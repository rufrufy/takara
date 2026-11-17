begin;
create temporary table json_fixture as select gen_random_uuid() as auth_id,gen_random_uuid() as member_auth,'json-test-'||gen_random_uuid()::text as hid;
grant select on json_fixture to authenticated;
do $$declare f record;begin
 select * into f from json_fixture;
 insert into auth.users(id) values(f.auth_id),(f.member_auth);
 insert into public.app_users(id,username,display_name,pin_hash,role,auth_user_id) values(f.hid||'-owner',f.hid||'-owner','JSON owner','AUTH_MANAGED','OWNER',f.auth_id),(f.hid||'-member',f.hid||'-member','JSON member','AUTH_MANAGED','MEMBER',f.member_auth);
 insert into public.households(id,name,created_by_id) values(f.hid,'JSON rollback fixture',f.hid||'-owner');
 insert into public.household_members(id,household_id,user_id,display_name,role) values(f.hid||'-mem',f.hid,f.hid||'-member','JSON member','MEMBER');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_id,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$declare f record;payload jsonb;res jsonb;bad jsonb;begin
 select * into f from json_fixture;
 payload:=jsonb_build_object(
  'wallets',jsonb_build_array(jsonb_build_object('id',f.hid||'-wallet','household_id',f.hid,'name','Original cash','type','cash','currency','IDR','balance',99999999,'is_archived',false,'created_at',now(),'updated_at',now())),
  'categories','[]'::jsonb,
  'debts',jsonb_build_array(jsonb_build_object('id',f.hid||'-debt','household_id',f.hid,'type','debt','person_or_entity','Test loan','amount',1000,'remaining_amount',800,'created_at',now())),
  'transactions',jsonb_build_array(
   jsonb_build_object('id',f.hid||'-income','household_id',f.hid,'type','income','amount',1000,'destination_wallet_id',f.hid||'-wallet','added_by','Test','status','POSTED','effective_at',now(),'created_at',now(),'updated_at',now()),
   jsonb_build_object('id',f.hid||'-payment','household_id',f.hid,'type','expense','amount',200,'source_wallet_id',f.hid||'-wallet','debt_id',f.hid||'-debt','added_by','Test','status','POSTED','effective_at',now(),'created_at',now(),'updated_at',now())
  ),'labels',jsonb_build_array('Backup test')
 );
 res:=public.import_financial_backup(f.hid,payload);
 if (res->>'imported')::integer<>2 then raise exception 'Transactions missing';end if;
 if (select balance from public.wallets where id=f.hid||'-wallet')<>800 then raise exception 'Wrong rebuilt balance';end if;
 if (select remaining_amount from public.debts where id=f.hid||'-debt')<>800 then raise exception 'Historical payment applied twice';end if;
 if (select debt_id from public.transactions where id=f.hid||'-payment') is distinct from f.hid||'-debt' then raise exception 'Debt link lost';end if;
 update public.wallets set name='Current name' where id=f.hid||'-wallet';
 res:=public.import_financial_backup(f.hid,payload);
 if (res->>'imported')::integer<>0 or (res->>'skipped')::integer<>2 or (select name from public.wallets where id=f.hid||'-wallet')<>'Current name' or (select balance from public.wallets where id=f.hid||'-wallet')<>800 then raise exception 'Import not idempotent or overwrote live data';end if;
 bad:=jsonb_set(payload,'{transactions}',jsonb_build_array(
  jsonb_build_object('id',f.hid||'-new-before-failure','household_id',f.hid,'type','income','amount',77,'destination_wallet_id',f.hid||'-wallet','added_by','Test','status','POSTED','effective_at',now(),'created_at',now(),'updated_at',now()),
  jsonb_build_object('id',f.hid||'-invalid','household_id',f.hid,'type','expense','amount',99,'source_wallet_id','foreign-wallet','added_by','Test','status','POSTED','effective_at',now(),'created_at',now(),'updated_at',now())
 ));
 begin
  perform public.import_financial_backup(f.hid,bad);
  raise exception 'TEST_FAILURE: invalid import accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 if exists(select 1 from public.transactions where id=f.hid||'-new-before-failure') or (select balance from public.wallets where id=f.hid||'-wallet')<>800 then raise exception 'Partial import committed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.member_auth,'role','authenticated')::text,true);
 begin
  perform public.import_financial_backup(f.hid,payload);
  raise exception 'TEST_FAILURE: member import accepted';
 exception when others then if sqlerrm like 'TEST_FAILURE:%' then raise;end if;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.auth_id,'role','authenticated')::text,true);
 perform public.reset_monthly_balances(f.hid);
 -- Rebuild the same household from its real row-shaped backup, including reset audit.
 payload:=jsonb_build_object(
  'wallets',(select jsonb_agg(to_jsonb(w)) from public.wallets w where household_id=f.hid),
  'categories','[]'::jsonb,
  'debts',(select jsonb_agg(to_jsonb(d)) from public.debts d where household_id=f.hid),
  'transactions',(select jsonb_agg(to_jsonb(t)) from public.transactions t where household_id=f.hid),
  'labels',jsonb_build_array('Backup test')
 );
 delete from public.households where id=f.hid;
 insert into public.households(id,name,created_by_id) values(f.hid,'Restored fixture',f.hid||'-owner');
 res:=public.import_financial_backup(f.hid,payload);
 if (res->>'imported')::integer<>4 or (select balance from public.wallets where id=f.hid||'-wallet')<>0
 or not exists(select 1 from public.transactions where household_id=f.hid and id like 'tx-month-reset-%-checkpoint')
 or (select remaining_amount from public.debts where id=f.hid||'-debt')<>800 then raise exception 'Reset audit restore failed';end if;
end $$;
reset role;
rollback;
select 'PASS: JSON restore atomic; ledger rebuilt; debt link kept without double payment; duplicates skipped; live names preserved; foreign wallet rejected; member denied; fixtures rolled back' as result;
