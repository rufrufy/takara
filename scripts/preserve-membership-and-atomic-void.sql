-- Existing ACL duplicates inspected: none. Unique membership prevents invite-code role upgrade races.
create unique index if not exists household_members_household_user_uidx on public.household_members(household_id,user_id);
alter table public.transactions add column if not exists debt_id text references public.debts(id) on delete set null;
create index if not exists transactions_debt_id_idx on public.transactions(debt_id) where debt_id is not null;
create or replace function public.save_financial_transaction(p_tx jsonb,p_debt_id text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare tx public.transactions; existing public.transactions; debt public.debts; was_existing boolean;begin
 tx:=jsonb_populate_record(null::public.transactions,p_tx);
 if not takara_private.household_access(tx.household_id,true) then raise exception 'Household access denied';end if;
 if tx.amount<0 or tx.amount is null or tx.status not in ('POSTED','VOIDED') or tx.type not in ('income','expense','transfer','opening_balance') then raise exception 'Invalid transaction';end if;
 perform 1 from public.wallets where household_id=tx.household_id order by id for update;
 select * into existing from public.transactions where id=tx.id for update;was_existing:=found;
 if was_existing and existing.household_id<>tx.household_id then raise exception 'Transaction household cannot change';end if;
 tx.debt_id:=coalesce(existing.debt_id,p_debt_id);
 if tx.debt_id is not null then
  select * into debt from public.debts where id=tx.debt_id and household_id=tx.household_id for update;
  if not found or (debt.type='debt' and tx.type<>'expense') or (debt.type='receivable' and tx.type<>'income') then raise exception 'Invalid debt payment';end if;
  if (case when tx.status='POSTED' then tx.amount else 0 end)-(case when was_existing and existing.status='POSTED' then existing.amount else 0 end)>debt.remaining_amount then raise exception 'Payment exceeds remaining debt';end if;
 end if;
 insert into public.transactions select (tx).* on conflict(id) do update set
 debt_id=excluded.debt_id,type=excluded.type,amount=excluded.amount,fee=excluded.fee,source_wallet_id=excluded.source_wallet_id,destination_wallet_id=excluded.destination_wallet_id,category_id=excluded.category_id,category_name=excluded.category_name,category_type=excluded.category_type,label=excluded.label,description=excluded.description,notes=excluded.notes,image_url=excluded.image_url,effective_at=excluded.effective_at,date_str=excluded.date_str,day=excluded.day,time=excluded.time,source_asset=excluded.source_asset,source_asset_type=excluded.source_asset_type,destination_asset=excluded.destination_asset,added_by=excluded.added_by,auto_income=excluded.auto_income,from_savings=excluded.from_savings,from_investment=excluded.from_investment,status=excluded.status,updated_at=excluded.updated_at;
 delete from public.ledger_entries where transaction_id=tx.id;
 if tx.status='POSTED' then
  if tx.type='income' then
   insert into public.ledger_entries values('led-'||tx.id||'-inc',tx.household_id,tx.id,coalesce(tx.destination_wallet_id,tx.source_wallet_id),tx.amount,'INCOME',tx.effective_at,tx.created_at);
  elsif tx.type='expense' then
   insert into public.ledger_entries values('led-'||tx.id||'-exp',tx.household_id,tx.id,coalesce(tx.source_wallet_id,tx.destination_wallet_id),-tx.amount,'EXPENSE',tx.effective_at,tx.created_at);
  elsif tx.type='transfer' then
   if tx.source_wallet_id is null or tx.destination_wallet_id is null or tx.source_wallet_id=tx.destination_wallet_id then raise exception 'Transfer needs different wallets';end if;
   insert into public.ledger_entries values('led-'||tx.id||'-tout',tx.household_id,tx.id,tx.source_wallet_id,-tx.amount,'TRANSFER_OUT',tx.effective_at,tx.created_at),('led-'||tx.id||'-tin',tx.household_id,tx.id,tx.destination_wallet_id,tx.amount,'TRANSFER_IN',tx.effective_at,tx.created_at);
   if coalesce(tx.fee,0)>0 then insert into public.ledger_entries values('led-'||tx.id||'-fee',tx.household_id,tx.id,tx.source_wallet_id,-tx.fee,'FEE',tx.effective_at,tx.created_at);end if;
  elsif tx.type='opening_balance' and not (coalesce(tx.category_name,'') ilike '%utang%' or coalesce(tx.description,'') ~* '^(utang|piutang):' or tx.id like 'tx-debt-%') then
   insert into public.ledger_entries values('led-'||tx.id||'-open',tx.household_id,tx.id,coalesce(tx.destination_wallet_id,tx.source_wallet_id),tx.amount,'OPENING',tx.effective_at,tx.created_at);
  end if;
 end if;
 if tx.debt_id is not null then update public.debts set
 remaining_amount=greatest(0,remaining_amount+(case when was_existing and existing.status='POSTED' then existing.amount else 0 end)-(case when tx.status='POSTED' then tx.amount else 0 end)),
 is_settled=remaining_amount+(case when was_existing and existing.status='POSTED' then existing.amount else 0 end)-(case when tx.status='POSTED' then tx.amount else 0 end)<=0,
 is_paid_this_month=exists(select 1 from public.transactions p where p.debt_id=tx.debt_id and p.status='POSTED' and to_char(p.effective_at at time zone 'Asia/Jakarta','YYYY-MM')=to_char(now() at time zone 'Asia/Jakarta','YYYY-MM')),
 last_paid_month=(select max(to_char(p.effective_at at time zone 'Asia/Jakarta','YYYY-MM')) from public.transactions p where p.debt_id=tx.debt_id and p.status='POSTED') where id=tx.debt_id;end if;
 update public.wallets w set balance=coalesce((select sum(l.signed_amount) from public.ledger_entries l join public.transactions t on t.id=l.transaction_id where l.wallet_id=w.id and l.household_id=tx.household_id and t.status='POSTED'),0),updated_at=now() where w.household_id=tx.household_id;
 return jsonb_build_object('success',true,'id',tx.id);
end $$;
revoke all on function public.save_financial_transaction(jsonb,text) from public,anon;
grant execute on function public.save_financial_transaction(jsonb,text) to authenticated;

create or replace function public.void_financial_transaction(p_transaction_id text) returns jsonb language plpgsql security invoker set search_path='' as $$ declare tx public.transactions;begin
 select * into tx from public.transactions where id=p_transaction_id;
 if not found then raise exception 'Transaction not found or access denied';end if;
 tx.status:='VOIDED';tx.updated_at:=now();return public.save_financial_transaction(to_jsonb(tx),tx.debt_id);
end $$;
revoke all on function public.void_financial_transaction(text) from public,anon;
grant execute on function public.void_financial_transaction(text) to authenticated;

create or replace function public.validate_financial_household() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if TG_OP='UPDATE' and new.household_id<>old.household_id then raise exception 'Household cannot be changed'; end if;
 if TG_TABLE_NAME='transactions' then
  if new.source_wallet_id is not null and not exists(select 1 from public.wallets where id=new.source_wallet_id and household_id=new.household_id) then raise exception 'Source wallet outside household';end if;
  if new.destination_wallet_id is not null and not exists(select 1 from public.wallets where id=new.destination_wallet_id and household_id=new.household_id) then raise exception 'Destination wallet outside household';end if;
  if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and household_id=new.household_id) then raise exception 'Category outside household';end if;
  if new.debt_id is not null and not exists(select 1 from public.debts where id=new.debt_id and household_id=new.household_id) then raise exception 'Debt outside household';end if;
 elsif TG_TABLE_NAME='ledger_entries' then
  if not exists(select 1 from public.wallets where id=new.wallet_id and household_id=new.household_id) or not exists(select 1 from public.transactions where id=new.transaction_id and household_id=new.household_id) then raise exception 'Ledger reference outside household';end if;
 end if;return new;end $$;
