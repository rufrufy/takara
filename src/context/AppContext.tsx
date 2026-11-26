import {isDebtOpeningTransaction} from '../lib/transactionVisibility';
import {monthlyActivity} from '../lib/monthlyBalance';
import {parseFinancialBackup,backupSummary} from '../lib/jsonBackup';
import {
  inviteAccount,
  authenticateAccount,
  getCurrentAccount,
  changeAccountPin,
  registerAccount,
  adminListDirectory,
  adminCreateAccount,
  adminUpdateAccount,
  adminDeleteAccount,
  adminCreateHousehold,
  adminUpdateHousehold,
  adminDeleteHousehold,
  adminAddHouseholdMember,
  adminUpdateHouseholdMember,
  adminRemoveHouseholdMember,
  signOutAccount,
  getReceiptAuthClient,
  getRequiredPinLength,
  isValidPinFormat
} from '../lib/receiptAuth';
import {jakartaDateTime} from '../lib/dateTime';
import {loadUserFinancialData} from '../lib/financialBootstrap';
import {uploadReceiptPhoto,clearReceiptSession} from '../lib/attachments';
import {formatIDR} from '../lib/money';
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import type {
  AppState,
  FinancialTransaction,
  LedgerEntry,
  Wallet,
  Category,
  Household,
  HouseholdMember,
  HouseholdNotification,
  HouseholdNotificationKind,
  ExcelImportSummary,
  TransactionType,
  WalletType,
  DebtItem,
  SavingsGoal,
  CategoryBudget,
  FamilyChallenge,
  UserRole,
  AIConfig,
  SupabaseConfig,
  UserSession,
  User
} from '../types';
import { initialData, createFreshUserData } from '../lib/initialData';
import { DEFAULT_AI_CONFIG, getSystemAIConfig, saveSystemAIConfig } from '../lib/aiScanner';
import {
  DEFAULT_SUPABASE_CONFIG,
  resetMonthlyBalancesInSupabase,
  rollbackMonthlyBalanceInSupabase,
  importFinancialBackupToSupabase,
  saveCategoryToSupabase,
  removeCategoryFromSupabase,
  fetchUserHouseholds,
  joinSupabaseHousehold,
  syncTransactionToSupabase,
  syncDebtPaymentToSupabase,
  deleteTransactionFromSupabase,
  syncDebtToSupabase,
  deleteDebtFromSupabase,
  syncSavingsGoalToSupabase,
  deleteSavingsGoalFromSupabase,
  syncCategoryBudgetToSupabase,
  deleteCategoryBudgetFromSupabase,
  syncFamilyChallengeToSupabase,
  deleteFamilyChallengeFromSupabase,
  readLocalHouseholdExtras,
  pushAllDataToSupabase,
  pullAllDataFromSupabase,
  fetchUsersFromSupabase,
  syncWalletToSupabase,
  deleteWalletFromSupabase,
  deleteHouseholdFromSupabase
} from '../lib/supabase';
import { parseFinancialExcel } from '../lib/excelImporter';
import {
  discardHouseholdSync
} from '../lib/syncEngine';
const serializeSessionState = (value: Partial<AppState>) => JSON.stringify({
  ...value, currentUser:value.currentUser?{...value.currentUser,pinHash:''}:undefined, transactions: [], ledgerEntries: [], debts: [], wallets: [], categories: []
});
const defaultDebts: DebtItem[] = [];
const STORAGE_KEY = 'dompetkita_app_state_v2';
const CURRENT_USER_KEY = 'dompetkita_active_username_v2';
const REGISTERED_USERS_KEY = 'dompetkita_registered_users_v2';
const MIGRATION_CLEAN_KEY = 'takara_v3_clean_users_migrated';
if(typeof window!=='undefined'){
  try{
    for(const key of ['dompetkita_registered_users_v1','dompetkita_registered_users_v2'])localStorage.removeItem(key);
    const keys=Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter((key):key is string=>Boolean(key&&((key.startsWith('dompetkita_app_state_user_'))||key==='dompetkita_app_state_v2')));
    for(const key of keys){try{const old=JSON.parse(localStorage.getItem(key)||'{}');if(old.currentUser)old.currentUser.pinHash='';if(Array.isArray(old.registeredUsers))old.registeredUsers=old.registeredUsers.map((user:User)=>({...user,pinHash:''}));localStorage.setItem(key,JSON.stringify(old));}catch{}}
  }catch{}
}


// Pembersihan otomatis data dummy lama saat startup
if (typeof window !== 'undefined') {
  try {
    const isCleanMigrated = localStorage.getItem(MIGRATION_CLEAN_KEY);
    if (!isCleanMigrated) {
      localStorage.removeItem('dompetkita_app_state_user_maruf');
      localStorage.removeItem('dompetkita_app_state_user_budi');
      localStorage.removeItem('dompetkita_app_state_v2');
      localStorage.removeItem('dompetkita_active_username_v2');
      localStorage.removeItem('dompetkita_registered_users_v1');
      localStorage.setItem(MIGRATION_CLEAN_KEY, 'true');
    }
  } catch {
    // abaikan jika storage terisolasi
  }
}

const NOTIFICATIONS_STORAGE_KEY = 'takara_notifications_v1';

const loadStoredNotifications = (): HouseholdNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HouseholdNotification[]).slice(0, 30) : [];
  } catch {
    return [];
  }
};

type NewNotificationPayload = Omit<HouseholdNotification, 'id' | 'createdAt' | 'read'>;

const buildTransactionNotification = (tx: {
  id: string;
  householdId: string;
  type?: string;
  amount?: number;
  description?: string;
  categoryName?: string;
  addedBy?: string;
  status?: string;
}): NewNotificationPayload | null => {
  if (tx.status === 'VOIDED' || tx.type === 'opening_balance' || isDebtOpeningTransaction(tx)) {
    return null;
  }
  const actor = String(tx.addedBy || 'Anggota').trim().split(' ')[0] || 'Anggota';
  const amount = Math.round(Number(tx.amount || 0));
  const detail = String(tx.description || tx.categoryName || 'Transaksi').trim();

  let kind: HouseholdNotificationKind = 'transaction_expense';
  let verb = 'mencatat Pengeluaran';
  if (tx.type === 'income') {
    kind = 'transaction_income';
    verb = 'mencatat Pemasukan';
  } else if (tx.type === 'transfer') {
    kind = 'transaction_transfer';
    verb = 'mencatat Transfer';
  }

  return {
    householdId: tx.householdId,
    kind,
    title: `${actor} ${verb}`,
    message: `${detail} · ${formatIDR(amount)}`,
    actor: tx.addedBy,
    amount,
    entityId: tx.id,
    targetTab: 'transaksi'
  };
};

const buildWalletNotification = (w: { id: string; householdId: string; name?: string }): NewNotificationPayload => ({
  householdId: w.householdId,
  kind: 'wallet',
  title: 'Dompet baru ditambahkan',
  message: `Dompet ${String(w.name || 'Baru')}`,
  entityId: w.id,
  targetTab: 'profil-keuangan'
});

const buildDebtNotification = (d: {
  id: string;
  householdId: string;
  type?: string;
  personOrEntity?: string;
  amount?: number;
}): NewNotificationPayload => ({
  householdId: d.householdId,
  kind: 'debt',
  title: d.type === 'receivable' ? 'Piutang baru dicatat' : 'Utang baru dicatat',
  message: `${String(d.personOrEntity || 'Catatan')} · ${formatIDR(Number(d.amount || 0))}`,
  amount: Number(d.amount || 0),
  entityId: d.id,
  targetTab: 'profil-keuangan'
});

const buildSavingsGoalNotification = (g: {
  id: string;
  householdId: string;
  title?: string;
  targetAmount?: number;
}): NewNotificationPayload => ({
  householdId: g.householdId,
  kind: 'savings_goal',
  title: 'Kantong impian baru',
  message: `${String(g.title || 'Impian')} · Target ${formatIDR(Number(g.targetAmount || 0))}`,
  amount: Number(g.targetAmount || 0),
  entityId: g.id,
  targetTab: 'profil-keuangan'
});

const buildCategoryBudgetNotification = (b: {
  id: string;
  householdId: string;
  categoryName?: string;
  monthlyLimit?: number;
}): NewNotificationPayload => ({
  householdId: b.householdId,
  kind: 'budget',
  title: 'Pagu anggaran diatur',
  message: `${String(b.categoryName || 'Kategori')} · Maks ${formatIDR(Number(b.monthlyLimit || 0))}/bln`,
  amount: Number(b.monthlyLimit || 0),
  entityId: b.id,
  targetTab: 'laporan'
});

const buildFamilyChallengeNotification = (ch: {
  id: string;
  householdId: string;
  title?: string;
  createdBy?: string;
}): NewNotificationPayload => ({
  householdId: ch.householdId,
  kind: 'challenge',
  title: 'Tantangan keluarga baru',
  message: String(ch.title || 'Tantangan hemat baru'),
  actor: ch.createdBy,
  entityId: ch.id,
  targetTab: 'beranda'
});

const buildMemberNotification = (m: {
  id: string;
  householdId: string;
  displayName?: string;
}): NewNotificationPayload => ({
  householdId: m.householdId,
  kind: 'member',
  title: 'Anggota baru bergabung',
  message: `${String(m.displayName || 'Anggota')} bergabung ke household`,
  actor: m.displayName,
  entityId: m.id,
  targetTab: 'pengaturan'
});

const buildCategoryNotification = (c: {
  id: string;
  householdId: string;
  name?: string;
}): NewNotificationPayload => ({
  householdId: c.householdId,
  kind: 'category',
  title: 'Kategori baru ditambahkan',
  message: `Kategori ${String(c.name || 'Baru')}`,
  entityId: c.id,
  targetTab: 'pengaturan'
});

const getUserStorageKey = (username: string) => `dompetkita_app_state_user_${username.toLowerCase().trim()}`;

