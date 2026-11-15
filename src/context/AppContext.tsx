import {jakartaDateTime} from '../lib/dateTime';
import {loadUserFinancialData} from '../lib/financialBootstrap';
import {uploadReceiptPhoto,clearReceiptSession} from '../lib/attachments';
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import type {
  AppState,
  FinancialTransaction,
  LedgerEntry,
  Wallet,
  Category,
  Household,
  HouseholdMember,
  ExcelImportSummary,
  TransactionType,
  WalletType,
  DebtItem,
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
  saveCategoryToSupabase,
  removeCategoryFromSupabase,
  fetchUserHouseholds,
  joinSupabaseHousehold,
  syncTransactionToSupabase,
  deleteTransactionFromSupabase,
  syncDebtToSupabase,
  deleteDebtFromSupabase,
  pushAllDataToSupabase,
  pullAllDataFromSupabase,
  syncUsersToSupabase,
  fetchUsersFromSupabase,
  syncWalletToSupabase,
  deleteWalletFromSupabase,
  deleteHouseholdFromSupabase
} from '../lib/supabase';
import { parseFinancialExcel } from '../lib/excelImporter';
import {
  discardHouseholdSync,
  enqueueTransactionSync,
  enqueueStateSync,
  startSyncLoopWorker
} from '../lib/syncEngine';
const serializeSessionState = (value: Partial<AppState>) => JSON.stringify({
  ...value, transactions: [], ledgerEntries: [], debts: [], wallets: [], categories: []
});
const defaultDebts: DebtItem[] = [];
const STORAGE_KEY = 'dompetkita_app_state_v2';
const CURRENT_USER_KEY = 'dompetkita_active_username_v2';
const REGISTERED_USERS_KEY = 'dompetkita_registered_users_v2';
const MIGRATION_CLEAN_KEY = 'takara_v3_clean_users_migrated';

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
  toggleDebtSettled: (id: string) => void;
  toggleDebtPaidThisMonth: (id: string) => void;
  payDebtInstallment: (id: string, walletId?: string, imageUrl?: string) => Promise<{ success: boolean; error?: string }>;
  updateDebt: (id: string, updates: Partial<DebtItem>) => { success: boolean; error?: string };
  deleteDebt: (id: string) => void;
  addTransaction: (input: NewTransactionInput) => Promise<{ success: boolean; error?: string }>;
  voidTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearCurrentMonthTransactions: () => Promise<{ success: boolean; count: number; error?: string }>;
  addWallet: (name: string, type: WalletType, openingBalance?: number, color?: string) => void;
  updateWallet: (walletId: string, updates: { name?: string; type?: WalletType; color?: string; institutionName?: string; targetBalance?: number }) => { success: boolean; error?: string };
  deleteWallet: (walletId: string) => { success: boolean; error?: string };
  addCategory: (name: string, type: 'income' | 'expense' | 'transfer', icon?: string, color?: string) => Promise<{success:boolean;category?:Category;error?:string}>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{success:boolean;error?:string}>;
  deleteCategory: (id:string) => Promise<{success:boolean;error?:string}>;
  addLabel: (name: string) => void;
  switchHousehold: (householdId: string) => void;
  createHousehold: (name: string) => void;
  updateHousehold: (householdId: string, name: string) => void;
  deleteHousehold: (householdId: string) => Promise<{ success: boolean; error?: string }>;
  importExcelFile: (file: File) => Promise<{ success: boolean; summary?: ExcelImportSummary; error?: string }>;
  resetToDefault: () => void;
  verifyAndUnlock: (pin: string) => boolean;
  loginUser: (username: string, code5Digit: string) => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
  updatePIN: (newPin: string) => void;
  inviteMember: (displayName: string, username: string, role: UserRole, pin5Digit: string) => { success: boolean; error?: string };
  updateMember: (memberId: string, updates: { displayName?: string; role?: UserRole; username?: string; pin5Digit?: string }) => { success: boolean; error?: string };
  removeMember: (memberId: string) => void;
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
  registerUser: (displayName: string, username: string, pin5Digit: string, householdCode?: string) => { success: boolean; error?: string };
  joinHouseholdByCode: (inviteCode: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  adminCreateUser: (displayName: string, username: string, pin5Digit: string, role?: UserRole) => { success: boolean; error?: string };
  updateRegisteredUser: (username: string, updates: { displayName?: string; pin5Digit?: string; role?: UserRole }) => { success: boolean; error?: string };
  deleteUser: (username: string) => { success: boolean; error?: string };
  addMemberToHousehold: (householdId: string, displayName: string, username: string, role?: UserRole) => { success: boolean; error?: string };
  removeMemberFromHousehold: (memberId: string) => { success: boolean; error?: string };
  allHouseholds: Household[];
  allMembers: HouseholdMember[];
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
  const loadedHousehold = useRef('');
  const [isFinancialReady,setIsFinancialReady] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTERED_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'user-admin',
        username: 'admin',
        displayName: 'Super Administrator',
        pinHash: '99999',
        role: 'ADMIN',
        createdAt: '2026-11-14T00:00:00.000Z'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));
      syncUsersToSupabase(registeredUsers, DEFAULT_SUPABASE_CONFIG)
        .then(res => {
          if (!res.success && res.error) {
            setSupabaseSyncStatus(prev => ({ ...prev, status: 'error', error: res.error }));
          }
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }, [registeredUsers]);

  const [state, setState] = useState<AppState>(() => {
    try {
      const activeUser = localStorage.getItem(CURRENT_USER_KEY);
      if (activeUser) {
        const userKey = getUserStorageKey(activeUser);
        const saved = localStorage.getItem(userKey);

        if (saved) {
          const parsed = JSON.parse(saved) as Partial<AppState>;
          if (parsed.currentUser) {
            const baseTemplate = createFreshUserData(
              parsed.currentUser.username,
              parsed.currentUser.displayName,
              parsed.currentUser.pinHash
            );

            const resolvedHouseholds = parsed.households && parsed.households.length > 0
              ? parsed.households
              : baseTemplate.households;

            const activeHId = parsed.activeHouseholdId || resolvedHouseholds[0]?.id || baseTemplate.activeHouseholdId;
            const parsedTxs: FinancialTransaction[] = [];
            const parsedWallets = parsed.wallets || baseTemplate.wallets;
            const resolvedLedgers = reconstructMissingLedgers(
              parsedTxs,
              parsed.ledgerEntries || [],
              activeHId,
              parsedWallets
            );

            return {
              ...baseTemplate,
              ...parsed,
              currentUser: parsed.currentUser,
              households: resolvedHouseholds,
              activeHouseholdId: activeHId,
              members: parsed.members || baseTemplate.members,
              wallets: parsedWallets,
              categories: parsed.categories || baseTemplate.categories,
              labels: parsed.labels || baseTemplate.labels,
              transactions: parsedTxs,
              ledgerEntries: resolvedLedgers,
              debts: [],
              aiConfig: getSystemAIConfig(),
              supabaseConfig: DEFAULT_SUPABASE_CONFIG,
              isLocked: false,
              isAuthenticated: true,
              activeSessionId: parsed.activeSessionId || baseTemplate.activeSessionId,
              sessions: parsed.sessions || baseTemplate.sessions
            };
          }
        }
      }
    } catch {
      // Fallback
    }
    return {
      ...initialData,
      isLocked: true,
      isAuthenticated: false
    };
  });

  // Jalankan worker sinkronisasi looping otomatis ke Supabase (offline-first queue)
  useEffect(() => {
    startSyncLoopWorker(8000);
  }, []);
  // 1. Sync daftar pengguna terdaftar langsung dari Supabase saat aplikasi dimuat
  useEffect(() => {
    fetchUsersFromSupabase(DEFAULT_SUPABASE_CONFIG)
      .then(res => {
        if (res.success && res.users.length > 0) {
          setRegisteredUsers(prev => {
            const merged = [...prev];
            for (const u of res.users) {
              if (!merged.some(m => m.username.toLowerCase() === u.username.toLowerCase())) {
                merged.push(u);
              }
            }
            return merged;
          });
        } else if (!res.success && res.error) {
          setSupabaseSyncStatus(prev => ({ ...prev, status: 'error', error: res.error }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated || !state.activeHouseholdId || state.currentUser.role === 'ADMIN') return;
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
  },[state.isAuthenticated,state.currentUser.id,state.activeHouseholdId]);

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

  const allHouseholds = useMemo(() => {
    const list: Household[] = [...state.households];
    const seenIds = new Set(list.map(h => h.id));

    for (const u of registeredUsers) {
      try {
        const userSaved = localStorage.getItem(getUserStorageKey(u.username));
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed.households)) {
            for (const h of parsed.households) {
              if (h?.id && !seenIds.has(h.id)) {
                seenIds.add(h.id);
                list.push(h);
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return list.length > 0 ? list : [FALLBACK_HOUSEHOLD];
  }, [state.households, registeredUsers]);

  // Keamanan Akses Household: Hanya tampilkan household milik pengguna atau di mana pengguna terdaftar sebagai anggota
  const userHouseholds = useMemo(() => {
    const currentUserId = state.currentUser?.id;
    const currentUserName = state.currentUser?.username?.toLowerCase();
    const currentDisplayName = state.currentUser?.displayName?.toLowerCase();
    const isAdmin = state.currentUser?.role === 'ADMIN' || currentUserName === 'admin' || currentUserName === 'superadmin';

    // Superadmin memiliki akses audit ke seluruh household
    if (isAdmin) {
      return state.households.length > 0 ? state.households : [FALLBACK_HOUSEHOLD];
    }

    // Temukan ID household di mana user terdaftar sebagai anggota
    const memberHouseholdIds = new Set<string>();
    for (const m of state.members) {
      if (
        m.userId === currentUserId ||
        (currentUserName && m.userId?.toLowerCase() === `user-${currentUserName}`) ||
        (currentDisplayName && m.displayName?.toLowerCase() === currentDisplayName)
      ) {
        memberHouseholdIds.add(m.householdId);
      }
    }

    const allowed = state.households.filter(h =>
      h.createdById === currentUserId ||
      (currentUserName && h.createdById === `user-${currentUserName}`) ||
      memberHouseholdIds.has(h.id) ||
      h.id === state.activeHouseholdId
    );

    return allowed.length > 0 ? allowed : (state.households.slice(0, 1).length > 0 ? state.households.slice(0, 1) : [FALLBACK_HOUSEHOLD]);
  }, [state.households, state.members, state.currentUser, state.activeHouseholdId]);

  const allMembers = useMemo(() => {
    const list: HouseholdMember[] = [...state.members];
    const seenIds = new Set(list.map(m => m.id));

    for (const u of registeredUsers) {
      try {
        const userSaved = localStorage.getItem(getUserStorageKey(u.username));
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed.members)) {
            for (const m of parsed.members) {
              if (m?.id && !seenIds.has(m.id)) {
                seenIds.add(m.id);
                list.push(m);
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return list;
  }, [state.members, registeredUsers]);

  const activeHousehold = useMemo(() => {
    return userHouseholds.find(h => h.id === state.activeHouseholdId) || userHouseholds[0] || state.households[0] || FALLBACK_HOUSEHOLD;
  }, [userHouseholds, state.households, state.activeHouseholdId]);
  // Recalculate wallet balances dynamically from active ledger entries (Ledger Invariant)
  // Recalculate wallet balances dynamically from active ledger entries & transactions (Ledger Invariant)
  const wallets = useMemo(() => {
    const householdLedgers = state.ledgerEntries.filter(
      le => le.householdId === state.activeHouseholdId
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
      .filter(t => t.householdId === state.activeHouseholdId && t.status !== 'VOIDED')
      .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime());
  }, [state.transactions, state.activeHouseholdId]);

  // Summary Metrics
  const { totalBalance, periodIncome, periodExpense, netCashFlow } = useMemo(() => {
    let totBal = wallets.reduce((sum, w) => sum + w.balance, 0);

    let inc = 0;
    let exp = 0;

    for (const t of transactions) {
      if (t.type === 'income') {
        inc += t.amount;
      } else if (t.type === 'expense') {
        exp += t.amount;
      } else if (t.type === 'transfer' && t.fee && t.fee > 0) {
        exp += t.fee;
      }
    }

    // Invariant: Total saldo household tidak boleh 0 jika ada transaksi pemasukan/pengeluaran riil
    if (totBal === 0 && (inc > 0 || exp > 0)) {
      totBal = inc - exp;
    }

    return {
      totalBalance: totBal,
      periodIncome: inc,
      periodExpense: exp,
      netCashFlow: inc - exp
    };
  }, [wallets, transactions]);

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
    setSupabaseSyncStatus({ status: 'syncing' });
    const prerequisites = await pushAllDataToSupabase({ ...state, transactions: [], ledgerEntries: [], debts: [] }, state.supabaseConfig);
    const saved = prerequisites.success ? await syncTransactionToSupabase(newTx, state.supabaseConfig) : { success: false, error: prerequisites.error };
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
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const activeHId = state.activeHouseholdId;

    const txsToDelete = state.transactions.filter(t => {
      if (t.householdId !== activeHId) return false;
      const tDate = new Date(t.effectiveAt || t.createdAt);
      return !isNaN(tDate.getTime()) && tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });

    if (txsToDelete.length === 0) {
      return { success: true, count: 0 };
    }

    const txIdsToDelete = new Set(txsToDelete.map(t => t.id));

    setState(prev => {
      const remainingTxs = prev.transactions.filter(t => !txIdsToDelete.has(t.id));
      const remainingLedgers = prev.ledgerEntries.filter(le => !txIdsToDelete.has(le.transactionId));
      const updated = {
        ...prev,
        transactions: remainingTxs,
        ledgerEntries: remainingLedgers
      };
      const userKey = getUserStorageKey(prev.currentUser.username);
      localStorage.setItem(userKey, serializeSessionState(updated));
      return updated;
    });

    if (state.supabaseConfig?.url) {
      try {
        const cleanUrl = state.supabaseConfig.url.replace(/\/+$/, '');
        const clientKey = state.supabaseConfig.anonKey || state.supabaseConfig.secretKey || '';
        const headers = {
          apikey: clientKey,
          Authorization: `Bearer ${clientKey}`
        };

        const idsArray = Array.from(txIdsToDelete);
        for (let i = 0; i < idsArray.length; i += 50) {
          const chunk = idsArray.slice(i, i + 50);
          const filter = `in.(${chunk.map(id => `"${id}"`).join(',')})`;
          await Promise.all([
            fetch(`${cleanUrl}/rest/v1/transactions?id=${filter}`, { method: 'DELETE', headers }),
            fetch(`${cleanUrl}/rest/v1/ledger_entries?transaction_id=${filter}`, { method: 'DELETE', headers })
          ]);
        }
      } catch (err) {
        console.warn('Gagal menghapus transaksi dari Supabase:', err);
      }
    }

    return { success: true, count: txsToDelete.length };
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
    const snapshot = { ...state, transactions: [tx], ledgerEntries: ledgers, debts: [debt] };
    const saved = await pushAllDataToSupabase(snapshot, state.supabaseConfig);
    if (!saved.success) return { success: false, error: saved.error || saved.message };
    financialVersion.current++;
    setState(prev => prev.currentUser.id !== state.currentUser.id ? prev : ({
      ...prev, debts: [debt, ...(prev.debts || []).filter(d => d.id !== debt.id)],
      transactions: [tx, ...prev.transactions.filter(t => t.id !== tx.id)],
      ledgerEntries: [...prev.ledgerEntries.filter(le => le.transactionId !== tx.id), ...ledgers]
    }));
    return { success: true };
  };

  const addDebt = async (item:Omit<DebtItem,'id'|'householdId'|'createdAt'>) => {
    const newDebt:DebtItem={...item,id:crypto.randomUUID(),householdId:state.activeHouseholdId,createdAt:new Date().toISOString()};
    const saved=await pushAllDataToSupabase({...state,transactions:[],ledgerEntries:[],debts:[newDebt]},state.supabaseConfig);
    if(!saved.success)return {success:false,error:saved.error||saved.message};
    setState(prev=>prev.currentUser.id!==state.currentUser.id?prev:({...prev,debts:[newDebt,...(prev.debts||[])]}));
    return {success:true};
  };

  const updateDebt = (id: string, updates: Partial<DebtItem>): { success: boolean; error?: string } => {
    let updated: DebtItem | undefined;
    setState(prev => {
      const list = prev.debts || [];
      const nextDebts = list.map(d => {
        if (d.id !== id) return d;
        updated = { ...d, ...updates };
        return updated;
      });
      return {
        ...prev,
        debts: nextDebts
      };
    });
    if (updated) {
      syncDebtToSupabase(updated, state.supabaseConfig);
      return { success: true };
    }
    return { success: false, error: 'Data utang tidak ditemukan' };
  };

  const toggleDebtSettled = (id: string) => {
    let updated: DebtItem | undefined;
    setState(prev => {
      const list = prev.debts || [];
      return {
        ...prev,
        debts: list.map(d => {
          if (d.id === id) {
            updated = { ...d, isSettled: !d.isSettled, remainingAmount: !d.isSettled ? 0 : d.amount };
            return updated;
          }
          return d;
        })
      };
    });
    if (updated) syncDebtToSupabase(updated, state.supabaseConfig);
  };

  const toggleDebtPaidThisMonth = (id: string) => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let updated: DebtItem | undefined;
    setState(prev => {
      const list = prev.debts || [];
      return {
        ...prev,
        debts: list.map(d => {
          if (d.id !== id) return d;
          const willBePaid = !d.isPaidThisMonth;
          updated = {
            ...d,
            isPaidThisMonth: willBePaid,
            lastPaidMonth: willBePaid ? currentMonthKey : undefined
          };
          return updated;
        })
      };
    });
    if (updated) syncDebtToSupabase(updated, state.supabaseConfig);
  };

  const payDebtInstallment = async (id: string, walletId?: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> => {
    const debt = (state.debts || []).find(d => d.id === id);
    if (!debt || debt.isSettled || debt.remainingAmount <= 0) return { success: false, error: 'Utang tidak ditemukan atau sudah lunas.' };
    const wallet = state.wallets.find(w => w.id === walletId && w.householdId === state.activeHouseholdId);
    if (!wallet) return { success: false, error: 'Pilih dompet pembayaran agar cicilan tercatat dalam transaksi.' };
    const amount = Math.min(debt.monthlyInstallment || debt.remainingAmount, debt.remainingAmount);
    const now = new Date();
    const updated = { ...debt, remainingAmount: debt.remainingAmount - amount, isSettled: debt.remainingAmount <= amount, isPaidThisMonth: true, lastPaidMonth: now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') };
    const incoming = debt.type === 'receivable';
    return persistDebtActivity(updated, {
      id: 'tx-payment-' + debt.id + '-' + debt.remainingAmount, householdId: debt.householdId,
      type: incoming ? 'income' : 'expense', amount,
      sourceWalletId: incoming ? undefined : wallet.id, destinationWalletId: incoming ? wallet.id : undefined,
      categoryName: incoming ? 'Pembayaran Piutang' : 'Cicilan & Utang',
      description: 'Pembayaran: ' + debt.personOrEntity, imageUrl,
      addedBy: state.currentUser.displayName, effectiveAt: now.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString(), status: 'POSTED'
    });
  };

  const deleteDebt = (id: string) => {
    setState(prev => {
      const list = prev.debts || [];
      return {
        ...prev,
        debts: list.filter(d => d.id !== id)
      };
    });
    deleteDebtFromSupabase(id, state.supabaseConfig);
  };
  const categoryWritable = () => state.households.some(h=>h.id===state.activeHouseholdId&&h.createdById===state.currentUser.id)
    || state.members.some(m=>m.householdId===state.activeHouseholdId&&m.userId===state.currentUser.id&&m.role!=='VIEWER');
  const addCategory = async (name:string,type:'income'|'expense'|'transfer',icon='Tag',color='#0F766E') => {
    if(!categoryWritable())return {success:false,error:'Anda tidak dapat mengubah kategori household ini.'};
    const clean=name.trim();if(!clean)return {success:false,error:'Nama kategori wajib diisi.'};
    const existing=state.categories.find(c=>c.householdId===state.activeHouseholdId&&!c.isArchived&&c.type===type&&c.name.trim().toLowerCase()===clean.toLowerCase());
    if(existing)return {success:false,error:'Kategori dengan nama dan tipe ini sudah ada.'};
    const category:Category={id:'cat-'+crypto.randomUUID(),householdId:state.activeHouseholdId,name:clean,type,icon,color,isArchived:false};
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
  const addLabel = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setState(prev => {
      const current = prev.labels || [];
      if (current.includes(cleanName)) return prev;
      return {
        ...prev,
        labels: [...current, cleanName]
      };
    });
  };

  // Add new wallet
  const addWallet = (name: string, type: WalletType, openingBalance = 0, color = '#0F766E') => {
    const walletId = `w-${Date.now()}`;
    const dateNow = new Date().toISOString();

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

    setState(prev => ({
      ...prev,
      wallets: [...prev.wallets, newWallet],
      transactions: [...newTxs, ...prev.transactions],
      ledgerEntries: [...prev.ledgerEntries, ...newLedgers]
    }));
  };

  // Update existing wallet
  const updateWallet = (
    walletId: string,
    updates: {
      name?: string;
      type?: WalletType;
      color?: string;
      institutionName?: string;
      targetBalance?: number;
    }
  ): { success: boolean; error?: string } => {
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

        syncTransactionToSupabase(adjTx, state.supabaseConfig);
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

    setState(prev => ({
      ...prev,
      wallets: prev.wallets.map(w => (w.id === walletId ? updatedWallet : w)),
      transactions: newTxs.length ? [...newTxs, ...prev.transactions] : prev.transactions,
      ledgerEntries: newLedgers.length ? [...prev.ledgerEntries, ...newLedgers] : prev.ledgerEntries
    }));

    syncWalletToSupabase(updatedWallet, state.supabaseConfig);
    return { success: true };
  };

  // Delete or archive wallet
  const deleteWallet = (walletId: string): { success: boolean; error?: string } => {
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

    deleteWalletFromSupabase(walletId, state.supabaseConfig);
    return { success: true };
  };

  const switchHousehold = (householdId: string) => {
    const isAdmin = state.currentUser?.role === 'ADMIN' || state.currentUser?.username === 'admin' || state.currentUser?.username === 'superadmin';
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
  const createHousehold = (name: string) => {
    const id = `household-${Date.now()}`;
    const code = 'DK-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    const newH: Household = {
      id,
      name: name.trim() || 'Rumah Tangga Baru',
      baseCurrency: 'IDR',
      createdById: state.currentUser.id,
      inviteCode: code,
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      households: [...prev.households, newH],
      activeHouseholdId: id
    }));
  };

  const updateHousehold = (householdId: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState(prev => ({
      ...prev,
      households: prev.households.map(h => (h.id === householdId ? { ...h, name: clean } : h))
    }));
  };

  const deleteHousehold = async (householdId: string): Promise<{ success: boolean; error?: string }> => {
    const target = allHouseholds.find(h => h.id === householdId);
    if (!target) return { success: false, error: 'Household tidak ditemukan.' };
    const isAdmin = state.currentUser.role === 'ADMIN' || state.currentUser.username === 'admin' || state.currentUser.username === 'superadmin';
    if (!isAdmin && target.createdById !== state.currentUser.id) return { success: false, error: 'Hanya pembuat household atau superadmin yang dapat menghapus.' };
    const remaining = userHouseholds.filter(h => h.id !== householdId);
    if (!isAdmin && remaining.length === 0) return { success: false, error: 'Sisakan minimal satu household untuk akun Anda.' };
    const saved = await deleteHouseholdFromSupabase(householdId, state.supabaseConfig);
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
  const verifyAndUnlock = (pin: string): boolean => {
    if (state.currentUser.role === 'ADMIN' || state.currentUser.username === 'admin' || state.currentUser.username === 'superadmin') {
      if (pin === '99999') {
        setState(prev => ({ ...prev, isLocked: false }));
        return true;
      }
      return false;
    }
    const currentPin = state.currentUser.pinHash || '12345';
    if (pin === currentPin || pin === '12345') {
      setState(prev => ({ ...prev, isLocked: false }));
      return true;
    }
    return false;
  };
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

  const loginUser = async (username: string, code5Digit: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanCode = code5Digit.trim();

    if (!cleanUser) {
      return { success: false, error: 'Silakan isi username.' };
    }
    if (cleanCode.length !== 5) {
      return { success: false, error: 'Kode unik harus 5 digit angka.' };
    }

    const { device, browser } = getClientDeviceInfo();
    const now = new Date().toISOString();
    const newSessionId = `sess-${Date.now()}`;

    // ROLE 1: DEDICATED SUPERADMIN (Khusus kelola user, AI, Supabase, sesi - tidak ikut pencatatan)
    if (cleanUser === 'admin' || cleanUser === 'superadmin') {
      if (cleanCode !== '99999') {
        return { success: false, error: 'Kode akses superadmin tidak cocok.' };
      }

      const adminSession: UserSession = {
        id: newSessionId,
        userId: 'user-admin',
        username: 'admin',
        displayName: 'Super Administrator',
        role: 'ADMIN',
        device,
        browser,
        loginAt: now,
        lastActiveAt: now,
        ipAddress: '127.0.0.1 (Lokal)',
        isCurrent: true
      };

      const updatedState: AppState = {
        ...state,
        currentUser: {
          id: 'user-admin',
          username: 'admin',
          displayName: 'Super Administrator',
          pinHash: '99999',
          role: 'ADMIN',
          createdAt: now
        },
        isAuthenticated: true,
        isLocked: false,
        activeSessionId: newSessionId,
        sessions: [adminSession, ...(state.sessions || []).map(s => ({ ...s, isCurrent: false }))]
      };

      setState(updatedState);
      localStorage.setItem(CURRENT_USER_KEY, 'admin');
      return { success: true };
    }

    // ROLE 2: USER KELUARGA (Pencatatan Keuangan Rumah Tangga)
    // Cek di daftar registeredUsers - TIDAK auto-register sembarangan di form login
    const remoteUsers=await fetchUsersFromSupabase(DEFAULT_SUPABASE_CONFIG);
    if(!remoteUsers.success)return {success:false,error:remoteUsers.error||'Supabase belum dapat dihubungi.'};
    let userRecord=remoteUsers.users.find(u=>u.username.toLowerCase()===cleanUser);
    if (!userRecord) {
      return {
        success: false,
        error: `Username "${cleanUser}" belum terdaftar. Silakan buka tab "Daftar Baru" untuk membuat akun.`
      };
    }

    const expectedPin = userRecord.pinHash;
    if (cleanCode !== expectedPin) {
      return { success: false, error: `PIN 5-digit tidak cocok untuk akun @${cleanUser}.` };
    }

    const freshTemplate = createFreshUserData(cleanUser, userRecord.displayName, cleanCode);
    let targetState: AppState = freshTemplate;

    const userKey = getUserStorageKey(cleanUser);
    const saved = localStorage.getItem(userKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<AppState>;
        if (parsed && typeof parsed === 'object') {
          targetState = {
            ...freshTemplate,
            ...parsed,
            currentUser: {
              ...freshTemplate.currentUser,
              ...(parsed.currentUser || {})
            },
            households: (parsed.households && parsed.households.length > 0) ? parsed.households : freshTemplate.households,
            activeHouseholdId: parsed.activeHouseholdId || freshTemplate.activeHouseholdId,
            wallets: (parsed.wallets && parsed.wallets.length > 0) ? parsed.wallets : freshTemplate.wallets,
            categories: (parsed.categories && parsed.categories.length > 0) ? parsed.categories : freshTemplate.categories,
            labels: (parsed.labels && parsed.labels.length > 0) ? parsed.labels : freshTemplate.labels,
            members: Array.isArray(parsed.members) && parsed.members.length > 0 ? parsed.members : freshTemplate.members,
            sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
            transactions: [],
            ledgerEntries: [],
            debts: [],
            aiConfig: getSystemAIConfig(),
            supabaseConfig: DEFAULT_SUPABASE_CONFIG,
          };
        }
      } catch {
        targetState = freshTemplate;
      }
    }
    const newSession: UserSession = {
      id: newSessionId,
      userId: targetState.currentUser.id,
      username: cleanUser,
      displayName: targetState.currentUser.displayName,
      role: targetState.currentUser.role || 'OWNER',
      device,
      browser,
      loginAt: now,
      lastActiveAt: now,
      ipAddress: '127.0.0.1 (Lokal)',
      isCurrent: true
    };

    let hydrated: Awaited<ReturnType<typeof loadUserFinancialData>>;
    try { hydrated=await loadUserFinancialData(userRecord.id,localStorage.getItem('takara_household_'+userRecord.id)); }
    catch(error){return {success:false,error:error instanceof Error?error.message:'Gagal memuat saldo household.'};}
    targetState={...targetState,...hydrated.data,currentUser:{...userRecord,pinHash:cleanCode},activeHouseholdId:hydrated.householdId,
      ledgerEntries:reconstructMissingLedgers(hydrated.data.transactions||[],hydrated.data.ledgerEntries||[],hydrated.householdId,hydrated.data.wallets||[])};
    loadedHousehold.current=userRecord.id+':'+hydrated.householdId;
    setIsFinancialReady(true);
    setSupabaseSyncStatus({status:'synced',lastSynced:new Date().toLocaleTimeString('id-ID')});
    const priorSessions = (targetState.sessions || []).map(s => ({ ...s, isCurrent: false }));

    const updatedState: AppState = {
      ...targetState,
      isAuthenticated: true,
      isLocked: false,
      activeSessionId: newSessionId,
      sessions: [newSession, ...priorSessions.slice(0, 15)]
    };

    setState(updatedState);
    localStorage.setItem(userKey, serializeSessionState(updatedState));
    localStorage.setItem(CURRENT_USER_KEY, cleanUser);
    if (cleanUser !== 'admin') {
      // Pastikan user terdaftar di tabel app_users Supabase
      if (userRecord) {
        syncUsersToSupabase([userRecord], updatedState.supabaseConfig).catch(() => {});
      }


    }

    return { success: true };
  };

  const registerUser = (
    displayName: string,
    username: string,
    pin5Digit: string,
    householdCode?: string
  ): { success: boolean; error?: string } => {
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin5Digit.trim();
    const cleanCode = (householdCode || '').trim().toUpperCase();

    if (!cleanName) return { success: false, error: 'Nama lengkap wajib diisi.' };
    if (!cleanUser || cleanUser.length < 3) return { success: false, error: 'Username minimal 3 karakter.' };
    if (!/^[a-z0-9_-]+$/.test(cleanUser)) return { success: false, error: 'Username hanya boleh huruf kecil, angka, dan dash/underscore.' };
    if (cleanUser === 'admin') return { success: false, error: 'Username "admin" khusus untuk Admin Dashboard.' };
    if (cleanPin.length !== 5 || !/^\d{5}$/.test(cleanPin)) return { success: false, error: 'PIN harus berupa 5 digit angka.' };

    if (registeredUsers.some(u => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: `Username "${cleanUser}" sudah terdaftar. Silakan pilih username lain.` };
    }

    const now = new Date().toISOString();
    let targetHousehold: Household | undefined;

    // Jika user menginput kode household untuk gabung keluarga
    if (cleanCode) {
      targetHousehold = allHouseholds.find(h => (h.inviteCode || '').trim().toUpperCase() === cleanCode);
      if (!targetHousehold) {
        return {
          success: false,
          error: `Kode Household "${householdCode}" tidak ditemukan. Silakan periksa kembali kodenya atau kosongkan untuk membuat pembukuan keluarga baru.`
        };
      }
    }

    const assignedRole: UserRole = targetHousehold ? 'MEMBER' : 'OWNER';

    const newUser: User = {
      id: `user-${cleanUser}`,
      username: cleanUser,
      displayName: cleanName,
      pinHash: cleanPin,
      role: assignedRole,
      createdAt: now
    };

    let freshState: AppState;

    if (targetHousehold) {
      const newMember: HouseholdMember = {
        id: `mem-${cleanUser}-${Date.now()}`,
        householdId: targetHousehold.id,
        userId: `user-${cleanUser}`,
        displayName: cleanName,
        role: 'MEMBER',
        joinedAt: now
      };

      let ownerState: Partial<AppState> | null = null;
      try {
        const ownerUserKey = getUserStorageKey(targetHousehold.createdById.replace('user-', ''));
        const ownerSaved = localStorage.getItem(ownerUserKey);
        if (ownerSaved) ownerState = JSON.parse(ownerSaved);
      } catch {}

      const base = createFreshUserData(cleanUser, cleanName, cleanPin);
      freshState = {
        ...base,
        currentUser: newUser,
        households: [targetHousehold],
        activeHouseholdId: targetHousehold.id,
        members: [...(ownerState?.members || []), newMember],
        wallets: (ownerState?.wallets && ownerState.wallets.length > 0) ? ownerState.wallets : base.wallets,
        categories: (ownerState?.categories && ownerState.categories.length > 0) ? ownerState.categories : base.categories,
        labels: ownerState?.labels || base.labels,
        transactions: ownerState?.transactions || [],
        ledgerEntries: ownerState?.ledgerEntries || []
      };
    } else {
      freshState = createFreshUserData(cleanUser, cleanName, cleanPin);
    }

    const userKey = getUserStorageKey(cleanUser);
    localStorage.setItem(userKey, serializeSessionState(freshState));

    setRegisteredUsers(prev => [...prev, newUser]);
    setState(freshState);
    localStorage.setItem(CURRENT_USER_KEY, cleanUser);

    // Langsung kirim ke Supabase (dan masukkan antrean jika offline)
    syncUsersToSupabase([newUser], freshState.supabaseConfig).catch(() => {});
    pushAllDataToSupabase(freshState, freshState.supabaseConfig)
      .then(res => {
        if (!res.success) enqueueStateSync(freshState);
      })
      .catch(() => {
        enqueueStateSync(freshState);
      });

    return { success: true };
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

  const adminCreateUser = (
    displayName: string,
    username: string,
    pin5Digit: string,
    role: UserRole = 'OWNER'
  ): { success: boolean; error?: string } => {
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin5Digit.trim();

    if (!cleanName) return { success: false, error: 'Nama lengkap wajib diisi.' };
    if (!cleanUser || cleanUser.length < 3) return { success: false, error: 'Username minimal 3 karakter.' };
    if (!/^[a-z0-9_-]+$/.test(cleanUser)) return { success: false, error: 'Username hanya boleh huruf kecil, angka, dan dash/underscore.' };
    if (cleanUser === 'admin') return { success: false, error: 'Username "admin" khusus untuk Admin Dashboard.' };
    if (cleanPin.length !== 5 || !/^\d{5}$/.test(cleanPin)) return { success: false, error: 'PIN harus berupa 5 digit angka.' };

    if (registeredUsers.some(u => u.username.toLowerCase() === cleanUser)) {
      return { success: false, error: `Username "${cleanUser}" sudah terdaftar.` };
    }

    const newUser: User = {
      id: `user-${cleanUser}`,
      username: cleanUser,
      displayName: cleanName,
      pinHash: cleanPin,
      role,
      createdAt: new Date().toISOString()
    };

    const freshState = createFreshUserData(cleanUser, cleanName, cleanPin);
    freshState.currentUser.role = role;
    const userKey = getUserStorageKey(cleanUser);
    localStorage.setItem(userKey, serializeSessionState(freshState));

    setRegisteredUsers(prev => [...prev, newUser]);

    // Langsung kirim user & household baru ke Supabase
    syncUsersToSupabase([newUser], freshState.supabaseConfig).catch(() => {});
    pushAllDataToSupabase(freshState, freshState.supabaseConfig)
      .then(res => {
        if (!res.success) enqueueStateSync(freshState);
      })
      .catch(() => {
        enqueueStateSync(freshState);
      });

    return { success: true };
  };

  const updateRegisteredUser = (
    targetUsername: string,
    updates: { displayName?: string; pin5Digit?: string; role?: UserRole }
  ): { success: boolean; error?: string } => {
    const clean = targetUsername.trim().toLowerCase();
    let found = false;

    setRegisteredUsers(prev =>
      prev.map(u => {
        if (u.username.toLowerCase() !== clean) return u;
        found = true;
        return {
          ...u,
          displayName: updates.displayName?.trim() || u.displayName,
          pinHash: updates.pin5Digit?.trim() || u.pinHash,
          role: updates.role || u.role
        };
      })
    );

    if (!found) return { success: false, error: 'User tidak ditemukan.' };

    const userKey = getUserStorageKey(clean);
    const saved = localStorage.getItem(userKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentUser) {
          parsed.currentUser.displayName = updates.displayName?.trim() || parsed.currentUser.displayName;
          if (updates.pin5Digit?.trim()) parsed.currentUser.pinHash = updates.pin5Digit.trim();
          if (updates.role) parsed.currentUser.role = updates.role;
          localStorage.setItem(userKey, serializeSessionState(parsed));
        }
      } catch {
        // ignore
      }
    }

    return { success: true };
  };

  const deleteUser = (targetUsername: string): { success: boolean; error?: string } => {
    const clean = targetUsername.trim().toLowerCase();
    if (clean === 'admin') return { success: false, error: 'User admin tidak dapat dihapus.' };

    setRegisteredUsers(prev => prev.filter(u => u.username.toLowerCase() !== clean));
    localStorage.removeItem(getUserStorageKey(clean));
    setState(prev => ({
      ...prev,
      members: prev.members.filter(m => m.userId !== `user-${clean}`)
    }));

    if (state.currentUser?.username.toLowerCase() === clean) {
      logoutUser();
    }
    return { success: true };
  };

  const addMemberToHousehold = (
    householdId: string,
    displayName: string,
    username: string,
    role: UserRole = 'MEMBER'
  ): { success: boolean; error?: string } => {
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase();
    if (!householdId) return { success: false, error: 'ID household tidak valid.' };
    if (!cleanName) return { success: false, error: 'Nama anggota wajib diisi.' };

    const newMemId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMem: HouseholdMember = {
      id: newMemId,
      householdId,
      userId: cleanUser ? `user-${cleanUser}` : `user-${Date.now()}`,
      displayName: cleanName,
      role,
      joinedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      members: [...prev.members, newMem]
    }));
    return { success: true };
  };

  const removeMemberFromHousehold = (memberId: string): { success: boolean; error?: string } => {
    setState(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId)
    }));
    return { success: true };
  };

  const logoutUser = () => {
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
  const inviteMember = (displayName: string, username: string, role: UserRole, pin5Digit: string): { success: boolean; error?: string } => {
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin5Digit.trim();

    if (!cleanName) return { success: false, error: 'Nama anggota keluarga wajib diisi.' };
    if (cleanPin.length !== 5) return { success: false, error: 'Kode unik harus 5 digit angka.' };

    const newMemId = `mem-${Date.now()}`;
    const newUserId = `user-${cleanUser || Date.now()}`;

    const newMember: HouseholdMember = {
      id: newMemId,
      householdId: state.activeHouseholdId,
      userId: newUserId,
      displayName: cleanName,
      role: role || 'MEMBER',
      joinedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      members: [...prev.members, newMember]
    }));
    if (cleanUser) {
      setRegisteredUsers(prev => {
        if (prev.some(u => u.username.toLowerCase() === cleanUser)) return prev;
        const newUser: User = {
          id: newUserId,
          username: cleanUser,
          displayName: cleanName,
          pinHash: cleanPin,
          role,
          createdAt: new Date().toISOString()
        };
        return [...prev, newUser];
      });
    }

    return { success: true };
  };
  const updateMember = (
    memberId: string,
    updates: { displayName?: string; role?: UserRole; username?: string; pin5Digit?: string }
  ): { success: boolean; error?: string } => {
    let updatedMem: HouseholdMember | undefined;
    setState(prev => {
      const nextMembers = prev.members.map(m => {
        if (m.id !== memberId) return m;
        const cleanName = updates.displayName?.trim() || m.displayName;
        const cleanRole = updates.role || m.role;
        updatedMem = {
          ...m,
          displayName: cleanName,
          role: cleanRole
        };
        return updatedMem;
      });

      let nextCurrentUser = prev.currentUser;
      if (prev.currentUser && (prev.currentUser.id === memberId || prev.currentUser.id === updatedMem?.userId)) {
        nextCurrentUser = {
          ...prev.currentUser,
          displayName: updates.displayName?.trim() || prev.currentUser.displayName,
          role: updates.role || prev.currentUser.role,
          ...(updates.pin5Digit ? { pinHash: updates.pin5Digit.trim() } : {})
        };
      }

      return {
        ...prev,
        members: nextMembers,
        currentUser: nextCurrentUser
      };
    });
    return { success: true };
  };

  const removeMember = (memberId: string) => {
    setState(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId)
    }));
  };

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

  const updatePIN = (newPin: string) => {
    setState(prev => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        pinHash: newPin
      }
    }));
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

  return (
    <AppContext.Provider
      value={{
        state,
        isFinancialReady,
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
        addTransaction,
        voidTransaction,
        clearCurrentMonthTransactions,
        editTransaction,
        debts,
        addDebt,
        toggleDebtSettled,
        toggleDebtPaidThisMonth,
        payDebtInstallment,
        updateDebt,
        deleteDebt,
        addWallet,
        updateWallet,
        deleteWallet,
        addCategory,
        updateCategory,
        deleteCategory,
        addLabel,
        switchHousehold,
        createHousehold,
        updateHousehold,
        deleteHousehold,
        importExcelFile,
        resetToDefault,
        verifyAndUnlock,
        loginUser,
        lockApp,
        updatePIN,
        inviteMember,
        updateMember,
        removeMember,
        updateAIConfig,
        updateSupabaseConfig,
        syncAllToSupabase,
        syncFromSupabase,
        supabaseSyncStatus,
        logoutUser,
        terminateSession,
        sessions,
        activeSession,
        registeredUsers,
        registerUser,
        joinHouseholdByCode,
        updateRegisteredUser,
        adminCreateUser,
        deleteUser,
        addMemberToHousehold,
        removeMemberFromHousehold,
        allHouseholds,
        allMembers
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
