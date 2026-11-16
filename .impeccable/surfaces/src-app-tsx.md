---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/index.css","src/components/BottomNav.tsx","src/components/Header.tsx","src/components/views/HomeView.tsx","src/components/views/FinancialProfileView.tsx"]
---

# Takara mobile application
Mode: Operate. Preserve authorized finance, account, category, report, authentication, and storage behavior.

## Direction contract
THESIS: Catatan Harian makes daily household activity the working area while balance is immediately legible. Avoid nested dashboard cards, promotional badges, and decorative AI motifs.
OWN-WORLD: Predominantly white and pale cyan glass (#FFFFFF, #F4FBFD, #EDF9FB), dark navy balance (#073B4C), and pinned Tropical accents: mint #06D6A0, teal #1B9AAA, pink #EF476F, yellow #FFD166. Preserve full rounding and translucent materials without monotone green. Native Apple SF system stack with native platform fallbacks; no proprietary font download.
STORY: The user signs in with finances loaded, checks balance, finds transactions, records or edits an entry, scans a receipt, and sees wallets update from Supabase.
FIRST VIEWPORT: Compact brand/household header, dark navy balance with mint Catat action and inline income/expense, quiet wallet strip, then Catatan Harian with an accessible camera scan button beside the heading. Search, disclosure filter, date-grouped rows, and floating five-item white/cyan glass dock remain. A 56px icon-only floating plus appears on Beranda, Transaksi, and Dompet. Sheets preserve the same rounded material language.
FORM: The historical image-2 Catatan Harian comp at .impeccable/mocks/decision/activity.png established composition, then user refinements superseded its sage colors and font. Use live household amounts. Wallet Aset/Utang/Pemasukan tabs have three equal minmax(0,1fr) columns, min-width:0, nonshrinking icons, vertical labels/counts, 13px labels, 11px counts, and 76px minimum height. Selected tabs use white, pink, and yellow tints. Preserve exact saved category backgrounds and contrasting icons.
FINISH: Source, type/build, static contrast, and real application-module integration checks are evidence only for their respective scopes. Fresh captures now cover Home, desktop, admin login, and 320px wallet tabs without overlap. Historical sage screenshots are reference only; the earlier pixel-comparison gate remains open.

Supabase Auth is live with ten migrated real profiles. Private receipt storage is active for authorized household members, with VIEWER read-only and other households/anonymous denied. No missing-admin-key blocker remains. Operational status is documented in docs/supabase-auth-status.md. Browser form validation confirmed private receipt upload, loading state, confirmed save, new transaction visibility, and wallet update.
