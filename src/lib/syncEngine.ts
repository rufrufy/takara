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
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
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
      const appState = item.data as AppState;
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

  saveSyncQueue(remainingQueue);
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
