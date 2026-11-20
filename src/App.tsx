import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Plus } from 'lucide-react';
import type { TransactionType } from './types';
import { initAutoUpdate } from './lib/autoUpdate';
import { Header } from './components/Header';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { HouseholdNotificationToasts } from './components/HouseholdNotificationToasts';
import { BrutalismAnimalBackdrop } from './components/BrutalismAnimalBackdrop';
import { TouchSparkLayer } from './components/TouchSparkLayer';
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
  const { state, isAuthReady, isFinancialReady, supabaseSyncStatus, logoutUser } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [profileSubTab, setProfileSubTab] = useState<'dompet' | 'impian' | 'utang' | 'pemasukan'>('dompet');
  const [profileSubTabNonce, setProfileSubTabNonce] = useState(0);
  const [selectedTransactionId,setSelectedTransactionId] = useState<string>();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login'>('landing');
  const [loginInitialTab, setLoginInitialTab] = useState<'login' | 'register' | 'admin'>('login');
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isAIScanOpen, setIsAIScanOpen] = useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  useEffect(() => {
    return initAutoUpdate(() => setIsUpdatingApp(true));
  }, []);

  const handleOpenQuickAdd = (type: TransactionType = 'expense') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  const handleNotificationNavigate = (tab: ActiveTab, entityId?: string) => {
    if (tab === 'transaksi' && entityId) {
      setSelectedTransactionId(entityId);
    } else {
      setSelectedTransactionId(undefined);
    }
    setActiveTab(tab);
  };

  const handleOpenProfileSubTab = (subTab: 'dompet' | 'impian' | 'utang' | 'pemasukan') => {
    setProfileSubTab(subTab);
    setProfileSubTabNonce(n => n + 1);
    setActiveTab('profil-keuangan');
  };

  if(!isAuthReady)return <main className="takara-app min-h-screen flex items-center justify-center p-6"><div role="status" className="nb-card max-w-xs w-full p-6 text-center space-y-2 bg-[#FFD166]"><img src="/Takara-192.png" alt="Takara" className="w-16 h-16 mx-auto mb-2 object-contain" /><h1 className="text-xl font-extrabold text-[#073B4C]">Membuka Takara</h1><p className="text-sm font-bold text-[#365664]">Memulihkan sesi akun keluarga Anda…</p></div></main>;
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
          <HouseholdNotificationToasts onNavigate={() => {}} isUpdatingApp={isUpdatingApp} />
        </>
      );
    }

    return (
      <>
        <LockScreen
          onBackToLanding={() => setAuthView('landing')}
          initialTab={loginInitialTab}
        />
        <HouseholdNotificationToasts onNavigate={() => {}} isUpdatingApp={isUpdatingApp} />
      </>
    );
  }
  // ROLE 1: ADMIN DASHBOARD (Khusus Admin: kelola user, AI, Supabase, sesi - tidak ikut pencatatan)
  if(!isFinancialReady && state.currentUser.role!=='ADMIN' && state.currentUser.username!=='admin') {
    return <main className="takara-app min-h-screen flex items-center justify-center p-6"><div className="nb-card max-w-sm w-full p-6 text-center space-y-4">
      <img src="/Takara-192.png" alt="Takara" className="w-16 h-16 mx-auto object-contain" />
      <h1 className="text-lg font-extrabold text-[#073B4C]">Menyiapkan household Anda</h1>
      {supabaseSyncStatus.status==='error'?<><p role="alert" className="text-sm font-bold text-red-700">{supabaseSyncStatus.error}</p><button onClick={()=>window.location.reload()} className="nb-btn bg-[#06D6A0] text-[#073B4C] px-5 py-2.5">Coba lagi</button><button onClick={logoutUser} className="block mx-auto text-sm font-extrabold underline">Kembali ke login</button></>:<p role="status" className="text-sm font-bold text-[#365664]">Memuat saldo, dompet, dan transaksi dari Supabase…</p>}
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
        onNavigateFromNotification={handleNotificationNavigate}
      />
      <HouseholdNotificationToasts
        onNavigate={handleNotificationNavigate}
        isUpdatingApp={isUpdatingApp}
      />
      {/* Main Content Area */}
      <main className="app-content flex-1">
        <div key={activeTab} className="view-stage-enter">
          {activeTab === 'beranda' && (
            <HomeView
              onOpenQuickAdd={handleOpenQuickAdd}
              onOpenAIScan={() => setIsAIScanOpen(true)}
              onOpenImport={() => setIsImportOpen(true)}
              onChangeTab={setActiveTab}
              onOpenProfileTab={handleOpenProfileSubTab}
              onOpenTransaction={id=>{setSelectedTransactionId(id);setActiveTab('transaksi');}}
            />
          )}
          {activeTab === 'transaksi' && (
            <TransactionsView onOpenQuickAdd={handleOpenQuickAdd} initialTransactionId={selectedTransactionId} />
          )}
          {activeTab === 'profil-keuangan' && (
            <FinancialProfileView
              onOpenQuickAdd={handleOpenQuickAdd}
              initialSubTab={profileSubTab}
              initialSubTabKey={profileSubTabNonce}
            />
          )}
          {activeTab === 'laporan' && <ReportsView />}
          {activeTab === 'pengaturan' && (
            <SettingsView
              onOpenImport={() => setIsImportOpen(true)}
              onOpenAdmin={() => setIsAdminOpen(true)}
              onOpenInstall={() => setIsPwaModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Mobile-First Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={tab=>{setSelectedTransactionId(undefined);if(tab==='profil-keuangan'){setProfileSubTab('dompet');setProfileSubTabNonce(n=>n+1);}setActiveTab(tab);}}
      />
      {(activeTab==='beranda'||activeTab==='transaksi'||activeTab==='profil-keuangan')&&<div className="page-record-action"><button onClick={()=>handleOpenQuickAdd()} aria-label="Tambah transaksi"><Plus size={28} strokeWidth={2.8}/></button></div>}

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
      <TouchSparkLayer />
      <BrutalismAnimalBackdrop />
      <TakaraMainLayout />
    </AppProvider>
  );
}
