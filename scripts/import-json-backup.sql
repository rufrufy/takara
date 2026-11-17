-- Additive, atomic restore of financial data; never import users, memberships or settings.
create or replace function public.import_financial_backup(p_household text,p_backup jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.wallets;c public.categories;d public.debts;t public.transactions;item jsonb;
 actor text:=takara_private.current_user_id();n integer:=0;skipped integer:=0;debt_ref text;
 prior_setting text:=current_setting('takara.monthly_reset',true);
begin
 if (select auth.uid()) is null or not takara_private.household_access(p_household,true)
 or not (takara_private.household_owner(p_household) or exists(select 1 from public.household_members where household_id=p_household and user_id=actor and role in ('OWNER','ADMIN'))) then
  raise exception 'Only household owner or admin can restore a backup';end if;
 foreach debt_ref in array array['wallets','categories','debts','transactions','labels'] loop
  if jsonb_typeof(p_backup->debt_ref) is distinct from 'array' or jsonb_array_length(p_backup->debt_ref)>10000 then raise exception 'Invalid backup array';end if;
 end loop;
 perform 1 from public.wallets where household_id=p_household order by id for update;
 perform pg_advisory_xact_lock(hashtextextended('backup-import:'||p_household,0));
 for w in select * from jsonb_populate_recordset(null::public.wallets,p_backup->'wallets') loop
  if w.household_id is distinct from p_household or w.id is null or length(trim(w.name))=0 or w.type not in ('cash','checking','digital','custom') then raise exception 'Invalid backup wallet';end if;
  w.balance:=0;w.currency:='IDR';w.is_archived:=coalesce(w.is_archived,false);
  insert into public.wallets select (w).* on conflict(id) do nothing;
  if not exists(select 1 from public.wallets where id=w.id and household_id=p_household) then raise exception 'Wallet ID unavailable';end if;
 end loop;
 for c in select * from jsonb_populate_recordset(null::public.categories,p_backup->'categories') loop
  if c.household_id is distinct from p_household or c.id is null or length(trim(c.name))=0 or c.type not in ('income','expense','transfer') then raise exception 'Invalid backup category';end if;
  c.is_archived:=coalesce(c.is_archived,false);
  insert into public.categories select (c).* on conflict(id) do nothing;
  if not exists(select 1 from public.categories where id=c.id and household_id=p_household) then raise exception 'Category ID unavailable';end if;
 end loop;
 for d in select * from jsonb_populate_recordset(null::public.debts,p_backup->'debts') loop
  if d.household_id is distinct from p_household or d.id is null or d.type not in ('debt','receivable') or d.amount<0 or d.remaining_amount<0 then raise exception 'Invalid backup debt';end if;
  d.is_settled:=coalesce(d.is_settled,false);d.is_paid_this_month:=coalesce(d.is_paid_this_month,false);
  insert into public.debts select (d).* on conflict(id) do nothing;
  if not exists(select 1 from public.debts where id=d.id and household_id=p_household) then raise exception 'Debt ID unavailable';end if;
 end loop;
 perform set_config('takara.monthly_reset',p_household,true);
 for item in select value from jsonb_array_elements(p_backup->'transactions') loop
  t:=jsonb_populate_record(null::public.transactions,item);
  if t.household_id is distinct from p_household or t.id is null or t.type not in ('income','expense','transfer','opening_balance') or t.amount<0 or coalesce(t.fee,0)<0 or t.status not in ('POSTED','VOIDED') then raise exception 'Invalid backup transaction';end if;
  if exists(select 1 from public.transactions where id=t.id and household_id=p_household) then skipped:=skipped+1;continue;end if;
  debt_ref:=t.debt_id;
  if debt_ref is not null and not exists(select 1 from public.debts where id=debt_ref and household_id=p_household and ((type='debt' and t.type='expense') or (type='receivable' and t.type='income'))) then raise exception 'Invalid backup debt link';end if;
  if t.id like 'tx-month-reset-%' and t.id not like 'tx-month-reset-'||md5(p_household)||'-%' then raise exception 'Reset checkpoint belongs to another household';end if;
  if t.id like 'tx-month-reset-%-checkpoint' then
   if t.type<>'opening_balance' or t.amount<>0 or t.source_wallet_id is not null or t.destination_wallet_id is not null then raise exception 'Invalid reset checkpoint';end if;
   insert into public.transactions select (t).*;
  else
   -- Debt balances in backups already include historical installments. Do not repay them.
   perform public.save_financial_transaction(item-'debt_id');
   if debt_ref is not null then update public.transactions set debt_id=debt_ref where id=t.id;end if;
  end if;
  n:=n+1;
 end loop;
 for debt_ref in select jsonb_array_elements_text(p_backup->'labels') loop
  if length(trim(debt_ref)) not between 1 and 100 then raise exception 'Invalid backup label';end if;
  insert into public.household_labels(id,household_id,name) values(p_household||':'||debt_ref,p_household,debt_ref) on conflict(id) do nothing;
 end loop;
 perform public.recompute_household_wallets(p_household);
 perform set_config('takara.monthly_reset',coalesce(prior_setting,''),true);
 return jsonb_build_object('success',true,'imported',n,'skipped',skipped);
end $$;
revoke all on function public.import_financial_backup(text,jsonb) from public,anon;
grant execute on function public.import_financial_backup(text,jsonb) to authenticated;
