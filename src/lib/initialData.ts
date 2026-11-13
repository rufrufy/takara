import type { AppState, Category } from '../types';
import { DEFAULT_AI_CONFIG } from './aiScanner';
import { DEFAULT_SUPABASE_CONFIG } from './supabase';

export const DEFAULT_CATEGORIES: Category[] = [
  // Pengeluaran (Expense)
  { id: 'cat-makan-minum', householdId: '', name: 'Makanan & Minuman', type: 'expense', icon: 'Utensils', color: '#FFEDD5', isArchived: false },
  { id: 'cat-belanja-harian', householdId: '', name: 'Belanja Harian', type: 'expense', icon: 'ShoppingCart', color: '#FCE7F3', isArchived: false },
  { id: 'cat-transportasi', householdId: '', name: 'Transportasi', type: 'expense', icon: 'Car', color: '#E0E7EB', isArchived: false },
  { id: 'cat-tagihan-utilitas', householdId: '', name: 'Tagihan & Utilitas', type: 'expense', icon: 'Zap', color: '#FEF9C3', isArchived: false },
  { id: 'cat-kesehatan', householdId: '', name: 'Kesehatan & Medis', type: 'expense', icon: 'HeartPulse', color: '#FEE2E2', isArchived: false },
  { id: 'cat-hiburan', householdId: '', name: 'Hiburan & Liburan', type: 'expense', icon: 'Tv', color: '#E0F2FE', isArchived: false },
  { id: 'cat-pendidikan', householdId: '', name: 'Pendidikan', type: 'expense', icon: 'GraduationCap', color: '#EDE9FE', isArchived: false },
  { id: 'cat-sosial-sedekah', householdId: '', name: 'Amal & Sedekah', type: 'expense', icon: 'Gift', color: '#D1FAE5', isArchived: false },
  { id: 'cat-rumah-tangga', householdId: '', name: 'Keperluan Rumah Tangga', type: 'expense', icon: 'Home', color: '#F3E8FF', isArchived: false },
  { id: 'cat-pengeluaran-lain', householdId: '', name: 'Pengeluaran Lainnya', type: 'expense', icon: 'MoreHorizontal', color: '#F1F5F9', isArchived: false },

  // Pemasukan (Income)
  { id: 'cat-gaji-utama', householdId: '', name: 'Gaji Pokok', type: 'income', icon: 'Briefcase', color: '#D1FAE5', isArchived: false },
  { id: 'cat-bonus-thr', householdId: '', name: 'Bonus & THR', type: 'income', icon: 'Award', color: '#FEF3C7', isArchived: false },
  { id: 'cat-usaha-bisnis', householdId: '', name: 'Usaha & Bisnis', type: 'income', icon: 'TrendingUp', color: '#CCFBF1', isArchived: false },
  { id: 'cat-investasi-dividen', householdId: '', name: 'Investasi & Dividen', type: 'income', icon: 'Coins', color: '#E0F2FE', isArchived: false },
  { id: 'cat-pemasukan-lain', householdId: '', name: 'Pemasukan Lainnya', type: 'income', icon: 'PlusCircle', color: '#F1F5F9', isArchived: false },

  // Transfer Antar Rekening
  { id: 'cat-transfer-antar-akun', householdId: '', name: 'Transfer Antar Dompet', type: 'transfer', icon: 'ArrowLeftRight', color: '#EFF6FF', isArchived: false }
];

export const initialData: AppState = {
  currentUser: {
    id: 'user-guest',
    username: '',
    displayName: 'Tamu',
    pinHash: '12345',
    avatarUrl: '',
    role: 'MEMBER',
    createdAt: new Date().toISOString()
  },
  households: [],
  activeHouseholdId: '',
  members: [],
  wallets: [],
  categories: DEFAULT_CATEGORIES,
  labels: ['Harian', 'Belanja', 'Rutin', 'Pribadi', 'Keluarga'],
  transactions: [],
  ledgerEntries: [],
  debts: [],
  importHistory: [],
  aiConfig: DEFAULT_AI_CONFIG,
  supabaseConfig: DEFAULT_SUPABASE_CONFIG,
  isLocked: true,
  isAuthenticated: false,
  activeSessionId: undefined,
  sessions: []
};

export const createFreshUserData = (
  username: string,
  displayName?: string,
  pin5Digit: string = '12345'
): AppState => {
  const cleanUser = username.trim().toLowerCase();
  const formattedName = displayName?.trim() || (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1));
  const userId = `user-${cleanUser}`;
  const householdId = `hh-${cleanUser}`;
  const now = new Date().toISOString();
  const inviteCode = 'TK-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

  return {
    currentUser: {
      id: userId,
      username: cleanUser,
      displayName: formattedName,
      pinHash: pin5Digit.trim() || '12345',
      avatarUrl: '',
      role: 'OWNER',
      createdAt: now
    },
    households: [
      {
        id: householdId,
        name: `Keluarga ${formattedName}`,
        baseCurrency: 'IDR',
        createdById: userId,
        inviteCode,
        createdAt: now
      }
    ],
    activeHouseholdId: householdId,
    members: [
      {
        id: `mem-${cleanUser}`,
        householdId,
        userId,
        displayName: formattedName,
        role: 'OWNER',
        joinedAt: now
      }
    ],
    wallets: [
      {
        id: `w-${cleanUser}-cash`,
        householdId,
        name: 'Dompet Tunai (Cash)',
        type: 'cash',
        institutionName: 'Tunai',
        currency: 'IDR',
        balance: 0,
        color: '#059669',
        icon: 'Banknote',
        isArchived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `w-${cleanUser}-bank`,
        householdId,
        name: 'Rekening Bank',
        type: 'checking',
        institutionName: 'Bank',
        currency: 'IDR',
        balance: 0,
        color: '#2563EB',
        icon: 'Building2',
        isArchived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `w-${cleanUser}-digital`,
        householdId,
        name: 'Dompet Digital / E-Wallet',
        type: 'digital',
        institutionName: 'E-Wallet',
        currency: 'IDR',
        balance: 0,
        color: '#F59E0B',
        icon: 'Smartphone',
        isArchived: false,
        createdAt: now,
        updatedAt: now
      }
    ],
    categories: DEFAULT_CATEGORIES.map(c => ({
      ...c,
      id: `cat-${cleanUser}-${c.id.replace('cat-', '')}`,
      householdId
    })),
    labels: ['Harian', 'Belanja', 'Rutin', 'Pribadi', 'Keluarga'],
    transactions: [],
    ledgerEntries: [],
    debts: [],
    importHistory: [],
    aiConfig: DEFAULT_AI_CONFIG,
    supabaseConfig: DEFAULT_SUPABASE_CONFIG,
    isLocked: false,
    isAuthenticated: true,
    activeSessionId: `sess-${Date.now()}`,
    sessions: [
      {
        id: `sess-${Date.now()}`,
        userId,
        username: cleanUser,
        displayName: formattedName,
        role: 'OWNER',
        device: 'Perangkat Pengguna',
        browser: 'Web Browser',
        loginAt: now,
        lastActiveAt: now,
        ipAddress: '127.0.0.1 (Lokal)',
        isCurrent: true
      }
    ]
  };
};
