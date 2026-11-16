---
name: Takara — Tropical Green Paradise
description: Airy household finance with white/cyan glass, navy balance, and Tropical accents.
colors:
  canvas: "#FFFFFF"
  white: "#ffffff"
  ink: "#073B4C"
  muted: "#365664"
  leaf: "#B8F4E5"
  action: "#06D6A0"
  action-ink: "#073B4C"
  primary: "#073B4C"
  glass: "rgba(255,255,255,.86)"
  line: "#d9e9ee"
  active: "#d9f1f3"
  income: "#087A60"
  expense: "#c82e54"
  transfer: "#14737F"
  information: "#1B9AAA"
  highlight-pink: "#EF476F"
  highlight-yellow: "#FFD166"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "clamp(36px,7vw,60px)"
    fontWeight: 650
    lineHeight: 1.17
    letterSpacing: "-.04em"
  balance:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "clamp(24px,6.6vw,34px)"
    fontWeight: 700
    letterSpacing: "-.035em"
  wordmark:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-.04em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "23px"
    fontWeight: 650
    letterSpacing: "-.035em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: ".9375rem"
    lineHeight: 1.5
  transaction:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "12px"
  dock-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif"
    fontSize: "10px"
    fontWeight: 500
rounded:
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.6rem"
  3xl: "2rem"
  field: "18px"
  screen-card: "24px"
  screen-panel: "28px"
  balance: "30px"
  sheet: "32px"
  capsule: "999px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  gap: "12px"
  md: "16px"
  panel: "18px"
  lg: "24px"
  xl: "32px"
components:
  button-record:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.capsule}"
    padding: "10px 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.circle}"
    padding: "0"
    height: "56px"
    width: "56px"
  input:
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "44px"
  search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    padding: "0 17px"
    height: "48px"
  card:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.screen-card}"
    padding: "16px"
  chip:
    backgroundColor: "#e5f5f8"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    padding: "8px 14px"
  dock-active:
    backgroundColor: "{colors.active}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    height: "58px"
---

# Design System: Takara — Catatan Harian

## Overview

**Creative North Star: "Catatan Harian"**

An airy daily household ledger with predominantly white and pale cyan glass, a dark navy balance panel, and distinct Tropical accents. Fully rounded containers, readable financial amounts, and Lucide outline icons support everyday recording without nested dashboard cards.

The earlier image-2 sage composition is historical direction. Current source reflects the user's subsequent palette, native font, wallet navigation, recording, and receipt-scan refinements. Current browser captures verify the latest Home, admin login, desktop and 320px wallet layout; the earlier historical image-comparison gate at 59.2 remains open and is not claimed as pixel reproduction.

**Key Characteristics:**
- White/cyan translucent material with dark navy balance.
- Mint, teal, pink, and yellow accents with distinct roles.
- Rounded containers, capsule controls, and circular floating actions.
- Native system typography and tabular financial numerals.

## Colors

Frontmatter records current tokens; `src/index.css`, including its final overrides, is implementation authority. The pinned Tropical palette is mint `#06D6A0`, teal `#1B9AAA`, pink `#EF476F`, yellow `#FFD166`, and navy `#073B4C`.

### Primary
- **Action:** mint recording and welcome actions with navy text.
- **Primary / Ink:** navy text, committed buttons, and the balance panel. Balance figures are white; secondary text is `#C0E8F0`.
- **Active:** pale cyan selected dock fill.

### Secondary
- **Income:** dark mint text; income icons on the balance panel use bright mint.
- **Expense:** darker pink for semantic text, bright pink for highlights; outgoing balance icons use yellow.
- **Transfer / Information:** dark teal text and brighter teal accents. Yellow supports warning and admin emphasis.

### Neutral
- **Canvas / White:** white base, transitioning through `#F4FBFD` and `#EDF9FB` on the application canvas.
- **Glass:** translucent white surfaces; **Muted / Line** support secondary text and separation.

Preserve exact saved household category backgrounds and icons. Select contrasting navy or white icons by luminance. Keep signs, labels, and icons alongside financial color cues. Avoid making every surface green.

## Typography

Every role uses `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', sans-serif`. Apple supplies San Francisco natively; other platforms use their system fallback. No proprietary font file is bundled or downloaded.

Frontmatter records the hierarchy. The home heading becomes 27px and balance 40px at 640px; other screen headings use 25px/650. Home titles and amounts are 14px/600, with 12px metadata; below 360px titles become 13px and amounts 12px. Wallet tabs use 13px labels and a separate 11px count line. Dock captions are 10px. Use tabular numerals for financial amounts.

## Layout

Mobile is primary, with a 390×844 historical reference viewport. Header and home cap at 896px. Home uses 12px side gutters, increasing to 24px at 640px; related screens use 16px/24px gutters. A sticky header precedes the balance, wallet strip, and date-grouped feed. Search and disclosure filters precede the list. Home previews the latest 12 matching transactions; Transaksi exposes full history. Rows are at least 60px on mobile and 76px from 640px.