const FALLBACK_HOUSEHOLD: Household = {
  id: 'hh-default',
  name: 'Keuangan Keluarga',
  baseCurrency: 'IDR',
  createdById: 'user-system',
  inviteCode: 'TK-INIT-1000',
  createdAt: new Date().toISOString()
};
interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  fee?: number;
  sourceWalletId?: string;
  destinationWalletId?: string;
  sourceAsset?: string;
  destinationAsset?: string;
  dateStr?: string;
  categoryId?: string;
  categoryName?: string;
  label?: string; // Label transaksi (e.g. Sarapan, Makan siang, Reina, AI)
  description?: string;
  notes?: string;
  imageUrl?: string;
  effectiveAt?: string;
  addedBy?: string;
}
interface AppContextValue {
  state: AppState;
  isFinancialReady: boolean;
  isAuthReady: boolean;
  activeHousehold: Household;
  households: Household[];
  wallets: Wallet[];
  categories: Category[];
  labels: string[];
  members: HouseholdMember[];
  transactions: FinancialTransaction[];
  ledgerEntries: LedgerEntry[];
  totalBalance: number;
  periodIncome: number;
  periodExpense: number;
  netCashFlow: number;
  editTransaction: (id: string, updatedFields: Partial<FinancialTransaction>) => Promise<{ success: boolean; error?: string }>;
  debts: DebtItem[];
  addDebt: (item: Omit<DebtItem, 'id' | 'householdId' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  toggleDebtSettled: (id: string) => Promise<{success:boolean;error?:string}>;
  toggleDebtPaidThisMonth: (id: string) => Promise<{success:boolean;error?:string}>;
  payDebtInstallment: (id: string, walletId?: string, imageUrl?: string) => Promise<{ success: boolean; error?: string }>;
  updateDebt: (id: string, updates: Partial<DebtItem>) => Promise<{success:boolean;error?:string}>;
  deleteDebt: (id: string) => Promise<{success:boolean;error?:string}>;
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'householdId' | 'isCompleted' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<{ success: boolean; error?: string }>;
  contributeToSavingsGoal: (goalId: string, amount: number, sourceWalletId?: string) => Promise<{ success: boolean; error?: string }>;
  deleteSavingsGoal: (id: string) => Promise<{ success: boolean; error?: string }>;
  categoryBudgets: CategoryBudget[];
  upsertCategoryBudget: (categoryName: string, monthlyLimit: number, categoryId?: string, alertThreshold?: number) => Promise<{ success: boolean; error?: string }>;
  deleteCategoryBudget: (id: string) => Promise<{ success: boolean; error?: string }>;
  familyChallenges: FamilyChallenge[];
  addFamilyChallenge: (input: Omit<FamilyChallenge, 'id' | 'householdId' | 'status' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  deleteFamilyChallenge: (id: string) => Promise<{ success: boolean; error?: string }>;
  addTransaction: (input: NewTransactionInput) => Promise<{ success: boolean; error?: string }>;
  voidTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearCurrentMonthTransactions: () => Promise<{ success: boolean; count: number; error?: string }>;
  resetMonthlyBalances: (period?:string) => Promise<{success:boolean;count?:number;alreadyReset?:boolean;error?:string}>;
  rollbackMonthlyBalance: (checkpointId:string) => Promise<{success:boolean;count?:number;alreadyRolledBack?:boolean;error?:string}>;
  addWallet: (name: string, type: WalletType, openingBalance?: number, color?: string) => Promise<{success:boolean;error?:string}>;
  updateWallet: (walletId: string, updates: { name?: string; type?: WalletType; color?: string; institutionName?: string; targetBalance?: number }) => Promise<{success:boolean;error?:string}>;
  deleteWallet: (walletId: string) => Promise<{success:boolean;error?:string}>;
  addCategory: (name: string, type: 'income' | 'expense' | 'transfer', icon?: string, color?: string) => Promise<{success:boolean;category?:Category;error?:string}>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{success:boolean;error?:string}>;
  deleteCategory: (id:string) => Promise<{success:boolean;error?:string}>;
  addLabel: (name: string) => Promise<{success:boolean;error?:string}>;
  switchHousehold: (householdId: string) => void;
  createHousehold: (name: string, ownerUserId?: string) => Promise<{success:boolean;error?:string}>;
  updateHousehold: (householdId: string, name: string, options?: { baseCurrency?: string; regenerateInviteCode?: boolean }) => Promise<{success:boolean;error?:string}>;
  deleteHousehold: (householdId: string) => Promise<{ success: boolean; error?: string }>;
  importExcelFile: (file: File) => Promise<{ success: boolean; summary?: ExcelImportSummary; error?: string }>;
  importJSONFile: (file:File) => Promise<{success:boolean;summary?:ExcelImportSummary;imported?:number;skipped?:number;error?:string}>;
  resetToDefault: () => void;
  verifyAndUnlock: (pin: string) => Promise<boolean>;
  loginUser: (username: string, code5Digit: string) => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
  updatePIN: (newPin: string,currentPin:string) => Promise<{success:boolean;error?:string}>;
  inviteMember: (displayName: string, username: string, role: UserRole, pin5Digit: string) => Promise<{success:boolean;error?:string}>;
  updateMember: (memberId: string, updates: { displayName?: string; role?: UserRole; username?: string; pin5Digit?: string }) => Promise<{success:boolean;error?:string}>;
  removeMember: (memberId: string) => Promise<{success:boolean;error?:string}>;
  updateAIConfig: (cfg: Partial<AIConfig>) => void;
  updateSupabaseConfig: (cfg: Partial<SupabaseConfig>) => void;
  syncAllToSupabase: () => Promise<{ success: boolean; message: string; count?: number }>;
  syncFromSupabase: () => Promise<{ success: boolean; message: string }>;
  supabaseSyncStatus: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSynced?: string; error?: string; count?: number };
  logoutUser: () => void;
  terminateSession: (sessionId: string) => void;
  sessions: UserSession[];
  activeSession: UserSession | null;
  registeredUsers: User[];
  registerUser: (displayName: string, username: string, pin5Digit: string, householdCode?: string) => Promise<{ success: boolean; error?: string }>;
  joinHouseholdByCode: (inviteCode: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  adminCreateUser: (displayName: string, username: string, pin5Digit: string, role?: UserRole, householdId?: string) => Promise<{ success: boolean; error?: string }>;
  updateRegisteredUser: (usernameOrId: string, updates: { displayName?: string; username?: string; pin5Digit?: string; role?: UserRole }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (usernameOrId: string) => Promise<{ success: boolean; error?: string }>;
  refreshAdminDirectory: () => Promise<{ success: boolean; error?: string }>;
  addMemberToHousehold: (householdId: string, displayName: string, usernameOrUserId: string, role?: UserRole) => Promise<{success:boolean;error?:string}>;
  removeMemberFromHousehold: (memberId: string) => Promise<{success:boolean;error?:string}>;
  allHouseholds: Household[];
  allMembers: HouseholdMember[];
  notifications: HouseholdNotification[];
  activeToasts: HouseholdNotification[];
  unreadNotificationCount: number;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const reconstructMissingLedgers = (
  transactions: FinancialTransaction[],
  existingLedgers: LedgerEntry[],
  householdId: string,
  wallets: Wallet[] = []
): LedgerEntry[] => {
  const ledgerTxSet = new Set((existingLedgers || []).map(le => le.transactionId).filter(Boolean));
  const result: LedgerEntry[] = [...(existingLedgers || [])];

  const walletByName = new Map<string, string>();
  for (const w of wallets) {
    walletByName.set(w.name.toLowerCase().trim(), w.id);
  }
  const defaultWalletId = wallets[0]?.id || '';

  for (const tx of transactions) {
    if(isDebtOpeningTransaction(tx))continue;
    if (tx.householdId !== householdId || tx.status === 'VOIDED') continue;
    if (ledgerTxSet.has(tx.id)) continue;
    if (tx.type === 'opening_balance' && !tx.sourceWalletId && !tx.destinationWalletId) continue;

    const srcId = tx.sourceWalletId || (tx.sourceAsset ? walletByName.get(tx.sourceAsset.toLowerCase().trim()) : '') || defaultWalletId;
    const dstId = tx.destinationWalletId || (tx.destinationAsset ? walletByName.get(tx.destinationAsset.toLowerCase().trim()) : '') || defaultWalletId;

    if (tx.type === 'income') {
      const wId = dstId || srcId;
      if (wId) {
        result.push({
          id: `led-${tx.id}-inc`,
          householdId,
          transactionId: tx.id,
          walletId: wId,
          signedAmount: Math.round(tx.amount),
          entryType: 'INCOME',
          postedAt: tx.effectiveAt,
          createdAt: tx.createdAt
        });
      }
    } else if (tx.type === 'expense') {
      const wId = srcId || dstId;
      if (wId) {
        result.push({
          id: `led-${tx.id}-exp`,
          householdId,
          transactionId: tx.id,
          walletId: wId,
          signedAmount: -Math.round(tx.amount),
          entryType: 'EXPENSE',
          postedAt: tx.effectiveAt,
          createdAt: tx.createdAt
        });
      }
    } else if (tx.type === 'transfer') {
      if (srcId) {
        result.push({
          id: `led-${tx.id}-tout`,
          householdId,
          transactionId: tx.id,
          walletId: srcId,
          signedAmount: -Math.round(tx.amount),
          entryType: 'TRANSFER_OUT',
          postedAt: tx.effectiveAt,
          createdAt: tx.createdAt
        });
      }
      if (dstId) {
        result.push({
          id: `led-${tx.id}-tin`,
          householdId,
          transactionId: tx.id,
          walletId: dstId,
          signedAmount: Math.round(tx.amount),
          entryType: 'TRANSFER_IN',
          postedAt: tx.effectiveAt,
          createdAt: tx.createdAt
        });
      }
      if (tx.fee && tx.fee > 0 && srcId) {
        result.push({
          id: `led-${tx.id}-fee`,
          householdId,
          transactionId: tx.id,
          walletId: srcId,
          signedAmount: -Math.round(tx.fee),
          entryType: 'FEE',
          postedAt: tx.effectiveAt,
          createdAt: tx.createdAt
        });
      }
    } else if (tx.type === 'opening_balance') {
      const wId = dstId || srcId;
      if (wId) {
        result.push({
          id: `led-${tx.id}-open`,
          householdId,
          transactionId: tx.id,
          walletId: wId,
          signedAmount: Math.round(tx.amount),
          entryType: 'OPENING',
          postedAt: tx.effectiveAt,
          createdAt: tx.createdAt
        });
      }
    }
  }

  return result;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const financialVersion = useRef(0);
  const activeMutationCount=useRef(0);
  const duringWrite=async<T,>(job:()=>Promise<T>):Promise<T>=>{activeMutationCount.current++;financialVersion.current++;try{return await job();}finally{activeMutationCount.current--;financialVersion.current++;}};
  const loadedHousehold = useRef('');
  const [isFinancialReady,setIsFinancialReady] = useState(false);
  const isFinancialReadyRef = useRef(false);
  isFinancialReadyRef.current = isFinancialReady;
  const [registeredUsers,setRegisteredUsers]=useState<User[]>([]);
  const [authReady,setAuthReady]=useState(false);
  const [state,setState]=useState<AppState>({...initialData,isAuthenticated:false,isLocked:true,transactions:[],ledgerEntries:[],wallets:[],categories:[],debts:[],members:[],households:[]});

  // Top-right Household Activity Notifications & Toasts
  const [allNotifications, setAllNotifications] = useState<HouseholdNotification[]>(loadStoredNotifications);
  const [activeToasts, setActiveToasts] = useState<HouseholdNotification[]>([]);
  const localMutationIdsRef = useRef<Set<string>>(new Set());
  const notifiedKeysRef = useRef<Set<string>>(new Set());
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const snapshotRef = useRef<{
    householdId: string;
    ready: boolean;
    txIds: Set<string>;
    walletIds: Set<string>;
    debtIds: Set<string>;
    goalIds: Set<string>;
    budgetIds: Set<string>;
    challengeIds: Set<string>;
    memberIds: Set<string>;
    catIds: Set<string>;
  }>({
    householdId: '',
    ready: false,
    txIds: new Set(),
    walletIds: new Set(),
    debtIds: new Set(),
    goalIds: new Set(),
    budgetIds: new Set(),
    challengeIds: new Set(),
    memberIds: new Set(),
    catIds: new Set()
  });

  const markLocalMutation = useCallback((id?: string) => {
    if (!id) return;
    localMutationIdsRef.current.add(id);
    setTimeout(() => {
      localMutationIdsRef.current.delete(id);
    }, 60_000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(allNotifications.slice(0, 30)));
    } catch {}
  }, [allNotifications]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(timer => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  const pushHouseholdNotification = useCallback(
    (dedupeKey: string, payload: NewNotificationPayload) => {
      if (notifiedKeysRef.current.has(dedupeKey)) return;
      notifiedKeysRef.current.add(dedupeKey);
      const notif: HouseholdNotification = {
        ...payload,
        id: `notif-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        read: false
      };
      setAllNotifications(prev => [notif, ...prev].slice(0, 30));
      setActiveToasts(prev => [notif, ...prev].slice(0, 3));
      const timer = setTimeout(() => {
        dismissToast(notif.id);
      }, 6000);
      toastTimersRef.current.set(notif.id, timer);
    },
    [dismissToast]
  );

  const markNotificationRead = useCallback((id: string) => {
    setAllNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const hid = state.activeHouseholdId;
    setAllNotifications(prev => prev.map(n => (n.householdId === hid ? { ...n, read: true } : n)));
  }, [state.activeHouseholdId]);

  const clearNotifications = useCallback(() => {
    const hid = state.activeHouseholdId;
    setAllNotifications(prev => prev.filter(n => n.householdId !== hid));
    setActiveToasts(prev => prev.filter(t => t.householdId !== hid));
  }, [state.activeHouseholdId]);

  const notifications = useMemo(
    () => allNotifications.filter(n => n.householdId === state.activeHouseholdId),
    [allNotifications, state.activeHouseholdId]
  );

  const householdToasts = useMemo(
    () => activeToasts.filter(t => t.householdId === state.activeHouseholdId),
    [activeToasts, state.activeHouseholdId]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  // Reset known-ID snapshot whenever active household/user changes
  useEffect(() => {
    snapshotRef.current = {
      householdId: state.activeHouseholdId,
      ready: false,
      txIds: new Set(),
      walletIds: new Set(),
      debtIds: new Set(),
      goalIds: new Set(),
      budgetIds: new Set(),
      challengeIds: new Set(),
      memberIds: new Set(),
      catIds: new Set()
    };
  }, [state.activeHouseholdId, state.currentUser.id, state.isAuthenticated]);

  // Keep snapshot populated with known household IDs once financial data is ready
  useEffect(() => {
    if (!isFinancialReady || !state.isAuthenticated || !state.activeHouseholdId) return;
    const hid = state.activeHouseholdId;
    const snap = snapshotRef.current;
    if (snap.householdId !== hid) return;

    for (const t of state.transactions || []) if (t.householdId === hid) snap.txIds.add(t.id);
    for (const w of state.wallets || []) if (w.householdId === hid) snap.walletIds.add(w.id);
    for (const d of state.debts || []) if (d.householdId === hid) snap.debtIds.add(d.id);
    for (const g of state.savingsGoals || []) if (g.householdId === hid) snap.goalIds.add(g.id);
    for (const b of state.categoryBudgets || []) if (b.householdId === hid) snap.budgetIds.add(b.id);
    for (const c of state.familyChallenges || []) if (c.householdId === hid) snap.challengeIds.add(c.id);
    for (const m of state.members || []) if (m.householdId === hid) snap.memberIds.add(m.id);
    for (const cat of state.categories || []) if (cat.householdId === hid) snap.catIds.add(cat.id);
    snap.ready = true;
  }, [
    isFinancialReady,
    state.isAuthenticated,
    state.activeHouseholdId,
    state.transactions,
    state.wallets,
    state.debts,
    state.savingsGoals,
    state.categoryBudgets,
    state.familyChallenges,
    state.members,
    state.categories
  ]);
  useEffect(()=>{let live=true;(async()=>{try{const user=await getCurrentAccount();if(!live||!user)return;let next={...createFreshUserData(user.username,user.displayName,''),currentUser:user,isAuthenticated:true,isLocked:false,transactions:[] as FinancialTransaction[],ledgerEntries:[] as LedgerEntry[],wallets:[] as Wallet[],categories:[] as Category[],debts:[] as DebtItem[],members:[] as HouseholdMember[],households:[] as Household[]};if(user.role==='ADMIN'){const pulled=await pullAllDataFromSupabase(DEFAULT_SUPABASE_CONFIG);if(!pulled.success)throw new Error(pulled.error||'Gagal memuat admin.');next={...next,...pulled.data};}if(live)setState(next);}catch(error){if(live)setSupabaseSyncStatus({status:'error',error:error instanceof Error?error.message:'Sesi tidak dapat dipulihkan.'});}finally{if(live)setAuthReady(true);}})();return()=>{live=false;};},[]);

  const refreshAdminDirectory = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const res = await adminListDirectory();
    if (!res.success) return { success: false, error: res.error || 'Gagal memuat direktori admin.' };
    const nextUsers = Array.isArray(res.users) ? (res.users as User[]) : [];
    const nextHouseholds = Array.isArray(res.households) ? (res.households as Household[]) : [];
    const nextMembers = Array.isArray(res.members) ? (res.members as HouseholdMember[]) : [];
    setRegisteredUsers(nextUsers);
    setState(prev => ({
      ...prev,
      households: nextHouseholds,
      members: nextMembers,
      activeHouseholdId:
        prev.activeHouseholdId && nextHouseholds.some(h => h.id === prev.activeHouseholdId)
          ? prev.activeHouseholdId
          : nextHouseholds[0]?.id || prev.activeHouseholdId
    }));
    return { success: true };
  }, []);

  // Legacy offline queue is retained for explicit recovery, never replayed over confirmed server records.
  // 1. Sync daftar pengguna terdaftar langsung dari Supabase saat aplikasi dimuat
  useEffect(() => {
    if (!authReady || !state.isAuthenticated) return;
    if (state.currentUser.role === 'ADMIN') {
      refreshAdminDirectory()
        .then(res => {
          if (!res.success && res.error) {
            setSupabaseSyncStatus(prev => ({ ...prev, status: 'error', error: res.error }));
          }
        })
        .catch(() => {});
      return;
    }
    fetchUsersFromSupabase(DEFAULT_SUPABASE_CONFIG)
      .then(res => {
        if (res.success && res.users.length > 0) {
          setRegisteredUsers(res.users);
        } else if (!res.success && res.error) {
          setSupabaseSyncStatus(prev => ({ ...prev, status: 'error', error: res.error }));
        }
      })
      .catch(() => {});
  }, [authReady, state.isAuthenticated, state.currentUser.role, refreshAdminDirectory]);

  useEffect(() => {
    if (!authReady || !state.isAuthenticated || !state.activeHouseholdId || state.currentUser.role === 'ADMIN') return;
    const userId=state.currentUser.id, householdId=state.activeHouseholdId;
    if(loadedHousehold.current===userId+':'+householdId)return;
    let cancelled=false;
    const version=financialVersion.current;
    setIsFinancialReady(false);setSupabaseSyncStatus({status:'syncing'});
    loadUserFinancialData(userId,localStorage.getItem('takara_household_'+userId)||householdId).then(({householdId:selectedId,data})=>{
      if(cancelled||version!==financialVersion.current)return;
      loadedHousehold.current=userId+':'+selectedId;
      setState(prev=>prev.currentUser.id!==userId?prev:({...prev,...data,activeHouseholdId:selectedId,
        ledgerEntries:reconstructMissingLedgers(data.transactions||[],data.ledgerEntries||[],selectedId,data.wallets||[])}));
      setIsFinancialReady(true);setSupabaseSyncStatus({status:'synced',lastSynced:new Date().toLocaleTimeString('id-ID')});
    }).catch(error=>{if(!cancelled)setSupabaseSyncStatus({status:'error',error:String(error)});});
    return()=>{cancelled=true;};
  },[authReady,state.isAuthenticated,state.currentUser.id,state.activeHouseholdId]);

  // Sync state to LocalStorage cache (untuk sesi offline & PWA)
  useEffect(() => {
    try {
      if (state.currentUser?.username) {
        const username = state.currentUser.username;
        const userKey = getUserStorageKey(username);
        localStorage.setItem(userKey, serializeSessionState(state));
        localStorage.setItem(STORAGE_KEY, serializeSessionState(state));

        if (state.isAuthenticated && !state.isLocked) {
          localStorage.setItem(CURRENT_USER_KEY, username);
        }
      }
    } catch {
      console.warn('Gagal menyimpan state.');
    }
  }, [state]);

  const allHouseholds=useMemo(()=>state.households,[state.households]);

  // Keamanan Akses Household: Hanya tampilkan household milik pengguna atau di mana pengguna terdaftar sebagai anggota
  const userHouseholds = useMemo(() => {
    const currentUserId = state.currentUser?.id;
    const currentUserName = state.currentUser?.username?.toLowerCase();
    const currentDisplayName = state.currentUser?.displayName?.toLowerCase();
    const isAdmin =
      state.currentUser?.role === 'ADMIN' ||
      currentUserName === 'adminmaruf99' ||
      currentUserName === 'admin' ||
      currentUserName === 'superadmin';

    // Superadmin memiliki akses audit ke seluruh household
    if (isAdmin) {
      return state.households.length > 0 ? state.households : [FALLBACK_HOUSEHOLD];
    }

    // Temukan ID household di mana user terdaftar sebagai anggota
    const memberHouseholdIds = new Set<string>();
    for (const m of state.members) {
      if (
        m.userId === currentUserId ||
        (currentUserName && m.userId?.toLowerCase() === `user-${currentUserName}`)
      ) {
        memberHouseholdIds.add(m.householdId);
      }
    }

    const allowed = state.households.filter(h =>
      h.createdById === currentUserId ||
      (currentUserName && h.createdById === `user-${currentUserName}`) ||
      memberHouseholdIds.has(h.id)
    );

    return allowed.length > 0 ? allowed : (state.households.slice(0, 1).length > 0 ? state.households.slice(0, 1) : [FALLBACK_HOUSEHOLD]);
  }, [state.households, state.members, state.currentUser, state.activeHouseholdId]);

  const allMembers=useMemo(()=>state.members,[state.members]);

  const activeHousehold = useMemo(() => {
    return userHouseholds.find(h => h.id === state.activeHouseholdId) || userHouseholds[0] || state.households[0] || FALLBACK_HOUSEHOLD;
  }, [userHouseholds, state.households, state.activeHouseholdId]);
  // Recalculate wallet balances dynamically from active ledger entries (Ledger Invariant)
  // Recalculate wallet balances dynamically from active ledger entries & transactions (Ledger Invariant)
  const wallets = useMemo(() => {
    const excludedTxIds=new Set(state.transactions.filter(isDebtOpeningTransaction).map(t=>t.id));
    const householdLedgers = state.ledgerEntries.filter(
      le => le.householdId === state.activeHouseholdId && !excludedTxIds.has(le.transactionId)
    );
    const activeHouseholdTxs = state.transactions.filter(
      t => t.householdId === state.activeHouseholdId && t.status !== 'VOIDED'
    );
    const ledgerTxIds = new Set(householdLedgers.map(le => le.transactionId).filter(Boolean));

    const activeWallets = state.wallets.filter(
      w => w.householdId === state.activeHouseholdId && !w.isArchived
    );

    return activeWallets.map(w => {
      // 1. Saldo dari entri buku besar
      let bal = householdLedgers
        .filter(le => le.walletId === w.id)
        .reduce((sum, le) => sum + le.signedAmount, 0);

      // 2. Tambahan mutasi dari transaksi yang belum tercatat di ledgerEntries
      for (const t of activeHouseholdTxs) {
        if (ledgerTxIds.has(t.id)) continue;

        const isSrc = t.sourceWalletId === w.id || (!t.sourceWalletId && t.sourceAsset && t.sourceAsset.toLowerCase().trim() === w.name.toLowerCase().trim());
        const isDst = t.destinationWalletId === w.id || (!t.destinationWalletId && t.destinationAsset && t.destinationAsset.toLowerCase().trim() === w.name.toLowerCase().trim());

        if (t.type === 'income') {
          if (isDst || (!t.destinationWalletId && isSrc)) {
            bal += t.amount;
          }
        } else if (t.type === 'expense') {
          if (isSrc || (!t.sourceWalletId && isDst)) {
            bal -= t.amount;
          }
        } else if (t.type === 'transfer') {
          if (isSrc) bal -= (t.amount + (t.fee || 0));
          if (isDst) bal += t.amount;
        } else if (t.type === 'opening_balance') {
          if (isDst || isSrc) bal += t.amount;
        }
      }

      // 3. Fallback: jika belum ada mutasi dari ledger maupun transaksi, pakai w.balance
      if (householdLedgers.length === 0 && activeHouseholdTxs.length === 0 && w.balance) {
        bal = w.balance;
      }

      return { ...w, balance: bal };
    });
  }, [state.wallets, state.ledgerEntries, state.transactions, state.activeHouseholdId]);

  const categories = useMemo(() => {
    return state.categories.filter(c => c.householdId === state.activeHouseholdId && !c.isArchived);
  }, [state.categories, state.activeHouseholdId]);

  const labels = useMemo(() => {
    const existingLabels = new Set<string>(state.labels || []);
    // Also extract labels from active transactions so none are missed
    for (const t of state.transactions) {
      if (t.householdId === state.activeHouseholdId && t.label && t.label.trim()) {
        existingLabels.add(t.label.trim());
      }
    }
    return Array.from(existingLabels);
  }, [state.labels, state.transactions, state.activeHouseholdId]);

  const members = useMemo(() => {
    return state.members.filter(m => m.householdId === state.activeHouseholdId);
  }, [state.members, state.activeHouseholdId]);

  const transactions = useMemo(() => {
    return state.transactions
      .filter(t => t.householdId === state.activeHouseholdId && t.status !== 'VOIDED' && !isDebtOpeningTransaction(t))
      .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime());
  }, [state.transactions, state.activeHouseholdId]);

  // Summary Metrics
  const [summaryMonth,setSummaryMonth]=useState(()=>jakartaDateTime().date.slice(0,7));
  useEffect(()=>{
    const update=()=>setSummaryMonth(jakartaDateTime().date.slice(0,7));
    const timer=setInterval(update,60000);window.addEventListener('focus',update);
    return()=>{clearInterval(timer);window.removeEventListener('focus',update);};
  },[]);
  const { totalBalance, periodIncome, periodExpense, netCashFlow } = useMemo(() => {
    const totBal = wallets.reduce((sum, w) => sum + w.balance, 0);

    let inc = 0;
    let exp = 0;

    const period=summaryMonth;
    for (const t of monthlyActivity(transactions,Number(period.slice(0,4)),Number(period.slice(5,7)))) {
      if (t.type === 'income') {
        inc += t.amount;
      } else if (t.type === 'expense') {
        exp += t.amount;
      } else if (t.type === 'transfer' && t.fee && t.fee > 0) {
        exp += t.fee;
      }
    }

    return {
      totalBalance: totBal,
      periodIncome: inc,
      periodExpense: exp,
      netCashFlow: inc - exp
    };
  }, [wallets, transactions, summaryMonth]);

  // Add Transaction with atomic ledger updates & label support
  const addTransaction = async (input: NewTransactionInput): Promise<{ success: boolean; error?: string }> => {
    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Nominal transaksi harus lebih dari 0' };
    }

    if(input.categoryId && input.type!=='transfer') {
      const category=state.categories.find(c=>c.id===input.categoryId&&c.householdId===state.activeHouseholdId&&!c.isArchived&&c.type===input.type);
      if(!category)return {success:false,error:'Pilih kategori yang sesuai dengan tipe transaksi dan household aktif.'};
      input={...input,categoryName:category.name};
    }
    const txId = 'tx-' + crypto.randomUUID();
    const dateNow = new Date().toISOString();
    const effectiveAt = input.effectiveAt || dateNow;
    const addedBy = input.addedBy || state.currentUser.displayName || 'Maruf H';

    const newLedgers: LedgerEntry[] = [];

    if (input.type === 'income') {
      const destId = input.destinationWalletId || input.sourceWalletId || (wallets[0] ? wallets[0].id : '');
      if (!destId) return { success: false, error: 'Dompet tujuan wajib dipilih' };

      newLedgers.push({
        id: `led-${txId}-inc`,
        householdId: state.activeHouseholdId,
        transactionId: txId,
        walletId: destId,
        signedAmount: Math.round(input.amount),
        entryType: 'INCOME',
        postedAt: effectiveAt,
        createdAt: dateNow
      });
    } else if (input.type === 'expense') {
      const srcId = input.sourceWalletId || (wallets[0] ? wallets[0].id : '');
      if (!srcId) return { success: false, error: 'Dompet sumber wajib dipilih' };

      newLedgers.push({
        id: `led-${txId}-exp`,
        householdId: state.activeHouseholdId,
        transactionId: txId,
        walletId: srcId,
        signedAmount: -Math.round(input.amount),
        entryType: 'EXPENSE',
        postedAt: effectiveAt,
        createdAt: dateNow
      });
    } else if (input.type === 'transfer') {
      if (!input.sourceWalletId || !input.destinationWalletId) {
        return { success: false, error: 'Dompet asal dan tujuan wajib dipilih' };
      }
      if (input.sourceWalletId === input.destinationWalletId) {
        return { success: false, error: 'Dompet asal dan tujuan tidak boleh sama' };
      }

      // Transfer Out
      newLedgers.push({
        id: `led-${txId}-tout`,
        householdId: state.activeHouseholdId,
        transactionId: txId,
        walletId: input.sourceWalletId,
        signedAmount: -Math.round(input.amount),
        entryType: 'TRANSFER_OUT',
        postedAt: effectiveAt,
        createdAt: dateNow
      });

      // Transfer In
      newLedgers.push({
        id: `led-${txId}-tin`,
        householdId: state.activeHouseholdId,
        transactionId: txId,
        walletId: input.destinationWalletId,
        signedAmount: Math.round(input.amount),
        entryType: 'TRANSFER_IN',
        postedAt: effectiveAt,
        createdAt: dateNow
      });

      // Transfer Fee (if any)
      if (input.fee && input.fee > 0) {
        newLedgers.push({
          id: `led-${txId}-fee`,
          householdId: state.activeHouseholdId,
          transactionId: txId,
          walletId: input.sourceWalletId,
          signedAmount: -Math.round(input.fee),
          entryType: 'FEE',
          postedAt: effectiveAt,
          createdAt: dateNow
        });
      }
    }

    // Auto-save new label if provided
    let updatedLabels = state.labels || [];
    if (input.label && input.label.trim()) {
      const cleanLabel = input.label.trim();
      if (!updatedLabels.includes(cleanLabel)) {
        updatedLabels = [...updatedLabels, cleanLabel];
      }
    }

    const newTx: FinancialTransaction = {
      id: txId,
      no: state.transactions.length + 1,
      householdId: state.activeHouseholdId,
      type: input.type,
      amount: Math.round(input.amount),
      fee: input.fee ? Math.round(input.fee) : undefined,
      sourceWalletId: input.type === 'income' ? undefined : (input.sourceWalletId || (input.type === 'expense' ? wallets[0]?.id : undefined)),
      destinationWalletId: input.type === 'income' ? (input.destinationWalletId || input.sourceWalletId || wallets[0]?.id) : input.destinationWalletId,
      sourceAsset: input.type === 'income' ? undefined : (input.sourceAsset || wallets.find(w => w.id === input.sourceWalletId)?.name),
      destinationAsset: input.type === 'income'
        ? (input.destinationAsset || wallets.find(w => w.id === (input.destinationWalletId || input.sourceWalletId))?.name)
        : (input.destinationAsset || wallets.find(w => w.id === input.destinationWalletId)?.name),
      categoryId: input.type === 'transfer' ? undefined : input.categoryId,
      categoryName: input.categoryName || (input.type === 'transfer' ? 'Uncategorized' : 'Lainnya'),
      label: input.label?.trim() || undefined,
      description: input.description,
      notes: input.notes,
      imageUrl: input.imageUrl,
      effectiveAt,
      dateStr:input.dateStr||jakartaDateTime(effectiveAt).date,
      time:jakartaDateTime(effectiveAt).time,
      addedBy,
      status: 'POSTED',
      createdAt: dateNow,
      updatedAt: dateNow
    };

    if (newTx.imageUrl) {
      try { newTx.imageUrl = await uploadReceiptPhoto(newTx.imageUrl, newTx.householdId, state.currentUser); }
      catch(error) { return {success:false,error:error instanceof Error?error.message:'Unggah lampiran gagal.'}; }
    }
    markLocalMutation(txId);
    setSupabaseSyncStatus({ status: 'syncing' });
    const saved = await syncTransactionToSupabase(newTx,state.supabaseConfig);
    if (!saved.success) {
      setSupabaseSyncStatus({ status: 'error', error: saved.error });
      return { success: false, error: saved.error || 'Transaksi belum tersimpan di Supabase. Coba lagi.' };
    }
    setSupabaseSyncStatus({ status: 'synced', lastSynced: new Date().toLocaleTimeString('id-ID') });
    financialVersion.current++;
    setState(prev => prev.currentUser.username !== state.currentUser.username ? prev : ({
      ...prev,
      labels: updatedLabels,
      transactions: [newTx, ...prev.transactions],
      ledgerEntries: [...prev.ledgerEntries, ...newLedgers]
    }));


    return { success: true };
  };

  // Void transaction safely (audit preservation)
  const voidTransaction = async (id: string) => editTransaction(id, { status: 'VOIDED' });

  const clearCurrentMonthTransactions = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    const householdId=state.activeHouseholdId,userId=state.currentUser.id;
    const month=jakartaDateTime(new Date().toISOString()).date.slice(0,7);
    const selected=state.transactions.filter(tx=>{
      if(tx.householdId!==householdId||tx.status==='VOIDED'||isDebtOpeningTransaction(tx))return false;
      try{return jakartaDateTime(tx.effectiveAt||tx.createdAt).date.slice(0,7)===month;}catch{return false;}
    });
    if(!selected.length)return {success:true,count:0};
    setSupabaseSyncStatus({status:'syncing'});
    const confirmedIds=new Set<string>();let failure:string|undefined;
    for(const tx of selected){
      try{
        const result=await syncTransactionToSupabase({...tx,status:'VOIDED',updatedAt:new Date().toISOString()},state.supabaseConfig,'update');
        if(!result.success){failure=result.error||'Supabase belum mengonfirmasi pembatalan transaksi.';break;}
        confirmedIds.add(tx.id);
      }catch(error){failure=error instanceof Error?error.message:'Koneksi ke Supabase terputus.';break;}
    }
    // Keep the audit rows and change only transactions confirmed by the atomic server RPC.
    if(confirmedIds.size){
      financialVersion.current++;
      setState(prev=>prev.currentUser.id!==userId?prev:({...prev,transactions:prev.transactions.map(tx=>confirmedIds.has(tx.id)?{...tx,status:'VOIDED' as const}:tx),ledgerEntries:prev.ledgerEntries.filter(le=>!confirmedIds.has(le.transactionId)),wallets:prev.wallets.map(wallet=>selected.some(tx=>confirmedIds.has(tx.id)&&(tx.sourceWalletId===wallet.id||tx.destinationWalletId===wallet.id))?{...wallet,balance:prev.ledgerEntries.filter(le=>le.walletId===wallet.id&&!confirmedIds.has(le.transactionId)).reduce((sum,le)=>sum+le.signedAmount,0)}:wallet)}));
    }
    // Reconcile balances and any concurrent household writes after a partial batch.
    if(confirmedIds.size){
      const reloaded=await pullAllDataFromSupabase(state.supabaseConfig,householdId);
      if(reloaded.success&&reloaded.data)setState(prev=>prev.currentUser.id!==userId||prev.activeHouseholdId!==householdId?prev:({...prev,...reloaded.data,currentUser:prev.currentUser,activeHouseholdId:householdId}));
    }
    if(failure){const error=confirmedIds.size+' dari '+selected.length+' transaksi berhasil dibatalkan. '+failure;setSupabaseSyncStatus({status:'error',error});return {success:false,count:confirmedIds.size,error};}
    setSupabaseSyncStatus({status:'synced',lastSynced:new Date().toLocaleTimeString('id-ID')});
    return {success:true,count:confirmedIds.size};
  };

  const editTransaction = async (id: string, updatedFields: Partial<FinancialTransaction>): Promise<{ success: boolean; error?: string }> => {
    const existingIndex = state.transactions.findIndex(t => t.id === id);
    if (existingIndex === -1) {
      return { success: false, error: 'Transaksi tidak ditemukan' };
    }

    const currentTx = state.transactions[existingIndex]!;
    const mergedTx: FinancialTransaction = {
      ...currentTx,
      ...updatedFields,
      imageUrl: updatedFields.imageUrl !== undefined ? updatedFields.imageUrl : currentTx.imageUrl,
      updatedAt: new Date().toISOString()
    };
    if (mergedTx.amount <= 0) {
      return { success: false, error: 'Nominal transaksi harus lebih dari 0' };
    }

    if (mergedTx.type === 'transfer') {
      if (!mergedTx.sourceWalletId || !mergedTx.destinationWalletId) {
        return { success: false, error: 'Dompet asal dan tujuan wajib dipilih' };
      }
      if (mergedTx.sourceWalletId === mergedTx.destinationWalletId) {
        return { success: false, error: 'Dompet asal dan tujuan tidak boleh sama' };
      }
    }

    const effectiveAt = mergedTx.effectiveAt || new Date().toISOString();
    const dateNow = new Date().toISOString();
    const newLedgers: LedgerEntry[] = [];

    if (mergedTx.type === 'income') {
      const destId = mergedTx.destinationWalletId || mergedTx.sourceWalletId || (wallets[0] ? wallets[0].id : '');
      mergedTx.destinationWalletId = destId;
      mergedTx.sourceWalletId = undefined;
      mergedTx.destinationAsset = mergedTx.destinationAsset || wallets.find(w => w.id === destId)?.name;
      mergedTx.sourceAsset = undefined;
      if (destId) {
        newLedgers.push({
          id: `led-${id}-inc`,
          householdId: mergedTx.householdId,
          transactionId: id,
          walletId: destId,
          signedAmount: Math.round(mergedTx.amount),
          entryType: 'INCOME',
          postedAt: effectiveAt,
          createdAt: dateNow
        });
      }
    } else if (mergedTx.type === 'expense') {
      const srcId = mergedTx.sourceWalletId || (wallets[0] ? wallets[0].id : '');
      if (srcId) {
        newLedgers.push({
          id: `led-${id}-exp`,
          householdId: mergedTx.householdId,
          transactionId: id,
          walletId: srcId,
          signedAmount: -Math.round(mergedTx.amount),
          entryType: 'EXPENSE',
          postedAt: effectiveAt,
          createdAt: dateNow
        });
      }
    } else if (mergedTx.type === 'transfer') {
      if (mergedTx.sourceWalletId && mergedTx.destinationWalletId) {
        newLedgers.push({
          id: `led-${id}-tout`,
          householdId: mergedTx.householdId,
          transactionId: id,
          walletId: mergedTx.sourceWalletId,
          signedAmount: -Math.round(mergedTx.amount),
          entryType: 'TRANSFER_OUT',
          postedAt: effectiveAt,
          createdAt: dateNow
        });

        newLedgers.push({
          id: `led-${id}-tin`,
          householdId: mergedTx.householdId,
          transactionId: id,
          walletId: mergedTx.destinationWalletId,
          signedAmount: Math.round(mergedTx.amount),
          entryType: 'TRANSFER_IN',
          postedAt: effectiveAt,
          createdAt: dateNow
        });

        if (mergedTx.fee && mergedTx.fee > 0) {
          newLedgers.push({
            id: `led-${id}-fee`,
            householdId: mergedTx.householdId,
            transactionId: id,
            walletId: mergedTx.sourceWalletId,
            signedAmount: -Math.round(mergedTx.fee),
            entryType: 'FEE',
            postedAt: effectiveAt,
            createdAt: dateNow
          });
        }
      }
    }

    if (mergedTx.status === 'VOIDED') newLedgers.length = 0;
    let updatedLabels = state.labels || [];
    if (mergedTx.label && mergedTx.label.trim()) {
      const cleanLabel = mergedTx.label.trim();
      if (!updatedLabels.includes(cleanLabel)) {
        updatedLabels = [...updatedLabels, cleanLabel];
      }
    }

    setSupabaseSyncStatus({ status: 'syncing' });
    if (mergedTx.imageUrl?.startsWith('data:')) {
      try { mergedTx.imageUrl = await uploadReceiptPhoto(mergedTx.imageUrl, mergedTx.householdId, state.currentUser); }
      catch(error) { return {success:false,error:error instanceof Error?error.message:'Unggah lampiran gagal.'}; }
    }
    const saved = await syncTransactionToSupabase(mergedTx, state.supabaseConfig, 'update');
    if (!saved.success) {
      setSupabaseSyncStatus({ status: 'error', error: saved.error });
      return saved;
    }
    setSupabaseSyncStatus({ status: 'synced', lastSynced: new Date().toLocaleTimeString('id-ID') });
    financialVersion.current++;
    setState(prev => prev.currentUser.id !== state.currentUser.id ? prev : ({
      ...prev, labels: updatedLabels,
      transactions: prev.transactions.map(tx => tx.id === id ? mergedTx : tx),
      ledgerEntries: [...prev.ledgerEntries.filter(le => le.transactionId !== id), ...newLedgers]
    }));

    return { success: true };
  };

  // Utang & Piutang Management
  const debts = useMemo(() => {
    const list = state.debts || [];
    return list.filter(d => d.householdId === state.activeHouseholdId);
  }, [state.debts, state.activeHouseholdId]);

  const persistDebtActivity = async (debt: DebtItem, tx: FinancialTransaction) => {
    if (tx.imageUrl) {
      try { tx.imageUrl = await uploadReceiptPhoto(tx.imageUrl, tx.householdId, state.currentUser); }
      catch(error) { return {success:false,error:error instanceof Error?error.message:'Unggah lampiran gagal.'}; }
    }
    const ledgers = reconstructMissingLedgers([tx], [], debt.householdId, state.wallets);
    const saved = await syncDebtPaymentToSupabase(tx,debt.id,state.supabaseConfig);
    if (!saved.success) return { success: false, error: saved.error || 'Gagal menyimpan ke Supabase.' };
    financialVersion.current++;
    setState(prev => prev.currentUser.id !== state.currentUser.id ? prev : ({
      ...prev, debts: [debt, ...(prev.debts || []).filter(d => d.id !== debt.id)],
      transactions: [tx, ...prev.transactions.filter(t => t.id !== tx.id)],
      ledgerEntries: [...prev.ledgerEntries.filter(le => le.transactionId !== tx.id), ...ledgers]
    }));
    return { success: true };
  };

  const addDebt=async(item:Omit<DebtItem,'id'|'householdId'|'createdAt'>)=>{
    const debt:DebtItem={...item,id:crypto.randomUUID(),householdId:state.activeHouseholdId,createdAt:new Date().toISOString()};
    markLocalMutation(debt.id);
    const saved=await syncDebtToSupabase(debt,state.supabaseConfig);if(!saved.success)return saved;
    setState(prev=>({...prev,debts:[debt,...(prev.debts||[])]}));return {success:true};
  };
  const updateDebt=async(id:string,updates:Partial<DebtItem>)=>{const prior=(state.debts||[]).find(d=>d.id===id);if(!prior)return {success:false,error:'Data utang tidak ditemukan.'};const next={...prior,...updates,id:prior.id,householdId:prior.householdId};const saved=await syncDebtToSupabase(next,state.supabaseConfig);if(saved.success)setState(prev=>({...prev,debts:(prev.debts||[]).map(d=>d.id===id?next:d)}));return saved;};
  const toggleDebtSettled=async(id:string)=>{const d=(state.debts||[]).find(d=>d.id===id);return d?updateDebt(id,{isSettled:!d.isSettled,remainingAmount:!d.isSettled?0:d.amount}):{success:false,error:'Utang tidak ditemukan.'};};
  const toggleDebtPaidThisMonth=async(id:string)=>{const d=(state.debts||[]).find(d=>d.id===id);return d?updateDebt(id,{isPaidThisMonth:!d.isPaidThisMonth,lastPaidMonth:jakartaDateTime(new Date().toISOString()).date.slice(0,7)}):{success:false,error:'Utang tidak ditemukan.'};};

  const payDebtInstallment = async (id: string, walletId?: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> => {
    const debt = (state.debts || []).find(d => d.id === id);
    if (!debt || debt.isSettled || debt.remainingAmount <= 0) return { success: false, error: 'Utang tidak ditemukan atau sudah lunas.' };
    const wallet = state.wallets.find(w => w.id === walletId && w.householdId === state.activeHouseholdId);
    if (!wallet) return { success: false, error: 'Pilih dompet pembayaran agar cicilan tercatat dalam transaksi.' };
    const amount = Math.min(debt.monthlyInstallment || debt.remainingAmount, debt.remainingAmount);
    const now = new Date();
    const updated = { ...debt, remainingAmount: debt.remainingAmount - amount, isSettled: debt.remainingAmount <= amount, isPaidThisMonth: true, lastPaidMonth: now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') };
    const incoming = debt.type === 'receivable';
    const paymentTxId = 'tx-payment-' + debt.id + '-' + debt.remainingAmount;
    markLocalMutation(paymentTxId);
    return persistDebtActivity(updated, {
      id: paymentTxId, householdId: debt.householdId,
      debtId: debt.id,
      type: incoming ? 'income' : 'expense', amount,
      sourceWalletId: incoming ? undefined : wallet.id, destinationWalletId: incoming ? wallet.id : undefined,
      categoryName: incoming ? 'Pembayaran Piutang' : 'Cicilan & Utang',
      description: 'Pembayaran: ' + debt.personOrEntity, imageUrl,
      addedBy: state.currentUser.displayName, effectiveAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(), status: 'POSTED'
    });
  };

  const deleteDebt=async(id:string)=>{const saved=await deleteDebtFromSupabase(id,state.supabaseConfig);if(saved.success)setState(prev=>({...prev,debts:(prev.debts||[]).filter(d=>d.id!==id)}));return saved;};

  // === SAVINGS GOALS, CATEGORY BUDGETS & FAMILY CHALLENGES ===
  const savingsGoals = useMemo(() => {
    const list = state.savingsGoals !== undefined
      ? state.savingsGoals
      : readLocalHouseholdExtras(state.activeHouseholdId).savingsGoals;
    return list.filter(g => g.householdId === state.activeHouseholdId);
  }, [state.savingsGoals, state.activeHouseholdId]);

  const categoryBudgets = useMemo(() => {
    const list = state.categoryBudgets !== undefined
      ? state.categoryBudgets
      : readLocalHouseholdExtras(state.activeHouseholdId).categoryBudgets;
    return list.filter(b => b.householdId === state.activeHouseholdId);
  }, [state.categoryBudgets, state.activeHouseholdId]);

  const familyChallenges = useMemo(() => {
    const list = state.familyChallenges !== undefined
      ? state.familyChallenges
      : readLocalHouseholdExtras(state.activeHouseholdId).familyChallenges;
    return list.filter(ch => ch.householdId === state.activeHouseholdId);
  }, [state.familyChallenges, state.activeHouseholdId]);

  const addSavingsGoal = async (
    input: Omit<SavingsGoal, 'id' | 'householdId' | 'isCompleted' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!input.title.trim()) return { success: false, error: 'Nama impian wajib diisi.' };
    if (input.targetAmount <= 0) return { success: false, error: 'Target tabungan harus lebih dari 0.' };
    const now = new Date().toISOString();
    const goal: SavingsGoal = {
      ...input,
      id: 'goal-' + crypto.randomUUID(),
      householdId: state.activeHouseholdId,
      title: input.title.trim(),
      currentAmount: Math.max(0, Math.round(input.currentAmount || 0)),
      targetAmount: Math.round(input.targetAmount),
      isCompleted: (input.currentAmount || 0) >= input.targetAmount,
      createdAt: now,
      updatedAt: now
    };
    markLocalMutation(goal.id);
    const nextGoals = [goal, ...savingsGoals];
    await syncSavingsGoalToSupabase(goal, nextGoals, state.supabaseConfig);
    setState(prev => ({
      ...prev,
      savingsGoals: [goal, ...(prev.savingsGoals || []).filter(g => g.id !== goal.id)]
    }));
    return { success: true };
  };

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<{ success: boolean; error?: string }> => {
    const existing = savingsGoals.find(g => g.id === id);
    if (!existing) return { success: false, error: 'Kantong impian tidak ditemukan.' };
    const nextTarget = updates.targetAmount !== undefined ? Math.round(updates.targetAmount) : existing.targetAmount;
    const nextCurrent = updates.currentAmount !== undefined ? Math.max(0, Math.round(updates.currentAmount)) : existing.currentAmount;
    const updated: SavingsGoal = {
      ...existing,
      ...updates,
      id: existing.id,
      householdId: existing.householdId,
      targetAmount: nextTarget,
      currentAmount: nextCurrent,
      isCompleted: updates.isCompleted !== undefined ? updates.isCompleted : nextCurrent >= nextTarget,
      updatedAt: new Date().toISOString()
    };
    const nextGoals = savingsGoals.map(g => (g.id === id ? updated : g));
    await syncSavingsGoalToSupabase(updated, nextGoals, state.supabaseConfig);
    setState(prev => ({
      ...prev,
      savingsGoals: (prev.savingsGoals || savingsGoals).map(g => (g.id === id ? updated : g))
    }));
    return { success: true };
  };

  const contributeToSavingsGoal = async (
    goalId: string,
    amount: number,
    sourceWalletId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return { success: false, error: 'Kantong impian tidak ditemukan.' };
    const cleanAmt = Math.round(amount);
    if (cleanAmt <= 0) return { success: false, error: 'Nominal menabung harus lebih dari 0.' };

    // If user chose to deduct from a wallet, record official ledger transaction
    if (sourceWalletId && sourceWalletId !== 'none') {
      if (goal.linkedWalletId && goal.linkedWalletId !== sourceWalletId) {
        const txRes = await addTransaction({
          type: 'transfer',
          amount: cleanAmt,
          sourceWalletId,
          destinationWalletId: goal.linkedWalletId,
          description: `Tabung Impian: ${goal.title}`,
          label: 'Impian'
        });
        if (!txRes.success) return txRes;
      } else {
        const txRes = await addTransaction({
          type: 'expense',
          amount: cleanAmt,
          sourceWalletId,
          categoryName: 'Tabungan & Emas',
          description: `Alokasi Impian: ${goal.title}`,
          label: 'Impian'
        });
        if (!txRes.success) return txRes;
      }
    }

    const nextCurrent = goal.currentAmount + cleanAmt;
    return updateSavingsGoal(goalId, {
      currentAmount: nextCurrent,
      isCompleted: nextCurrent >= goal.targetAmount
    });
  };

  const deleteSavingsGoal = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const remaining = savingsGoals.filter(g => g.id !== id);
    await deleteSavingsGoalFromSupabase(id, state.activeHouseholdId, remaining, state.supabaseConfig);
    setState(prev => ({
      ...prev,
      savingsGoals: (prev.savingsGoals || savingsGoals).filter(g => g.id !== id)
    }));
    return { success: true };
  };

  const upsertCategoryBudget = async (
    categoryName: string,
    monthlyLimit: number,
    categoryId?: string,
    alertThreshold = 80
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanName = categoryName.trim();
    if (!cleanName) return { success: false, error: 'Pilih kategori terlebih dahulu.' };
    if (monthlyLimit <= 0) return { success: false, error: 'Batas anggaran harus lebih dari 0.' };

    const existing = categoryBudgets.find(
      b => (categoryId && b.categoryId === categoryId) || b.categoryName.toLowerCase() === cleanName.toLowerCase()
    );
    const budget: CategoryBudget = {
      id: existing?.id || `bgt-${state.activeHouseholdId}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      householdId: state.activeHouseholdId,
      categoryId: categoryId || existing?.categoryId,
      categoryName: cleanName,
      monthlyLimit: Math.round(monthlyLimit),
      alertThreshold: Math.min(100, Math.max(50, Math.round(alertThreshold))),
      updatedAt: new Date().toISOString()
    };
    markLocalMutation(budget.id);
    const nextBudgets = existing
      ? categoryBudgets.map(b => (b.id === existing.id ? budget : b))
      : [...categoryBudgets, budget];

    await syncCategoryBudgetToSupabase(budget, nextBudgets, state.supabaseConfig);
    setState(prev => {
      const base = prev.categoryBudgets || categoryBudgets;
      const updatedList = base.some(b => b.id === budget.id)
        ? base.map(b => (b.id === budget.id ? budget : b))
        : [...base, budget];
      return { ...prev, categoryBudgets: updatedList };
    });
    return { success: true };
  };

  const deleteCategoryBudget = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const remaining = categoryBudgets.filter(b => b.id !== id);
    await deleteCategoryBudgetFromSupabase(id, state.activeHouseholdId, remaining, state.supabaseConfig);
    setState(prev => ({
      ...prev,
      categoryBudgets: (prev.categoryBudgets || categoryBudgets).filter(b => b.id !== id)
    }));
    return { success: true };
  };

  const addFamilyChallenge = async (
    input: Omit<FamilyChallenge, 'id' | 'householdId' | 'status' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!input.title.trim()) return { success: false, error: 'Judul tantangan wajib diisi.' };
    const challenge: FamilyChallenge = {
      ...input,
      id: 'chl-' + crypto.randomUUID(),
      householdId: state.activeHouseholdId,
      title: input.title.trim(),
      status: 'ACTIVE',
      createdBy: input.createdBy || state.currentUser.displayName,
      createdAt: new Date().toISOString()
    };
    markLocalMutation(challenge.id);
    const nextChallenges = [challenge, ...familyChallenges];
    await syncFamilyChallengeToSupabase(challenge, nextChallenges, state.supabaseConfig);
    setState(prev => ({
      ...prev,
      familyChallenges: [challenge, ...(prev.familyChallenges || familyChallenges).filter(c => c.id !== challenge.id)]
    }));
    return { success: true };
  };

  const deleteFamilyChallenge = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const remaining = familyChallenges.filter(c => c.id !== id);
    await deleteFamilyChallengeFromSupabase(id, state.activeHouseholdId, remaining, state.supabaseConfig);
    setState(prev => ({
      ...prev,
      familyChallenges: (prev.familyChallenges || familyChallenges).filter(c => c.id !== id)
    }));
    return { success: true };
  };
  const categoryWritable = () => state.households.some(h=>h.id===state.activeHouseholdId&&h.createdById===state.currentUser.id)
    || state.members.some(m=>m.householdId===state.activeHouseholdId&&m.userId===state.currentUser.id&&m.role!=='VIEWER');
  const addCategory = async (name:string,type:'income'|'expense'|'transfer',icon='Tag',color='#06D6A0') => {
    if(!categoryWritable())return {success:false,error:'Anda tidak dapat mengubah kategori household ini.'};
    const clean=name.trim();if(!clean)return {success:false,error:'Nama kategori wajib diisi.'};
    const existing=state.categories.find(c=>c.householdId===state.activeHouseholdId&&!c.isArchived&&c.type===type&&c.name.trim().toLowerCase()===clean.toLowerCase());
    if(existing)return {success:false,error:'Kategori dengan nama dan tipe ini sudah ada.'};
    const category:Category={id:'cat-'+crypto.randomUUID(),householdId:state.activeHouseholdId,name:clean,type,icon,color,isArchived:false};
    markLocalMutation(category.id);
    try {
      await saveCategoryToSupabase(category,'create');
      setState(prev=>prev.currentUser.id!==state.currentUser.id?prev:({...prev,categories:[...prev.categories,category]}));
      return {success:true,category};
    }catch(error){return {success:false,error:error instanceof Error?error.message:'Gagal menyimpan kategori.'};}
  };
  const updateCategory = async (id:string,updates:Partial<Category>) => {
    const current=state.categories.find(c=>c.id===id&&c.householdId===state.activeHouseholdId);
    if(!current||!categoryWritable())return {success:false,error:'Kategori tidak ditemukan pada household Anda.'};
    if(updates.householdId&&updates.householdId!==current.householdId)return {success:false,error:'Kategori terkunci pada household asal.'};
    if(updates.type&&updates.type!==current.type)return {success:false,error:'Tipe kategori tidak dapat dipindah. Buat kategori baru.'};
    const name=(updates.name??current.name).trim();if(!name)return {success:false,error:'Nama kategori wajib diisi.'};
    if(state.categories.some(c=>c.id!==id&&c.householdId===current.householdId&&!c.isArchived&&c.type===current.type&&c.name.toLowerCase()===name.toLowerCase()))return {success:false,error:'Nama kategori sudah digunakan.'};
    const category={...current,name,icon:updates.icon??current.icon,color:updates.color??current.color};
    try {await saveCategoryToSupabase(category,'update');setState(prev=>prev.currentUser.id!==state.currentUser.id?prev:({...prev,categories:prev.categories.map(c=>c.id===id?category:c)}));return {success:true};}
    catch(error){return {success:false,error:error instanceof Error?error.message:'Gagal mengubah kategori.'};}
  };
  const deleteCategory = async (id:string) => {
    const category=state.categories.find(c=>c.id===id&&c.householdId===state.activeHouseholdId);
    if(!category||!categoryWritable())return {success:false,error:'Kategori tidak ditemukan pada household Anda.'};
    try {await removeCategoryFromSupabase(category);setState(prev=>({...prev,categories:prev.categories.map(c=>c.id===id?{...c,isArchived:true}:c)}));return {success:true};}
    catch(error){return {success:false,error:error instanceof Error?error.message:'Gagal menghapus kategori.'};}
  };

  // Add new Label directly
  const addLabel=async(name:string)=>{const clean=name.trim();if(!clean)return {success:false,error:'Nama label wajib diisi.'};const {error}=await getReceiptAuthClient().from('household_labels').upsert({id:state.activeHouseholdId+':'+clean,household_id:state.activeHouseholdId,name:clean});if(error)return {success:false,error:error.message};setState(prev=>({...prev,labels:[...new Set([...prev.labels,clean])]}));return {success:true};};

  // Add new wallet
  const addWallet = async (name: string, type: WalletType, openingBalance = 0, color = '#06D6A0') => {
    const walletId = `w-${Date.now()}`;
    const dateNow = new Date().toISOString();
    markLocalMutation(walletId);

    const newWallet: Wallet = {
      id: walletId,
      householdId: state.activeHouseholdId,
      name,
      type,
      institutionName: name,
      currency: 'IDR',
      balance: 0,
      color,
      icon: type === 'cash' ? 'Banknote' : type === 'digital' ? 'Smartphone' : 'Building2',
      isArchived: false,
      createdAt: dateNow,
      updatedAt: dateNow
    };

    const newLedgers: LedgerEntry[] = [];
    const newTxs: FinancialTransaction[] = [];

    if (openingBalance > 0) {
      const txId = `tx-open-${Date.now()}`;
      markLocalMutation(txId);
      newTxs.push({
        id: txId,
        householdId: state.activeHouseholdId,
        type: 'opening_balance',
        amount: Math.round(openingBalance),
        destinationWalletId: walletId,
        categoryName: 'Saldo Awal',
        description: `Saldo Awal ${name}`,
        effectiveAt: dateNow,
        addedBy: state.currentUser.displayName,
        status: 'POSTED',
        createdAt: dateNow,
        updatedAt: dateNow
      });

      newLedgers.push({
        id: `led-${txId}`,
        householdId: state.activeHouseholdId,
        transactionId: txId,
        walletId,
        signedAmount: Math.round(openingBalance),
        entryType: 'OPENING',
        postedAt: dateNow,
        createdAt: dateNow
      });
    }

    const saved=await syncWalletToSupabase(newWallet,state.supabaseConfig);if(!saved.success)return saved;
    for(const tx of newTxs){const savedTx=await syncTransactionToSupabase(tx,state.supabaseConfig);if(!savedTx.success)return savedTx;}
    setState(prev => ({
      ...prev,
      wallets: [...prev.wallets, newWallet],
      transactions: [...newTxs, ...prev.transactions],
      ledgerEntries: [...prev.ledgerEntries, ...newLedgers]
    }));
    return {success:true};
  };

  // Update existing wallet
  const updateWallet = async (
    walletId: string,
    updates: {
      name?: string;
      type?: WalletType;
      color?: string;
      institutionName?: string;
      targetBalance?: number;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const target = state.wallets.find(w => w.id === walletId);
    if (!target) return { success: false, error: 'Dompet tidak ditemukan' };

    const dateNow = new Date().toISOString();
    const cleanName = updates.name?.trim() || target.name;
    const cleanType = updates.type || target.type;
    const cleanColor = updates.color || target.color;
    const cleanInstitution = updates.institutionName?.trim() || target.institutionName || cleanName;

    // Hitung saldo riil saat ini dari buku besar
    const currentBal = state.ledgerEntries
      .filter(le => le.walletId === walletId && le.householdId === state.activeHouseholdId)
      .reduce((sum, le) => sum + le.signedAmount, 0);

    const newLedgers: LedgerEntry[] = [];
    const newTxs: FinancialTransaction[] = [];

    // Jika ada penyesuaian target balance, buat entri penyesuaian double-entry
    if (updates.targetBalance !== undefined) {
      const diff = Math.round(updates.targetBalance) - currentBal;
      if (diff !== 0) {
        const txId = `tx-adj-${Date.now()}`;
        markLocalMutation(txId);
        const isPositive = diff > 0;
        const absDiff = Math.abs(diff);

        const adjTx: FinancialTransaction = {
          id: txId,
          householdId: state.activeHouseholdId,
          type: isPositive ? 'income' : 'expense',
          amount: absDiff,
          sourceWalletId: isPositive ? undefined : walletId,
          destinationWalletId: isPositive ? walletId : undefined,
          categoryName: 'Penyesuaian Saldo',
          description: `Penyesuaian saldo dompet: ${cleanName}`,
          effectiveAt: dateNow,
          addedBy: state.currentUser.displayName,
          status: 'POSTED',
          createdAt: dateNow,
          updatedAt: dateNow
        };
        newTxs.push(adjTx);

        newLedgers.push({
          id: `led-${txId}`,
          householdId: state.activeHouseholdId,
          transactionId: txId,
          walletId,
          signedAmount: diff,
          entryType: isPositive ? 'INCOME' : 'EXPENSE',
          postedAt: dateNow,
          createdAt: dateNow
        });


      }
    }

    const updatedWallet: Wallet = {
      ...target,
      name: cleanName,
      type: cleanType,
      color: cleanColor,
      institutionName: cleanInstitution,
      icon: cleanType === 'cash' ? 'Banknote' : cleanType === 'digital' ? 'Smartphone' : 'Building2',
      updatedAt: dateNow
    };

    const savedWallet=await syncWalletToSupabase(updatedWallet,state.supabaseConfig);if(!savedWallet.success)return savedWallet;
    for(const tx of newTxs){const savedTx=await syncTransactionToSupabase(tx,state.supabaseConfig);if(!savedTx.success)return savedTx;}
    setState(prev => ({
      ...prev,
      wallets: prev.wallets.map(w => (w.id === walletId ? updatedWallet : w)),
      transactions: newTxs.length ? [...newTxs, ...prev.transactions] : prev.transactions,
      ledgerEntries: newLedgers.length ? [...prev.ledgerEntries, ...newLedgers] : prev.ledgerEntries
    }));


    return { success: true };
  };

  // Delete or archive wallet
  const deleteWallet = async (walletId: string): Promise<{ success: boolean; error?: string }> => {
    const target = state.wallets.find(w => w.id === walletId);
    if (!target) return { success: false, error: 'Dompet tidak ditemukan' };

    // Cek minimal harus tersisa 1 dompet aktif
    const activeWallets = state.wallets.filter(w => w.householdId === state.activeHouseholdId && !w.isArchived);
    if (activeWallets.length <= 1) {
      return { success: false, error: 'Minimal harus ada 1 dompet aktif di household ini.' };
    }

    const hasTransactions = state.transactions.some(
      t => t.sourceWalletId === walletId || t.destinationWalletId === walletId
    );

    const saved=hasTransactions?await syncWalletToSupabase({...target,isArchived:true,updatedAt:new Date().toISOString()},state.supabaseConfig):await deleteWalletFromSupabase(walletId,state.supabaseConfig);if(!saved.success)return saved;
    setState(prev => {
      if (hasTransactions) {
        return {
          ...prev,
          wallets: prev.wallets.map(w => (w.id === walletId ? { ...w, isArchived: true, updatedAt: new Date().toISOString() } : w))
        };
      }
      return {
        ...prev,
        wallets: prev.wallets.filter(w => w.id !== walletId)
      };
    });


    return { success: true };
  };

  const isSuperAdmin =
    state.currentUser?.role === 'ADMIN' ||
    state.currentUser?.username === 'adminmaruf99' ||
    state.currentUser?.username === 'admin';

  const switchHousehold = (householdId: string) => {
    const isAdmin =
      state.currentUser?.role === 'ADMIN' ||
      state.currentUser?.username === 'adminmaruf99' ||
      state.currentUser?.username === 'admin' ||
      state.currentUser?.username === 'superadmin';
    const isAllowed = isAdmin || userHouseholds.some(h => h.id === householdId);
    if (!isAllowed) {
      console.warn('Akses ditolak: Anda bukan anggota dari household ini.');
      return;
    }
    if (state.households.some(h => h.id === householdId)) {
      localStorage.setItem('takara_household_' + state.currentUser.id, householdId);
      setState(prev => ({ ...prev, activeHouseholdId: householdId }));
    }
  };
  const createHousehold = async (name: string, ownerUserId?: string) => {
    const cleanName = name.trim() || 'Rumah Tangga';
    if (isSuperAdmin) {
      const res = await adminCreateHousehold(cleanName, ownerUserId);
      if (!res.success || !res.household) return { success: false, error: res.error || 'Gagal membuat household.' };
      const created = res.household as Household;
      const createdMember = res.member as HouseholdMember | undefined;
      setState(prev => ({
        ...prev,
        households: [created, ...prev.households.filter(h => h.id !== created.id)],
        members: createdMember ? [createdMember, ...prev.members.filter(m => m.id !== createdMember.id)] : prev.members,
        activeHouseholdId: prev.activeHouseholdId || created.id
      }));
      return { success: true };
    }
    const now = new Date().toISOString();
    const household: Household = { id: crypto.randomUUID(), name: cleanName, baseCurrency: 'IDR', createdById: state.currentUser.id, inviteCode: 'TK-' + crypto.randomUUID().slice(0, 12).toUpperCase(), createdAt: now };
    const { error } = await getReceiptAuthClient().from('households').insert({ id: household.id, name: household.name, base_currency: 'IDR', created_by_id: household.createdById, invite_code: household.inviteCode, created_at: now });
    if (error) return { success: false, error: error.message };
    setState(prev => ({ ...prev, households: [...prev.households, household], activeHouseholdId: household.id }));
    return { success: true };
  };
  const updateHousehold = async (
    id: string,
    name: string,
    options?: { baseCurrency?: string; regenerateInviteCode?: boolean }
  ) => {
    const cleanName = name.trim();
    if (!cleanName && !options?.regenerateInviteCode && !options?.baseCurrency) {
      return { success: false, error: 'Nama household wajib diisi.' };
    }
    if (isSuperAdmin) {
      const res = await adminUpdateHousehold(id, {
        ...(cleanName ? { name: cleanName } : {}),
        ...(options?.baseCurrency ? { baseCurrency: options.baseCurrency } : {}),
        ...(options?.regenerateInviteCode ? { regenerateInviteCode: true } : {})
      });
      if (!res.success || !res.household) return { success: false, error: res.error || 'Gagal memperbarui household.' };
      const updated = res.household as Household;
      setState(prev => ({
        ...prev,
        households: prev.households.map(h => (h.id === id ? updated : h))
      }));
      return { success: true };
    }
    if (!cleanName) return { success: false, error: 'Nama household wajib diisi.' };
    const { error } = await getReceiptAuthClient().from('households').update({ name: cleanName }).eq('id', id).select('id').single();
    if (error) return { success: false, error: error.message };
    setState(prev => ({ ...prev, households: prev.households.map(h => (h.id === id ? { ...h, name: cleanName } : h)) }));
    return { success: true };
  };

  const deleteHousehold = async (householdId: string): Promise<{ success: boolean; error?: string }> => {
    const target = allHouseholds.find(h => h.id === householdId);
    if (!target) return { success: false, error: 'Household tidak ditemukan.' };
    const isAdmin =
      state.currentUser.role === 'ADMIN' ||
      state.currentUser.username === 'adminmaruf99' ||
      state.currentUser.username === 'admin' ||
      state.currentUser.username === 'superadmin';
    if (!isAdmin && target.createdById !== state.currentUser.id) return { success: false, error: 'Hanya pembuat household atau superadmin yang dapat menghapus.' };
    const remaining = userHouseholds.filter(h => h.id !== householdId);
    if (!isAdmin && remaining.length === 0) return { success: false, error: 'Sisakan minimal satu household untuk akun Anda.' };
    const saved = isAdmin
      ? await adminDeleteHousehold(householdId)
      : await deleteHouseholdFromSupabase(householdId, state.supabaseConfig);
    if (!saved.success) return saved;
    discardHouseholdSync(householdId);
    const withoutHousehold = (value: AppState): AppState => ({
      ...value, households: value.households.filter(h => h.id !== householdId),
      activeHouseholdId: value.activeHouseholdId === householdId ? (value.currentUser?.id === state.currentUser.id ? remaining[0]?.id || '' : (value.households || []).find(h => h.id !== householdId && h.createdById === value.currentUser?.id)?.id || '') : value.activeHouseholdId,
      transactions: (value.transactions || []).filter(t => t.householdId !== householdId),
      ledgerEntries: (value.ledgerEntries || []).filter(t => t.householdId !== householdId),
      wallets: (value.wallets || []).filter(t => t.householdId !== householdId),
      categories: (value.categories || []).filter(t => t.householdId !== householdId),
      members: (value.members || []).filter(t => t.householdId !== householdId),
      debts: (value.debts || []).filter(t => t.householdId !== householdId)
    });
    setState(prev => withoutHousehold(prev));
    // Remove obsolete household metadata so admin inventories cannot restore it from a cached session.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || (!key.startsWith('dompetkita_app_state_user_') && key !== STORAGE_KEY)) continue;
      try { const cached = JSON.parse(localStorage.getItem(key) || '{}');
        if (Array.isArray(cached.households)) localStorage.setItem(key, serializeSessionState(withoutHousehold(cached)));
      } catch { /* Ignore invalid legacy session metadata. */ }
    }
    return { success: true };
  };

  const importJSONFile=async(file:File)=>{
    const householdId=state.activeHouseholdId;
    try{
      const allowed=state.households.some(h=>h.id===householdId&&h.createdById===state.currentUser.id)||state.members.some(m=>m.householdId===householdId&&m.userId===state.currentUser.id&&['OWNER','ADMIN'].includes(m.role));
      if(!allowed)throw Error('Hanya pemilik atau admin household yang dapat mengimpor cadangan JSON.');
      if(file.size>20*1024*1024)throw Error('Ukuran cadangan JSON maksimal 20 MB.');
      const backup=parseFinancialBackup(await file.text(),householdId);
      const existingIds=new Set(state.transactions.map(tx=>tx.id));
      for(const tx of backup.transactions){
        if(!existingIds.has(tx.id)&&tx.imageUrl?.startsWith('data:'))tx.imageUrl=await uploadReceiptPhoto(tx.imageUrl,householdId,state.currentUser);
      }
      const result=await importFinancialBackupToSupabase(backup,state.supabaseConfig);
      if(!result.success)return result;
      const verified=await pullAllDataFromSupabase(state.supabaseConfig,householdId);
      const confirmed=verified.data;
      const complete=confirmed&&(['transactions','wallets','categories','debts'] as const).every(key=>{
        const ids=new Set(confirmed[key]?.map(row=>row.id));return backup[key].every(row=>ids.has(row.id));
      })&&backup.labels.every(label=>confirmed.labels?.includes(label));
      if(!verified.success||!complete)return {success:false,error:'Impor tersimpan, tetapi belum dapat diverifikasi. Coba impor ulang dengan aman.'};
      setState(prev=>prev.activeHouseholdId===householdId?{...prev,...verified.data}:prev);
      return {...result,summary:backupSummary(backup)};
    }catch(error){return {success:false,error:error instanceof Error?error.message:'Impor JSON gagal.'};}
  };

  // Import from Excel file (.xlsx)
  const importExcelFile = async (file: File): Promise<{ success: boolean; summary?: ExcelImportSummary; error?: string }> => {
    try {
      const buffer = await file.arrayBuffer();
      const targetHouseholdId = state.activeHouseholdId;
      const targetHouseholdName = activeHousehold.name;
      const result = parseFinancialExcel(buffer, targetHouseholdId, targetHouseholdName);

      if (!result.success) {
        return { success: false, error: result.error || 'Gagal memproses berkas Excel' };
      }

      // Gabungkan dompet: simpan dompet yang sudah ada dan tambahkan dompet baru dari Excel
      const existingWalletMap = new Map(state.wallets.map(w => [w.name.toLowerCase().trim(), w]));
      const resolvedWallets: Wallet[] = Array.from(new Map(state.wallets.map(w => [w.id, w])).values());

      for (const rw of result.wallets) {
        const key = rw.name.toLowerCase().trim();
        const sameId = resolvedWallets.find(w => w.id === rw.id);
        if (sameId) existingWalletMap.set(key, sameId);
        else if (!existingWalletMap.has(key)) {
          existingWalletMap.set(key, rw);
          resolvedWallets.push(rw);
        }
      }

      // Gabungkan kategori: simpan kategori yang sudah ada dan tambahkan kategori baru dari Excel
      const existingCatMap = new Map(state.categories.filter(c=>c.householdId===targetHouseholdId).map(c => [c.type+':'+c.name.toLowerCase().trim(), c]));
      const resolvedCats: Category[] = Array.from(new Map(state.categories.map(c => [c.id,c])).values());

      for (const rc of result.categories) {
        const key = rc.type+':'+rc.name.toLowerCase().trim();
        const sameId = resolvedCats.find(c => c.id === rc.id);
        if (sameId) existingCatMap.set(key, sameId);
        else if (!existingCatMap.has(key)) {
          existingCatMap.set(key, rc);
          resolvedCats.push(rc);
        }
      }

      // Petakan transaksi & ledger agar sesuai dengan ID dompet & kategori rumah tangga aktif
      const defaultWallet = resolvedWallets[0] || state.wallets[0];

      const remappedTxs = result.transactions.map(tx => {
        let srcWalletId = tx.sourceWalletId;
        let dstWalletId = tx.destinationWalletId;
        let srcAsset = tx.sourceAsset;
        let dstAsset = tx.destinationAsset;
        let catId = tx.categoryId;

        if (tx.sourceAsset) {
          const match = existingWalletMap.get(tx.sourceAsset.toLowerCase().trim());
          if (match) srcWalletId = match.id;
        }
        if (tx.destinationAsset) {
          const match = existingWalletMap.get(tx.destinationAsset.toLowerCase().trim());
          if (match) dstWalletId = match.id;
        }
        if (tx.categoryName) {
          const match = existingCatMap.get((tx.type==='income'?'income':'expense')+':'+tx.categoryName.toLowerCase().trim());
          if (match) catId = match.id;
        }

        // Pastikan dompet tidak kosong
        if (tx.type === 'income') {
          if (!dstWalletId && srcWalletId) dstWalletId = srcWalletId;
          if (!dstWalletId && defaultWallet) dstWalletId = defaultWallet.id;
          if (!dstAsset && defaultWallet) dstAsset = defaultWallet.name;
        } else if (tx.type === 'expense') {
          if (!srcWalletId && defaultWallet) srcWalletId = defaultWallet.id;
          if (!srcAsset && defaultWallet) srcAsset = defaultWallet.name;
        } else if (tx.type === 'transfer') {
          if (!srcWalletId && defaultWallet) srcWalletId = defaultWallet.id;
          if (!dstWalletId && resolvedWallets[1]) dstWalletId = resolvedWallets[1].id;
        }

        return {
          ...tx,
          householdId: targetHouseholdId,
          sourceWalletId: tx.type === 'income' ? undefined : srcWalletId,
          destinationWalletId: dstWalletId,
          sourceAsset: tx.type === 'income' ? undefined : (srcAsset || (srcWalletId ? resolvedWallets.find(w => w.id === srcWalletId)?.name : undefined)),
          destinationAsset: dstAsset || (dstWalletId ? resolvedWallets.find(w => w.id === dstWalletId)?.name : undefined),
          categoryId: catId,
          status: 'POSTED' as const
        };
      });

      const remappedLedgers = result.ledgerEntries.map(le => {
        const parentTx = remappedTxs.find(t => t.id === le.transactionId);
        let walletId = le.walletId;
        if (parentTx) {
          if (le.entryType === 'INCOME' || le.entryType === 'TRANSFER_IN') {
            walletId = parentTx.destinationWalletId || parentTx.sourceWalletId || walletId;
          } else if (le.entryType === 'EXPENSE' || le.entryType === 'TRANSFER_OUT' || le.entryType === 'FEE') {
            walletId = parentTx.sourceWalletId || walletId;
          }
        }
        return {
          ...le,
          householdId: targetHouseholdId,
          walletId
        };
      });

      const mergedLabels = Array.from(new Set([...state.labels, ...result.labels]));

      // Gabungkan transaksi tanpa menghapus transaksi yang sudah ada
      const txMap = new Map<string, FinancialTransaction>();
      for (const t of state.transactions) {
        txMap.set(t.id, t);
      }
      for (const t of remappedTxs) {
        txMap.set(t.id, t);
      }
      const combinedTxs = Array.from(txMap.values());

      const ledgerMap = new Map<string, LedgerEntry>();
      for (const le of state.ledgerEntries) {
        ledgerMap.set(le.id, le);
      }
      for (const le of remappedLedgers) {
        ledgerMap.set(le.id, le);
      }
      const combinedLedgers = Array.from(ledgerMap.values());

      const updatedState: AppState = {
        ...state,
        wallets: resolvedWallets,
        categories: resolvedCats,
        labels: mergedLabels,
        transactions: combinedTxs,
        ledgerEntries: combinedLedgers,
        importHistory: [result.summary, ...(state.importHistory || [])]
      };
      setSupabaseSyncStatus({ status: 'syncing' });
      const saved = await pushAllDataToSupabase(updatedState, updatedState.supabaseConfig);
      if (!saved.success) {
        setSupabaseSyncStatus({ status: 'error', error: saved.error });
        return { success: false, error: saved.error || saved.message };
      }
      const verified = await pullAllDataFromSupabase(updatedState.supabaseConfig, targetHouseholdId);
      const ids = new Set(verified.data?.transactions?.map(t => t.id));
      if (!verified.success || remappedTxs.some(tx => !ids.has(tx.id))) {
        return { success: false, error: verified.error || 'Hasil impor belum dapat diverifikasi dari Supabase. Coba impor ulang.' };
      }
      financialVersion.current++;
    setState(prev => prev.currentUser.id !== state.currentUser.id ? prev : ({ ...prev, ...verified.data, labels: mergedLabels, importHistory: updatedState.importHistory }));
      setSupabaseSyncStatus({ status: 'synced', lastSynced: new Date().toLocaleTimeString('id-ID') });
      return { success: true, summary: result.summary };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat membaca file';
      return { success: false, error: msg };
    }
  };


  const resetToDefault = () => {
    setState(initialData);
    localStorage.removeItem(STORAGE_KEY);
  };
  const verifyAndUnlock = async(pin:string)=>{const result=await authenticateAccount(state.currentUser.username,pin);if(result.success)setState(prev=>({...prev,isLocked:false}));return result.success;};
  const getClientDeviceInfo = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let device = 'Laptop / PC';
    if (/android/i.test(ua)) device = 'HP Android';
    else if (/iphone/i.test(ua)) device = 'iPhone';
    else if (/ipad/i.test(ua)) device = 'iPad Tablet';
    else if (/windows/i.test(ua)) device = 'Laptop Windows';
    else if (/macintosh|mac os x/i.test(ua)) device = 'MacBook / Mac';
    else if (/linux/i.test(ua)) device = 'Laptop Linux';
    let browser = 'Web Browser';
    if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
    else if (/edg/i.test(ua)) browser = 'Microsoft Edge';

    return { device, browser };
  };

  const sessions = useMemo(() => {
    return state.sessions && state.sessions.length > 0 ? state.sessions : (initialData.sessions || []);
  }, [state.sessions]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === state.activeSessionId) || sessions.find(s => s.isCurrent) || sessions[0] || null;
  }, [sessions, state.activeSessionId]);

