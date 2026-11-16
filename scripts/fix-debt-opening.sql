-- Reversible correction: retain the historical row for audit, exclude it from posted activity.
-- Initial debt exists in debts and has no wallet movement. Installments remain posted.
update public.transactions
set status='VOIDED', updated_at=now()
where id='tx-debt-12d51b71-93b8-46f7-ad0a-274b2218522a'
  and household_id='hh-maruf' and type='opening_balance'
  and source_wallet_id is null and destination_wallet_id is null
  and not exists(select 1 from public.ledger_entries le where le.transaction_id=transactions.id);
