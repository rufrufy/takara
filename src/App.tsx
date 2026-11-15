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
  const { state, isFinancialReady, supabaseSyncStatus, logoutUser } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [selectedTransactionId,setSelectedTransactionId] = useState<string>();
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
  if(!isFinancialReady && state.currentUser.role!=='ADMIN' && state.currentUser.username!=='admin') {
    return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><div className="max-w-sm text-center space-y-4">
      <h1 className="text-lg font-bold text-teal-900">Menyiapkan household Anda</h1>
      {supabaseSyncStatus.status==='error'?<><p role="alert" className="text-sm text-red-700">{supabaseSyncStatus.error}</p><button onClick={()=>window.location.reload()} className="rounded-xl bg-teal-700 text-white px-4 py-2">Coba lagi</button><button onClick={logoutUser} className="block mx-auto text-sm underline">Kembali ke login</button></>:<p role="status" className="text-sm text-slate-600">Memuat saldo, dompet, dan transaksi dari Supabase…</p>}
    </div></main>;
  }

  if (state.currentUser?.role === 'ADMIN' || state.currentUser?.username === 'admin') {
    return <div className="takara-app"><AdminDashboardView onBack={isAdminOpen ? () => setIsAdminOpen(false) : undefined} /></div>;
  }

  // ROLE 2: USER KELUARGA (Pencatatan Keuangan Rumah Tangga)
  return (
    <div className="takara-app min-h-screen flex flex-col">
      {/* Top Sticky Header */}
      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onOpenInstall={() => setIsPwaModalOpen(true)}
      />
      {/* Main Content Area */}
      <main className="app-content flex-1">
        {activeTab === 'beranda' && (
          <HomeView
            onOpenQuickAdd={handleOpenQuickAdd}
            onOpenAIScan={() => setIsAIScanOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
            onChangeTab={setActiveTab}
            onOpenTransaction={id=>{setSelectedTransactionId(id);setActiveTab('transaksi');}}
          />
        )}
        {activeTab === 'transaksi' && (
          <TransactionsView onOpenQuickAdd={handleOpenQuickAdd} initialTransactionId={selectedTransactionId} />
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
        onChangeTab={tab=>{setSelectedTransactionId(undefined);setActiveTab(tab);}}
      />
      {(activeTab==='transaksi'||activeTab==='profil-keuangan')&&<div className="page-record-action"><button onClick={()=>handleOpenQuickAdd()} aria-label="Catat transaksi"><Plus size={23}/><span>Catat</span></button></div>}

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
