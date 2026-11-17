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
-- A later wallet failure must roll back the earlier adjustment and checkpoint.
reset role;
create function pg_temp.fail_reset_wallet() returns trigger language plpgsql as $$begin
 if current_setting('takara.test_fail_reset',true)='yes' and new.id like 'tx-month-reset-%-positive' then raise exception 'Injected reset write failure';end if;
 return new;
end $$;
create trigger test_reset_rollback before insert on public.transactions for each row execute function pg_temp.fail_reset_wallet();
set local role authenticated;
do $$declare f record;res jsonb;count_before integer;marker public.transactions;begin
 select * into f from reset_fixture;
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-old-income','household_id',f.hid,'type','income','amount',100000,'destination_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at',clock_timestamp(),'created_at',clock_timestamp(),'updated_at',clock_timestamp()));
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-old-expense','household_id',f.hid,'type','expense','amount',20000,'source_wallet_id',f.hid||'-negative','added_by','Test','status','POSTED','effective_at',clock_timestamp(),'created_at',clock_timestamp(),'updated_at',clock_timestamp()));
 perform set_config('takara.test_fail_reset','yes',true);
 begin
  perform public.reset_monthly_balances(f.hid);
  raise exception 'TEST_FAILURE: injection did not fail';
 exception when others then if sqlerrm<>'Injected reset write failure' then raise;end if;end;
 if exists(select 1 from public.transactions where household_id=f.hid and id like 'tx-month-reset-%')
 or (select balance from public.wallets where id=f.hid||'-positive')<>100000
 or (select balance from public.wallets where id=f.hid||'-negative')<>-20000 then raise exception 'Partial reset committed';end if;
 perform set_config('takara.test_fail_reset','no',true);
 res:=public.reset_monthly_balances(f.hid);
 if (res->>'count')::integer<>2 or (res->>'alreadyReset')::boolean then raise exception 'Wrong reset result %',res;end if;
 if exists(select 1 from public.wallets where household_id=f.hid and balance<>0) then raise exception 'Balances did not reach zero';end if;
 if (select count(*) from public.transactions where household_id=f.hid and status='POSTED' and id in(f.hid||'-old-income',f.hid||'-old-expense'))<>2 then raise exception 'Original history changed';end if;
 select * into marker from public.transactions where household_id=f.hid and id like 'tx-month-reset-%-checkpoint';
 if jsonb_array_length(marker.notes::jsonb->'excludedTransactionIds')<>2 then raise exception 'Wrong checkpoint snapshot';end if;
 select count(*) into count_before from public.transactions where household_id=f.hid;
 res:=public.reset_monthly_balances(f.hid);
 if not (res->>'alreadyReset')::boolean or (select count(*) from public.transactions where household_id=f.hid)<>count_before then raise exception 'Reset is not idempotent';end if;
 perform public.save_financial_transaction(jsonb_build_object('id',f.hid||'-new-income','household_id',f.hid,'type','income','amount',7000,'destination_wallet_id',f.hid||'-positive','added_by','Test','status','POSTED','effective_at',clock_timestamp()-interval '1 hour','created_at',clock_timestamp()-interval '1 hour','updated_at',clock_timestamp()));
 if (select balance from public.wallets where id=f.hid||'-positive')<>7000 then raise exception 'New activity missing';end if;
 if (marker.notes::jsonb->'excludedTransactionIds') ? (f.hid||'-new-income') then raise exception 'New backdated activity excluded';end if;
 begin
  perform public.void_financial_transaction(marker.id);
  raise exception 'TEST_FAILURE: reset was voided';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 begin
  delete from public.transactions where id=marker.id;
  raise exception 'TEST_FAILURE: reset was deleted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.member_auth,'role','authenticated')::text,true);
 begin
  perform public.reset_monthly_balances(f.hid);
  raise exception 'TEST_FAILURE: member reset allowed';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.foreign_auth,'role','authenticated')::text,true);
 begin
  perform public.reset_monthly_balances(f.hid);
  raise exception 'TEST_FAILURE: foreign reset allowed';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
end $$;
reset role;
rollback;
select 'PASS: atomic positive/negative/zero reset; history preserved; snapshot cutoff; idempotency; future activity; immutable audit; member and foreign household denied; fixtures rolled back' as result;