The five-destination floating dock uses viewport width minus 16px, caps at 560px, and sits 12px plus safe-area inset above the bottom. Content reserves 112px plus that inset. Desktop widens the same application. Wallet section navigation is three equal `minmax(0,1fr)` columns with `min-width:0`, vertical icon/label/count, nonshrinking icons, and 76px minimum height.

## Elevation & Depth

White/cyan glass combines blur, refractive white edges, and restrained shadows. Shared glass uses `0 8px 28px -18px #365c6940,inset 0 1px 0 #fff`. Balance uses `inset 0 1px 0 #ffffff26,0 10px 30px -22px #073b4c70`. Header blur is 20px; balance 16px; dock and entry sheet 24px; modal backdrops 5px. Dock saturation is 1.1. Larger shared overlays use `0 16px 50px -24px #2c4b5545`.

Navigation transitions take .2s ease. Reduced-motion preference disables animation and transitions. Global keyboard focus uses a 2px navy outline with 4px offset. Exact materials and snippets live in the sidecar.

## Shapes

Capsules define buttons, search, date labels, household switch, and dock. Circles define profile, scan, and floating recording controls. Shared cards use 24px/28px corners; balance uses 30px; entry sheets 32px with 8px exterior margin and maximum viewport height minus 16px. Inputs have 18px corners and at least 44px height. The floating plus action is exactly 56px square with 50% radius.

## Components

### Buttons
Home Scan is a mint capsule with navy text and a scan icon. A separate navy icon-only circular plus button, labelled `Tambah transaksi`, appears on Beranda, Transaksi, and Dompet. The plus opens the existing transaction sheet. The camera button beside Catatan Harian is labelled `Scan struk otomatis` and opens receipt scanning. Preserve visible keyboard focus.

### Chips
Date headings use pale cyan capsules and navy text. Filters retain expanded state and selected tint. Household selection truncates within a capsule with house icon and chevron.

### Cards / Containers
The dark navy balance contrasts with the light application canvas. Wallet, transaction, report, settings, and administration containers retain rounded glass. Shared summaries use pale cyan. Avoid redundant card containers around the home feed.

### Inputs / Fields
Shared fields use rounded light surfaces; home search is borderless inside a shared 28px rounded search-and-filter panel, with an outline only while focused. Authentication uses a white/cyan background, fields of at least 48px, and capsule controls. Preserve loading, error, retry, empty, selected, and focus states.

### Navigation
Five Lucide destinations remain Beranda, Transaksi, Dompet, Laporan, and Setelan. Dock icons are 23px at 1.65 stroke, with captions below. Active destination uses `aria-current="page"` and pale cyan fill. Wallet tabs are Aset, Utang, and Pemasukan, using `role="tab"` and `aria-selected`; selected fills are white, pink tint `#fff0f4`, and yellow tint `#fff3cf` respectively.

### Daily ledger and sheets
Date-grouped rows combine saved category-icon tiles, truncated descriptions, time/author metadata, and right-aligned tabular amounts. Rows open transaction detail. Data remains live Supabase household data; never hardcode reference balances.

The live product now uses Supabase Auth with ten migrated real profiles. Private receipt storage allows authorized household members and denies other households and anonymous callers; VIEWER members read only. Live application-module integration checks cover persistence and attachments. The browser form also passed an attachment upload and transaction save; operational detail lives in `docs/supabase-auth-status.md`.

## Do's and Don'ts

### Do:
- **Do** preserve the pinned Tropical palette, white/cyan base, dark balance, full rounding, and glass.
- **Do** keep amounts legible and reserve safe-area clearance for dock and floating action.
- **Do** preserve real data, category colors, accessible labels, and application states.

### Don't:
- **Don't** turn the interface into monotone green or restore the historical sage palette as authority.
- **Don't** bundle unlicensed SF Pro font files or claim identical platform font rendering.
- **Don't** describe historical screenshots, static checks, or integration checks as a fresh rendered visual pass.

The final admin keypad uses white numbered keys with navy text, pink clear/delete keys, pale yellow context and a mint submit action. Home search uses one visible boundary and a dark focus-within outline.

Transaction choice panels are contained inside the entry sheet with a 28px radius and a content-driven height capped at min(52dvh, 440px). Date/time fields use minmax(0,1fr) columns, switching to one column at 340px. The balance action opens receipt scanning; the floating plus remains the transaction entry action.

Home wallets sort by descending balance, with name as the tie-breaker. Transaction history groups filtered results by Jakarta calendar month, newest first, with month/year headings and matching counts. Entry tabs, amount, and save action distinguish expense (pink), income (mint), and transfer (teal); darker pink/teal button shades keep white labels readable. The save-and-continue action uses a 48px circular plus with an accessible label. Verified with the live application at desktop, 390px, and 320px; no financial records were written during this UI pass.

The entry amount is a native text input with numeric input mode, supporting keyboard typing, selection, deletion, and numeric paste. Raw digits remain editable while focused; Indonesian thousands separators return on blur. Both native input and the existing keypad share the same amount state and a 12-digit ceiling. The field remains borderless within the amount surface and receives a visible focus outline. Verified keyboard replacement, Backspace, keypad continuation, formatting, and 12-digit fit at 320px without saving a transaction.
