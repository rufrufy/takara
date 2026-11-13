import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Plus } from 'lucide-react';
import type { TransactionType } from './types';
import { Header } from './components/Header';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { HomeView } from './components/views/HomeView';
import { TransactionsView } from './components/views/TransactionsView';
import { FinancialProfileView } from './components/views/FinancialProfileView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { QuickAddModal } from './components/QuickAddModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { LockScreen } from './components/LockScreen';
import { LandingPage } from './components/LandingPage';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { PWAInstallModal } from './components/PWAInstallModal';
import { AIScanModal } from './components/AIScanModal';
import { Camera, Sparkles } from 'lucide-react';

export const TakaraMainLayout: React.FC = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login'>('landing');
  const [loginInitialTab, setLoginInitialTab] = useState<'login' | 'register' | 'admin'>('login');
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isAIScanOpen, setIsAIScanOpen] = useState(false);
  const handleOpenQuickAdd = (type: TransactionType = 'expense') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  // Jika belum login, tampilkan Landing Page atau Login Page
  if (!state.isAuthenticated || state.isLocked) {
    if (authView === 'landing') {
      return (
        <>
          <LandingPage
            onGoToLogin={(defaultRole) => {
              setLoginInitialTab(defaultRole === 'admin' ? 'admin' : 'login');
              setAuthView('login');
            }}
            onGoToRegister={() => {
              setLoginInitialTab('register');
              setAuthView('login');
            }}
            onOpenInstall={() => setIsPwaModalOpen(true)}
          />
          <PWAInstallModal
            isOpen={isPwaModalOpen}
            onClose={() => setIsPwaModalOpen(false)}
          />
        </>
      );
    }

    return (
      <LockScreen
        onBackToLanding={() => setAuthView('landing')}
        initialTab={loginInitialTab}
      />
    );
  }
  // ROLE 1: ADMIN DASHBOARD (Khusus Admin: kelola user, AI, Supabase, sesi - tidak ikut pencatatan)
  if (state.currentUser?.role === 'ADMIN' || state.currentUser?.username === 'admin') {
    return <AdminDashboardView onBack={isAdminOpen ? () => setIsAdminOpen(false) : undefined} />;
  }

  // ROLE 2: USER KELUARGA (Pencatatan Keuangan Rumah Tangga)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-[#0F172A]">
      {/* Top Sticky Header */}
      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onOpenInstall={() => setIsPwaModalOpen(true)}
      />
      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'beranda' && (
          <HomeView
            onOpenQuickAdd={handleOpenQuickAdd}
            onOpenAIScan={() => setIsAIScanOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
            onChangeTab={setActiveTab}
          />
        )}
        {activeTab === 'transaksi' && (
          <TransactionsView onOpenQuickAdd={handleOpenQuickAdd} />
        )}
        {activeTab === 'profil-keuangan' && <FinancialProfileView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'laporan' && <ReportsView />}
        {activeTab === 'pengaturan' && (
          <SettingsView
            onOpenImport={() => setIsImportOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenInstall={() => setIsPwaModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile-First Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />
      {/* Floating Action Buttons: Scan Nota AI & Catat Cepat */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 flex flex-col items-end gap-2.5">
        {/* Tombol Opsi 1: Scan Nota AI */}
        <button
          type="button"
          onClick={() => setIsAIScanOpen(true)}
          className="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 shadow-lg shadow-slate-900/10 text-xs font-extrabold active:scale-95 transition-all group"
          title="Scan Foto Nota dengan AI"
        >
          <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center">
            <Camera className="w-3 h-3 text-teal-700" />
          </div>
          <span>Scan Nota AI</span>
        </button>

        {/* Tombol Opsi 2: Catat Transaksi Biasa */}
        <button
          type="button"
          onClick={() => handleOpenQuickAdd('expense')}
          className="w-14 h-14 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-xl shadow-teal-950/30 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20 group"
          title="Catat Transaksi Manual"
        >
          <Plus className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Quick Add Transaction Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialType={quickAddType}
      />

      {/* Dedicated AI Receipt Vision Scanner Modal */}
      <AIScanModal
        isOpen={isAIScanOpen}
        onClose={() => setIsAIScanOpen(false)}
      />
      {/* Excel Importer Modal */}
      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <TakaraMainLayout />
    </AppProvider>
  );
}
