/** Initial liabilities are debt records, never household cash movement. */
export function isDebtOpeningTransaction(transaction: {
  id?: string;
  type?: string;
  categoryName?: string;
  description?: string;
}): boolean {
  return transaction.type === 'opening_balance' && (
    /^tx-debt-/i.test(transaction.id || '') ||
    /pencatatan.*(?:utang|hutang|piutang)/i.test(transaction.categoryName || '') ||
    /^(?:utang|hutang|piutang)\s*:/i.test(transaction.description || '')
  );
}
