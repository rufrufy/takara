-- Standard Auth identity and trusted household authorization.
create schema if not exists takara_private;
revoke all on schema takara_private from public,anon;
grant usage on schema takara_private to authenticated;
create or replace function takara_private.current_user_id() returns text language sql stable security definer set search_path='' as $$ select id from public.app_users where auth_user_id=(select auth.uid()) $$;
create or replace function takara_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.app_users where auth_user_id=(select auth.uid()) and role='ADMIN') $$;
create or replace function takara_private.household_owner(hid text) returns boolean language sql stable security definer set search_path='' as $$ select (select auth.uid()) is not null and (takara_private.is_admin() or exists(select 1 from public.households where id=hid and created_by_id=takara_private.current_user_id())) $$;
create or replace function takara_private.household_access(hid text,writing boolean default false) returns boolean language sql stable security definer set search_path='' as $$ select (select auth.uid()) is not null and (takara_private.household_owner(hid) or exists(select 1 from public.household_members where household_id=hid and user_id=takara_private.current_user_id() and (not writing or role in ('OWNER','ADMIN','MEMBER')))) $$;
revoke all on all functions in schema takara_private from public,anon;
grant execute on all functions in schema takara_private to authenticated;
create index if not exists household_members_user_household_idx on public.household_members(user_id,household_id);
create index if not exists households_created_by_idx on public.households(created_by_id);
create table if not exists public.household_labels(id text primary key, household_id text not null references public.households(id) on delete cascade, name text not null check(length(name) between 1 and 100));
create index if not exists household_labels_household_idx on public.household_labels(household_id);
alter table public.household_labels enable row level security;
do $$ declare t text; p record; begin
 foreach t in array array['app_users','households','household_members','wallets','categories','transactions','ledger_entries','debts','household_labels'] loop
  execute format('alter table public.%I enable row level security',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t); end loop;
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
-- PIN and role are server-managed. Browser never reads or writes credentials.
grant select(id,username,display_name,role,avatar_url,created_at,auth_user_id) on public.app_users to authenticated;
grant update(display_name,avatar_url) on public.app_users to authenticated;
create policy profiles_read on public.app_users for select to authenticated using (auth_user_id=(select auth.uid()) or (select takara_private.is_admin()) or exists(select 1 from public.household_members m where m.user_id=app_users.id and takara_private.household_access(m.household_id)));
create policy profiles_update on public.app_users for update to authenticated using (auth_user_id=(select auth.uid())) with check(auth_user_id=(select auth.uid()));
grant select,insert,update,delete on public.households,public.household_members,public.wallets,public.categories,public.transactions,public.ledger_entries,public.debts,public.household_labels to authenticated;
create policy household_read on public.households for select to authenticated using(takara_private.household_access(id));
create policy household_create on public.households for insert to authenticated with check(created_by_id=(select takara_private.current_user_id()));
create policy household_update on public.households for update to authenticated using(takara_private.household_owner(id)) with check(takara_private.household_owner(id));
create policy household_delete on public.households for delete to authenticated using(takara_private.household_owner(id));
create policy members_read on public.household_members for select to authenticated using(takara_private.household_access(household_id));
create policy members_insert on public.household_members for insert to authenticated with check(takara_private.household_owner(household_id));
create policy members_update on public.household_members for update to authenticated using(takara_private.household_owner(household_id)) with check(takara_private.household_owner(household_id));
create policy members_delete on public.household_members for delete to authenticated using(takara_private.household_owner(household_id));
do $$ declare t text; begin foreach t in array array['wallets','categories','transactions','ledger_entries','debts','household_labels'] loop
 execute format('create policy household_read on public.%I for select to authenticated using(takara_private.household_access(household_id))',t);
 execute format('create policy household_insert on public.%I for insert to authenticated with check(takara_private.household_access(household_id,true))',t);
 execute format('create policy household_update on public.%I for update to authenticated using(takara_private.household_access(household_id,true)) with check(takara_private.household_access(household_id,true))',t);
 execute format('create policy household_delete on public.%I for delete to authenticated using(takara_private.household_access(household_id,true))',t);
