# MASTER PROMPT — FULL-STACK PERSONAL & HOUSEHOLD FINANCE APP

> **Instruksi penggunaan:** Tempel seluruh dokumen ini ke Cursor, Claude Code, Windsurf, atau AI coding assistant lain sebagai instruksi utama proyek. Bila project sudah ada, audit codebase terlebih dahulu, jangan menimpa kode yang bekerja tanpa alasan. Bangun aplikasi secara bertahap dan benar-benar implementasikan kode, migrasi, validasi, serta pengujian; jangan berhenti pada mockup atau rencana.

## 1. ROLE & OBJECTIVE

Bertindak sebagai **Principal Full-Stack Engineer, Software Architect, Product Designer, Database Engineer, dan Security Engineer**. Bangun aplikasi web pencatatan keuangan pribadi/keluarga yang production-ready, mobile-first, cepat dan mudah dipakai sehari-hari.

Nama sementara: **DompetKita** (mudah diganti lewat konfigurasi). Bahasa UI: **Bahasa Indonesia**. Mata uang default: **IDR**. Zona waktu tampilan default: **Asia/Jakarta**, sedangkan timestamp disimpan dalam UTC.
Referensi pengalaman produk: Kemudahan penggunaan, kolaborasi household, dan kejelasan dashboard pencatatan keuangan modern.

### Outcome utama

1. Pengguna membuat akun dan login **hanya dengan username dan PIN** (tanpa email, password biasa, OAuth, atau OTP sebagai syarat penggunaan normal).
2. Pengguna dapat membuat **banyak household** (contoh: Pribadi, Rumah Tangga, Usaha Sampingan), berganti active household, serta mengundang anggota memakai kode undangan.
3. Setiap household memiliki **banyak wallet**: cash/tunai, rekening bank, e-wallet, atau custom.
4. Mencatat **income, expense, transfer**, beserta histori, kategori, pencarian, filter, dan laporan.
5. **Transfer wallet adalah perpindahan aset, BUKAN pendapatan dan BUKAN pengeluaran.** Total uang household tetap sama ketika transfer tanpa biaya dan tanpa selisih kurs.
6. Saldo wallet dan laporan **harus selalu konsisten**, termasuk ketika transaksi diedit, dibatalkan, atau dibuat bersamaan.

## 2. RECOMMENDED STACK

Gunakan stack ini sebagai default, kecuali repository sudah memiliki stack yang setara dan stabil:

- **Frontend + backend:** Next.js App Router, TypeScript strict, React.
- **UI:** Tailwind CSS, shadcn/ui, Lucide Icons, Recharts; mobile-first dan dark mode.
- **Database:** PostgreSQL + Prisma ORM.
- **Validation:** Zod untuk input server maupun form.
- **Authentication:** custom username + PIN menggunakan session server-side dan cookie HttpOnly Secure SameSite=Lax; session disimpan dalam database, dirotasi saat login dan dapat dicabut saat logout.
- **Testing:** Vitest (unit/integration), Playwright (E2E); gunakan database pengujian terpisah.
- **Deployment:** Docker Compose untuk PostgreSQL lokal, dan konfigurasi deployment Next.js yang sesuai (VPS/container atau managed Postgres).
- **PWA:** manifest, ikon, installable shell; jangan cache response berisi data finansial sensitif secara tidak aman.

Gunakan library versi kompatibel terkini yang benar-benar terpasang. Jangan mengarang nama API atau fitur library. Jangan menambahkan layanan berbayar eksternal untuk MVP.

## 3. CORE CONCEPT & DATA OWNERSHIP

