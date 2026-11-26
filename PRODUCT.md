# Product — Takara (Aplikasi Keuangan Rumah Tangga)

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
1. **Keluarga & Pasangan (Multi-Household SaaS Publik)**: Keluarga yang mendaftar dan mengelola arus kas rumah tangga bersama dalam ruang household terisolasi (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`, dapat bergabung melalui kode undangan). Contoh persona awal: **Maruf H** (Owner / Pencatat Utama, mengelola arus kas keluarga, transfer antar rekening, belanja bulanan, jajan, dan ART) dan **Zakia Nurul Hanifa** (Admin / Pasangan, bersama mengelola anggaran, mencatat gaji, transfer ke kas harian, dan memonitor pengeluaran rumah tangga).
2. **Superadmin Platform**: Pengelola tingkat sistem dengan dashboard khusus untuk CRUD pengguna, household, dan keanggotaan tanpa ikut mencampuri pencatatan keuangan keluarga.

## Product Purpose
Menyediakan aplikasi web PWA pencatatan keuangan pribadi dan rumah tangga multi-household, multi-wallet yang akurat secara akuntansi (*double-entry ledger* berbasis *signed-amount* dalam satuan integer Rupiah) dan cepat digunakan sehari-hari oleh pasangan maupun keluarga di ponsel. Keberhasilan berarti transaksi harian cepat tercatat, saldo seluruh dompet selalu konsisten dan sinkron antar anggota keluarga, serta anggaran bulanan mudah dipantau.

## Positioning
Menggabungkan disiplin *double-entry ledger* Rupiah (pemisahan tegas antara pemasukan, pengeluaran, transfer antar dompet, dan biaya admin) dengan kolaborasi multi-household SaaS publik, autentikasi ringan Username + PIN 5 digit berbasis Supabase Auth, scan struk AI Vision, reset saldo bulanan yang dapat di-*rollback*, serta impor/ekspor Excel dan JSON — dirancang untuk kebiasaan pencatatan keluarga Indonesia.

## Operating Context
- **Lingkungan Penggunaan**: Aplikasi web PWA *mobile-first* yang dioptimalkan untuk penggunaan satu tangan di ponsel (iPhone dan Android), serta tetap dapat diakses di desktop untuk peninjauan laporan, impor data, dan dashboard Superadmin.
- **Ritme Penggunaan**: Pencatatan transaksi harian (belanja, makan, jajan, transfer antar rekening seperti Cash, Bank Jateng, Bank Jateng Ulfa, Bank Jago), unggah bukti struk ke penyimpanan privat, pemantauan pagu anggaran kategori dan goal tabungan, serta tutup/reset buku saldo per bulan mengikuti kalender Asia/Jakarta (WIB).

## Capabilities and Constraints
- **Integritas Ledger**:
  - Nilai uang disimpan dalam integer minor unit (Rupiah).
  - `Transfer`: Perpindahan aset antar wallet (`walletSumber -nominal`, `walletTujuan +nominal`). Bukan pemasukan, bukan pengeluaran.
  - `Income`: Menambah saldo wallet tujuan, dihitung dalam laporan pemasukan.
  - `Expense`: Mengurangi saldo wallet sumber, dihitung dalam laporan pengeluaran.
  - `Transfer Fee`: Bila ada biaya admin transfer, tercatat sekali sebagai pengeluaran terpisah.
- **Struktur Domain & RBAC**:
  - Multi-household dengan ruang data terisolasi (`Keuangan Maruf`, `Pribadi`, dsb.) dan role keanggotaan `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` (`VIEWER` bersifat baca-saja; household lain dan pengguna anonim ditolak).
  - Panel Superadmin untuk mengelola user, household, dan anggota household.
- **Autentikasi & Privasi Data**:
  - Username + PIN tepat 5 digit menggunakan sesi Supabase Auth. Verifikasi dan hash kredensial dikelola server/Supabase Auth; PIN tidak disimpan atau ditampilkan oleh klien.
  - Perubahan PIN memverifikasi PIN saat ini, menunggu konfirmasi server, lalu berlaku untuk login berikutnya.
  - Data finansial disimpan di Supabase dengan akses per household. Lampiran struk disimpan di bucket privat `receipts` dan dibuka memakai tautan sementara untuk anggota yang berhak.
- **Fitur Terkonfirmasi**:
  - Multi-wallet (`cash`, `checking`, `digital`, `custom`), kategori dan `#label` kustom.
  - AI Receipt Vision Scanner dan Magic Input (ketik cepat alami / suara).
  - Pagu Anggaran Kategori dengan peringatan ambang batas, Goal/Impian Tabungan, serta pencatatan Utang & Piutang.
  - Reset Saldo Bulanan (sekali per bulan Jakarta) lengkap dengan fitur *Rollback* riwayat, serta laporan dengan opsi pengecualian cicilan utang dan pemfilteran pasca-reset.
  - Gamifikasi Streak & Tantangan Keluarga, notifikasi aktivitas household, dan impor data Excel (`.xlsx`/`.xls`) serta cadangan JSON.
- **Keputusan Terbuka (Undecided)**:
  - Model harga, paket berlangganan SaaS publik, dan batas kuota akun/transaksi per paket belum ditetapkan.

## Brand Commitments
- **Nama Produk**: Takara.
- **Bahasa & Nada Suara**: Bahasa Indonesia yang ringkas, akrab, dan bernuansa keluarga.
- **Aset Resmi**: Logo aplikasi `public/Takara-192.png` dan berkas sumber `Takara_logo_original_transparan.png`.

## Evidence on Hand
- **Berkas Impor Excel Nyata**: `Keuangan-Maruf-transactions-2026-11-10.xlsx` — ringkasan tervalidasi: Total Pemasukan Rp5.795.000, Pengeluaran Rp4.374.462, Saldo Bersih Rp1.420.538, 74 transaksi, 6 transfer, disertai pembentukan otomatis dompet & kategori terkait.
- **Dokumentasi Status Auth & Storage**: `docs/supabase-auth-status.md`.
- **Skema Basis Data**: `supabase_schema.sql`.
- **Belum Tersedia**: Testimoni pelanggan publik, studi kasus pihak ketiga, angka pengguna publik, maupun materi pers (jangan membuat atau memfabrikasi klaim eksternal).

## Product Principles
1. **Integritas Ledger Tanpa Kompromi**: Setiap transaksi, transfer, biaya admin, void, dan reset bulanan wajib menjaga kebenaran saldo antar dompet.
2. **Pencatatan Harian Cepat Satu Tangan**: Alur catat transaksi manual, ketik cepat/suara, maupun scan struk AI harus ringkas untuk dipakai di ponsel sambil beraktivitas.
3. **Kolaborasi Keluarga & Isolasi Household**: Anggota satu household melihat pembaruan bersama secara sinkron, sementara data antar household tetap terisolasi ketat.
4. **Keamanan PIN & Bukti Struk Privat**: Kredensial dikelola aman melalui Supabase Auth dan bukti struk hanya dapat diakses anggota household yang berwenang.
5. **Terbuka terhadap Data Nyata**: Mendukung migrasi data Excel, pencadangan JSON, dan koreksi aman melalui void maupun rollback reset saldo bulanan.

## Accessibility & Inclusion
- Nyaman dioperasikan dengan satu tangan di layar ponsel (PWA *mobile-first* iPhone/Android), memiliki target sentuh yang jelas, navigasi konsisten, dan menggunakan bahasa Indonesia sehari-hari yang mudah dipahami seluruh anggota keluarga.
