import type {Category,TransactionType} from '../types';
export function selectTransactionCategory(categories:Category[],householdId:string,type:TransactionType,currentId?:string):Category|undefined {
  if(type!=='income'&&type!=='expense')return undefined;
  const matching=categories.filter(c=>c.householdId===householdId&&c.type===type&&!c.isArchived);
  return matching.find(c=>c.id===currentId)||matching[0];
}
