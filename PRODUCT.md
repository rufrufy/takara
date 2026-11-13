# PRODUCT.md — DompetKita (Aplikasi Keuangan Rumah Tangga)

## Visi & Tujuan Produk
Aplikasi pencatatan keuangan pribadi dan rumah tangga multi-household, multi-wallet dengan integritas akuntansi tinggi (double-entry ledger signed-amount), otentikasi cepat via Username + PIN 6-digit (tanpa repot OTP/email), serta dukungan langsung untuk impor data transaksi dari berkas ekspor Excel (`Keuangan-Maruf-transactions-2026-11-10.xlsx`).

## Persona Pengguna
1. **Maruf H (Owner / Pencatat Utama)**: Mengelola arus kas keluarga, transfer antar rekening (Bank Jateng, Bank Jago, Cash), memantau belanja bulanan, jajan, dan ART.
2. **Zakia Nurul Hanifa (Admin / Pasangan)**: Bersama mengelola anggaran, mencatat gaji, transfer ke kas harian, dan memonitor pengeluaran rumah tangga.

## Struktur & Domain Inti
1. **Household**: Ruang terisolasi (`Keuangan Maruf`, `Pribadi`, dsb.).
2. **Membership**: Role `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
3. **Wallet**:
   - `Cash` (Uang Tunai / Pegangan)
   - `Bank Jateng` (Rekening Gaji / Operasional)
   - `Bank Jateng Ulfa` (Rekening Pendamping)
   - `Bank Jago` (Digital / Kantong Belanja)
4. **Prinsip Akuntansi Finansial (Ledger Integrity)**:
   - Nilai uang disimpan dalam integer minor unit (Rupiah).
   - `Transfer`: Perpindahan aset antar wallet (`walletSumber -nominal`, `walletTujuan +nominal`). **Bukan pemasukan, bukan pengeluaran**.
   - `Income`: Menambah saldo wallet tujuan, dihitung dalam laporan pemasukan.
   - `Expense`: Mengurangi saldo wallet sumber, dihitung dalam laporan pengeluaran.
   - `Transfer Fee`: Bila ada biaya admin, tercatat sekali sebagai pengeluaran terpisah.
5. **Autentikasi**:
   - Username + PIN (min 6 digit), salt + hash aman, recovery codes saat daftar.
6. **Impor Excel Finansial**:
   - Mampu membaca berkas `.xlsx` (`Keuangan-Maruf-transactions-2026-11-10.xlsx`), memvalidasi ringkasan (Total Pemasukan Rp5.795.000, Pengeluaran Rp4.374.462, Saldo Bersih Rp1.420.538, 74 transaksi, 6 transfer), auto-generate dompet & kategori terkait.
