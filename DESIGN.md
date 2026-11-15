---
name: Takara — Catatan Harian
description: Airy household finance in soft green and white liquid glass.
colors:
  canvas: "#f1f6f1"
  white: "#ffffff"
  ink: "#193727"
  muted: "#61705c"
  leaf: "#daebcd"
  action: "#cfe3bc"
  action-ink: "#36522e"
  primary: "#426638"
  glass: "rgba(255,255,255,.72)"
  line: "#dee7d9"
  active: "#dce9ce"
  income: "#557d41"
  expense: "#a55444"
  transfer: "#55756b"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "clamp(36px,7vw,60px)"
    fontWeight: 650
    lineHeight: 1.17
    letterSpacing: "-.04em"
  balance:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "clamp(24px,6.6vw,34px)"
    fontWeight: 700
    letterSpacing: "-.045em"
  wordmark:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-.04em"
  headline:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "23px"
    fontWeight: 650
    letterSpacing: "-.035em"
  body:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: ".9375rem"
    lineHeight: 1.5
  transaction:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "14px"
    fontWeight: 600
  label:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "12px"
  dock-label:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
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
    rounded: "{rounded.capsule}"
    padding: "13px 18px"
  input:
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "44px"
  search:
    backgroundColor: "#ffffffa8"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    padding: "0 17px"
    height: "48px"
  card:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.screen-card}"
    padding: "16px"
  chip:
    backgroundColor: "#e7efdf99"
    textColor: "#52664a"
    rounded: "{rounded.capsule}"
    padding: "8px 14px"
  dock-active:
    backgroundColor: "{colors.active}"
    textColor: "#3c5f2f"
    rounded: "{rounded.capsule}"
    height: "58px"
---

# Design System: Takara — Catatan Harian

## Overview

**Creative North Star: "Catatan Harian"**

An airy daily household ledger with soft green and white liquid glass. Rounded translucent surfaces, readable financial amounts, and quiet outlined icons make everyday recording approachable. The balance supports the working transaction area without turning the screen into a stack of dashboard cards.

This is the approved replacement visual world from image 2, extracted from the implemented application. The reference composition adapts to real household values and logical phone dimensions; it is not a claim of pixel reproduction. The automated hero comparison remains open/failed at 59.2. Documentation does not close that gate.

**Key Characteristics:**
- Soft green and white translucent material.
- Fully rounded containers and capsule actions.
- Airy lists with readable amounts and metadata.
- One self-hosted sans family and Lucide outline icons.

## Colors

The palette combines warm green-white neutrals, muted leaf actions, and dark forest text. Frontmatter values are normative; implementation authority is `src/index.css`.

### Primary
- **Leaf and Action:** calm balance and recording surfaces. Stronger Primary supports committed actions and keyboard focus.
- **Active:** quiet filled capsules mark the current navigation destination.

### Secondary
- **Income, Expense, Transfer:** muted leaf, clay, and gray-green semantic accents in transaction/report views. Keep labels, signs, and icons so color is never the only cue. The home feed deliberately uses forest amounts with a lighter green income distinction.

### Neutral
- **Canvas:** warm green-white page base.
- **Glass and White:** translucent containers and refractive top edges.
- **Ink, Muted, Line:** primary content, supporting content, and low-contrast separation.

**The Quiet Material Rule.** Use green-white surfaces for structure; reserve stronger color for actions, selection, and financial meaning.

## Typography

The self-hosted variable Plus Jakarta Sans font (`public/fonts/plus-jakarta-sans.ttf`, weights 200–800) serves every role, with sans-serif fallback. Compressed tracking on wordmark, headings, and balance contrasts with ordinary readable labels. Use tabular numerals for amounts.

The hierarchy is encoded above. Welcome display belongs to the public welcome surface. Home heading becomes 27px and balance 40px from 640px; other screen headings use 25px/650. Home transaction titles and amounts are 14px/600 after the readability correction; metadata, wallet labels, and inline balance flows are 12px. Dock captions remain 10px. Below 360px, titles reduce to 13px and amounts to 12px. These are observed exceptions, not permission to shrink ordinary text.

## Layout

