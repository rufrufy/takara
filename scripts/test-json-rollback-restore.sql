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
do $$declare f record;payload jsonb;r jsonb;prefix text;begin
 select * into f from reset_fixture;prefix:='tx-month-reset-'||md5(f.hid)||'-2001-11';
 payload:=jsonb_build_object('wallets',jsonb_build_array(jsonb_build_object('id',f.hid||'-restored-wallet','household_id',f.hid,'name','Restored','type','cash','currency','IDR','balance',0,'created_at',now(),'updated_at',now())),
 'categories','[]'::jsonb,'debts','[]'::jsonb,'labels','[]'::jsonb,
 'transactions',jsonb_build_array(
  jsonb_build_object('id',f.hid||'-original-in','household_id',f.hid,'type','income','amount',1000,'destination_wallet_id',f.hid||'-restored-wallet','added_by','Test','status','POSTED','effective_at','2001-11-01T03:00:00Z','created_at',now(),'updated_at',now()),
  jsonb_build_object('id',f.hid||'-original-out','household_id',f.hid,'type','expense','amount',200,'source_wallet_id',f.hid||'-restored-wallet','added_by','Test','status','POSTED','effective_at','2001-11-02T03:00:00Z','created_at',now(),'updated_at',now()),
  jsonb_build_object('id',prefix||'-checkpoint','household_id',f.hid,'type','opening_balance','amount',0,'added_by','Test','status','POSTED','effective_at','2001-11-30T16:59:59Z','created_at',now(),'updated_at',now()),
  jsonb_build_object('id',prefix||'-'||f.hid||'-restored-wallet','household_id',f.hid,'type','expense','amount',800,'source_wallet_id',f.hid||'-restored-wallet','added_by','Test','status','POSTED','effective_at','2001-11-30T16:59:59Z','created_at',now(),'updated_at',now()),
  jsonb_build_object('id',prefix||'-undo-'||f.hid||'-restored-wallet','household_id',f.hid,'type','income','amount',800,'destination_wallet_id',f.hid||'-restored-wallet','added_by','Test','status','POSTED','effective_at','2001-11-30T16:59:59Z','created_at',now(),'updated_at',now()),
  jsonb_build_object('id',prefix||'-rollback','household_id',f.hid,'type','opening_balance','amount',0,'added_by','Test','status','POSTED','effective_at','2001-11-30T16:59:59Z','created_at',now(),'updated_at',now())
 ));
 r:=public.import_financial_backup(f.hid,payload);
 if (r->>'imported')::integer<>6 or (select balance from public.wallets where id=f.hid||'-restored-wallet')<>800 then raise exception 'Rollback backup failed to rebuild balance';end if;
 if not exists(select 1 from public.transactions where id=prefix||'-rollback') then raise exception 'Rollback marker was lost';end if;
 r:=public.import_financial_backup(f.hid,payload);
 if (r->>'imported')::integer<>0 or (r->>'skipped')::integer<>6 then raise exception 'Rollback restore is not idempotent';end if;
end $$;
reset role;
rollback;
select 'PASS: JSON restores original transactions, reset, exact inverse, and rollback marker; balance rebuilt correctly; repeated restore skips all six records; fixtures rolled back' as result;