end loop; end $$;
-- No anonymous access and no object overwrite/move; files remain in verified household/user folders.
create policy receipt_read on storage.objects for select to authenticated using(bucket_id='receipts' and takara_private.household_access((storage.foldername(name))[1]));
create policy receipt_upload on storage.objects for insert to authenticated with check(bucket_id='receipts' and (storage.foldername(name))[2]=(select auth.uid())::text and takara_private.household_access((storage.foldername(name))[1],true));
create policy receipt_delete on storage.objects for delete to authenticated using(bucket_id='receipts' and takara_private.household_access((storage.foldername(name))[1],true) and ((storage.foldername(name))[2]=(select auth.uid())::text or takara_private.household_owner((storage.foldername(name))[1])));
-- Protect immutable tenant assignment and related financial references.
create or replace function public.validate_financial_household() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if TG_OP='UPDATE' and new.household_id<>old.household_id then raise exception 'Household cannot be changed'; end if;
 if TG_TABLE_NAME='transactions' then
  if new.source_wallet_id is not null and not exists(select 1 from public.wallets where id=new.source_wallet_id and household_id=new.household_id) then raise exception 'Source wallet outside household';end if;
  if new.destination_wallet_id is not null and not exists(select 1 from public.wallets where id=new.destination_wallet_id and household_id=new.household_id) then raise exception 'Destination wallet outside household';end if;
  if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and household_id=new.household_id) then raise exception 'Category outside household';end if;
 elsif TG_TABLE_NAME='ledger_entries' then
  if not exists(select 1 from public.wallets where id=new.wallet_id and household_id=new.household_id) or not exists(select 1 from public.transactions where id=new.transaction_id and household_id=new.household_id) then raise exception 'Ledger reference outside household';end if;
 end if;return new;end $$;
