import type {AppState,Wallet,Category,DebtItem,FinancialTransaction,ExcelImportSummary} from '../types';

export interface FinancialBackup {
 format:'takara-financial-backup';version:1;exportedAt:string;
 household:{id:string;name:string};wallets:Wallet[];categories:Category[];
 transactions:FinancialTransaction[];debts:DebtItem[];labels:string[];
}
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Struktur cadangan JSON tidak valid.');return v as Record<string,unknown>;};
const text=(v:unknown,f:string,optional=false):string|undefined=>{if(optional&&(v===undefined||v===null))return undefined;if(typeof v!=='string'||(!optional&&!v.trim()))throw Error(`${f} pada cadangan tidak valid.`);return v;};
const date=(v:unknown,f:string)=>{const s=text(v,f)!;if(!Number.isFinite(Date.parse(s)))throw Error(`${f} pada cadangan tidak valid.`);return new Date(s).toISOString();};
const money=(v:unknown,f:string)=>{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)throw Error(`${f} harus berupa rupiah bulat positif atau nol.`);return v;};
const choice=<T extends string>(v:unknown,choices:readonly T[],f:string):T=>{if(!choices.includes(v as T))throw Error(`${f} pada cadangan tidak valid.`);return v as T;};

export function parseFinancialBackup(contents:string,householdId:string):FinancialBackup {
 let value:unknown;try{value=JSON.parse(contents.replace(/^\uFEFF/,''));}catch{throw Error('File JSON tidak dapat dibaca. Pilih file cadangan hasil ekspor Takara.');}
 const root=record(value);
 const modern=root.format==='takara-financial-backup';
 if(modern&&root.version!==1)throw Error('Versi cadangan JSON belum didukung.');
 const household=modern?record(root.household):Array.isArray(root.households)?root.households.map(record).find(h=>h.id===householdId):undefined;
 if(!household||household.id!==householdId)throw Error('Cadangan berasal dari household berbeda. Pindah ke household asal sebelum mengimpor.');
 const rows=(key:string,optional=false)=>{
  const list=root[key];if(optional&&list===undefined)return [];
  if(!Array.isArray(list)||list.length>10000)throw Error(`Daftar ${key} pada cadangan tidak valid atau terlalu besar.`);
  const scoped=list.map(record).filter(r=>{if(modern&&r.householdId!==householdId)throw Error('Data cadangan berisi household berbeda.');return r.householdId===householdId;});
  const ids=new Set<string>();for(const row of scoped){const id=text(row.id,'ID')!;if(id.length>300||ids.has(id))throw Error(`ID ${key} kosong atau duplikat.`);ids.add(id);}
  return scoped;
 };
 const optional=(r:Record<string,unknown>,key:string)=>text(r[key],key,true);
 const wallets:Wallet[]=rows('wallets').map(r=>({id:text(r.id,'ID dompet')!,householdId,name:text(r.name,'Nama dompet')!,type:choice(r.type,['cash','checking','digital','custom'],'Jenis dompet'),currency:'IDR',balance:0,isArchived:r.isArchived===true,color:optional(r,'color'),icon:optional(r,'icon'),institutionName:optional(r,'institutionName'),createdAt:date(r.createdAt,'Tanggal dompet'),updatedAt:date(r.updatedAt||r.createdAt,'Tanggal dompet')}));
 const categories:Category[]=rows('categories').map(r=>({id:text(r.id,'ID kategori')!,householdId,name:text(r.name,'Nama kategori')!,type:choice(r.type,['income','expense','transfer'],'Jenis kategori'),icon:optional(r,'icon'),color:optional(r,'color'),isArchived:r.isArchived===true}));
 const debts:DebtItem[]=rows('debts',true).map(r=>({id:text(r.id,'ID utang')!,householdId,type:choice(r.type,['debt','receivable'],'Jenis utang'),personOrEntity:text(r.personOrEntity,'Nama utang')!,amount:money(r.amount,'Nominal utang'),remainingAmount:money(r.remainingAmount,'Sisa utang'),monthlyInstallment:r.monthlyInstallment===undefined?undefined:money(r.monthlyInstallment,'Cicilan'),dueDay:r.dueDay===undefined?undefined:money(r.dueDay,'Tanggal jatuh tempo'),dueDate:optional(r,'dueDate'),notes:optional(r,'notes'),isSettled:r.isSettled===true,isPaidThisMonth:r.isPaidThisMonth===true,lastPaidMonth:optional(r,'lastPaidMonth'),createdAt:date(r.createdAt,'Tanggal utang')}));
 const transactions:FinancialTransaction[]=rows('transactions').map(r=>({
  id:text(r.id,'ID transaksi')!,householdId,type:choice(r.type,['income','expense','transfer','opening_balance'],'Jenis transaksi'),amount:money(r.amount,'Nominal transaksi'),fee:r.fee===undefined?0:money(r.fee,'Biaya'),
  sourceWalletId:optional(r,'sourceWalletId'),destinationWalletId:optional(r,'destinationWalletId'),categoryId:optional(r,'categoryId'),categoryName:optional(r,'categoryName'),debtId:optional(r,'debtId'),
  categoryType:r.categoryType==null?undefined:choice<'income'|'expense'>(r.categoryType,['income','expense'],'Tipe kategori'),label:optional(r,'label'),description:optional(r,'description'),notes:optional(r,'notes'),imageUrl:optional(r,'imageUrl'),
  effectiveAt:date(r.effectiveAt,'Tanggal transaksi'),dateStr:optional(r,'dateStr'),day:optional(r,'day'),time:optional(r,'time'),sourceAsset:optional(r,'sourceAsset'),destinationAsset:optional(r,'destinationAsset'),sourceAssetType:optional(r,'sourceAssetType'),addedBy:text(r.addedBy||'Impor JSON','Pencatat')!,
  autoIncome:r.autoIncome===true,fromSavings:r.fromSavings===true,fromInvestment:r.fromInvestment===true,status:choice(r.status||'POSTED',['POSTED','VOIDED'],'Status transaksi'),createdAt:date(r.createdAt||r.effectiveAt,'Tanggal pembuatan'),updatedAt:date(r.updatedAt||r.createdAt||r.effectiveAt,'Tanggal perubahan')
 }));
 const walletIds=new Set(wallets.map(w=>w.id)),categoryIds=new Set(categories.map(c=>c.id)),debtIds=new Set(debts.map(d=>d.id));
 for(const tx of transactions){
  if([tx.sourceWalletId,tx.destinationWalletId].some(id=>id&&!walletIds.has(id))||tx.categoryId&&!categoryIds.has(tx.categoryId)||tx.debtId&&!debtIds.has(tx.debtId))throw Error('Referensi dompet, kategori, atau utang pada cadangan tidak lengkap.');
  if(tx.type==='transfer'&&(!tx.sourceWalletId||!tx.destinationWalletId||tx.sourceWalletId===tx.destinationWalletId))throw Error('Dompet transfer pada cadangan tidak valid.');
  if(tx.imageUrl?.startsWith('supabase-storage://')&&!tx.imageUrl.startsWith(`supabase-storage://receipts/${householdId}/`))throw Error('Lampiran berasal dari household berbeda.');
 }
 const labels=Array.isArray(root.labels)?[...new Set(root.labels.map(v=>text(v,'Label')!))]:[];
 if(labels.some(l=>l.length>100))throw Error('Label pada cadangan terlalu panjang.');
 return {format:'takara-financial-backup',version:1,exportedAt:typeof root.exportedAt==='string'?root.exportedAt:new Date().toISOString(),household:{id:householdId,name:text(household.name,'Nama household')!},wallets,categories,debts,transactions,labels};
}

