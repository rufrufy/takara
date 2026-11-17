# Monthly balances and debt report filter

Settings → **Reset saldo per bulan** lets a household owner or admin select a month and year and close that period at zero, with at most one active reset per Jakarta calendar month. This is an explicit action with a wallet-by-wallet preview and confirmation, not an unattended scheduled reset.

`reset_monthly_balances` runs with the signed-in user's permissions and checks household membership plus the owner/admin role. It locks wallets in the same order as normal transaction saves, serializes concurrent reset calls, and adds balancing transactions. Positive and negative closing balances both reach zero at the end of the selected period. Later-month ledger activity remains intact, so the current wallet balance can remain positive or become negative. A zero-value checkpoint records the operation even when every wallet was already zero. Original transactions, receipts, debts, and installments remain intact.

The operation is atomic. A failure on any wallet rolls back the checkpoint and every adjustment. Its deterministic household/month identifier makes retries idempotent. Reset audit transactions cannot be edited or voided; an explicit rollback adds compensating ledger entries and a separate audit marker. Household deletion can still cascade its own records.

The checkpoint stores a snapshot of existing transaction IDs for that month. Monthly counters exclude those IDs and administrative reset entries. Newly recorded transactions count even if backdated or created while another user was resetting. Wallet balances always come from their ledger; a legitimate zero is never replaced with historical income minus expenses.

Reports default to activity since that month's reset. Uncheck **Hitungan sejak reset saldo** to inspect the entire month. **Sembunyikan cicilan utang** excludes linked outgoing debt payments and recognized legacy installment categories from totals, charts, category/label/member breakdowns, and analysis. Receivable payments and unrelated ordinary expenses remain included. This filter does not change records or actual wallet balances.

Validation:

- `scripts/test-monthly-balance-reset.sql` ran on Supabase inside a rolled-back transaction: positive/negative/zero wallets, injected mid-write failure, history preservation, snapshot, retry idempotency, new backdated activity, immutable audit, member/foreign-household rejection. No real household was reset.
- `scripts/test-monthly-balance.mjs`: Jakarta month boundaries, full-month versus post-reset activity, invalid/voided records, debt classification and receivable preservation.
- Existing Supabase, datetime/report, and transaction cancellation checks pass; TypeScript and production build pass.
- Live browser checks verified the reset preview without submitting it, debt-filter totals, and the colored mobile screens. All temporary SQL fixtures were rolled back.

The Supabase security advisor showed only existing notices for [legacy server-only receipt tables without client policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and the [disabled leaked-password protection setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no new table or RLS policy was introduced by this change.

The two-argument RPC accepts a first-of-month date, rejects future periods, and posts historical adjustments at the last instant of the selected Jakarta month. The one-argument RPC remains compatible with older clients and selects the current Jakarta month. Period closures must be chronological: a month earlier than an existing later active reset is rejected, while retrying an already-closed month remains idempotent. The UI previews both closing balances and resulting current balances and previews rollback when the selected period has an active reset.

`scripts/test-period-balance-reset.sql` passed on Supabase with all writes rolled back: selected historical closing balances reach zero, later income/expense survive, the UTC/Jakarta month boundary is correct, invalid/future/out-of-order periods are rejected, and the next chronological period can close. Existing reset and JSON-backup database regressions also pass.

## Rollback

Choose the period with an active reset and click **Tinjau rollback**, then confirm. Only household owners/admins can execute it. Rollback reverses the exact ledger adjustments for that reset and restores monthly counters without removing its checkpoint or any ordinary transaction. Later activity stays intact. If more than one period is closed, roll back the latest active period first. A period can be reset again after rollback; each cycle receives a new ID.

`rollback_monthly_balance_reset` identifies the exact checkpoint, locks wallets consistently with other writes, and commits inverse entries plus its rollback marker atomically. Repeating a rollback is idempotent. A delayed retry against an older cycle cannot roll back a newly created reset. Receipt references and remaining debts are unaffected.

Validation: `scripts/test-balance-rollback.sql` passed on Supabase with temporary fixtures rolled back, covering positive/negative wallets, later activity, reverse ordering, retries, new reset cycles, stale retries, injected mid-write failure, preserved original records and member/foreign-household denial. `scripts/test-json-rollback-restore.sql` also passed: JSON restore reconstructs all original/reset/inverse/rollback records with the correct balance, and retry skips all records. Helper tests confirm counters recover and inactive checkpoints are ignored. Mobile preview/cancel was checked at 390px and 320px using the real component with isolated sample data; no real user reset or rollback was executed.
