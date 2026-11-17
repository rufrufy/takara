-- Reset cycles remain immutable; rollback adds exact inverse ledger entries.
-- Historical month close preserves ledger activity in later months.
create or replace function public.reset_monthly_balances(p_household text,p_period date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 actor text := takara_private.current_user_id();
 actor_name text;
 reset_at timestamptz;
 reset_prefix text;
 period_end timestamptz;
 effective_at_reset timestamptz;
 marker_id text;
 excluded_ids jsonb;
 previous_setting text := current_setting('takara.monthly_reset',true);
 w record;
 changed integer := 0;
 reset_number integer;
 active_marker text;
begin
 if (select auth.uid()) is null or not takara_private.household_access(p_household,true)
    or not (takara_private.household_owner(p_household) or exists(
      select 1 from public.household_members where household_id=p_household and user_id=actor and role in ('OWNER','ADMIN')
    )) then raise exception 'Only household owner or admin can reset balances'; end if;
 -- Same wallet lock order as save_financial_transaction; concurrent writes serialize.
 perform 1 from public.wallets where household_id=p_household order by id for update;
 perform pg_advisory_xact_lock(hashtextextended('monthly-balance:'||p_household,0));
 reset_at:=clock_timestamp();
 if p_period is null or p_period<>date_trunc('month',p_period)::date or p_period<date '1900-01-01' or p_period>date_trunc('month',reset_at at time zone 'Asia/Jakarta')::date then raise exception 'Pilih bulan dan tahun yang valid, maksimal bulan berjalan';end if;
 period_end:=(p_period+interval '1 month') at time zone 'Asia/Jakarta';
 effective_at_reset:=case when p_period=date_trunc('month',reset_at at time zone 'Asia/Jakarta')::date then reset_at else period_end-interval '1 microsecond' end;
 reset_prefix:='tx-month-reset-'||md5(p_household)||'-'||to_char(p_period,'YYYY-MM');
 select cp.id into active_marker from public.transactions cp where cp.household_id=p_household and cp.status='POSTED'
 and cp.id like reset_prefix||'%-checkpoint'
 and not exists(select 1 from public.transactions rb where rb.id=regexp_replace(cp.id,'-checkpoint$','-rollback') and rb.status='POSTED') limit 1;
 if active_marker is not null then return jsonb_build_object('success',true,'alreadyReset',true,'count',0);end if;
 if exists(select 1 from public.transactions cp where cp.household_id=p_household and cp.status='POSTED' and cp.id like 'tx-month-reset-%-checkpoint' and cp.effective_at>=period_end
 and not exists(select 1 from public.transactions rb where rb.id=regexp_replace(cp.id,'-checkpoint$','-rollback') and rb.status='POSTED')) then raise exception 'Periode ini mendahului reset yang masih aktif. Rollback reset periode berikutnya dahulu';end if;
 select count(*) into reset_number from public.transactions where household_id=p_household and id like reset_prefix||'%-checkpoint';
 if reset_number>0 then reset_prefix:=reset_prefix||'-r'||(reset_number+1)::text;end if;
 marker_id:=reset_prefix||'-checkpoint';
 select display_name into actor_name from public.app_users where id=actor;
 select coalesce(jsonb_agg(id),'[]'::jsonb) into excluded_ids from public.transactions
 where household_id=p_household and status='POSTED'
 and effective_at>=p_period::timestamp at time zone 'Asia/Jakarta'
 and effective_at<period_end;
 perform set_config('takara.monthly_reset',p_household,true);
 insert into public.transactions(id,household_id,type,amount,category_name,description,notes,added_by,effective_at,status,created_at,updated_at)
 values(marker_id,p_household,'opening_balance',0,'Reset saldo bulanan','Reset saldo bulanan',
   jsonb_build_object('message','Saldo dompet dan hitungan bulanan dimulai kembali dari waktu ini. Riwayat sebelumnya tetap tersimpan.','excludedTransactionIds',excluded_ids)::text,
   coalesce(actor_name,actor),effective_at_reset,'POSTED',reset_at,reset_at);
 for w in
  select wallet.id,wallet.name,coalesce(sum(l.signed_amount) filter(where t.status='POSTED' and l.posted_at<period_end),0) as actual_balance
  from public.wallets wallet
  left join public.ledger_entries l on l.wallet_id=wallet.id and l.household_id=p_household
  left join public.transactions t on t.id=l.transaction_id
  where wallet.household_id=p_household group by wallet.id,wallet.name order by wallet.id
 loop
  if w.actual_balance<>0 then
   perform public.save_financial_transaction(jsonb_build_object(
    'id',reset_prefix||'-'||w.id,'household_id',p_household,
    'type',case when w.actual_balance>0 then 'expense' else 'income' end,
    'amount',abs(w.actual_balance),'fee',0,
    'source_wallet_id',case when w.actual_balance>0 then w.id else null end,
    'destination_wallet_id',case when w.actual_balance<0 then w.id else null end,
    'category_name','Penyesuaian saldo bulanan','description','Reset saldo '||to_char(p_period,'YYYY-MM')||': '||w.name,
    'notes','Penyesuaian administrasi bulanan, bukan pemasukan atau pengeluaran riil. Saldo sebelum reset: '||w.actual_balance::text,
    'added_by',coalesce(actor_name,actor),'effective_at',effective_at_reset,'status','POSTED','created_at',reset_at,'updated_at',reset_at
   ));
   changed:=changed+1;
  end if;
 end loop;
 perform public.recompute_household_wallets(p_household);
 perform set_config('takara.monthly_reset',coalesce(previous_setting,''),true);
 return jsonb_build_object('success',true,'alreadyReset',false,'count',changed,'resetAt',reset_at,'period',to_char(p_period,'YYYY-MM'));
end $$;
revoke all on function public.reset_monthly_balances(text,date) from public,anon;
grant execute on function public.reset_monthly_balances(text,date) to authenticated;

-- Keep existing clients working for the current Jakarta month.
create or replace function public.reset_monthly_balances(p_household text) returns jsonb
language sql security invoker set search_path='' as $$
 select public.reset_monthly_balances(p_household,date_trunc('month',now() at time zone 'Asia/Jakarta')::date)
$$;
revoke all on function public.reset_monthly_balances(text) from public,anon;
grant execute on function public.reset_monthly_balances(text) to authenticated;

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
  if t.id like 'tx-month-reset-%-checkpoint' or t.id like 'tx-month-reset-%-rollback' then
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
create or replace function public.rollback_monthly_balance_reset(p_household text,p_checkpoint_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare actor text:=takara_private.current_user_id();actor_name text;checkpoint public.transactions;
 prefix text;rollback_id text;period_end timestamptz;w record;n integer:=0;
 saved_at timestamptz:=clock_timestamp();prior_setting text:=current_setting('takara.monthly_reset',true);
begin
 if (select auth.uid()) is null or not takara_private.household_access(p_household,true)
 or not (takara_private.household_owner(p_household) or exists(select 1 from public.household_members where household_id=p_household and user_id=actor and role in ('OWNER','ADMIN'))) then
  raise exception 'Only household owner or admin can roll back a reset';end if;
 perform 1 from public.wallets where household_id=p_household order by id for update;
 perform pg_advisory_xact_lock(hashtextextended('monthly-balance:'||p_household,0));
 select * into checkpoint from public.transactions where id=p_checkpoint_id and household_id=p_household and status='POSTED' and id like 'tx-month-reset-%-checkpoint';
 if not found then raise exception 'Reset tidak ditemukan di household ini';end if;
 prefix:=regexp_replace(checkpoint.id,'-checkpoint$','');rollback_id:=prefix||'-rollback';
 if exists(select 1 from public.transactions where id=rollback_id) then
  return jsonb_build_object('success',true,'alreadyRolledBack',true,'count',0);end if;
 period_end:=(date_trunc('month',checkpoint.effective_at at time zone 'Asia/Jakarta')+interval '1 month') at time zone 'Asia/Jakarta';
 if exists(select 1 from public.transactions cp where cp.household_id=p_household and cp.status='POSTED' and cp.id like 'tx-month-reset-%-checkpoint' and cp.effective_at>=period_end
 and not exists(select 1 from public.transactions rb where rb.id=regexp_replace(cp.id,'-checkpoint$','-rollback') and rb.status='POSTED')) then
  raise exception 'Rollback reset periode yang paling baru dahulu';end if;
 select display_name into actor_name from public.app_users where id=actor;
 perform set_config('takara.monthly_reset',p_household,true);
 for w in
  select wallet.id,wallet.name,-sum(l.signed_amount) as reversal
  from public.wallets wallet join public.ledger_entries l on l.wallet_id=wallet.id and l.household_id=p_household
  join public.transactions tx on tx.id=l.transaction_id and tx.household_id=p_household and tx.status='POSTED' and tx.id=prefix||'-'||wallet.id
  where wallet.household_id=p_household group by wallet.id,wallet.name order by wallet.id
 loop
  if w.reversal<>0 then
   perform public.save_financial_transaction(jsonb_build_object(
    'id',prefix||'-undo-'||w.id,'household_id',p_household,
    'type',case when w.reversal>0 then 'income' else 'expense' end,'amount',abs(w.reversal),'fee',0,
    'source_wallet_id',case when w.reversal<0 then w.id else null end,
    'destination_wallet_id',case when w.reversal>0 then w.id else null end,
    'category_name','Rollback reset saldo','description','Rollback reset '||to_char(checkpoint.effective_at at time zone 'Asia/Jakarta','YYYY-MM')||': '||w.name,
    'notes','Membalik penyesuaian reset, mempertahankan seluruh transaksi lain. Bukan arus kas riil.',
    'added_by',coalesce(actor_name,actor),'effective_at',checkpoint.effective_at,'status','POSTED','created_at',saved_at,'updated_at',saved_at
   ));n:=n+1;
  end if;
 end loop;
 insert into public.transactions(id,household_id,type,amount,category_name,description,notes,added_by,effective_at,status,created_at,updated_at)
 values(rollback_id,p_household,'opening_balance',0,'Rollback reset saldo','Rollback reset saldo bulanan',
 jsonb_build_object('resetCheckpointId',checkpoint.id,'message','Reset dibatalkan melalui penyesuaian balik; riwayat dan transaksi lain tetap tersimpan.')::text,
 coalesce(actor_name,actor),checkpoint.effective_at,'POSTED',saved_at,saved_at);
 perform public.recompute_household_wallets(p_household);
 perform set_config('takara.monthly_reset',coalesce(prior_setting,''),true);
 return jsonb_build_object('success',true,'alreadyRolledBack',false,'count',n,'checkpointId',checkpoint.id);
end $$;
revoke all on function public.rollback_monthly_balance_reset(text,text) from public,anon;
grant execute on function public.rollback_monthly_balance_reset(text,text) to authenticated;

