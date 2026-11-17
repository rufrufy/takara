import type {FinancialTransaction} from '../types';
import {jakartaDateTime} from './dateTime';

export const isBalanceReset = (tx: Pick<FinancialTransaction,'id'>) => tx.id.startsWith('tx-month-reset-');
export function monthlyResetCheckpoint(transactions: FinancialTransaction[], year: number, month: number) {
  const period = `${year}-${String(month).padStart(2,'0')}`;
  return transactions.find(tx => {
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
