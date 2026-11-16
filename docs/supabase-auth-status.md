# Supabase Auth, receipts, and persistence

The live project now uses standard Supabase Auth for the existing accounts. Ten real profiles were migrated through the official Auth Admin API and linked through `app_users.auth_user_id`. Legacy plaintext PIN fields contain `AUTH_MANAGED`; the client does not read or persist PINs. Existing accounts retain the PIN that was actually saved in Supabase before migration.

## Private receipt uploads

The private `receipts` bucket permits images/PDFs up to 10 MB. Uploads require a verified Auth session and write access to the household, under `householdId/authUserId/random.ext`. Household members can read private files through short-lived signed URLs; other households and anonymous callers are denied. VIEWER membership grants reading only. Transaction rows store a storage reference, never temporary signed URLs or local Base64 fallbacks.

Live tests exercised the actual application auth, attachment, and persistence modules: upload, signed download, shared member reading after login, foreign-household denial, transaction attachment readback, idempotent retries, edits, and wallet/ledger reconciliation. The same upload flow was subsequently tested through the browser form: loading appeared, a private file reference was persisted with one ledger entry, the transaction appeared on Home, and the wallet updated.

## Saves and PIN changes

Financial mutations await Supabase confirmation before reporting success. Transaction, ledger, wallet balance, and installment debt updates use atomic RPCs. Monthly resets void audit records through authenticated writes and report partial failures accurately. Debounced household refresh and focus/visibility refresh keep shared data current without replacing a visible balance with zero.

Changing a PIN requires the current PIN, updates Supabase Auth on the server, and renews the session. The live test verified that the old PIN fails and the new PIN works after logout/login. A PIN change made by the former local-only implementation cannot be recovered if it never reached Supabase: use the previously persisted PIN, then change it again, or use the authorized admin reset flow.

## Deployment

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the server environment. Never prefix the secret key with `VITE_` or commit it. The Vite development server and Bun production server share `server/auth.ts`; restart the server after updating account endpoints or environment values. Legacy local JSON account endpoints return 410.

Applied SQL is recorded in `scripts/secure-household-auth.sql` and `scripts/preserve-membership-and-atomic-void.sql`; run in that order on a new environment after the base schema/mapping. Do not rerun the account migration to reset credentials. The migration skips already linked accounts and disposable legacy test accounts.

AI scan server configuration uses `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL`; browser settings are a per-device fallback. Existing local credentials remain in the ignored `.env`.

## UI validation limits

The current Tropical palette, SF system font stack, mobile wallet tab layout, icon-only floating action, and scan action were checked in source, by type/build checks and contrast calculations. Current browser checks covered Home, reports, wallet tabs at 320px (no tab/content overflow), desktop at 1280px, and admin login. Evidence is retained locally under `.impeccable/review/tropical-*.jpg`. Prior sage-palette screenshots and the earlier open image-comparison gate do not prove the new palette's rendered appearance. SF Pro is supplied natively on Apple platforms; other platforms use their system fallback unless a separately licensed font is provided.
