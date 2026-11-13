import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Detect if already installed / standalone
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isLegacyStandalone = typeof nav.standalone === 'boolean' && nav.standalone;
    const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(Boolean(isMediaStandalone || isLegacyStandalone));

    // Listen for Android / Chromium beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalledSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-800 border border-teal-600/50 flex items-center justify-center p-1.5 shadow-md shadow-teal-950/20">
              <img
                src="/Takara_logo_original_transparan.png"
                alt="Takara"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                Install Takara
              </h3>
              <p className="text-xs text-slate-500">Pasang di Layar Utama HP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-950 text-sm">Aplikasi Sudah Terpasang</h4>
            <p className="text-xs text-emerald-800">
              Takara sudah terpasang di layar utama perangkat ini dan siap digunakan secara offline.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2 text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-teal-700" />
                <span>Cara Pasang di iPhone / iPad (iOS):</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                <li>
                  Tekan ikon <strong>Bagikan / Share</strong>{' '}
                  <span className="inline-flex p-1 rounded bg-blue-50 text-blue-600 border border-blue-200 align-middle">
                    <Share className="w-3 h-3" />
                  </span>{' '}
                  di bilah bawah Safari.
                </li>
                <li>
                  Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama</strong> (
                  <em>Add to Home Screen</em>){' '}
                  <span className="inline-flex p-1 rounded bg-slate-100 text-slate-700 border border-slate-300 align-middle">
                    <PlusSquare className="w-3 h-3" />
                  </span>
                </li>
                <li>
                  Tekan tombol <strong>Tambah (Add)</strong> di sudut kanan atas layar.
                </li>
              </ol>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Aplikasi akan muncul seperti aplikasi App Store dengan ikon Takara.
            </p>
          </div>
        ) : (
          /* Android / Chrome Prompt */
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Dapatkan pengalaman seperti aplikasi native tanpa perlu download dari Play Store. Buka langsung dari layar utama HP Anda dengan akses cepat dan hemat kuota.
            </p>

            {installedSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold text-center border border-emerald-200 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Berhasil ditambahkan ke Layar Utama!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Tambahkan ke Layar Utama (Homescreen)</span>
              </button>
            )}

            {!deferredPrompt && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-left space-y-1">
                <strong>Tips di Android:</strong> Bila tombol belum muncul, tekan menu titik tiga (⋮) di pojok kanan atas browser lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install App"</strong>.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
