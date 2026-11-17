# JSON financial backups

**Setelan → Impor Excel / JSON** accepts `.xlsx`, `.xls`, and `.json`. JSON backups are restricted to the original active household, with a 20 MB file limit and at most 10,000 records per collection. Restore requires the household owner or an admin. Existing records are skipped by ID, preserving their current edits and avoiding duplicates; missing records are added.

New exports use `format: "takara-financial-backup"`, `version: 1` and contain only that household's wallets, categories, transactions, debts and labels. Credentials, sessions, users, memberships and system settings are excluded. The importer also accepts the previous whole-AppState JSON export, selects the active household and ignores account/settings fields. It validates numeric amounts, dates, IDs, references and receipt household paths before writing.

The signed-in Supabase RPC `import_financial_backup` performs the entire financial restore in one database transaction with household authorization and RLS. It preserves VOIDED status and reset checkpoints, rebuilds ledgers through the existing transaction RPC, and recalculates wallet balances. Stored wallet snapshots and client ledger snapshots cannot override balances. Debt snapshots already include historic payments, so restored payment links do not charge the debt again. Existing debt records remain unchanged.

After commit, the application reads transactions, wallets, categories, debts and labels from Supabase and checks every imported ID before showing success. A failed read-back can be retried without duplicating records. Older inline receipt images are uploaded to private receipt storage before their new transaction is imported. Existing storage references remain references: JSON does not contain copies of the private storage files and cannot restore a file that was separately deleted from storage.

Validation:

- `node scripts/test-json-backup.mjs`: new and legacy roundtrips, secret exclusion, validation and cross-household rejection.
- `scripts/test-json-backup.sql`: ran against Supabase in a rolled-back transaction; atomic failure, rebuilt balances, duplicate skipping, preserved edits, debt links without double payments, member rejection, and full restoration including monthly reset audit. No real financial records were imported during testing.
- Browser file chooser accepted JSON and rejected an unsupported backup version before writes. Mobile import dialog reviewed at 390px.
- Existing Supabase regression tests, TypeScript and production build pass. Security advisor results match the existing notices documented in `monthly-balance-reset.md`.

Rollback audit is supported too: zero-value rollback markers are restored without synthetic wallet ledger entries. Original reset adjustments and their exact inverses remain recorded, allowing monthly counters to recognize a rolled-back reset after restore. `scripts/test-json-rollback-restore.sql` verifies the six-record restore and idempotent retry inside a rolled-back database transaction.
