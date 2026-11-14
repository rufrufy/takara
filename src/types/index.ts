export type TransactionType = 'income' | 'expense' | 'transfer' | 'opening_balance';

export type WalletType = 'cash' | 'checking' | 'digital' | 'custom';

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  displayName: string;
  pinHash?: string; // 5-digit unique code
  avatarUrl?: string;
  role?: UserRole;
  createdAt: string;
}

export interface Household {
  id: string;
  name: string;
  baseCurrency: 'IDR';
  createdById: string;
  inviteCode?: string; // Kode unik untuk invite keluarga (misal: DK-KLRG-8921)
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  displayName: string;
  role: UserRole;
  joinedAt: string;
}

export interface Wallet {
  id: string;
  householdId: string;
  name: string;
  type: WalletType;
  institutionName?: string;
  currency: 'IDR';
  balance: number; // calculated from ledger
  color?: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  householdId: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  icon?: string;
  color?: string;
  isArchived?: boolean;
}

export interface LedgerEntry {
  id: string;
  householdId: string;
  transactionId: string;
  walletId: string;
  signedAmount: number; // positive for credit, negative for debit
  entryType: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'FEE' | 'OPENING';
  postedAt: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  no?: number;
  householdId: string;
  type: TransactionType;
  amount: number; // in Rupiah (integer)
  fee?: number; // transfer fee
  sourceWalletId?: string;
  destinationWalletId?: string;
  categoryId?: string;
  categoryName?: string;
  categoryType?: 'income' | 'expense';
  label?: string; // Kolom Label transaksi (Sarapan, Makan siang, AI, Reina, dll)
  description?: string;
  notes?: string;
  imageUrl?: string; // URL atau Base64 foto nota/struk
  effectiveAt: string; // ISO date string or formatted date
  dateStr?: string;
  day?: string;
  time?: string;
  sourceAsset?: string;
  sourceAssetType?: string;
  destinationAsset?: string;
  addedBy: string; // User display name
  autoIncome?: boolean;
  fromSavings?: boolean;
  fromInvestment?: boolean;
  status: 'POSTED' | 'VOIDED';
  createdAt: string;
  updatedAt: string;
}

export interface ExcelImportSummary {
  householdName: string;
  exportedOn: string;
  currency: string;
  totalTransactions: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  topCategories: { name: string; amountStr: string }[];
  labelsList?: string[];
  walletsList?: string[];
}
export interface DebtItem {
  id: string;
  householdId: string;
  type: 'debt' | 'receivable'; // debt = Keluarga Berutang, receivable = Piutang (orang lain berutang ke kita)
  personOrEntity: string;
  amount: number;
  remainingAmount: number;
  monthlyInstallment?: number; // Nominal cicilan per bulan (Rp)
  dueDay?: number; // Tanggal jatuh tempo (1-31)
  dueDate?: string;
  notes?: string;
  isSettled: boolean;
  isPaidThisMonth?: boolean; // Status apakah cicilan bulan berjalan sudah dibayar
  lastPaidMonth?: string; // Penanda bulan pembayaran terakhir, e.g. '2026-11'
  imageUrl?: string; // Foto bukti transfer / struk pembayaran cicilan
  createdAt: string;
}

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'custom';
  apiUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  secretKey?: string;
  bucket: string;
}

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  device: string;
  browser: string;
  loginAt: string;
  lastActiveAt: string;
  ipAddress?: string;
  isCurrent: boolean;
}

export interface AppState {
  currentUser: User;
  households: Household[];
  activeHouseholdId: string;
  members: HouseholdMember[];
  wallets: Wallet[];
  categories: Category[];
  labels: string[]; // Daftar label dinamis yang bisa ditambah pengguna
  transactions: FinancialTransaction[];
  ledgerEntries: LedgerEntry[];
  debts?: DebtItem[];
  importHistory?: ExcelImportSummary[];
  isLocked: boolean;
  isAuthenticated?: boolean;
  activeSessionId?: string;
  sessions?: UserSession[];
  aiConfig?: AIConfig;
  supabaseConfig?: SupabaseConfig;
}