  const loginUser=async(username:string,pin:string)=>{
    const result=await authenticateAccount(username,pin);
    if(!result.success||!result.user)return {success:false,error:result.error||'Login gagal.'};
    const user=result.user;
    try {
      let next={...createFreshUserData(user.username,user.displayName,''),currentUser:user,isAuthenticated:true,isLocked:false};
      if(user.role==='ADMIN'){const adminData=await pullAllDataFromSupabase(DEFAULT_SUPABASE_CONFIG);if(!adminData.success)throw new Error(adminData.error||'Gagal memuat data admin.');next={...next,...adminData.data,currentUser:user};}
      if(user.role!=='ADMIN'){
        const hydrated=await loadUserFinancialData(user.id,localStorage.getItem('takara_household_'+user.id));
        next={...next,...hydrated.data,currentUser:user,activeHouseholdId:hydrated.householdId,ledgerEntries:reconstructMissingLedgers(hydrated.data.transactions||[],hydrated.data.ledgerEntries||[],hydrated.householdId,hydrated.data.wallets||[])};
        loadedHousehold.current=user.id+':'+hydrated.householdId;
      }
      setIsFinancialReady(true);setAuthReady(true);setState(next);localStorage.setItem(CURRENT_USER_KEY,user.username);
      setSupabaseSyncStatus({status:'synced',lastSynced:new Date().toLocaleTimeString('id-ID')});
      return {success:true};
    }catch(error){await signOutAccount();return {success:false,error:error instanceof Error?error.message:'Gagal memuat household.'};}
  };
  const registerUser=async(displayName:string,username:string,pin:string,householdCode?:string)=>{
    const result=await registerAccount(displayName,username,pin,householdCode);if(!result.success)return result;
    return loginUser(username,pin);
  };