revoke all on function public.validate_financial_household() from public,anon;
do $$ declare t text;begin foreach t in array array['transactions','ledger_entries','wallets','debts','household_labels','household_members'] loop execute format('create trigger validate_household before insert or update on public.%I for each row execute function public.validate_financial_household()',t);end loop;end $$;
-- Ownership cannot be transferred via the browser.
create or replace function public.lock_household_owner() returns trigger language plpgsql set search_path='' as $$ begin if new.created_by_id is distinct from old.created_by_id then raise exception 'Household owner cannot be changed';end if;return new;end $$;
revoke all on function public.lock_household_owner() from public,anon;
create trigger lock_household_owner before update on public.households for each row execute function public.lock_household_owner();
create or replace function public.save_financial_transaction(p_tx jsonb,p_debt_id text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare tx public.transactions; existing public.transactions; debt public.debts; was_existing boolean;begin
 tx:=jsonb_populate_record(null::public.transactions,p_tx);
 if not takara_private.household_access(tx.household_id,true) then raise exception 'Household access denied';end if;
 if tx.amount<0 or tx.amount is null or tx.status not in ('POSTED','VOIDED') or tx.type not in ('income','expense','transfer','opening_balance') then raise exception 'Invalid transaction';end if;
 perform 1 from public.wallets where household_id=tx.household_id order by id for update;
 select * into existing from public.transactions where id=tx.id for update;was_existing:=found;
 if was_existing and existing.household_id<>tx.household_id then raise exception 'Transaction household cannot change';end if;
 if p_debt_id is not null then
  select * into debt from public.debts where id=p_debt_id and household_id=tx.household_id for update;
  if not found or tx.status<>'POSTED' or (debt.type='debt' and tx.type<>'expense') or (debt.type='receivable' and tx.type<>'income') then raise exception 'Invalid debt payment';end if;
  if not was_existing and tx.amount>debt.remaining_amount then raise exception 'Payment exceeds remaining debt';end if;
 end if;
 insert into public.transactions select (tx).* on conflict(id) do update set
 type=excluded.type,amount=excluded.amount,fee=excluded.fee,source_wallet_id=excluded.source_wallet_id,destination_wallet_id=excluded.destination_wallet_id,category_id=excluded.category_id,category_name=excluded.category_name,category_type=excluded.category_type,label=excluded.label,description=excluded.description,notes=excluded.notes,image_url=excluded.image_url,effective_at=excluded.effective_at,date_str=excluded.date_str,day=excluded.day,time=excluded.time,source_asset=excluded.source_asset,source_asset_type=excluded.source_asset_type,destination_asset=excluded.destination_asset,added_by=excluded.added_by,auto_income=excluded.auto_income,from_savings=excluded.from_savings,from_investment=excluded.from_investment,status=excluded.status,updated_at=excluded.updated_at;
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
 if p_debt_id is not null and not was_existing then update public.debts set remaining_amount=greatest(0,remaining_amount-tx.amount),is_settled=remaining_amount-tx.amount<=0,is_paid_this_month=true,last_paid_month=to_char(tx.effective_at at time zone 'Asia/Jakarta','YYYY-MM') where id=p_debt_id;end if;
 update public.wallets w set balance=coalesce((select sum(l.signed_amount) from public.ledger_entries l join public.transactions t on t.id=l.transaction_id where l.wallet_id=w.id and l.household_id=tx.household_id and t.status='POSTED'),0),updated_at=now() where w.household_id=tx.household_id;
 return jsonb_build_object('success',true,'id',tx.id);
end $$;
revoke all on function public.save_financial_transaction(jsonb,text) from public,anon;
grant execute on function public.save_financial_transaction(jsonb,text) to authenticated;
-- Called only by the authenticated server administration client after Auth creates identity.
create or replace function public.provision_auth_account(p_auth_id uuid,p_id text,p_username text,p_display text,p_role text,p_household text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare hid text; now_at timestamptz:=now();begin
 if p_role not in ('OWNER','ADMIN','MEMBER','VIEWER') then raise exception 'Invalid role';end if;
 insert into public.app_users(id,username,display_name,pin_hash,role,auth_user_id,created_at) values(p_id,p_username,p_display,'AUTH_MANAGED',p_role,p_auth_id,now_at);
 hid:=p_household;
 if hid is null and p_role<>'ADMIN' then
  hid:='hh-'||pg_catalog.gen_random_uuid()::text;
  insert into public.households(id,name,created_by_id,invite_code,created_at) values(hid,'Keluarga '||p_display,p_id,'TK-'||upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,12)),now_at);
  insert into public.wallets(id,household_id,name,type,currency,balance,created_at,updated_at) values('wallet-'||p_id,hid,'Tunai','cash','IDR',0,now_at,now_at);
  insert into public.categories(id,household_id,name,type,icon,color) values('category-income-'||p_id,hid,'Pemasukan lainnya','income','Wallet','#06D6A0'),('category-expense-'||p_id,hid,'Pengeluaran lainnya','expense','Tag','#1B9AAA');
 end if;
 if hid is not null then insert into public.household_members(id,household_id,user_id,display_name,role,joined_at) values('mem-'||p_id||'-'||hid,hid,p_id,p_display,case when p_household is null then 'OWNER' else p_role end,now_at);end if;
 return jsonb_build_object('id',p_id,'username',p_username,'display_name',p_display,'role',p_role,'auth_user_id',p_auth_id,'created_at',now_at);
end $$;
revoke all on function public.provision_auth_account(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.provision_auth_account(uuid,text,text,text,text,text) to service_role;
create or replace function public.recompute_household_wallets(p_household text) returns void language plpgsql security invoker set search_path='' as $$ begin
 if not takara_private.household_access(p_household,true) then raise exception 'Household access denied';end if;
 perform 1 from public.wallets where household_id=p_household order by id for update;
 update public.wallets w set balance=coalesce((select sum(l.signed_amount) from public.ledger_entries l join public.transactions t on t.id=l.transaction_id where l.wallet_id=w.id and l.household_id=p_household and t.status='POSTED'),0),updated_at=now() where w.household_id=p_household;
end $$;
revoke all on function public.recompute_household_wallets(text) from public,anon;
grant execute on function public.recompute_household_wallets(text) to authenticated;
-- Internal event trigger must not be callable as a public RPC.
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
