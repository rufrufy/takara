import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {loadSource as load} from './test-source-loader.mjs';
const {parseFinancialExcel}=await load('src/lib/excelImporter.ts');
const {pushAllDataToSupabase,pullAllDataFromSupabase}=await load('src/lib/supabase.ts');
const bytes=readFileSync('Keuangan-Maruf-transactions-2026-11-10.xlsx');
const parsed=parseFinancialExcel(bytes,'hh-test');
assert.equal(parsed.success,true); assert.equal(parsed.transactions.length,74);
assert.deepEqual(parsed.transactions.map(t=>t.id),parseFinancialExcel(bytes,'hh-test').transactions.map(t=>t.id));
for(const t of parsed.transactions)for(const field of ['createdAt','updatedAt','effectiveAt'])assert.equal(new Date(t[field]).toISOString(),t[field]);
const database={};
globalThis.fetch=async(url,options)=>{
  const u=new URL(url),table=u.pathname.split('/').pop();
  if(table==='recompute_household_wallets')return new Response(JSON.stringify({success:true}),{status:200});
  if(table==='save_financial_transaction'){const {p_tx}=JSON.parse(options.body);database.transactions??=new Map();database.transactions.set(p_tx.id,p_tx);return new Response(JSON.stringify({success:true,id:p_tx.id}),{status:200});}
  if(options.method==='PATCH') {
    const id=u.searchParams.get('id').slice(3);
    Object.assign(database[table].get(id),JSON.parse(options.body));
    return new Response(null,{status:204});
  }
  if(options.method==='POST'){
    const rows=JSON.parse(options.body); database[table]??=new Map();
    for(const row of rows) database[table].set(row.id,row);
    return new Response(null,{status:201});
  }
  const offset=Number(u.searchParams.get('offset')||0);
  return new Response(JSON.stringify([...database[table]?.values()||[]].slice(offset,offset+500)));
};
const config={url:'https://test.supabase.co',anonKey:'sb_publishable_test'};
const state={currentUser:{id:parsed.household.createdById,role:"OWNER"},households:[parsed.household],activeHouseholdId:'hh-test',members:parsed.members,wallets:[...parsed.wallets, ...parsed.wallets],categories:parsed.categories,transactions:parsed.transactions,ledgerEntries:parsed.ledgerEntries};
{const result=await pushAllDataToSupabase(state,config);assert.equal(result.success,true,result.error);}
assert.equal((await pullAllDataFromSupabase(config,'hh-test')).data.transactions.length,74);
assert.equal((await pushAllDataToSupabase(state,config)).success,true);
assert.equal(database.transactions.size,74);
assert.equal(database.wallets.size,new Set(parsed.wallets.map(w=>w.id)).size);
console.log('PASS: 74 Excel records persisted and read back, ISO timestamps, repeat import without duplicates');
