# Supabase storage and authentication

Financial records, wallet balances, categories and household membership are persisted in Supabase. The application waits for household data before showing the balance after login. Local application/session metadata is not the authoritative financial database.

The private `receipts` bucket exists with a 10 MB limit. The upload client uses standard Supabase Auth and stores a storage reference in the transaction, then requests a short-lived signed URL to display it. Upload failures never silently turn into locally stored images.

## Pending activation

Receipt uploads are **not yet active**. The main account login still uses the existing application PIN flow. Supabase Auth account migration and household access policies must be completed before enabling private uploads.

1. Set `SUPABASE_SERVICE_ROLE_KEY` in the server `.env`; never use a `VITE_` prefix for this key and never commit it.
2. Use the official Auth Admin API migration in `scripts/migrate-supabase-auth.mjs` after the mapping migration. For Node, load the environment explicitly, for example `node --env-file=.env scripts/migrate-supabase-auth.mjs`.
3. Complete the application's standard Auth login/session lifecycle and secure household membership/account management. Existing permissive legacy database policies must be replaced before treating household membership as trusted authorization for private files.
4. Add authenticated Storage access policies scoped to the verified household and Auth identity. Verify separate household isolation, shared member access, logout/relogin, and revoked membership before enabling uploads.

Creating Auth users alone does not complete this activation. Do not deploy an anonymous endpoint with elevated access as a workaround.

## AI model configuration

The scan server reads `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` from the server environment. Settings-based client configuration is a browser-specific fallback. The embedded fallback API credential has been removed from source; configure deployments with server environment variables. The local existing credential was moved into the ignored `.env` file.

## Validation

The local checks cover Supabase reads/writes and pagination, repeatable Excel import, category type/household selection, Jakarta date/time and report periods, and authenticated attachment behavior. The attachment checks use mocks and do not mean the pending live Auth setup is enabled.
