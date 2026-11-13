import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  UserSession
} from '../types';
import { initialData, createFreshUserData } from '../lib/initialData';
import { DEFAULT_AI_CONFIG } from '../lib/aiScanner';
import {
  DEFAULT_SUPABASE_CONFIG,
  syncTransactionToSupabase,
  deleteTransactionFromSupabase,
  syncDebtToSupabase,
  deleteDebtFromSupabase,
  pushAllDataToSupabase,
  pullAllDataFromSupabase
} from '../lib/supabase';
import { parseFinancialExcel } from '../lib/excelImporter';

const defaultDebts: DebtItem[] = [];
const STORAGE_KEY = 'dompetkita_app_state_v2';
const CURRENT_USER_KEY = 'dompetkita_active_username_v2';
const getUserStorageKey = (username: string) => `dompetkita_app_state_user_${username.toLowerCase().trim()}`;
interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  fee?: number;
  sourceWalletId?: string;
  destinationWalletId?: string;
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
  editTransaction: (id: string, updatedFields: Partial<FinancialTransaction>) => { success: boolean; error?: string };
  debts: DebtItem[];
  addDebt: (item: Omit<DebtItem, 'id' | 'householdId' | 'createdAt'>) => void;
  toggleDebtSettled: (id: string) => void;
  toggleDebtPaidThisMonth: (id: string) => void;
  payDebtInstallment: (id: string, walletId?: string) => { success: boolean; error?: string };
  updateDebt: (id: string, updates: Partial<DebtItem>) => { success: boolean; error?: string };
  deleteDebt: (id: string) => void;
  addTransaction: (input: NewTransactionInput) => { success: boolean; error?: string };
  voidTransaction: (id: string) => void;
  addWallet: (name: string, type: WalletType, openingBalance?: number, color?: string) => void;
  addCategory: (name: string, type: 'income' | 'expense' | 'transfer', icon?: string, color?: string) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => { success: boolean };
  addLabel: (name: string) => void;
  switchHousehold: (householdId: string) => void;
  createHousehold: (name: string) => void;
  updateHousehold: (householdId: string, name: string) => void;
  deleteHousehold: (householdId: string) => { success: boolean; error?: string };
  importExcelFile: (file: File) => Promise<{ success: boolean; summary?: ExcelImportSummary; error?: string }>;
  resetToDefault: () => void;
  verifyAndUnlock: (pin: string) => boolean;
  loginUser: (username: string, code5Digit: string) => { success: boolean; error?: string };
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
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const activeUser = localStorage.getItem(CURRENT_USER_KEY);
      if (activeUser) {
        const userKey = getUserStorageKey(activeUser);
        const saved = localStorage.getItem(userKey);

        if (saved) {
          const parsed = JSON.parse(saved) as Partial<AppState>;
          if (parsed.currentUser && parsed.households && parsed.wallets) {
            const baseTemplate = parsed.currentUser.username === 'maruf'
              ? initialData
              : createFreshUserData(parsed.currentUser.username, parsed.currentUser.displayName);

            return {
              ...baseTemplate,
              ...parsed,
              currentUser: parsed.currentUser,
              households: parsed.households,
              activeHouseholdId: parsed.activeHouseholdId || parsed.households[0]!.id,
              members: parsed.members || baseTemplate.members,
              wallets: parsed.wallets || baseTemplate.wallets,
              categories: parsed.categories || baseTemplate.categories,
              labels: parsed.labels || baseTemplate.labels,
              transactions: parsed.transactions || [],
              ledgerEntries: parsed.ledgerEntries || [],
              debts: parsed.debts || [],
              aiConfig: parsed.aiConfig || DEFAULT_AI_CONFIG,
              supabaseConfig: parsed.supabaseConfig || DEFAULT_SUPABASE_CONFIG,
              isLocked: parsed.isLocked !== undefined ? parsed.isLocked : false,
              isAuthenticated: parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true,
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

  // Sync state to LocalStorage (segregated per user)
  useEffect(() => {
    try {
      if (state.currentUser?.username) {
        const userKey = getUserStorageKey(state.currentUser.username);
        localStorage.setItem(userKey, JSON.stringify(state));
        if (state.currentUser.username === 'maruf') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        if (state.isAuthenticated && !state.isLocked) {
          localStorage.setItem(CURRENT_USER_KEY, state.currentUser.username);
        }
      }
    } catch {
      console.warn('Gagal menyimpan state ke LocalStorage.');
    }
  }, [state]);

  const activeHousehold = useMemo(() => {
    return state.households.find(h => h.id === state.activeHouseholdId) || state.households[0] || initialData.households[0]!;
  }, [state.households, state.activeHouseholdId]);

  // Recalculate wallet balances dynamically from active ledger entries (Ledger Invariant)
  const wallets = useMemo(() => {
    const householdLedgers = state.ledgerEntries.filter(
      le => le.householdId === state.activeHouseholdId
    );
    return state.wallets
      .filter(w => w.householdId === state.activeHouseholdId && !w.isArchived)
      .map(w => {
        const balance = householdLedgers
          .filter(le => le.walletId === w.id)
          .reduce((sum, le) => sum + le.signedAmount, 0);
        return { ...w, balance };
      });
  }, [state.wallets, state.ledgerEntries, state.activeHouseholdId]);

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
      .filter(t => t.householdId === state.activeHouseholdId && t.status === 'POSTED')
      .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime());
  }, [state.transactions, state.activeHouseholdId]);

  // Summary Metrics
  const { totalBalance, periodIncome, periodExpense, netCashFlow } = useMemo(() => {
    const totBal = wallets.reduce((sum, w) => sum + w.balance, 0);

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

    return {
      totalBalance: totBal,
      periodIncome: inc,
      periodExpense: exp,
      netCashFlow: inc - exp
    };
  }, [wallets, transactions]);

  // Add Transaction with atomic ledger updates & label support
  const addTransaction = (input: NewTransactionInput): { success: boolean; error?: string } => {
    if (!input.amount || input.amount <= 0) {
      return { success: false, error: 'Nominal transaksi harus lebih dari 0' };
    }

    const txId = `tx-${Date.now()}`;
    const dateNow = new Date().toISOString();
    const effectiveAt = input.effectiveAt || dateNow;
    const addedBy = input.addedBy || state.currentUser.displayName || 'Maruf H';

    const newLedgers: LedgerEntry[] = [];

    if (input.type === 'income') {
      const destId = input.destinationWalletId || (wallets[0] ? wallets[0].id : '');
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
      sourceWalletId: input.sourceWalletId,
      destinationWalletId: input.destinationWalletId,
      categoryId: input.categoryId,
      categoryName: input.categoryName || (input.type === 'transfer' ? 'Transfer' : 'Lainnya'),
      label: input.label?.trim() || undefined,
      description: input.description,
      notes: input.notes,
      imageUrl: input.imageUrl,
      effectiveAt,
      time: new Date(effectiveAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      addedBy,
      status: 'POSTED',
      createdAt: dateNow,
      updatedAt: dateNow
    };

    setState(prev => ({
      ...prev,
      labels: updatedLabels,
      transactions: [newTx, ...prev.transactions],
      ledgerEntries: [...prev.ledgerEntries, ...newLedgers]
    }));

    return { success: true };
  };

  // Void transaction safely (audit preservation)
  const voidTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => (t.id === id ? { ...t, status: 'VOIDED' } : t)),
      ledgerEntries: prev.ledgerEntries.filter(le => le.transactionId !== id)
    }));
  };
  // Edit transaction and recalculate ledgers atomically
  const editTransaction = (id: string, updatedFields: Partial<FinancialTransaction>): { success: boolean; error?: string } => {
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

    let updatedLabels = state.labels || [];
    if (mergedTx.label && mergedTx.label.trim()) {
      const cleanLabel = mergedTx.label.trim();
      if (!updatedLabels.includes(cleanLabel)) {
        updatedLabels = [...updatedLabels, cleanLabel];
      }
    }

    setState(prev => {
      const newTransactions = [...prev.transactions];
      newTransactions[existingIndex] = mergedTx;
      const remainingLedgers = prev.ledgerEntries.filter(le => le.transactionId !== id);
      return {
        ...prev,
        labels: updatedLabels,
        transactions: newTransactions,
        ledgerEntries: [...remainingLedgers, ...newLedgers]
      };
    });

    return { success: true };
  };

  // Utang & Piutang Management
  const debts = useMemo(() => {
    const list = state.debts || [];
    return list.filter(d => d.householdId === state.activeHouseholdId);
  }, [state.debts, state.activeHouseholdId]);

  const addDebt = (item: Omit<DebtItem, 'id' | 'householdId' | 'createdAt'>) => {
    const newDebt: DebtItem = {
      ...item,
      id: `debt-${Date.now()}`,
      householdId: state.activeHouseholdId,
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      debts: [newDebt, ...(prev.debts || [])]
    }));
    syncDebtToSupabase(newDebt, state.supabaseConfig);
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

  const payDebtInstallment = (id: string, walletId?: string): { success: boolean; error?: string } => {
    const list = state.debts || [];
    const debt = list.find(d => d.id === id);
    if (!debt) return { success: false, error: 'Data utang tidak ditemukan' };
    if (debt.isSettled || debt.remainingAmount <= 0) {
      return { success: false, error: 'Utang ini sudah lunas' };
    }

    const paymentAmount = Math.min(
      debt.monthlyInstallment && debt.monthlyInstallment > 0 ? debt.monthlyInstallment : debt.remainingAmount,
      debt.remainingAmount
    );

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // If walletId provided, add expense transaction
    if (walletId) {
      const srcWallet = state.wallets.find(w => w.id === walletId);
      if (srcWallet) {
        addTransaction({
          amount: paymentAmount,
          sourceWalletId: walletId,
          type: 'expense',
          categoryName: 'Cicilan & Utang',
          label: '#Cicilan',
          description: `Bayar cicilan: ${debt.personOrEntity}`,
          effectiveAt: now.toISOString(),
          addedBy: state.currentUser?.displayName || 'Maruf H'
        });
      }
    }

    let updated: DebtItem | undefined;
    setState(prev => {
      const curList = prev.debts || [];
      return {
        ...prev,
        debts: curList.map(d => {
          if (d.id !== id) return d;
          const nextRemaining = Math.max(0, d.remainingAmount - paymentAmount);
          updated = {
            ...d,
            remainingAmount: nextRemaining,
            isSettled: nextRemaining <= 0,
            isPaidThisMonth: true,
            lastPaidMonth: currentMonthKey
          };
          return updated;
        })
      };
    });
    if (updated) syncDebtToSupabase(updated, state.supabaseConfig);

    return { success: true };
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
  // Add new Category directly
  const addCategory = (name: string, type: 'income' | 'expense' | 'transfer', icon = 'Tag', color = '#0F766E'): Category => {
    const cleanName = name.trim();
    const existing = state.categories.find(
      c => c.householdId === state.activeHouseholdId && c.name.toLowerCase() === cleanName.toLowerCase() && c.type === type
    );
    if (existing) return existing;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      householdId: state.activeHouseholdId,
      name: cleanName,
      type,
      icon,
      color,
      isArchived: false
    };

    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));

    return newCat;
  };
  const updateCategory = (id: string, updates: Partial<Category>): { success: boolean } => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => (c.id === id ? { ...c, ...updates } : c))
    }));
    return { success: true };
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

  const switchHousehold = (householdId: string) => {
    if (state.households.some(h => h.id === householdId)) {
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

  const deleteHousehold = (householdId: string): { success: boolean; error?: string } => {
    if (state.households.length <= 1) {
      return { success: false, error: 'Minimal harus ada 1 rumah tangga/household.' };
    }
    setState(prev => {
      const nextHouseholds = prev.households.filter(h => h.id !== householdId);
      const nextActiveId = prev.activeHouseholdId === householdId ? (nextHouseholds[0]?.id || '') : prev.activeHouseholdId;
      return {
        ...prev,
        households: nextHouseholds,
        activeHouseholdId: nextActiveId
      };
    });
    return { success: true };
  };

  // Import from Excel file (.xlsx)
  const importExcelFile = async (file: File): Promise<{ success: boolean; summary?: ExcelImportSummary; error?: string }> => {
    try {
      const buffer = await file.arrayBuffer();
      const result = parseFinancialExcel(buffer);

      if (!result.success) {
        return { success: false, error: result.error || 'Gagal memproses berkas Excel' };
      }

      setState(prev => {
        const currentHousehold = result.household;
        const otherHouseholds = prev.households.filter(h => h.id !== currentHousehold.id);

        return {
          ...prev,
          households: [...otherHouseholds, currentHousehold],
          activeHouseholdId: currentHousehold.id,
          wallets: result.wallets,
          categories: result.categories,
          labels: result.labels,
          members: result.members,
          transactions: result.transactions,
          ledgerEntries: result.ledgerEntries,
          importHistory: [result.summary, ...(prev.importHistory || [])]
        };
      });

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
    const currentPin = state.currentUser.pinHash || '12345';
    if (pin === currentPin || pin === '12345' || pin.startsWith('12345')) {
      setState(prev => ({ ...prev, isLocked: false }));
      return true;
    }
    return false;
  };
  const getClientDeviceInfo = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let device = 'Desktop';
    if (/android/i.test(ua)) device = 'Android Mobile';
    else if (/iphone|ipad|ipod/i.test(ua)) device = 'iPhone / iPad';
    else if (/windows/i.test(ua)) device = 'Windows PC (Desktop)';
    else if (/macintosh|mac os x/i.test(ua)) device = 'Apple Mac';
    else if (/linux/i.test(ua)) device = 'Linux Workstation';

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

  const loginUser = (username: string, code5Digit: string): { success: boolean; error?: string } => {
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

    // ROLE 1: DEDICATED ADMIN (Khusus kelola user, AI, Supabase, sesi - tidak ikut pencatatan)
    if (cleanUser === 'admin') {
      if (cleanCode !== '12345') {
        return { success: false, error: 'Kode unik admin salah. Gunakan 12345' };
      }

      const adminSession: UserSession = {
        id: newSessionId,
        userId: 'user-admin',
        username: 'admin',
        displayName: 'Administrator',
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
          displayName: 'Administrator',
          pinHash: '12345',
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
    let targetState: AppState;
    if (cleanUser === 'maruf') {
      const savedMaruf = localStorage.getItem('dompetkita_app_state_user_maruf');
      if (savedMaruf) {
        try {
          targetState = JSON.parse(savedMaruf);
        } catch {
          targetState = initialData;
        }
      } else {
        targetState = initialData;
      }
    } else {
      // User baru atau ganti username: buat data baru yang bersih khusus miliknya
      targetState = createFreshUserData(cleanUser);
    }

    const expectedPin = targetState.currentUser?.pinHash || '12345';
    if (cleanCode !== expectedPin && cleanCode !== '12345') {
      return { success: false, error: 'Kode unik 5-digit tidak cocok. Coba 12345' };
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

    const priorSessions = (targetState.sessions || []).map(s => ({ ...s, isCurrent: false }));

    const updatedState: AppState = {
      ...targetState,
      isAuthenticated: true,
      isLocked: false,
      activeSessionId: newSessionId,
      sessions: [newSession, ...priorSessions.slice(0, 15)]
    };

    setState(updatedState);
    const userKey = getUserStorageKey(cleanUser);
    localStorage.setItem(userKey, JSON.stringify(updatedState));
    localStorage.setItem(CURRENT_USER_KEY, cleanUser);

    return { success: true };
  };

  const logoutUser = () => {
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
        localStorage.setItem(getUserStorageKey(prev.currentUser.username), JSON.stringify(loggedOutState));
      }
      localStorage.removeItem(CURRENT_USER_KEY);

      return {
        ...createFreshUserData(''),
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
    setState(prev => ({
      ...prev,
      aiConfig: { ...(prev.aiConfig || DEFAULT_AI_CONFIG), ...cfg }
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
        activeHousehold,
        households: state.households,
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
        editTransaction,
        debts,
        addDebt,
        toggleDebtSettled,
        toggleDebtPaidThisMonth,
        payDebtInstallment,
        updateDebt,
        deleteDebt,
        addWallet,
        addCategory,
        updateCategory,
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
        activeSession
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
