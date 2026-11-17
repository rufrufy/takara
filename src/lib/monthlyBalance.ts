import type {FinancialTransaction,Wallet,LedgerEntry} from '../types';
import {jakartaDateTime} from './dateTime';

export const isBalanceReset = (tx: Pick<FinancialTransaction,'id'>) => tx.id.startsWith('tx-month-reset-');
export function activeResetCheckpoints(transactions:FinancialTransaction[]){
  const rolledBack=new Set(transactions.filter(tx=>tx.status==='POSTED'&&isBalanceReset(tx)&&tx.id.endsWith('-rollback')).map(tx=>tx.id.replace(/-rollback$/,'-checkpoint')));
  return transactions.filter(tx=>tx.status==='POSTED'&&isBalanceReset(tx)&&tx.id.endsWith('-checkpoint')&&!rolledBack.has(tx.id)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
export function monthlyRollbackPreview(wallets:Wallet[],ledgers:LedgerEntry[],transactions:FinancialTransaction[],checkpointId:string){
  const prefix=checkpointId.replace(/-checkpoint$/,'');
  const posted=new Set(transactions.filter(tx=>tx.status==='POSTED').map(tx=>tx.id));
  const reversal=new Map<string,number>();
  for(const entry of ledgers){
    if(posted.has(entry.transactionId)&&entry.transactionId===prefix+'-'+entry.walletId)reversal.set(entry.walletId,(reversal.get(entry.walletId)||0)-entry.signedAmount);
  }
  return wallets.map(wallet=>({...wallet,rollbackChange:reversal.get(wallet.id)||0,balanceAfterRollback:wallet.balance+(reversal.get(wallet.id)||0)}));
}
export function monthlyResetPreview(wallets:Wallet[],ledgers:LedgerEntry[],transactions:FinancialTransaction[],year:number,month:number){
  const end=Date.UTC(year,month,1)-7*60*60*1000;
  const posted=new Set(transactions.filter(tx=>tx.status==='POSTED').map(tx=>tx.id));
  const balances=new Map<string,number>();
  for(const entry of ledgers){
    if(posted.has(entry.transactionId)&&Date.parse(entry.postedAt)<end)balances.set(entry.walletId,(balances.get(entry.walletId)||0)+entry.signedAmount);
  }
  return wallets.map(wallet=>({...wallet,closingBalance:balances.get(wallet.id)||0,balanceAfterReset:wallet.balance-(balances.get(wallet.id)||0)}));
}
export function monthlyResetCheckpoint(transactions: FinancialTransaction[], year: number, month: number) {
  const period = `${year}-${String(month).padStart(2,'0')}`;
  return activeResetCheckpoints(transactions).find(tx => {
    if(tx.status!=='POSTED'||!isBalanceReset(tx)||!tx.id.endsWith('-checkpoint'))return false;
    try{return jakartaDateTime(tx.effectiveAt).date.startsWith(period);}catch{return false;}
  });
}
export function monthlyActivity(transactions: FinancialTransaction[], year: number, month: number, sinceReset = true) {
  const period = `${year}-${String(month).padStart(2,'0')}`;
  const checkpoint = sinceReset ? monthlyResetCheckpoint(transactions, year, month) : undefined;
  let excludedIds: Set<string> | undefined;
  if(checkpoint?.notes)try{
    const snapshot=JSON.parse(checkpoint.notes);
    if(Array.isArray(snapshot.excludedTransactionIds))excludedIds=new Set(snapshot.excludedTransactionIds);
  }catch{/* Older checkpoints use their recorded time. */}
  return transactions.filter(tx => {
    if (tx.status === 'VOIDED' || isBalanceReset(tx)) return false;
    try {
      return jakartaDateTime(tx.effectiveAt).date.startsWith(period) && (!checkpoint || (excludedIds ? !excludedIds.has(tx.id) : Date.parse(tx.createdAt) > Date.parse(checkpoint.createdAt)));
    } catch { return false; }
  });
}
export function isDebtInstallmentExpense(tx: FinancialTransaction) {
  if (tx.type !== 'expense') return false;
  if (tx.debtId || tx.id.startsWith('tx-payment-')) return true;
  const category = (tx.categoryName || '').trim().toLocaleLowerCase('id').replace(/\s+/g,' ');
  return /^(?:cicilan|angsuran)(?:\s*(?:&|dan|\/)?\s*(?:utang|hutang))?$/.test(category) || /^(?:pembayaran |bayar )?(?:utang|hutang)$/.test(category);
}
