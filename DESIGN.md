# DESIGN.md — Takara Keuangan Keluarga Design System

## Visual Authority & Reference
Diadopsi dari artboard `pen.html` (Mobile 390px, Tablet 820px, Desktop responsive) dan pengalaman ringkas pencatatan keuangan modern.

## Tipografi
- **Family**: `Plus Jakarta Sans`, system-ui, sans-serif
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Tracking**: `-0.02em` s/d `-0.03em` untuk headline, normal untuk body

## Palet Warna
- **Primary / Brand**:
  - Teal Deep: `#042F2E`
  - Teal Dark: `#115E59`
  - Teal Primary: `#0F766E`
  - Teal Active / Hover: `#0D9488`
  - Teal Soft Surface: `#F0FDFA`
- **Neutral**:
  - Canvas / Background: `#F8FAFC` (Slate-50)
  - Card / Panel Surface: `#FFFFFF`
  - Subdued Surface: `#F1F5F9` (Slate-100)
  - Border Subdued: `#E2E8F0` (Slate-200)
  - Text Primary: `#0F172A` (Slate-900)
  - Text Secondary: `#475569` (Slate-600)
  - Text Muted: `#64748B` (Slate-500)
- **Semantic Finansial**:
  - **Pemasukan (Income)**: `#059669` (Emerald-600), background `#ECFDF5`
  - **Pengeluaran (Expense)**: `#DC2626` (Red-600), background `#FEF2F2`
  - **Transfer Antar Rekening**: `#2563EB` (Blue-600), background `#EFF6FF`
  - **Peringatan / Alert**: `#D97706` (Amber-600), background `#FFFBEB`

## Komponen & Pola Layout
1. **Mobile Bottom Navigation**:
   - Beranda (Home / Overview)
   - Transaksi (Filter, Search, List)
   - Dompet (Wallets, Saldo, Rekonsiliasi)
   - Laporan (Grafik, Distribusi, Ekspor)
   - Pengaturan (Profil, PIN, Rumah Tangga, Impor Data)
2. **Floating Quick Action (`+ Catat`)**:
   - Membuka bottom sheet modal dengan 3 tab: Pengeluaran, Pemasukan, Transfer.
   - Kolom transfer memiliki input: Dari Dompet, Ke Dompet, Nominal, Biaya Admin (opsional), Catatan.
3. **Card & Surface Elevation**:
   - Border halus `1px solid #E2E8F0` dengan soft blur shadow `0 2px 8px -2px rgba(15, 23, 42, 0.05)`.
   - Radius sudut: `16px` (`rounded-2xl`).
4. **Desktop / Tablet Mode**:
   - Dual-pane layout: Sidebar navigasi di kiri, feed utama di tengah, kartu ringkasan dompet dan aksi cepat di samping kanan.