Mobile is primary, with a 390×844 reference viewport. Header and home cap at 896px. Home uses 12px side gutters, increasing to 24px at 640px; related screens use 16px/24px gutters. A compact sticky header precedes a shallow balance panel, horizontal wallet strip, and date-grouped working feed. Search and a disclosure filter precede the list. Rows are at least 60px on mobile and 76px from 640px. Home previews the latest 12 matching transactions; the transaction destination exposes the full working history.

The centered floating five-destination dock uses viewport width minus 16px, caps at 560px, and sits 12px plus safe-area inset above the bottom. Content reserves 112px plus that inset. Desktop widens the same application; the former desktop sidebar is superseded. Below 360px header, balance, and record action compress selectively.

## Elevation & Depth

Depth combines pale gradients, translucent white, blur, inset white edges, and restrained diffuse green shadows. Shared glass uses `0 8px 28px -18px #45623d40,inset 0 1px 0 #fff`. Header blur is 20px; balance blur 16px; dock and entry sheet blur 24px; modal backdrops blur 5px. Dock saturation is 1.1. Small utility shadows are removed; larger shared surfaces use `0 16px 50px -24px #34532e45`. Exact gradients and component snippets live in the sidecar.

Navigation color/background transitions take .2s ease. Reduced-motion preference disables animation and transitions. Global keyboard focus uses a 2px Primary outline with 4px offset.

## Shapes

The normative radius vocabulary appears above. Capsules define buttons, search, date labels, household switch, and dock. Circles define profile/filter controls; panels have broad curves. Shared screen cards override generic utility radii to 24px/28px. Entry sheets have 32px corners, 8px exterior margin, and maximum height of viewport minus 16px. Top-only sheets retain their lower attachment where applicable. Inputs have 18px corners and at least 44px height. Some compact existing buttons remain 38–42px; core record/search controls meet or exceed 44px.

## Components

### Buttons
Home Catat is a pale leaf capsule with forest text. Non-home recording uses a stronger green floating capsule above the dock. Both open the existing transaction sheet; inline flow actions open the corresponding income/expense form. Shared utility buttons inherit capsule shapes. Keep icon-and-text labels and visible focus.

### Chips
Date headings are broad translucent sage capsules. Filters use selected fills and labels; disclosure retains expanded state and active tint. Household selection truncates within a capsule with house icon and chevron.

### Cards / Containers
Balance is a shallow gradient panel with refractive top edge. Wallet, transaction, report, settings, and administration cards inherit glass and remapped green neutral tokens. Wallet/report summaries use the pale summary gradient. Avoid redundant card containers around the home feed.

### Inputs / Fields
Shared fields use rounded light surfaces; search is a capsule beside a circular filter action. Home search removes its local outline; its focus-visible behavior depends on the global rule and should be verified when changing styles. Authentication uses a light green-white screen, fields of at least 48px, and capsule controls through explicit overrides.

### Navigation
Five Lucide outline destinations are Beranda, Transaksi, Dompet, Laporan, and Setelan. Dock icons are 23px at 1.65 stroke, with captions below. Active destination uses `aria-current="page"`, sage fill, forest text, and inset light edge. Hover adds quiet fill. Wordmark and household selector stay in the sticky top header; account actions open from the circular profile control.

### Daily ledger and sheets
Date-grouped rows combine rounded category-icon tiles, truncated descriptions, time/author metadata, and right-aligned tabular amounts. Rows open existing transaction detail. Preserve live Supabase-backed balances, wallets, transactions, loading/error/retry states, empty states, search, and filters. Do not insert a Contoh badge or hardcode comp numbers.

The visual refresh does not complete authentication migration or activate storage uploads; both remain dependent on the missing server-only Supabase Admin API key. PRODUCT.md contains preexisting DompetKita/PIN-6 drift and is outside this documentation change.

## Do's and Don'ts

### Do:
- **Do** use soft green-white glass, rounded surfaces, and outlined icons consistently across screens and sheets.
- **Do** keep real amounts readable with tabular numerals and reserve clearance for the floating dock.
- **Do** preserve live values and loading, error, empty, selected, and keyboard-focus states.

### Don't:
- **Don't** add nested dashboard cards, promotional badges, or decorative AI motifs to the daily ledger.
- **Don't** reintroduce the former dark teal visual identity or desktop sidebar as the default system.
- **Don't** describe reference comparison, authentication migration, or storage setup as complete without independent evidence.
