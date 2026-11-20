-- ==============================================================================
-- TAKARA KEUANGAN KELUARGA - SUPABASE DATABASE SCHEMA
-- Skema Database PostgreSQL Lengkap untuk Pencatatan Keuangan Rumah Tangga
-- Multi-Household, Multi-Wallet, Double-Entry Ledger, Utang Piutang & AI Struk
-- ==============================================================================

-- 1. Tabel Households (Rumah Tangga / Akun Keuangan)
CREATE TABLE IF NOT EXISTS public.households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'IDR',
  created_by_id TEXT,
  invite_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Household Members (Anggota Keluarga per Household)
CREATE TABLE IF NOT EXISTS public.household_members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel Wallets (Aset & Dompet Finansial)
CREATE TABLE IF NOT EXISTS public.wallets (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking',
  institution_name TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  balance BIGINT NOT NULL DEFAULT 0,
  color TEXT,
  icon TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabel Categories (Kategori Pemasukan, Pengeluaran & Transfer)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Tabel Transactions (Transaksi Keuangan)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  no BIGINT,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  fee BIGINT DEFAULT 0,
  source_wallet_id TEXT,
  destination_wallet_id TEXT,
  category_id TEXT,
  category_name TEXT,
  category_type TEXT,
  label TEXT,
  description TEXT,
  notes TEXT,
  image_url TEXT,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_str TEXT,
  day TEXT,
  time TEXT,
  source_asset TEXT,
  source_asset_type TEXT,
  destination_asset TEXT,
  added_by TEXT NOT NULL,
  auto_income BOOLEAN DEFAULT FALSE,
  from_savings BOOLEAN DEFAULT FALSE,
  from_investment BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'POSTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabel Ledger Entries (Pencatatan Buku Besar Double-Entry Berbasis Nilai Bertanda)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL,
  signed_amount BIGINT NOT NULL,
  entry_type TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabel Debts (Daftar Utang & Piutang Keluarga)
CREATE TABLE IF NOT EXISTS public.debts (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'debt' (Keluarga Berutang) atau 'receivable' (Piutang)
  person_or_entity TEXT NOT NULL,
  amount BIGINT NOT NULL,
  remaining_amount BIGINT NOT NULL,
  monthly_installment BIGINT DEFAULT 0,
  due_day INT,
  due_date TEXT,
  notes TEXT,
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  is_paid_this_month BOOLEAN NOT NULL DEFAULT FALSE,
  last_paid_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tabel App Users (Pengguna Sistem & PIN Otentikasi)
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL DEFAULT '12345',
  role TEXT NOT NULL DEFAULT 'MEMBER',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabel Savings Goals (Kantong Impian / Target Tabungan Keluarga)
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount BIGINT NOT NULL,
  current_amount BIGINT NOT NULL DEFAULT 0,
  linked_wallet_id TEXT,
  deadline TEXT,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#06D6A0',
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Tabel Category Budgets (Pagu Anggaran Bulanan per Kategori)
CREATE TABLE IF NOT EXISTS public.category_budgets (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id TEXT,
  category_name TEXT NOT NULL,
  monthly_limit BIGINT NOT NULL,
  alert_threshold INT NOT NULL DEFAULT 80,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tabel Family Challenges (Tantangan Hemat Keluarga)
CREATE TABLE IF NOT EXISTS public.family_challenges (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'spending_cap',
  category_name TEXT,
  max_amount BIGINT DEFAULT 0,
  target_days INT DEFAULT 7,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reward_badge TEXT DEFAULT '🏆',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Tabel Household Labels (Label Kustom per Household)
CREATE TABLE IF NOT EXISTS public.household_labels (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_household ON public.transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_effective_at ON public.transactions(effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_household ON public.ledger_entries(household_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet ON public.ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallets_household ON public.wallets(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household ON public.categories(household_id);
CREATE INDEX IF NOT EXISTS idx_debts_household ON public.debts(household_id);
CREATE INDEX IF NOT EXISTS idx_debts_settled ON public.debts(is_settled);
CREATE INDEX IF NOT EXISTS idx_savings_goals_household ON public.savings_goals(household_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_household ON public.category_budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_family_challenges_household ON public.family_challenges(household_id);
CREATE INDEX IF NOT EXISTS idx_household_labels_household ON public.household_labels(household_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - IDEMPOTENT STANDAR POSTGRESQL
-- ==============================================================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_households ON public.households;
CREATE POLICY allow_all_households ON public.households FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_members ON public.household_members;
CREATE POLICY allow_all_members ON public.household_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_wallets ON public.wallets;
CREATE POLICY allow_all_wallets ON public.wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_categories ON public.categories;
CREATE POLICY allow_all_categories ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_transactions ON public.transactions;
CREATE POLICY allow_all_transactions ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_ledger_entries ON public.ledger_entries;
CREATE POLICY allow_all_ledger_entries ON public.ledger_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_debts ON public.debts;
CREATE POLICY allow_all_debts ON public.debts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_app_users ON public.app_users;
CREATE POLICY allow_all_app_users ON public.app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_savings_goals ON public.savings_goals;
CREATE POLICY allow_all_savings_goals ON public.savings_goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_category_budgets ON public.category_budgets;
CREATE POLICY allow_all_category_budgets ON public.category_budgets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_family_challenges ON public.family_challenges;
CREATE POLICY allow_all_family_challenges ON public.family_challenges FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_household_labels ON public.household_labels;
CREATE POLICY allow_all_household_labels ON public.household_labels FOR ALL USING (true) WITH CHECK (true);
