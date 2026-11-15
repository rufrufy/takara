import type {FinancialTransaction} from '../types';
import {jakartaDateTime} from './dateTime';
export function transactionsForMonth(transactions:FinancialTransaction[],year:number,month:number):FinancialTransaction[] {
  const prefix=String(year)+'-'+String(month).padStart(2,'0');
  return transactions.filter(tx=>{
    if(tx.status==='VOIDED')return false;
    try{return jakartaDateTime(tx.effectiveAt).date.startsWith(prefix);}catch{return false;}
  });
}
