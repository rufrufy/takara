const RELOADED_VERSION_KEY = 'takara_reloaded_version';
const PRELOAD_RELOAD_KEY = 'takara_preload_reloaded';

/**
 * Inisialisasi pengecekan pembaruan otomatis aplikasi di production (misal: bkpp.dev).
 * Memeriksa `/version.json` tanpa cache + memicu update Service Worker agar pengguna
 * langsung mendapatkan versi terbaru setelah GitHub push / deploy tanpa hard reload manual.
 */
export const initAutoUpdate = (onUpdating?: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const isLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!import.meta.env.PROD || isLocal) {
    return () => {};
  }

  let checking = false;
  let lastCheckedAt = 0;
  let reloading = false;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;

  const triggerCleanReload = async (nextVersion?: string) => {
    if (reloading) return;
    if (nextVersion && sessionStorage.getItem(RELOADED_VERSION_KEY) === nextVersion) {
      return;
    }
    reloading = true;
    if (nextVersion) {
      try {
        sessionStorage.setItem(RELOADED_VERSION_KEY, nextVersion);
      } catch {}
    }
    onUpdating?.();

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        regs.forEach((reg) => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    } catch {}

    reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  const checkForUpdate = async () => {
    if (checking || reloading || !navigator.onLine) return;
    const now = Date.now();
    if (now - lastCheckedAt < 10_000) return;

    checking = true;
    lastCheckedAt = now;
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.update().catch(() => {})));
      }

      const res = await fetch(`/version.json?t=${now}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
      if (data?.version && currentVersion && data.version !== currentVersion) {
        await triggerCleanReload(data.version);
      }
    } catch {
      // Abaikan gangguan jaringan sementara
    } finally {
      checking = false;
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate();
    }
  };

  const handlePreloadError = () => {
    try {
      if (sessionStorage.getItem(PRELOAD_RELOAD_KEY) === '1') return;
      sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
    } catch {}
    void triggerCleanReload();
  };

  const initialTimer = setTimeout(() => {
    void checkForUpdate();
  }, 3_000);
  const pollInterval = setInterval(() => {
    void checkForUpdate();
  }, 60_000);

  window.addEventListener('focus', checkForUpdate);
  window.addEventListener('online', checkForUpdate);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('vite:preloadError', handlePreloadError);

  return () => {
    clearTimeout(initialTimer);
    if (reloadTimer) clearTimeout(reloadTimer);
    clearInterval(pollInterval);
    window.removeEventListener('focus', checkForUpdate);
    window.removeEventListener('online', checkForUpdate);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('vite:preloadError', handlePreloadError);
  };
};
