import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import assert from 'node:assert/strict';
const dateSource=stripTypeScriptTypes(fs.readFileSync('src/lib/dateTime.ts','utf8'));const {jakartaDateTime}=await import('data:text/javascript;base64,'+Buffer.from(dateSource).toString('base64'));
const source=fs.readFileSync('src/context/AppContext.tsx','utf8');const a=source.indexOf('  const clearCurrentMonthTransactions ='),b=source.indexOf('  const editTransaction =',a);assert(a>=0&&b>a);
const body=stripTypeScriptTypes(source.slice(a,b));
const month=jakartaDateTime(new Date().toISOString()).date.slice(0,7),at=month+'-15T10:00:00+07:00';
async function run(failAt){
 const transactions=[1,2,3].map(n=>({id:'t'+n,householdId:'hh',type:'expense',status:'POSTED',sourceWalletId:'w',amount:100,effectiveAt:at,createdAt:at}));
 const ledger=[{id:'open',walletId:'w',transactionId:'opening',signedAmount:1000},...transactions.map(tx=>({id:'l'+tx.id,walletId:'w',transactionId:tx.id,signedAmount:-100}))];
 let current={currentUser:{id:'u'},activeHouseholdId:'hh',transactions:structuredClone(transactions),ledgerEntries:structuredClone(ledger),wallets:[{id:'w',balance:700}],supabaseConfig:{}};
 const database=structuredClone(current);let writes=0,sets=0;const statuses=[];
 const save=async tx=>{writes++;if(writes===1)assert.equal(sets,0,'no local change before confirmed server write');if(writes===failAt)return {success:false,error:'controlled failure'};database.transactions=database.transactions.map(t=>t.id===tx.id?tx:t);database.ledgerEntries=database.ledgerEntries.filter(l=>l.transactionId!==tx.id);database.wallets[0].balance=database.ledgerEntries.reduce((n,l)=>n+l.signedAmount,0);return {success:true};};
 const invoke=new Function('state','jakartaDateTime','isDebtOpeningTransaction','setSupabaseSyncStatus','syncTransactionToSupabase','financialVersion','setState','pullAllDataFromSupabase',body+';return clearCurrentMonthTransactions();');
 const result=await invoke(current,jakartaDateTime,()=>false,x=>statuses.push(x),save,{current:0},fn=>{sets++;current=fn(current);},async()=>({success:true,data:structuredClone(database)}));
 return {result,writes,current,statuses};
}
const first=await run(1);assert.equal(first.result.success,false);assert.equal(first.result.count,0);assert(first.current.transactions.every(t=>t.status==='POSTED'));
const partial=await run(2);assert.equal(partial.result.success,false);assert.equal(partial.result.count,1);assert.equal(partial.writes,2);assert.match(partial.result.error,/1 dari 3/);assert.deepEqual(partial.current.transactions.map(t=>t.status),['VOIDED','POSTED','POSTED']);assert.equal(partial.current.wallets[0].balance,800);
const all=await run(99);assert.equal(all.result.success,true);assert.equal(all.result.count,3);assert.equal(all.current.transactions.length,3,'audit rows retained');assert(all.current.transactions.every(t=>t.status==='VOIDED'));assert.equal(all.current.wallets[0].balance,1000);assert.equal(all.current.ledgerEntries.length,1);
console.log('PASS: month reset waits for authenticated RPC confirmation, preserves audit, reports partial commit counts, reloads balances, and never clears failed writes locally');
