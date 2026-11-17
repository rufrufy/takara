-- Live integration test: every fixture and write is rolled back.
begin;
create temporary table reset_fixture as select gen_random_uuid() as owner_auth,gen_random_uuid() as member_auth,gen_random_uuid() as foreign_auth,'test-reset-'||gen_random_uuid()::text as hid;
grant select on reset_fixture to authenticated;
do $$declare f record;begin
 select * into f from reset_fixture;
 insert into auth.users(id) values(f.owner_auth),(f.member_auth),(f.foreign_auth);
 insert into public.app_users(id,username,display_name,pin_hash,role,auth_user_id) values
 (f.hid||'-owner',f.hid||'-owner','Reset test owner','AUTH_MANAGED','OWNER',f.owner_auth),
 (f.hid||'-member',f.hid||'-member','Reset test member','AUTH_MANAGED','MEMBER',f.member_auth),
 (f.hid||'-foreign',f.hid||'-foreign','Reset test foreign','AUTH_MANAGED','OWNER',f.foreign_auth);
 insert into public.households(id,name,created_by_id) values(f.hid,'Rollback reset fixture',f.hid||'-owner');
 insert into public.household_members(id,household_id,user_id,display_name,role) values
 (f.hid||'-membership',f.hid,f.hid||'-member','Reset test member','MEMBER');
 insert into public.wallets(id,household_id,name,type) values(f.hid||'-positive',f.hid,'Positive','cash'),(f.hid||'-negative',f.hid,'Negative','checking'),(f.hid||'-zero',f.hid,'Zero','digital');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_auth,'role','authenticated')::text,true);
end $$;
set local role authenticated;
reset role;
create function pg_temp.fail_rollback_wallet() returns trigger language plpgsql as $$begin
 if current_setting('takara.fail_rollback',true)='yes' and new.id like 'tx-month-reset-%-undo-%-positive' then raise exception 'Injected rollback failure';end if;return new;
end $$;
create trigger test_atomic_rollback before insert on public.transactions for each row execute function pg_temp.fail_rollback_wallet();
set local role authenticated;
do $$declare f record;r jsonb;oct text;nov text;second_oct text;third_oct text;before_count integer;begin
 select * into f from reset_fixture;
 oct:='tx-month-reset-'||md5(f.hid)||'-2001-10-checkpoint';nov:='tx-month-reset-'||md5(f.hid)||'-2001-11-checkpoint';
 second_oct:='tx-month-reset-'||md5(f.hid)||'-2001-10-r2-checkpoint';third_oct:='tx-month-reset-'||md5(f.hid)||'-2001-10-r3-checkpoint';
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-oct-in','household_id',f.hid,'type','income','amount',1000,'destination_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at','2001-10-20T03:00:00Z','created_at',now(),'updated_at',now()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-oct-out','household_id',f.hid,'type','expense','amount',300,'source_wallet_id',f.hid||'-negative','added_by','Test','status','POSTED','effective_at','2001-10-20T03:00:00Z','created_at',now(),'updated_at',now()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-nov-in','household_id',f.hid,'type','income','amount',700,'destination_wallet_id',f.hid||'-negative','added_by','Test','status','POSTED','effective_at','2001-11-02T03:00:00Z','created_at',now(),'updated_at',now()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-nov-out','household_id',f.hid,'type','expense','amount',200,'source_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at','2001-11-02T03:00:00Z','created_at',now(),'updated_at',now()));
 perform public.reset_monthly_balances(f.hid,date '2001-10-01');perform public.reset_monthly_balances(f.hid,date '2001-11-01');
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-after-reset','household_id',f.hid,'type','income','amount',50,'destination_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at',now(),'created_at',now(),'updated_at',now()));
 begin
  perform public.rollback_monthly_balance_reset(f.hid,oct);raise exception 'TEST_FAILURE: rolled back older active period';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 r:=public.rollback_monthly_balance_reset(f.hid,nov);
 if (r->>'count')::integer<>2 or (select balance from public.wallets where id=f.hid||'-positive')<>-150 or (select balance from public.wallets where id=f.hid||'-negative')<>700 then raise exception 'Latest rollback lost later activity';end if;
 select count(*) into before_count from public.transactions where household_id=f.hid;
 r:=public.rollback_monthly_balance_reset(f.hid,nov);
 if not (r->>'alreadyRolledBack')::boolean or (select count(*) from public.transactions where household_id=f.hid)<>before_count then raise exception 'Rollback retry duplicated records';end if;
 perform public.rollback_monthly_balance_reset(f.hid,oct);
 if (select balance from public.wallets where id=f.hid||'-positive')<>850 or (select balance from public.wallets where id=f.hid||'-negative')<>400 then raise exception 'Original balances not restored';end if;
 perform public.reset_monthly_balances(f.hid,date '2001-10-01');
 if not exists(select 1 from public.transactions where id=second_oct) then raise exception 'Reset after rollback did not create a new cycle';end if;
 r:=public.rollback_monthly_balance_reset(f.hid,oct);
 if not (r->>'alreadyRolledBack')::boolean or (select balance from public.wallets where id=f.hid||'-positive')<>-150 then raise exception 'Stale rollback retried against new cycle';end if;
 perform public.rollback_monthly_balance_reset(f.hid,second_oct);
 perform public.reset_monthly_balances(f.hid,date '2001-10-01');
 perform set_config('takara.fail_rollback','yes',true);
 begin
  perform public.rollback_monthly_balance_reset(f.hid,third_oct);raise exception 'TEST_FAILURE: injection not triggered';
 exception when others then if sqlerrm<>'Injected rollback failure' then raise;end if;end;
 if exists(select 1 from public.transactions where id=regexp_replace(third_oct,'-checkpoint$','-rollback')) or (select balance from public.wallets where id=f.hid||'-positive')<>-150 or (select balance from public.wallets where id=f.hid||'-negative')<>700 then raise exception 'Partial rollback committed';end if;
 perform set_config('takara.fail_rollback','no',true);
 perform public.rollback_monthly_balance_reset(f.hid,third_oct);
 if (select balance from public.wallets where id=f.hid||'-positive')<>850 or (select balance from public.wallets where id=f.hid||'-negative')<>400 then raise exception 'Rollback recovery failed';end if;
 if (select count(*) from public.transactions where household_id=f.hid and id like f.hid||'-%' and status='POSTED')<>5 then raise exception 'Original financial history changed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.member_auth,'role','authenticated')::text,true);
 begin
  perform public.rollback_monthly_balance_reset(f.hid,oct);raise exception 'TEST_FAILURE: member rollback accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.foreign_auth,'role','authenticated')::text,true);
 begin
  perform public.rollback_monthly_balance_reset(f.hid,oct);raise exception 'TEST_FAILURE: foreign rollback accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS: exact inverse rollback; later activity preserved; latest-first ordering; idempotent retries; new reset cycles; stale retry safe; atomic failure rollback; history kept; member/foreign denied; fixtures rolled back' as result;
