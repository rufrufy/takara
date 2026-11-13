import React from 'react';

export type ActiveTab = 'beranda' | 'transaksi' | 'profil-keuangan' | 'laporan' | 'pengaturan';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-between">
        {/* 1. Beranda */}
        <button
          onClick={() => onChangeTab('beranda')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'beranda' ? 'scale-105 font-bold text-teal-800' : 'text-slate-400 hover:text-slate-600 opacity-80'
          }`}
        >
          <div className="w-6 h-6 mb-0.5 flex items-center justify-center">
            {activeTab === 'beranda' ? (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <circle cx="24" cy="24" r="22" fill="#CCFBF1" />
                <path d="M24 10L10 22v16a2 2 0 002 2h24a2 2 0 002-2V22L24 10z" fill="#0F766E" />
                <rect x="20" y="26" width="8" height="14" fill="#5EEAD4" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <path d="M24 10L10 22v16a2 2 0 002 2h24a2 2 0 002-2V22L24 10z" stroke="#64748B" strokeWidth="3" fill="none" />
                <rect x="20" y="26" width="8" height="14" stroke="#64748B" strokeWidth="2.5" />
              </svg>
            )}
          </div>
          <span className="text-[10px]">Beranda</span>
        </button>

        {/* 2. Transaksi */}
        <button
          onClick={() => onChangeTab('transaksi')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'transaksi' ? 'scale-105 font-bold text-teal-800' : 'text-slate-400 hover:text-slate-600 opacity-80'
          }`}
        >
          <div className="w-6 h-6 mb-0.5 flex items-center justify-center">
            {activeTab === 'transaksi' ? (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <circle cx="24" cy="24" r="22" fill="#E0E7FF" />
                <rect x="12" y="10" width="24" height="28" rx="3" fill="#4F46E5" />
                <path d="M18 18h12M18 24h12M18 30h8" stroke="#A5B4FC" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <rect x="12" y="10" width="24" height="28" rx="3" stroke="#64748B" strokeWidth="3" fill="none" />
                <path d="M18 18h12M18 24h12M18 30h8" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="text-[10px]">Transaksi</span>
        </button>

        {/* 3. Profil Finansial */}
        <button
          onClick={() => onChangeTab('profil-keuangan')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'profil-keuangan' ? 'scale-105 font-bold text-teal-800' : 'text-slate-400 hover:text-slate-600 opacity-80'
          }`}
        >
          <div className="w-6 h-6 mb-0.5 flex items-center justify-center">
            {activeTab === 'profil-keuangan' ? (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <circle cx="24" cy="24" r="22" fill="#FEF3C7" />
                <rect x="10" y="20" width="28" height="18" rx="3" fill="#D97706" />
                <polygon points="24,10 8,18 40,18" fill="#F59E0B" />
                <circle cx="24" cy="28" r="3" fill="#FEF08A" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <rect x="10" y="20" width="28" height="18" rx="3" stroke="#64748B" strokeWidth="3" fill="none" />
                <polygon points="24,10 8,18 40,18" stroke="#64748B" strokeWidth="2.5" fill="none" />
              </svg>
            )}
          </div>
          <span className="text-[10px] whitespace-nowrap">Profil Finansial</span>
        </button>

        {/* 4. Laporan */}
        <button
          onClick={() => onChangeTab('laporan')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'laporan' ? 'scale-105 font-bold text-teal-800' : 'text-slate-400 hover:text-slate-600 opacity-80'
          }`}
        >
          <div className="w-6 h-6 mb-0.5 flex items-center justify-center">
            {activeTab === 'laporan' ? (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <circle cx="24" cy="24" r="22" fill="#FEE2E2" />
                <rect x="12" y="24" width="6" height="14" rx="1.5" fill="#EF4444" />
                <rect x="21" y="16" width="6" height="22" rx="1.5" fill="#F59E0B" />
                <rect x="30" y="10" width="6" height="28" rx="1.5" fill="#10B981" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <rect x="12" y="24" width="6" height="14" rx="1.5" stroke="#64748B" strokeWidth="2.5" fill="none" />
                <rect x="21" y="16" width="6" height="22" rx="1.5" stroke="#64748B" strokeWidth="2.5" fill="none" />
                <rect x="30" y="10" width="6" height="28" rx="1.5" stroke="#64748B" strokeWidth="2.5" fill="none" />
              </svg>
            )}
          </div>
          <span className="text-[10px]">Laporan</span>
        </button>

        {/* 5. Pengaturan */}
        <button
          onClick={() => onChangeTab('pengaturan')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'pengaturan' ? 'scale-105 font-bold text-teal-800' : 'text-slate-400 hover:text-slate-600 opacity-80'
          }`}
        >
          <div className="w-6 h-6 mb-0.5 flex items-center justify-center">
            {activeTab === 'pengaturan' ? (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <circle cx="24" cy="24" r="22" fill="#F1F5F9" />
                <circle cx="24" cy="24" r="7" fill="#0F766E" />
                <path d="M24 8v5M24 35v5M8 24h5M35 24h5M12.7 12.7l3.5 3.5M31.8 31.8l3.5 3.5M12.7 35.3l3.5-3.5M31.8 16.2l3.5-3.5" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
                <circle cx="24" cy="24" r="6" stroke="#64748B" strokeWidth="3" fill="none" />
                <path d="M24 8v4M24 36v4M8 24h4M36 24h4" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="text-[10px]">Pengaturan</span>
        </button>
      </div>
    </nav>
  );
};