  const joinHouseholdByCode = async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!inviteCode.trim()) return { success: false, error: 'Masukkan kode household.' };
    try {
      const userId = state.currentUser.id;
      const household = await joinSupabaseHousehold(inviteCode, state.currentUser);
      const membership = await fetchUserHouseholds(userId);
      const result = await pullAllDataFromSupabase(DEFAULT_SUPABASE_CONFIG, household.id);
      if (!result.success || !result.data) return { success: false, error: result.error || 'Gagal membaca data household.' };
      localStorage.setItem('takara_household_' + userId, household.id);
      financialVersion.current++;
      setState(prev => prev.currentUser.id !== userId ? prev : ({
        ...prev, ...result.data, households:membership.households,
        members:Array.from(new Map([...membership.members, ...(result.data!.members || [])].map(m => [m.id,m])).values()),
        activeHouseholdId:household.id,
        ledgerEntries:reconstructMissingLedgers(result.data!.transactions || [],result.data!.ledgerEntries || [],household.id,result.data!.wallets || [])
      }));
      return { success: true };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Gagal bergabung ke Supabase.' }; }
  };

  const adminCreateUser = async (
    displayName: string,
    username: string,
    pin: string,
    role: UserRole = 'OWNER',
    householdId?: string
  ) => {
    const result = await adminCreateAccount(displayName, username, pin, role, householdId);
    if (result.success) {
      const dir = await refreshAdminDirectory();
      if (!dir.success && result.user) {
        setRegisteredUsers(prev => [result.user as User, ...prev]);
      }
    }
    return result;
  };
  const updateRegisteredUser = async (
    usernameOrId: string,
    updates: { displayName?: string; username?: string; pin5Digit?: string; role?: UserRole }
  ) => {
    const user = registeredUsers.find(u => u.id === usernameOrId || u.username === usernameOrId);
    if (!user) return { success: false, error: 'User tidak ditemukan.' };
    const result = await adminUpdateAccount(user.id, updates);
    if (result.success) {
      const nextUser = (result.user as User | undefined) || {
        ...user,
        displayName: updates.displayName || user.displayName,
        username: updates.username || user.username,
        role: updates.role || user.role,
        pinHash: ''
      };
      setRegisteredUsers(prev => prev.map(u => (u.id === user.id ? nextUser : u)));
      if (updates.displayName) {
        setState(prev => ({
          ...prev,
          members: prev.members.map(m =>
            m.userId === user.id ? { ...m, displayName: nextUser.displayName } : m
          )
        }));
      }
    }
    return result;
  };
  const deleteUser = async (usernameOrId: string) => {
    const user = registeredUsers.find(u => u.id === usernameOrId || u.username === usernameOrId);
    if (!user) return { success: false, error: 'User tidak ditemukan.' };
    const result = await adminDeleteAccount(user.id);
    if (result.success) {
      setRegisteredUsers(prev => prev.filter(u => u.id !== user.id));
      setState(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== user.id) }));
    }
    return result;
  };

  const addMemberToHousehold = async (
    householdId: string,
    displayName: string,
    usernameOrUserId: string,
    role: UserRole = 'MEMBER'
  ) => {
    const lookup = usernameOrUserId.trim().toLowerCase();
    const matchedUser = registeredUsers.find(
      u => u.id === usernameOrUserId.trim() || u.username.toLowerCase() === lookup
    );
    if (isSuperAdmin) {
      const res = await adminAddHouseholdMember(householdId, {
        userId: matchedUser?.id,
        username: matchedUser?.username || lookup,
        displayName: displayName.trim() || matchedUser?.displayName,
        role
      });
      if (!res.success || !res.member) return { success: false, error: res.error || 'Gagal menambahkan anggota.' };
      const added = res.member as HouseholdMember;
      setState(prev => ({
        ...prev,
        members: [...prev.members.filter(m => m.id !== added.id), added]
      }));
      return { success: true };
    }
    if (!matchedUser) return { success: false, error: 'Akun belum terdaftar. Buat akun atau gunakan kode undangan.' };
    const mem: HouseholdMember = {
      id: crypto.randomUUID(),
      householdId,
      userId: matchedUser.id,
      displayName: displayName.trim() || matchedUser.displayName,
      role,
      joinedAt: new Date().toISOString()
    };
    markLocalMutation(mem.id);
    const { error } = await getReceiptAuthClient()
      .from('household_members')
      .insert({
        id: mem.id,
        household_id: mem.householdId,
        user_id: mem.userId,
        display_name: mem.displayName,
        role: mem.role,
        joined_at: mem.joinedAt
      });
    if (error) return { success: false, error: error.message };
    setState(prev => ({ ...prev, members: [...prev.members, mem] }));
    return { success: true };
  };
  const removeMemberFromHousehold = async (id: string) => {
    if (isSuperAdmin) {
      const res = await adminRemoveHouseholdMember(id);
      if (!res.success) return { success: false, error: res.error || 'Gagal menghapus anggota.' };
      setState(prev => ({ ...prev, members: prev.members.filter(m => m.id !== id) }));
      return { success: true };
    }
    const { error } = await getReceiptAuthClient().from('household_members').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setState(prev => ({ ...prev, members: prev.members.filter(m => m.id !== id) }));
    return { success: true };
  };

  const logoutUser = () => {
    void signOutAccount();
    loadedHousehold.current='';setIsFinancialReady(false);
    clearReceiptSession(state.currentUser.id);
    setState(prev => {
      const updatedSessions = (prev.sessions || []).map(s => ({
        ...s,
        isCurrent: false
      }));

      const loggedOutState: AppState = {
        ...prev,
        isAuthenticated: false,
        isLocked: true,
        activeSessionId: undefined,
        sessions: updatedSessions
      };

      if (prev.currentUser?.username) {
        localStorage.setItem(getUserStorageKey(prev.currentUser.username), serializeSessionState(loggedOutState));
      }
      localStorage.removeItem(CURRENT_USER_KEY);

      return {
        ...initialData,
        isLocked: true,
        isAuthenticated: false,
        sessions: updatedSessions
      };
    });
  };

  const terminateSession = (sessionId: string) => {
    if (sessionId === state.activeSessionId) {
      logoutUser();
      return;
    }
    setState(prev => ({
      ...prev,
      sessions: (prev.sessions || initialData.sessions || []).filter(s => s.id !== sessionId)
    }));
  };
  const inviteMember=async(displayName:string,username:string,role:UserRole,pin:string)=>{const result=await inviteAccount(displayName,username,pin,state.activeHouseholdId,role);if(!result.success)return result;const membership=await fetchUserHouseholds(state.currentUser.id);membership.members.forEach(m=>markLocalMutation(m.id));setState(prev=>({...prev,members:membership.members,households:membership.households}));return {success:true};};
  const updateMember = async (
    id: string,
    updates: { displayName?: string; role?: UserRole; username?: string; pin5Digit?: string }
  ) => {
    const mem = state.members.find(m => m.id === id);
    if (!mem) return { success: false, error: 'Anggota tidak ditemukan.' };
    if (updates.pin5Digit || updates.username) {
      const account = await adminUpdateAccount(mem.userId, updates);
      if (!account.success) return account;
    }
    if (isSuperAdmin) {
      const res = await adminUpdateHouseholdMember(id, {
        displayName: updates.displayName,
        role: updates.role
      });
      if (!res.success) return { success: false, error: res.error || 'Gagal memperbarui anggota.' };
      const updatedMember = (res.member as HouseholdMember | undefined) || {
        ...mem,
        displayName: updates.displayName || mem.displayName,
        role: updates.role || mem.role
      };
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => (m.id === id ? updatedMember : m))
      }));
      return { success: true };
    }
    const { error } = await getReceiptAuthClient()
      .from('household_members')
      .update({ display_name: updates.displayName || mem.displayName, role: updates.role || mem.role })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    setState(prev => ({
      ...prev,
      members: prev.members.map(m =>
        m.id === id ? { ...m, displayName: updates.displayName || m.displayName, role: updates.role || m.role } : m
      )
    }));
    return { success: true };
  };
  const removeMember=removeMemberFromHousehold;

  const updateAIConfig = (cfg: Partial<AIConfig>) => {
    const updated = saveSystemAIConfig(cfg);
    setState(prev => ({
      ...prev,
      aiConfig: updated
    }));
  };

  const updateSupabaseConfig = (cfg: Partial<SupabaseConfig>) => {
    setState(prev => ({
      ...prev,
      supabaseConfig: { ...(prev.supabaseConfig || DEFAULT_SUPABASE_CONFIG), ...cfg }
    }));
  };

  const lockApp = () => {
    setState(prev => ({ ...prev, isLocked: true }));
  };

  const updatePIN=async(newPin:string,currentPin:string)=>{
    const expectedLen = getRequiredPinLength(state.currentUser?.username || '');
    if(!isValidPinFormat(state.currentUser?.username || '', newPin))return {success:false,error:`PIN harus ${expectedLen} digit angka.`};
    const saved=await changeAccountPin(currentPin,newPin);if(!saved.success)return saved;
    setState(prev=>({...prev,currentUser:{...prev.currentUser,pinHash:''}}));return {success:true};
  };

  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<{
    status: 'idle' | 'syncing' | 'synced' | 'error';
    lastSynced?: string;
    error?: string;
    count?: number;
  }>({ status: 'idle' });

  const syncAllToSupabase = async (): Promise<{ success: boolean; message: string; count?: number }> => {
    setSupabaseSyncStatus({ status: 'syncing' });
    const res = await pushAllDataToSupabase(state, state.supabaseConfig);
    if (res.success) {
      const nowStr = new Date().toLocaleTimeString('id-ID');
      setSupabaseSyncStatus({
        status: 'synced',
        lastSynced: nowStr,
        count: res.count
      });
      return { success: true, message: res.message, count: res.count };
    } else {
      setSupabaseSyncStatus({
        status: 'error',
        error: res.error
      });
      return { success: false, message: res.message };
    }
  };

  const syncFromSupabase = async (): Promise<{ success: boolean; message: string }> => {
    setSupabaseSyncStatus({ status: 'syncing' });
    const res = await pullAllDataFromSupabase(state.supabaseConfig, state.activeHouseholdId);
    if (res.success && res.data) {
      setState(prev => ({
        ...prev,
        ...res.data,
        wallets: res.data?.wallets || prev.wallets,
        categories: res.data?.categories || prev.categories,
        transactions: res.data?.transactions || prev.transactions,
        debts: res.data?.debts !== undefined ? res.data.debts : prev.debts
      }));
      const nowStr = new Date().toLocaleTimeString('id-ID');
      setSupabaseSyncStatus({ status: 'synced', lastSynced: nowStr });
      return { success: true, message: 'Berhasil sinkronisasi dari Supabase Cloud!' };
    } else {
      setSupabaseSyncStatus({ status: 'error', error: res.error });
      return { success: false, message: res.error || 'Gagal sinkronisasi dari Supabase.' };
    }
  };

  const resetMonthlyBalances=async(period?:string)=>{
    const householdId=state.activeHouseholdId;
    const result=await resetMonthlyBalancesInSupabase(householdId,state.supabaseConfig,period);
    if(!result.success)return result;
    const refreshed=await pullAllDataFromSupabase(state.supabaseConfig,householdId);
    if(!refreshed.success||!refreshed.data)return {...result,error:'Reset sudah tersimpan. Muat ulang untuk memperbarui saldo.'};
    setState(prev=>prev.activeHouseholdId===householdId?{...prev,...refreshed.data}:prev);
    return result;
  };
  const rollbackMonthlyBalance=async(checkpointId:string)=>{
    const householdId=state.activeHouseholdId;
    const result=await rollbackMonthlyBalanceInSupabase(householdId,checkpointId,state.supabaseConfig);
    if(!result.success)return result;
    const refreshed=await pullAllDataFromSupabase(state.supabaseConfig,householdId);
    if(!refreshed.success||!refreshed.data)return {...result,error:'Rollback sudah tersimpan. Muat ulang untuk memperbarui saldo.'};
    setState(prev=>prev.activeHouseholdId===householdId?{...prev,...refreshed.data}:prev);
    return result;
  };

  useEffect(()=>{
    if(!authReady||!state.isAuthenticated||!state.activeHouseholdId)return;
    const householdId=state.activeHouseholdId,userId=state.currentUser.id,admin=state.currentUser.role==='ADMIN';
    let disposed=false,refreshing=false,refreshTimer:ReturnType<typeof setTimeout>|undefined;

    const handleRealtimeInsert=(table:string,row:Record<string,unknown>)=>{
      const entityId=String(row.id||'');
      const rowHouseholdId=String(row.household_id||householdId);
      if(!entityId||rowHouseholdId!==householdId)return;
      if(localMutationIdsRef.current.has(entityId)||activeMutationCount.current>0)return;
      const snap=snapshotRef.current;
      if(!isFinancialReadyRef.current||!snap.ready||snap.householdId!==householdId)return;

      if(table==='transactions'){
        if(snap.txIds.has(entityId))return;
        snap.txIds.add(entityId);
        const notif=buildTransactionNotification({
          id:entityId,
          householdId:rowHouseholdId,
          type:row.type?String(row.type):undefined,
          amount:Number(row.amount||0),
          description:row.description?String(row.description):undefined,
          categoryName:row.category_name?String(row.category_name):undefined,
          addedBy:row.added_by?String(row.added_by):undefined,
          status:row.status?String(row.status):undefined
        });
        if(notif)pushHouseholdNotification(`tx:${entityId}`,notif);
      }else if(table==='wallets'){
        if(snap.walletIds.has(entityId))return;
        snap.walletIds.add(entityId);
        pushHouseholdNotification(`wallet:${entityId}`,buildWalletNotification({id:entityId,householdId:rowHouseholdId,name:row.name?String(row.name):undefined}));
      }else if(table==='debts'){
        if(snap.debtIds.has(entityId))return;
        snap.debtIds.add(entityId);
        pushHouseholdNotification(`debt:${entityId}`,buildDebtNotification({id:entityId,householdId:rowHouseholdId,type:row.type?String(row.type):undefined,personOrEntity:row.person_or_entity?String(row.person_or_entity):undefined,amount:Number(row.amount||0)}));
      }else if(table==='savings_goals'){
        if(snap.goalIds.has(entityId))return;
        snap.goalIds.add(entityId);
        pushHouseholdNotification(`goal:${entityId}`,buildSavingsGoalNotification({id:entityId,householdId:rowHouseholdId,title:row.title?String(row.title):undefined,targetAmount:Number(row.target_amount||0)}));
      }else if(table==='category_budgets'){
        if(snap.budgetIds.has(entityId))return;
        snap.budgetIds.add(entityId);
        pushHouseholdNotification(`budget:${entityId}`,buildCategoryBudgetNotification({id:entityId,householdId:rowHouseholdId,categoryName:row.category_name?String(row.category_name):undefined,monthlyLimit:Number(row.monthly_limit||0)}));
      }else if(table==='family_challenges'){
        if(snap.challengeIds.has(entityId))return;
        snap.challengeIds.add(entityId);
        pushHouseholdNotification(`challenge:${entityId}`,buildFamilyChallengeNotification({id:entityId,householdId:rowHouseholdId,title:row.title?String(row.title):undefined,createdBy:row.created_by?String(row.created_by):undefined}));
      }else if(table==='household_members'){
        if(snap.memberIds.has(entityId))return;
        snap.memberIds.add(entityId);
        pushHouseholdNotification(`member:${entityId}`,buildMemberNotification({id:entityId,householdId:rowHouseholdId,displayName:row.display_name?String(row.display_name):undefined}));
      }else if(table==='categories'){
        if(snap.catIds.has(entityId))return;
        snap.catIds.add(entityId);
        pushHouseholdNotification(`cat:${entityId}`,buildCategoryNotification({id:entityId,householdId:rowHouseholdId,name:row.name?String(row.name):undefined}));
      }
    };

    const refresh=async()=>{
      if(disposed||refreshing||activeMutationCount.current||document.visibilityState==='hidden')return;
      refreshing=true;const version=financialVersion.current;
      try{
        const pulled=await pullAllDataFromSupabase(DEFAULT_SUPABASE_CONFIG,admin?undefined:householdId);
        if(disposed||activeMutationCount.current||version!==financialVersion.current)return;
        if(!pulled.success||!pulled.data){setSupabaseSyncStatus({status:'error',error:pulled.error||'Pembaruan household belum tersedia.'});return;}

        const data=pulled.data;
        const snap=snapshotRef.current;
        if(isFinancialReadyRef.current&&snap.ready&&snap.householdId===householdId){
          const newTxs=(data.transactions||[]).filter(
            (tx)=>tx.householdId===householdId&&tx.status!=='VOIDED'&&tx.type!=='opening_balance'&&!isDebtOpeningTransaction(tx)&&!snap.txIds.has(tx.id)&&!localMutationIdsRef.current.has(tx.id)&&!notifiedKeysRef.current.has(`tx:${tx.id}`)
          );
          if(newTxs.length>3){
            for(const tx of newTxs)notifiedKeysRef.current.add(`tx:${tx.id}`);
            pushHouseholdNotification(`tx-batch:${newTxs.map((t)=>t.id).sort().join(',')}`,{
              householdId,
              kind:'transaction_expense',
              title:'Pembaruan Household',
              message:`${newTxs.length} transaksi baru ditambahkan ke household`,
              targetTab:'transaksi'
            });
          }else{
            for(const tx of newTxs){
              const notif=buildTransactionNotification(tx);
              if(notif)pushHouseholdNotification(`tx:${tx.id}`,notif);
            }
          }

          for(const w of data.wallets||[]){
            if(w.householdId===householdId&&!snap.walletIds.has(w.id)&&!localMutationIdsRef.current.has(w.id)){
              pushHouseholdNotification(`wallet:${w.id}`,buildWalletNotification(w));
            }
          }
          for(const d of data.debts||[]){
            if(d.householdId===householdId&&!snap.debtIds.has(d.id)&&!localMutationIdsRef.current.has(d.id)){
              pushHouseholdNotification(`debt:${d.id}`,buildDebtNotification(d));
            }
          }
          for(const g of data.savingsGoals||[]){
            if(g.householdId===householdId&&!snap.goalIds.has(g.id)&&!localMutationIdsRef.current.has(g.id)){
              pushHouseholdNotification(`goal:${g.id}`,buildSavingsGoalNotification(g));
            }
          }
          for(const b of data.categoryBudgets||[]){
            if(b.householdId===householdId&&!snap.budgetIds.has(b.id)&&!localMutationIdsRef.current.has(b.id)){
              pushHouseholdNotification(`budget:${b.id}`,buildCategoryBudgetNotification(b));
            }
          }
          for(const ch of data.familyChallenges||[]){
            if(ch.householdId===householdId&&!snap.challengeIds.has(ch.id)&&!localMutationIdsRef.current.has(ch.id)){
              pushHouseholdNotification(`challenge:${ch.id}`,buildFamilyChallengeNotification(ch));
            }
          }
          for(const m of data.members||[]){
            if(m.householdId===householdId&&!snap.memberIds.has(m.id)&&!localMutationIdsRef.current.has(m.id)){
              pushHouseholdNotification(`member:${m.id}`,buildMemberNotification(m));
            }
          }
        }

        if(isFinancialReadyRef.current&&snap.householdId===householdId){
          for(const t of data.transactions||[])if(t.householdId===householdId)snap.txIds.add(t.id);
          for(const w of data.wallets||[])if(w.householdId===householdId)snap.walletIds.add(w.id);
          for(const d of data.debts||[])if(d.householdId===householdId)snap.debtIds.add(d.id);
          for(const g of data.savingsGoals||[])if(g.householdId===householdId)snap.goalIds.add(g.id);
          for(const b of data.categoryBudgets||[])if(b.householdId===householdId)snap.budgetIds.add(b.id);
          for(const ch of data.familyChallenges||[])if(ch.householdId===householdId)snap.challengeIds.add(ch.id);
          for(const m of data.members||[])if(m.householdId===householdId)snap.memberIds.add(m.id);
          for(const c of data.categories||[])if(c.householdId===householdId)snap.catIds.add(c.id);
          snap.ready=true;
        }

        setState(prev=>prev.currentUser.id!==userId||prev.activeHouseholdId!==householdId?prev:({...prev,...data,currentUser:prev.currentUser,activeHouseholdId:householdId,ledgerEntries:reconstructMissingLedgers(data.transactions||[],data.ledgerEntries||[],householdId,data.wallets||[])}));
        setSupabaseSyncStatus({status:'synced',lastSynced:new Date().toLocaleTimeString('id-ID')});
      }catch{if(!disposed)setSupabaseSyncStatus({status:'error',error:'Belum dapat memperbarui household. Periksa koneksi Anda.'});}finally{refreshing=false;}
    };
    const schedule=()=>{if(refreshTimer)clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,400);};
    const client=getReceiptAuthClient();let channel=client.channel('takara-household-'+householdId+'-'+userId);
    for(const table of ['transactions','ledger_entries','wallets','categories','debts','household_members','household_labels','savings_goals','category_budgets','family_challenges'] as const){
      channel=channel.on('postgres_changes',{event:'*',schema:'public',table,...(!admin?{filter:'household_id=eq.'+householdId}:{})},(payload)=>{
        schedule();
        if(disposed||table==='ledger_entries'||table==='household_labels'||activeMutationCount.current>0||payload.eventType!=='INSERT')return;
        const row=payload.new as Record<string,unknown>|undefined;
        if(row)handleRealtimeInsert(table,row);
      });
    }
    channel.subscribe();
    const interval=setInterval(refresh,15000);
    window.addEventListener('focus',schedule);document.addEventListener('visibilitychange',schedule);
    return()=>{disposed=true;if(refreshTimer)clearTimeout(refreshTimer);clearInterval(interval);window.removeEventListener('focus',schedule);document.removeEventListener('visibilitychange',schedule);void client.removeChannel(channel);};
  },[authReady,state.isAuthenticated,state.activeHouseholdId,state.currentUser.id,state.currentUser.role,pushHouseholdNotification]);

  return (
    <AppContext.Provider
      value={{
        state,
        isFinancialReady,
        isAuthReady:authReady,
        activeHousehold,
        households: userHouseholds,
        wallets,
        categories,
        labels,
        members,
        transactions,
        ledgerEntries: state.ledgerEntries,
        totalBalance,
        periodIncome,
        periodExpense,
        netCashFlow,
        addTransaction:(...args)=>duringWrite(()=>addTransaction(...args)),
        voidTransaction:(...args)=>duringWrite(()=>voidTransaction(...args)),
        clearCurrentMonthTransactions:(...args)=>duringWrite(()=>clearCurrentMonthTransactions(...args)),
        resetMonthlyBalances:(period)=>duringWrite(()=>resetMonthlyBalances(period)),
        rollbackMonthlyBalance:(checkpointId)=>duringWrite(()=>rollbackMonthlyBalance(checkpointId)),
        editTransaction:(...args)=>duringWrite(()=>editTransaction(...args)),
        debts,
        addDebt:(...args)=>duringWrite(()=>addDebt(...args)),
        toggleDebtSettled:(...args)=>duringWrite(()=>toggleDebtSettled(...args)),
        toggleDebtPaidThisMonth:(...args)=>duringWrite(()=>toggleDebtPaidThisMonth(...args)),
        payDebtInstallment:(...args)=>duringWrite(()=>payDebtInstallment(...args)),
        updateDebt:(...args)=>duringWrite(()=>updateDebt(...args)),
        deleteDebt:(...args)=>duringWrite(()=>deleteDebt(...args)),
        savingsGoals,
        addSavingsGoal:(...args)=>duringWrite(()=>addSavingsGoal(...args)),
        updateSavingsGoal:(...args)=>duringWrite(()=>updateSavingsGoal(...args)),
        contributeToSavingsGoal:(...args)=>duringWrite(()=>contributeToSavingsGoal(...args)),
        deleteSavingsGoal:(...args)=>duringWrite(()=>deleteSavingsGoal(...args)),
        categoryBudgets,
        upsertCategoryBudget:(...args)=>duringWrite(()=>upsertCategoryBudget(...args)),
        deleteCategoryBudget:(...args)=>duringWrite(()=>deleteCategoryBudget(...args)),
        familyChallenges,
        addFamilyChallenge:(...args)=>duringWrite(()=>addFamilyChallenge(...args)),
        deleteFamilyChallenge:(...args)=>duringWrite(()=>deleteFamilyChallenge(...args)),
        addWallet:(...args)=>duringWrite(()=>addWallet(...args)),
        updateWallet:(...args)=>duringWrite(()=>updateWallet(...args)),
        deleteWallet:(...args)=>duringWrite(()=>deleteWallet(...args)),
        addCategory:(...args)=>duringWrite(()=>addCategory(...args)),
        updateCategory:(...args)=>duringWrite(()=>updateCategory(...args)),
        deleteCategory:(...args)=>duringWrite(()=>deleteCategory(...args)),
        addLabel:(...args)=>duringWrite(()=>addLabel(...args)),
        switchHousehold,
        createHousehold:(...args)=>duringWrite(()=>createHousehold(...args)),
        updateHousehold:(...args)=>duringWrite(()=>updateHousehold(...args)),
        deleteHousehold:(...args)=>duringWrite(()=>deleteHousehold(...args)),
        importExcelFile:(...args)=>duringWrite(()=>importExcelFile(...args)),
        importJSONFile:(...args)=>duringWrite(()=>importJSONFile(...args)),
        resetToDefault,
        verifyAndUnlock,
        loginUser,
        lockApp,
        updatePIN:(...args)=>duringWrite(()=>updatePIN(...args)),
        inviteMember:(...args)=>duringWrite(()=>inviteMember(...args)),
        updateMember:(...args)=>duringWrite(()=>updateMember(...args)),
        removeMember:(...args)=>duringWrite(()=>removeMember(...args)),
        updateAIConfig,
        updateSupabaseConfig,
        syncAllToSupabase:(...args)=>duringWrite(()=>syncAllToSupabase(...args)),
        syncFromSupabase,
        supabaseSyncStatus,
        logoutUser,
        terminateSession,
        sessions,
        activeSession,
        registeredUsers,
        registerUser:(...args)=>duringWrite(()=>registerUser(...args)),
        joinHouseholdByCode:(...args)=>duringWrite(()=>joinHouseholdByCode(...args)),
        updateRegisteredUser:(...args)=>duringWrite(()=>updateRegisteredUser(...args)),
        adminCreateUser:(...args)=>duringWrite(()=>adminCreateUser(...args)),
        deleteUser:(...args)=>duringWrite(()=>deleteUser(...args)),
        refreshAdminDirectory,
        addMemberToHousehold:(...args)=>duringWrite(()=>addMemberToHousehold(...args)),
        removeMemberFromHousehold:(...args)=>duringWrite(()=>removeMemberFromHousehold(...args)),
        allHouseholds,
        allMembers,
        notifications,
        activeToasts: householdToasts,
        unreadNotificationCount,
        dismissToast,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
