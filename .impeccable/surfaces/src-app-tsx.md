---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/index.css","src/components/BottomNav.tsx","src/components/Header.tsx","src/components/views/HomeView.tsx"]
---

# Takara mobile application
Mode: Operate. Whole-app mobile redesign; preserve all authorized finance/account/category/report changes.

## Direction contract
THESIS: Catatan Harian makes daily household activity the working area while balance is immediately legible. Avoid nested dashboard cards, promotional badges, and decorative AI motifs.
OWN-WORLD: Warm white #F1F6F1, soft sage glass #DAEBCD, muted leaf #8FB27F, dark forest #193727. Rounded translucent surfaces, consistent outlined icons, 44px controls, restrained refractive edges. One readable sans family.
STORY: The user signs in with finances already loaded, checks balance, finds transactions, records or edits an entry, and sees wallets update from Supabase.
FIRST VIEWPORT: At 390x844, compact brand/household header, shallow balance panel with Catat action and inline income/expense. A quiet wallet strip precedes Catatan Harian. Search with disclosure filter, date-grouped transaction rows, and a floating five-item rounded glass bottom dock. Sheets share the same rounded visual language.
FORM: User chose image 2, Catatan Harian, over assigned candidate5 from seed f41ff5ca. Approved comp .impeccable/mocks/decision/activity.png; text/numbers are live household data, never hardcoded demo balances. Keep airy density, readable amounts, and soft green/white liquid glass as explicit user commitments.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Auth migration remains blocked on the missing server-only Supabase Admin API key. Do not claim uploads active. Push to GitHub after completed authorized deliverables and disclose any remaining blocker.
