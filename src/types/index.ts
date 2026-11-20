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
  debtId?: string;
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
  type: 'debt' | 'receivable';
  personOrEntity: string;
  amount: number;
  remainingAmount: number;
  monthlyInstallment?: number;
  dueDay?: number;
  dueDate?: string;
  notes?: string;
  isSettled: boolean;
  isPaidThisMonth?: boolean;
  lastPaidMonth?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  householdId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  linkedWalletId?: string;
  deadline?: string;
  icon: string;
  color: string;
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudget {
  id: string;
  householdId: string;
  categoryId?: string;
  categoryName: string;
  monthlyLimit: number;
  alertThreshold: number;
  updatedAt: string;
}

export type ChallengeTargetType = 'spending_cap' | 'no_spend_category' | 'streak_days';

export interface FamilyChallenge {
  id: string;
  householdId: string;
  title: string;
  targetType: ChallengeTargetType;
  categoryName?: string;
  maxAmount?: number;
  targetDays?: number;
  startDate: string;
  endDate: string;
  rewardBadge: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  createdBy?: string;
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
  labels: string[];
  transactions: FinancialTransaction[];
  ledgerEntries: LedgerEntry[];
  debts?: DebtItem[];
  savingsGoals?: SavingsGoal[];
  categoryBudgets?: CategoryBudget[];
  familyChallenges?: FamilyChallenge[];
  importHistory?: ExcelImportSummary[];
  isLocked: boolean;
  isAuthenticated?: boolean;
  activeSessionId?: string;
  sessions?: UserSession[];
  aiConfig?: AIConfig;
  supabaseConfig?: SupabaseConfig;
}

export type HouseholdNotificationKind =
  | 'transaction_income'
  | 'transaction_expense'
  | 'transaction_transfer'
  | 'wallet'
  | 'debt'
  | 'savings_goal'
  | 'budget'
  | 'challenge'
  | 'member'
  | 'category';

export interface HouseholdNotification {
  id: string;
  householdId: string;
  kind: HouseholdNotificationKind;
  title: string;
  message: string;
  actor?: string;
  amount?: number;
  entityId?: string;
  targetTab?: 'beranda' | 'transaksi' | 'profil-keuangan' | 'laporan' | 'pengaturan';
  createdAt: string;
  read: boolean;
}
