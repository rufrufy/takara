import type { FinancialTransaction, AppState, SupabaseConfig } from '../types';
import { syncTransactionToSupabase, pushAllDataToSupabase, DEFAULT_SUPABASE_CONFIG } from './supabase';

export interface SyncQueueItem {
  id: string;
  type: 'transaction' | 'state';
  data: FinancialTransaction | AppState;
  timestamp: number;
  attempts: number;
  error?: string;
}

let memoryQueue: SyncQueueItem[] | null = null;
const SYNC_QUEUE_KEY = 'takara_offline_sync_queue_v1';

export type SyncState = 'synced' | 'syncing' | 'offline_pending' | 'error';

export interface SyncEngineStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt?: string;
  lastError?: string;
}

// Event emitter untuk React UI listener
export const SYNC_EVENT_NAME = 'takara:sync-status-changed';

export const getSyncQueue = (): SyncQueueItem[] => {
  if (memoryQueue) return memoryQueue;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: SyncQueueItem) => {
          if (item.type === 'state' && (item.data as AppState).supabaseConfig?.url?.includes('gnjrysgmiqapbjroishz')) {
            (item.data as AppState).supabaseConfig = DEFAULT_SUPABASE_CONFIG;
          }
          return item;
        });
      }
    }
  } catch {
    // ignore
  }
  return [];
};

export const saveSyncQueue = (queue: SyncQueueItem[]): void => {
  if (typeof window === 'undefined') return;
  try {
    memoryQueue = queue;
    // Preserve pre-existing unsent records until recovered; never persist new queue items locally.
    const legacy = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]') as SyncQueueItem[];
    const pendingIds = new Set(queue.map(item => item.id));
    const pendingLegacy = legacy.filter(item => pendingIds.has(item.id)).map(item => queue.find(current => current.id === item.id)!);
    if (pendingLegacy.length) localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(pendingLegacy));
    else localStorage.removeItem(SYNC_QUEUE_KEY);
    notifyStatus();
  } catch {
    // ignore
  }
};

export const enqueueTransactionSync = (tx: FinancialTransaction): void => {
  const queue = getSyncQueue();
  // Hindari duplikasi jika id transaksi sama
  const filtered = queue.filter(item => !(item.type === 'transaction' && (item.data as FinancialTransaction).id === tx.id));
  filtered.push({
    id: `sync-tx-${tx.id}-${Date.now()}`,
    type: 'transaction',
    data: tx,
    timestamp: Date.now(),
    attempts: 0
  });
  saveSyncQueue(filtered);
  // Picu proses loop sinkronisasi
  triggerSyncLoop();
};

export const enqueueStateSync = (state: AppState): void => {
  const queue = getSyncQueue();
  // Simpan snapshot state terbaru
  const filtered = queue.filter(item => item.type !== 'state');
  filtered.push({
    id: `sync-state-${state.currentUser.username}-${Date.now()}`,
    type: 'state',
    data: state,
    timestamp: Date.now(),
    attempts: 0
  });
  saveSyncQueue(filtered);
  triggerSyncLoop();
};

const deletedHouseholdIds = new Set<string>();
export const discardHouseholdSync = (householdId: string) => {
  deletedHouseholdIds.add(householdId);
  const queue = getSyncQueue().filter(item => item.type !== 'transaction' || (item.data as FinancialTransaction).householdId !== householdId).map(item => {
    if (item.type !== 'state') return item;
    const data = { ...(item.data as AppState) };
    data.households = data.households.filter(h => h.id !== householdId);
    for (const key of ['transactions', 'ledgerEntries', 'wallets', 'categories', 'members', 'debts'] as const) (data[key] as unknown[]) = (data[key] || []).filter(row => row.householdId !== householdId);
    if (data.activeHouseholdId === householdId) data.activeHouseholdId = data.households[0]?.id || '';
    return { ...item, data };
  });
  saveSyncQueue(queue);
};
let isSyncing = false;
let loopTimerId: number | null = null;
let currentStatus: SyncEngineStatus = {
  state: 'synced',
  pendingCount: 0
};

export const getSyncStatus = (): SyncEngineStatus => {
  const queue = getSyncQueue();
  return {
    ...currentStatus,
    pendingCount: queue.length,
    state: queue.length > 0 ? (isSyncing ? 'syncing' : 'offline_pending') : (currentStatus.lastError ? 'error' : 'synced')
  };
};

const notifyStatus = () => {
  if (typeof window === 'undefined') return;
  const status = getSyncStatus();
  window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: status }));
};

