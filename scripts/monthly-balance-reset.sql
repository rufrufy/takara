-- One auditable balance reset per household and Jakarta calendar month.
-- Existing transactions stay posted. Only new adjustment transactions are added.
create or replace function public.guard_monthly_balance_reset() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='DELETE' then
  if old.id like 'tx-month-reset-%' and exists(select 1 from public.households where id=old.household_id) then
   raise exception 'Monthly reset history cannot be deleted';
  end if;
  return old;
 end if;
 if TG_OP='UPDATE' and (old.id like 'tx-month-reset-%' or new.id like 'tx-month-reset-%') then
  raise exception 'Monthly reset history cannot be edited';
 end if;
 if TG_OP='INSERT' and new.id like 'tx-month-reset-%'
    and coalesce(current_setting('takara.monthly_reset',true),'')<>new.household_id then
  raise exception 'Use reset_monthly_balances to create reset history';
 end if;
 return new;
end $$;
revoke all on function public.guard_monthly_balance_reset() from public,anon,authenticated;
drop trigger if exists guard_monthly_balance_reset on public.transactions;
create trigger guard_monthly_balance_reset before insert or update or delete on public.transactions
for each row execute function public.guard_monthly_balance_reset();

create or replace function public.reset_monthly_balances(p_household text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 actor text := takara_private.current_user_id();
 actor_name text;
 reset_at timestamptz;
 reset_prefix text;
 marker_id text;
 excluded_ids jsonb;
 previous_setting text := current_setting('takara.monthly_reset',true);
 w record;
 changed integer := 0;
begin
 if (select auth.uid()) is null or not takara_private.household_access(p_household,true)
    or not (takara_private.household_owner(p_household) or exists(
      select 1 from public.household_members where household_id=p_household and user_id=actor and role in ('OWNER','ADMIN')
    )) then raise exception 'Only household owner or admin can reset balances'; end if;
 -- Same wallet lock order as save_financial_transaction; concurrent writes serialize.
 perform 1 from public.wallets where household_id=p_household order by id for update;
 perform pg_advisory_xact_lock(hashtextextended('monthly-balance:'||p_household,0));
 reset_at:=clock_timestamp();
 reset_prefix:='tx-month-reset-'||md5(p_household)||'-'||to_char(reset_at at time zone 'Asia/Jakarta','YYYY-MM');
 marker_id:=reset_prefix||'-checkpoint';
 if exists(select 1 from public.transactions where id=marker_id) then
  return jsonb_build_object('success',true,'alreadyReset',true,'count',0);
 end if;
 select display_name into actor_name from public.app_users where id=actor;
 select coalesce(jsonb_agg(id),'[]'::jsonb) into excluded_ids from public.transactions
 where household_id=p_household and status='POSTED'
 and effective_at>=date_trunc('month',reset_at at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
 and effective_at<(date_trunc('month',reset_at at time zone 'Asia/Jakarta')+interval '1 month') at time zone 'Asia/Jakarta';
 perform set_config('takara.monthly_reset',p_household,true);
 insert into public.transactions(id,household_id,type,amount,category_name,description,notes,added_by,effective_at,status,created_at,updated_at)
 values(marker_id,p_household,'opening_balance',0,'Reset saldo bulanan','Reset saldo bulanan',
   jsonb_build_object('message','Saldo dompet dan hitungan bulanan dimulai kembali dari waktu ini. Riwayat sebelumnya tetap tersimpan.','excludedTransactionIds',excluded_ids)::text,
   coalesce(actor_name,actor),reset_at,'POSTED',reset_at,reset_at);
 for w in
  select wallet.id,wallet.name,coalesce(sum(l.signed_amount) filter(where t.status='POSTED'),0) as actual_balance
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
    'category_name','Penyesuaian saldo bulanan','description','Reset saldo: '||w.name,
    'notes','Penyesuaian administrasi bulanan, bukan pemasukan atau pengeluaran riil. Saldo sebelum reset: '||w.actual_balance::text,
    'added_by',coalesce(actor_name,actor),'effective_at',reset_at,'status','POSTED','created_at',reset_at,'updated_at',reset_at
   ));
   changed:=changed+1;
  end if;
 end loop;
 perform public.recompute_household_wallets(p_household);
 perform set_config('takara.monthly_reset',coalesce(previous_setting,''),true);
 return jsonb_build_object('success',true,'alreadyReset',false,'count',changed,'resetAt',reset_at);
end $$;
revoke all on function public.reset_monthly_balances(text) from public,anon;
grant execute on function public.reset_monthly_balances(text) to authenticated;
