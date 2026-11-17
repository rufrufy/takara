begin;
create temporary table period_fixture as select gen_random_uuid() as auth_id,'period-reset-test-'||gen_random_uuid()::text as hid;
grant select on period_fixture to authenticated;
do $$declare f record;begin
 select * into f from period_fixture;
 insert into auth.users(id) values(f.auth_id);
 insert into public.app_users(id,username,display_name,pin_hash,role,auth_user_id) values(f.hid||'-owner',f.hid||'-owner','Period reset owner','AUTH_MANAGED','OWNER',f.auth_id);
 insert into public.households(id,name,created_by_id) values(f.hid,'Period rollback fixture',f.hid||'-owner');
 insert into public.wallets(id,household_id,name,type) values(f.hid||'-positive',f.hid,'Positive','cash'),(f.hid||'-negative',f.hid,'Negative','checking'),(f.hid||'-zero',f.hid,'Zero','digital');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_id,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$declare f record;r jsonb;begin
 select * into f from period_fixture;
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-oct-income','household_id',f.hid,'type','income','amount',1000,'destination_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at','2001-10-20T03:00:00Z','created_at',now(),'updated_at',now()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-nov-expense','household_id',f.hid,'type','expense','amount',200,'source_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at','2001-10-31T17:00:00Z','created_at',now(),'updated_at',now()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-oct-expense','household_id',f.hid,'type','expense','amount',300,'source_wallet_id',f.hid||'-negative','added_by','Test','status','POSTED','effective_at','2001-10-20T03:00:00Z','created_at',now(),'updated_at',now()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-nov-income','household_id',f.hid,'type','income','amount',700,'destination_wallet_id',f.hid||'-negative','added_by','Test','status','POSTED','effective_at','2001-11-02T03:00:00Z','created_at',now(),'updated_at',now()));
 r:=public.reset_monthly_balances(f.hid,date '2001-10-01');
 if (r->>'count')::integer<>2 then raise exception 'Wrong changed-wallet count';end if;
 if (select balance from public.wallets where id=f.hid||'-positive')<>-200 or (select balance from public.wallets where id=f.hid||'-negative')<>700 then raise exception 'Later month activity was lost';end if;
 if exists(select 1 from public.wallets w where household_id=f.hid and (select coalesce(sum(l.signed_amount),0) from public.ledger_entries l join public.transactions t on t.id=l.transaction_id where l.wallet_id=w.id and t.status='POSTED' and l.posted_at<'2001-10-31T17:00:00Z')<>0) then raise exception 'Selected month did not close at zero';end if;
 if not exists(select 1 from public.transactions where household_id=f.hid and id like 'tx-month-reset-%-checkpoint' and to_char(effective_at at time zone 'Asia/Jakarta','YYYY-MM')='2001-10') then raise exception 'Checkpoint posted in wrong month';end if;
 r:=public.reset_monthly_balances(f.hid,date '2001-10-01');
 if not (r->>'alreadyReset')::boolean then raise exception 'Period retry not idempotent';end if;
 begin
  perform public.reset_monthly_balances(f.hid,date '2001-09-01');raise exception 'TEST_FAILURE: earlier close accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 begin
  perform public.reset_monthly_balances(f.hid,(date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '1 month')::date);raise exception 'TEST_FAILURE: future close accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 begin
  perform public.reset_monthly_balances(f.hid,date '2001-11-15');raise exception 'TEST_FAILURE: non-month date accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 r:=public.reset_monthly_balances(f.hid,date '2001-11-01');
 if exists(select 1 from public.wallets where household_id=f.hid and balance<>0) then raise exception 'Next chronological close failed';end if;
 if (select count(*) from public.transactions where household_id=f.hid and id like f.hid||'-%' and status='POSTED')<>4 then raise exception 'Original history changed';end if;
end $$;
reset role;
rollback;
select 'PASS: selected historical month closes at zero, later-month income/expense preserved, Jakarta boundary correct, repeat idempotent, future/earlier/non-month inputs rejected, next period can close; fixtures rolled back' as result;