/**
 * Loop proses antrean sinkronisasi hingga berhasil tersambung ke Supabase & Server
 */
export const processSyncQueue = async (
  supabaseConfig: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; syncedCount: number; remainingCount: number }> => {
  if (isSyncing) {
    const queue = getSyncQueue();
    return { success: false, syncedCount: 0, remainingCount: queue.length };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    currentStatus = {
      state: 'synced',
      pendingCount: 0,
      lastSyncedAt: currentStatus.lastSyncedAt || new Date().toLocaleTimeString('id-ID')
    };
    notifyStatus();
    return { success: true, syncedCount: 0, remainingCount: 0 };
  }

  isSyncing = true;
  currentStatus = { ...currentStatus, state: 'syncing', pendingCount: queue.length };
  notifyStatus();

  const remainingQueue: SyncQueueItem[] = [];
  let syncedCount = 0;
  let lastErrStr = '';

  const effectiveConfig = (!supabaseConfig?.url || supabaseConfig.url.includes('gnjrysgmiqapbjroishz'))
    ? DEFAULT_SUPABASE_CONFIG
    : supabaseConfig;

  for (const item of queue) {
    let itemSuccess = false;

    if (item.type === 'transaction') {
      const tx = item.data as FinancialTransaction;
      if (deletedHouseholdIds.has(tx.householdId)) continue;
      try {
        const res = await syncTransactionToSupabase(tx, effectiveConfig);
        if (res.success) {
          itemSuccess = true;
        } else {
          lastErrStr = res.error || 'Gagal sinkron ke Supabase';
        }
      } catch (err: unknown) {
        lastErrStr = err instanceof Error ? err.message : 'Koneksi internet terputus';
      }
    } else if (item.type === 'state') {
      const original = item.data as AppState;
      const appState = { ...original };
      appState.households = (original.households || []).filter(h => !deletedHouseholdIds.has(h.id));
      for (const key of ['transactions', 'ledgerEntries', 'wallets', 'categories', 'members', 'debts'] as const) {
        (appState[key] as unknown[]) = (original[key] || []).filter(row => !deletedHouseholdIds.has(row.householdId));
      }
      if (deletedHouseholdIds.has(appState.activeHouseholdId)) appState.activeHouseholdId = appState.households[0]?.id || '';
      if (appState.supabaseConfig?.url?.includes('gnjrysgmiqapbjroishz')) {
        appState.supabaseConfig = DEFAULT_SUPABASE_CONFIG;
      }
      try {
        const res = await pushAllDataToSupabase(appState, effectiveConfig);
        if (res.success) {
          itemSuccess = true;
        } else {
          lastErrStr = res.error || 'Gagal sinkron state ke Supabase';
        }
      } catch (err: unknown) {
        lastErrStr = err instanceof Error ? err.message : 'Koneksi internet terputus';
      }
    }

    if (itemSuccess) {
      syncedCount++;
    } else {
      item.attempts += 1;
      item.error = lastErrStr;
      remainingQueue.push(item);
    }
  }

  const processedIds = new Set(queue.map(item => item.id));
  saveSyncQueue([...remainingQueue, ...getSyncQueue().filter(item => !processedIds.has(item.id))]);
  isSyncing = false;

  if (remainingQueue.length === 0) {
    currentStatus = {
      state: 'synced',
      pendingCount: 0,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID')
    };
  } else {
    currentStatus = {
      state: 'offline_pending',
      pendingCount: remainingQueue.length,
      lastError: lastErrStr
    };
  }

  notifyStatus();
  return {
    success: remainingQueue.length === 0,
    syncedCount,
    remainingCount: remainingQueue.length
  };
};

/**
 * Memulai worker looping sinkronisasi otomatis
 */
export const startSyncLoopWorker = (intervalMs: number = 8000): void => {
  if (typeof window === 'undefined') return;

  // Hentikan timer sebelumnya
  clearInterval(loopTimerId as number);

  // Jalankan segera percobaan pertama
  processSyncQueue().catch(() => {});

  // Loop setiap intervalMs hingga semua data tersinkronisasi
  loopTimerId = setInterval(() => {
    const queue = getSyncQueue();
    if (queue.length > 0) {
      processSyncQueue().catch(() => {});
    }
  }, intervalMs) as unknown as number;

  // Listener event online browser (saat internet kembali tersambung)
  window.addEventListener('online', () => {
    processSyncQueue().catch(() => {});
  });
};

export const triggerSyncLoop = (): void => {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    processSyncQueue().catch(() => {});
  }, 200);
};