export function createFinancialBackup(state:AppState):FinancialBackup {
 const household=state.households.find(h=>h.id===state.activeHouseholdId);if(!household)throw Error('Household belum dimuat.');
 const scoped=<T extends {householdId:string}>(rows:T[])=>rows.filter(r=>r.householdId===household.id);
 const backup=parseFinancialBackup(JSON.stringify({format:'takara-financial-backup',version:1,exportedAt:new Date().toISOString(),household,wallets:scoped(state.wallets),categories:scoped(state.categories),transactions:scoped(state.transactions),debts:scoped(state.debts||[]),labels:state.labels}),household.id);
 backup.wallets=backup.wallets.map(w=>({...w,balance:state.wallets.find(original=>original.id===w.id)!.balance}));
 return backup;
}
export function backupSummary(backup:FinancialBackup):ExcelImportSummary {
 const posted=backup.transactions.filter(t=>t.status==='POSTED'&&!t.id.startsWith('tx-month-reset-'));
 const income=posted.filter(t=>t.type==='income'),expense=posted.filter(t=>t.type==='expense');
 const totalIncome=income.reduce((n,t)=>n+t.amount,0),totalExpenses=expense.reduce((n,t)=>n+t.amount,0);
 return {householdName:backup.household.name,exportedOn:backup.exportedAt,currency:'IDR',totalTransactions:backup.transactions.length,incomeCount:income.length,expenseCount:expense.length,transferCount:posted.filter(t=>t.type==='transfer').length,totalIncome,totalExpenses,netBalance:totalIncome-totalExpenses,topCategories:[]};
}