- **User** adalah akun identitas independen.
- **Household** adalah ruang finansial terpisah. Satu user boleh masuk ke lebih dari satu household.
- **Membership** menghubungkan user dengan household dan role (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Wallet** milik tepat satu household, bukan milik global user. Akses selalu melalui active household dan membership.
- **Category** milik household; dibedakan `INCOME` dan `EXPENSE`.
- **FinancialTransaction** adalah peristiwa bisnis (`INCOME`, `EXPENSE`, `TRANSFER`, `OPENING_BALANCE`, `ADJUSTMENT`) dengan referensi wallet terkait.
- **LedgerEntry** adalah perubahan saldo bertanda (signed amount) untuk satu wallet, dan merupakan sumber perhitungan saldo yang dapat diaudit.
- Semua record bisnis harus memiliki `householdId`, createdAt/updatedAt, dan actor/audit metadata yang relevan.

### Invariant / aturan finansial yang WAJIB

**Gunakan integer minor unit untuk uang IDR** (misal Rp25.000 disimpan `25000` sebagai BIGINT), jangan gunakan floating-point JavaScript untuk nilai uang. Bila frontend memakai string input nominal, lakukan parsing/validasi ketat sebelum penyimpanan.

| Tipe transaksi | Ledger wallet sumber | Ledger wallet tujuan | Pengaruh ke income | Pengaruh ke expense |
|---|---:|---:|---:|---:|
| Income Rp5.000.000 ke BCA | — | BCA +5.000.000 | +5.000.000 | 0 |
| Expense Rp100.000 dari Cash | Cash −100.000 | — | 0 | +100.000 |
| Transfer Rp500.000 BCA → GoPay | BCA −500.000 | GoPay +500.000 | **0** | **0** |
| Transfer Rp500.000 BCA → GoPay + biaya Rp2.500 | BCA −502.500 | GoPay +500.000 | **0** | **+2.500 (biaya)** |
| Opening balance Cash Rp200.000 | — | Cash +200.000 | **0** | **0** |

**Persamaan yang harus selalu benar:**

- `walletBalance(walletId) = SUM(ledgerEntry.signedAmount)` untuk wallet tersebut.
- `householdTotalBalance = SUM(walletBalance(wallet))` bagi wallet aktif/diarsipkan sesuai kebijakan tampilan yang eksplisit.
- `periodIncome = SUM(amount)` hanya dari transaksi berjenis `INCOME` yang posted pada periode tersebut.
- `periodExpense = SUM(amount)` hanya dari transaksi berjenis `EXPENSE` yang posted, ditambah biaya transfer yang dikategorikan sebagai expense, pada periode tersebut.
- `periodNetCashFlow = periodIncome - periodExpense` **tidak memasukkan transfer internal**.
- Transfer satu mata uang tanpa biaya: `SUM(ledgerEntry.signedAmount) == 0` untuk satu transfer.
- Wallet asal dan tujuan transfer **harus berbeda**, berada pada household yang sama, memiliki mata uang yang sama untuk MVP, dan nilai transfer harus positif.
- Biaya transfer, bila ada, harus **tercatat sekali saja** sebagai pengeluaran nyata yang terpisah secara logis, bukan menggandakan nominal transfer.
- Opening balance dan adjustment bukan income/expense, tetapi harus diperlihatkan secara terpisah dalam rekonsiliasi.
- Transaksi berstatus `VOIDED` tidak boleh tetap menyumbang pada saldo atau laporan. Gunakan reversal ledger atau model posting aman yang mempertahankan audit trail; jangan menghapus jejak finansial tanpa histori.
- Query laporan wajib membedakan tanggal efektif transaksi (tanggal lokal) dari waktu pencatatan/audit (UTC).
- Jangan pakai field `wallet.balance` sebagai satu-satunya source of truth. Jika saldo di-cache untuk performa, semua update wajib atomik dan dapat direkonsiliasi terhadap ledger.

### Contoh wajib lulus

Awal: Cash Rp200.000, BCA Rp1.000.000, GoPay Rp100.000, income periode Rp0, expense periode Rp0.

1. Transfer BCA → GoPay Rp300.000.
2. Hasil: BCA Rp700.000; GoPay Rp400.000; Cash Rp200.000.
3. Total household tetap Rp1.300.000.
4. Income periode masih Rp0, expense periode masih Rp0, net cash flow masih Rp0.
5. Catatan histori: satu transaksi `TRANSFER` terhubung ke dua ledger entry, **bukan dua transaksi income/expense**.

## 4. AUTHENTICATION: USERNAME + PIN ONLY

### Register

- Input: `username`, `displayName`, `PIN`, `confirmPIN`.
- Username unik secara case-insensitive, format 3–30 karakter (`a-z`, `0-9`, `_`, `.`), normalisasi lowercase.
- PIN numerik **6 digit minimum**; pilih 6–8 digit untuk UX dan jangan izinkan PIN umum/lemah (mis. `123456`, `000000`, repetisi sederhana). Jangan menawarkan PIN 4 digit sebagai default untuk aplikasi finansial.
- Hash PIN dengan **Argon2id** + salt unik; **jangan pernah simpan PIN plaintext, log PIN, atau mengembalikannya melalui API**.
- Buat household pertama otomatis bernama `Pribadi` atau tawarkan langkah onboarding untuk memberi nama.

### Login

- Username + PIN, dengan opsi tampilkan/sembunyikan PIN, dukungan paste yang aman, dan UI PIN ramah mobile.
- Rate limit **per akun dan per IP**, progressive backoff/lockout sementara; respons gagal generik untuk mencegah enumerasi username; audit failed logins tanpa menyimpan PIN.
- Proteksi CSRF pada operasi state-changing sesuai rancangan cookie/session; validasi Origin dan otorisasi server-side.
- Session token acak berentropi tinggi; simpan **hash token** dalam DB, simpan token asli hanya di cookie HttpOnly Secure sesuai lingkungan; expiry dan revocation.
- Regenerasi session setelah autentikasi; logout menghapus cookie dan revoke session.
- Idle timeout dan absolute expiry yang wajar; verifikasi ulang PIN untuk operasi sensitif (mengubah PIN, menghapus household, pindah kepemilikan).
- **Tidak ada fitur 'lupa PIN' lewat email/SMS** karena akun tidak menggunakan faktor pemulihan tersebut. Sediakan **recovery codes sekali pakai saat registrasi** (di-hash di database) atau mekanisme pemulihan administratif yang aman dengan kebijakan jelas. Jelaskan secara eksplisit bahwa tanpa recovery code dan tanpa sesi valid, akun tidak bisa dipulihkan secara mandiri.
- Ganti PIN memerlukan PIN lama atau recovery code valid, revoke session lain.

### Keamanan ekstra

Semua operasi memakai HTTPS produksi, security headers, parameterized queries/ORM, validasi input di backend, no secrets in client bundle, redaksi data sensitif di logs, dan backup terenkripsi. Satu user **tidak boleh mengakses wallet/transaction dari household lain** dengan mengganti ID di URL/API. Uji kasus IDOR secara eksplisit.

## 5. HOUSEHOLD MANAGEMENT

### Fitur

- Create household: nama, icon/emoji, mata uang dasar `IDR` untuk MVP.
- Daftar household user dan household switcher pada navbar/sidebar.
- Dashboard, wallet, kategori, dan transaksi berganti sepenuhnya mengikuti active household.
- Undang pengguna via **invite code** acak yang aman, pendek untuk diketik namun cukup entropi; punya masa berlaku, batas penggunaan, status, dan dapat dicabut; kode disimpan sebagai hash.
- Join household dengan invite code dari akun existing. Jika belum punya akun, register dulu lalu klaim undangan.
- Role: `OWNER` (kontrol penuh), `ADMIN` (kelola wallet, kategori, anggota sesuai policy), `MEMBER` (mencatat transaksi), `VIEWER` (read only).
- Owner dapat mengubah peran/mengeluarkan anggota; tidak boleh membuang satu-satunya owner tanpa transfer kepemilikan.
- Audit: siapa membuat/mengedit/membatalkan transaksi, mengubah role, membuat undangan.
- Household deletion sebaiknya soft delete dengan konfirmasi ulang PIN dan kebijakan retensi/ekspor.

### Aturan izin minimum

| Operasi | OWNER | ADMIN | MEMBER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| Melihat dashboard & laporan | ✓ | ✓ | ✓ | ✓ |
| Menambah income/expense/transfer | ✓ | ✓ | ✓ | — |
| Edit/void transaksi sendiri | ✓ | ✓ | ✓ | — |
| Edit/void transaksi semua anggota | ✓ | ✓ | — | — |
| Mengatur wallet & kategori | ✓ | ✓ | — | — |
| Undang anggota | ✓ | ✓ | — | — |
| Ubah role / hapus anggota | ✓ | sesuai batas policy | — | — |
| Hapus household / transfer ownership | ✓ | — | — | — |

Implementasikan aturan ini secara konsisten di server; sembunyikan kontrol di UI hanya sebagai pelengkap, bukan pengganti authorization.

## 6. MULTI-WALLET

Dukung wallet type:

- `CASH`: Dompet Harian, Uang Pegangan.
- `BANK`: BCA, BRI, Mandiri, BNI, Jago, dll (label saja, bukan integrasi bank).
- `E_WALLET`: GoPay, OVO, DANA, ShopeePay, LinkAja, dll.
- `CUSTOM`: Tabungan Amplop, Dana Darurat, lainnya.

Properti wallet: `id`, `householdId`, `name`, `type`, `institutionName?`, `icon?`, `color?`, `currency=IDR`, `isArchived`, `createdAt`, `updatedAt`.

- Add/edit/archive wallet, detail saldo dan histori per wallet.
- Saat membuat wallet, boleh menetapkan opening balance **melalui ledger `OPENING_BALANCE`**, tidak dihitung sebagai pemasukan.
- Saldo wallet tidak boleh menjadi negatif secara default; sediakan opsi kebijakan wallet `allowNegativeBalance` yang hanya dapat diubah admin/owner dan validasikan atomik. Jika memilih mengizinkan saldo negatif pada beberapa wallet, UI harus menandainya jelas.
- Wallet yang memiliki histori jangan hard delete; archive. Wallet archived tetap dihitung dalam rekonsiliasi historis; beri pilihan eksplisit apakah masuk total tampilan saat ini.
- Minimal ada dua mode daftar: kartu wallet dan list compact.

## 7. TRANSACTION FLOWS

### Income

Field: amount, destinationWalletId, incomeCategoryId, transactionDate, note, optional tags. Setelah commit: ledger entry `+amount` ke wallet tujuan; tampil di laporan pemasukan.

### Expense

Field: amount, sourceWalletId, expenseCategoryId, transactionDate, note, optional tags. Setelah commit: ledger entry `-amount` dari wallet sumber; tampil di laporan pengeluaran.

### Transfer (PRIORITAS TERTINGGI)

Form: `dari wallet`, `ke wallet`, `nominal`, `biaya admin` (default nol), `kategori biaya` (wajib bila biaya > 0), `tanggal`, `catatan`.

Dalam **satu database transaction**:

1. Verifikasi session, household, membership, izin, validitas kedua wallet, dan saldo sumber sesuai kebijakan.
2. Pastikan tidak ada transfer duplikat lewat idempotency key per request (unique per household/actor) dan retry aman.
3. Tulis satu business transaction berjenis `TRANSFER`.
4. Tulis ledger `-amount` ke wallet sumber dan `+amount` ke wallet tujuan.
5. Jika `fee > 0`, catat pengeluaran biaya yang terhubung secara eksplisit ke transfer dan tulis satu ledger debit `-fee` pada wallet pembayar. Fee harus masuk laporan pengeluaran **tepat sekali**.
6. Commit atomik; bila salah satu langkah gagal, seluruh mutasi rollback.
7. Saat edit/void transfer, lakukan pembalikan lengkap dan posting ulang dengan audit trail, bukan mengedit satu sisi saja.

Untuk mengatasi race condition dua debit bersamaan, gunakan locking/serializable transaction atau mekanisme DB yang ekuivalen dan uji concurrency. Gunakan perhitungan saldo dari ledger atau cache yang konsisten secara transaksional.

### Riwayat & operasi

- List transaksi dengan icon berbeda: pemasukan hijau, pengeluaran merah, transfer biru/ungu.
- Untuk transfer tampil `BCA → GoPay` dengan satu baris, tidak masuk list income/expense ketika filter hanya income atau expense.
- Filter tanggal, type, wallet, kategori, pembuat, teks; pagination server-side.
- Detail transaksi, edit, void dengan konfirmasi, audit trail.
- Catatan pengeluaran/pemasukan selalu memiliki category yang valid sesuai tipe.
- Tidak ada double submit ketika tombol diketuk berulang.

## 8. DASHBOARD, BUDGET, & REPORTS

### Dashboard MVP

- Active household switcher.
- Total saldo household (sum wallet, dengan aturan archived eksplisit).
- Pemasukan bulan berjalan, pengeluaran bulan berjalan, net cash flow.
- Daftar saldo setiap wallet.
- Grafik income vs expense per bulan dan komposisi expense per kategori.
- Recent transactions (5–10) dan tombol cepat `+ Pemasukan`, `− Pengeluaran`, `⇄ Transfer`.
- Empty state dengan instruksi tambah wallet dan transaksi pertama.
- Format IDR sesuai locale `id-ID` dan tanggal `Asia/Jakarta`.

### Budget (phase 2)

- Budget per kategori per bulan: limit, realisasi, sisa, warning 80% dan 100%.
- Budget hanya mengurangi sisa oleh **pengeluaran**, bukan transfer.
- Filter household dan bulan.

### Reports (phase 2)

- Ringkasan harian/mingguan/bulanan, tren per kategori, per wallet, dan per anggota.
- Ekspor CSV berformat aman; formula injection prevention untuk konten dari user. Ekspor transaksi dengan type jelas.
- Transfer tampil pada laporan pergerakan wallet, tetapi dikecualikan dari income/expense dan kategori belanja.
- Opening balances dan adjustments disajikan dalam rekonsiliasi tersendiri.

## 9. UX / UI DESIGN SYSTEM

Rancang UI premium namun sederhana, bukan dashboard akuntansi kompleks.

- Visual: soft neutral, white/stone backgrounds, emerald/teal primary, accent blue untuk transfer, typography yang jelas, rounded-xl/2xl, whitespace proporsional.
- Mobile-first dengan **bottom navigation**: `Beranda`, `Transaksi`, `Dompet`, `Laporan`, `Pengaturan`.
- Desktop: collapsible sidebar, topbar household switcher, kartu summary responsif.
- Floating primary action `+ Catat` di mobile memunculkan bottom sheet dengan tiga pilihan: pemasukan, pengeluaran, transfer.
- Touch target cukup besar; keyboard numerik untuk PIN/nominal; formulir berlabel dan pesan kesalahan yang bisa ditindaklanjuti.
- Loading skeleton, optimistic UI hanya saat aman, toast sukses/gagal, confirmation dialogs untuk operasi berisiko.
- Aksesibilitas: navigasi keyboard, semantic headings, focus states, kontras WCAG AA, reduced motion.
- Jangan copy screenshot/asset/branding produk referensi. Gunakan UI yang orisinal.

### Minimum routes

```text
/                         Landing page ringkas
/register                 Daftar (username + PIN)
/login                    Login (username + PIN)
/onboarding               Buat household pertama / setup wallet
/app                      Dashboard
/app/households           Daftar dan buat household
/app/households/settings  Anggota, invite code, peran
/app/wallets              Daftar wallet
/app/wallets/[id]         Detail wallet & histori
/app/transactions         Semua transaksi
/app/transactions/new     Tambah transaksi, termasuk transfer
/app/transactions/[id]    Detail/edit/void
/app/reports              Laporan
/app/budgets              Budget (phase 2)
/app/settings             Profil, PIN, session, recovery
```

Active household sebaiknya ada dalam URL atau server-side preference dan selalu divalidasi; jika memakai URL `/app/h/[householdId]/...`, ubah semua route app sesuai pilihan itu secara konsisten. **Dilarang mengandalkan `householdId` dari client tanpa verifikasi membership.**

## 10. DATABASE DESIGN — MINIMUM ENTITIES

Buat Prisma schema beserta migrasi, indeks, foreign key, dan constraint SQL tambahan bila diperlukan:

```text
User(id, usernameNormalized UNIQUE, displayName, pinHash, createdAt, updatedAt)
RecoveryCode(id, userId, codeHash, usedAt?, createdAt)
Session(id, userId, tokenHash UNIQUE, expiresAt, revokedAt?, lastSeenAt?, createdAt)
Household(id, name, baseCurrency, createdById, deletedAt?, createdAt, updatedAt)
HouseholdMember(id, householdId, userId, role, createdAt, UNIQUE(householdId,userId))
HouseholdInvite(id, householdId, codeHash UNIQUE, role, expiresAt, maxUses, usedCount, revokedAt?, createdById, createdAt)
Wallet(id, householdId, name, type, institutionName?, currency, allowNegativeBalance, isArchived, createdAt, updatedAt)
Category(id, householdId, name, type, icon?, color?, isArchived, createdAt)
FinancialTransaction(id, householdId, type, status, amountMinor BIGINT, feeMinor BIGINT, sourceWalletId?, destinationWalletId?, categoryId?, feeCategoryId?, description?, effectiveAt, createdById, updatedById?, voidedById?, voidedAt?, idempotencyKey?, createdAt, updatedAt)
LedgerEntry(id, householdId, transactionId, walletId, signedAmountMinor BIGINT, entryType, postedAt, createdAt)
AuditLog(id, householdId?, actorUserId, action, entityType, entityId, metadataJson, createdAt)
```

Tambahkan relasi dan constraint tepat untuk tipe transaksi, termasuk kombinasi wallet/jenis kategori/status. **Pastikan setiap ledger entry bersumber dari wallet dan transaction pada household yang sama** melalui validasi service serta constraint DB sekuat mungkin. Gunakan `onDelete` aman; jangan cascade-delete histori akuntansi tanpa sengaja. Buat indeks untuk `(householdId,effectiveAt)`, `(householdId,type,status)`, `(walletId,postedAt)`, dan lainnya berdasar query nyata.

**Perluas model jika diperlukan** untuk reversal ledger, expense biaya transfer yang terpisah secara akuntansi, atau batch posting. Dokumentasikan keputusan desain sebelum implementasi. Jangan memaksakan skema ringkas ini bila bertentangan dengan invariant.

## 11. ARCHITECTURE & BUSINESS LOGIC

Pisahkan kode dengan jelas:

```text
src/
  app/                  routes, pages, layouts, server actions / route handlers
  components/           reusable UI + domain components
  features/auth/        auth service, validation, policies
  features/households/  membership, invite, authorization
  features/wallets/     wallet service, balance queries
  features/transactions/ posting engine, transfer service, reversals
  features/reports/     read models and queries
  lib/db/               Prisma client, transactions, helpers
  lib/security/         sessions, rate limit, CSRF, audit
  lib/money/            integer amounts, formatting, arithmetic
prisma/                schema, migrations, seed
 tests/                unit, integration, e2e
```

- Domain/service functions mengendalikan semua mutasi keuangan; UI dan route tidak boleh mengubah ledger secara langsung.
- Server-side authorization dilakukan **di setiap read dan write** yang mengandung data household.
- Gunakan typed errors, HTTP status yang tepat, boundary error, dan logger tanpa PIN/sesi.
- Akses database dan pembuatan posting adalah atomic; mutasi penting memiliki idempotency.
- Endpoint publik memakai validasi Zod, pagination dan rate limits yang masuk akal.
- Sediakan seed data demo aman yang **hanya untuk development**, bukan akun default produksi.

## 12. EDGE CASES & ACCEPTANCE TESTS

Buat automated tests untuk skenario berikut:

1. Username case-insensitive; login benar/salah; lockout percobaan brute force; logout revoke session.
2. User A tidak bisa membaca/mengubah wallet atau transaksi dari household B tanpa membership (IDOR).
3. User mengakses beberapa household tanpa bocor data antar-household.
4. Viewer tidak dapat membuat/edit/void transaksi; member tidak dapat mengubah transaksi orang lain.
5. Income Rp1.000.000 meningkatkan saldo dan laporan income Rp1.000.000.
6. Expense Rp100.000 menurunkan saldo dan laporan expense Rp100.000.
7. Transfer Rp300.000 BCA → GoPay menurunkan BCA Rp300.000, menaikkan GoPay Rp300.000, **income dan expense tetap nol**.
8. Transfer dengan fee Rp2.500 mengurangi saldo sumber `amount+fee`, menambah tujuan `amount`, dan expense bertambah **hanya Rp2.500**.
9. Dua submit dengan idempotency key yang sama hanya membuat satu transfer.
10. Dua transfer concurrent dari wallet bersaldo terbatas tidak menyebabkan overdraft jika tidak diizinkan.
11. Transfer dengan wallet asal=tujuan, beda household, wallet archived, jumlah nol/negatif ditolak.
12. Edit atau void transfer mempertahankan invariant ledger dan audit trail.
13. Opening balance tidak menambah income.
14. Arsip wallet tidak menghilangkan saldo dan histori dari rekonsiliasi.
15. Batas awal/akhir bulan untuk waktu Asia/Jakarta benar walau DB menyimpan UTC.
16. Semua perhitungan uang aman untuk angka besar; tidak ada floating point precision bug.
17. Kode undangan kedaluwarsa, sudah dipakai maksimum, atau revoked ditolak.
18. Owner terakhir tidak dapat dikeluarkan sebelum transfer ownership.

**Jangan menyebut tugas selesai apabila test penting transfer, keamanan akses household, dan saldo belum lulus.**

## 13. PRIORITAS IMPLEMENTASI

Bekerja secara iteratif dan menghasilkan **kode nyata yang dapat dijalankan** pada tiap fase:

### Fase 1 — Foundation

Inisialisasi stack, Docker PostgreSQL, Prisma schema/migrations, design system, env example, lint/typecheck/test config, README.

### Fase 2 — Authentication & Household

Register/login username+PIN, hashed PIN, session, logout, recovery codes, permission system, create/switch household, member invitations.

### Fase 3 — Wallets & Financial Ledger

CRUD wallet, opening balance, transaksi income/expense/transfer atomik, transfer fee, histori, edit/void/reversal, audit logs, isolation tests.

### Fase 4 — Dashboard & Reports

Summary IDR, wallet overview, period filters, charts, recent activity, laporan akurat, UX mobile responsive.

### Fase 5 — Enhancements

Budget, export CSV, recurring transactions, search lanjutan, PWA yang aman, dan polish. Fitur-fitur ini **tidak boleh menghambat penyelesaian Fase 1–4**.

## 14. DEFINITION OF DONE

Proyek dianggap selesai untuk MVP bila:

- `docker compose up -d` menyalakan DB lokal.
- Setup env, migrate, seed, dan dev server terdokumentasi dengan langkah yang benar.
- Pengguna bisa register/login via username+PIN, membangun household, mengundang user lain, membuat beberapa wallet, dan mencatat income/expense/transfer dari UI.
- Semua mutasi mempunyai server-side auth + role checks + validasi.
- Transfer RpX **tidak muncul sebagai income/expense**, walau saldo masing-masing wallet berubah.
- Dashboard dan laporan merekonsiliasi ledger dengan benar.
- Typecheck, lint, unit/integration tests utama, dan Playwright smoke tests lulus.
- Ada `.env.example`, README, script migrate/seed/test, kebijakan backup sederhana, dan deployment checklist.
- Semua layar utama usable pada 375px mobile dan desktop; empty/loading/error states berfungsi.

## 15. FORMAT RESPONS CODING AGENT

Saat mulai bekerja:

1. Periksa repository. Jika kosong, scaffold proyek. Jika sudah berisi kode, identifikasi apa yang bisa digunakan kembali.
2. Berikan ringkasan arsitektur singkat, keputusan data model, dan rencana fase; lalu **langsung implementasikan Fase 1**, bukan hanya menyarankan.
3. Untuk setiap fase, tunjukkan file yang ditambah/diubah, perintah yang sudah dijalankan, hasil pengujian yang benar-benar terjadi, dan kendala nyata.
4. Jangan menuliskan klaim `tested`, `production-ready`, atau `completed` tanpa bukti eksekusi yang sesuai.
5. Jika tool/lingkungan tidak mengizinkan suatu langkah, jelaskan keterbatasannya dan berikan implementasi terbaik yang tetap bisa dikerjakan.
6. Jangan menghasilkan pseudocode sebagai pengganti implementasi pada fitur inti.
7. Bila ada pilihan desain yang tidak didefinisikan di sini, pilih opsi paling sederhana yang menjaga **security, correctness, auditability, dan maintainability**, dokumentasikan alasannya, dan lanjutkan bekerja.

## 16. OPTIONAL FUTURE SCOPE (BUKAN MVP)

- Multi-currency dengan exchange rate dan accounting gain/loss yang jelas.
- Recurring expenses & auto-posting yang idempotent.
- Upload bukti transaksi ke storage privat.
- Natural-language input transaksi (harus dikonfirmasi user sebelum posting).
- Import CSV bank/e-wallet dengan proses matching dan deduplikasi.
- Goals, debt tracking, shared budgets, per-member spending limits.
- Push notification dan offline drafts dengan sinkronisasi aman.

**INSTRUKSI PENUTUP:** Prioritaskan alur login username+PIN, multi-household, multi-wallet, dan transfer internal yang akuntansinya benar. Kualitas ledger, transaksi atomik, kontrol akses, dan kemudahan UX lebih penting daripada menambahkan banyak fitur. Implementasikan aplikasinya, bukan hanya desainnya.
