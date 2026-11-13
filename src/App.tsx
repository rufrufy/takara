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
import { AdminDashboardView } from './components/views/AdminDashboardView';
export const TakaraMainLayout: React.FC = () => {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('beranda');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleOpenQuickAdd = (type: TransactionType = 'expense') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };
  // Jika belum login, tampilkan Login Page
  if (!state.isAuthenticated || state.isLocked) {
    return <LockScreen />;
  }

  // ROLE 1: ADMIN DASHBOARD (Khusus Admin: kelola user, AI, Supabase, sesi - tidak ikut pencatatan)
  if (state.currentUser?.role === 'ADMIN' || state.currentUser?.username === 'admin' || isAdminOpen) {
    return <AdminDashboardView onBack={isAdminOpen ? () => setIsAdminOpen(false) : undefined} />;
  }

  // ROLE 2: USER KELUARGA (Pencatatan Keuangan Rumah Tangga)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-[#0F172A]">
      {/* Top Sticky Header */}
      <Header onOpenImport={() => setIsImportOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'beranda' && (
          <HomeView
            onOpenQuickAdd={handleOpenQuickAdd}
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
          />
        )}
      </main>

      {/* Mobile-First Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />
      {/* Floating Action Button (FAB) - Hanya Tombol Tambah Tanpa Tulisan */}
      <button
        onClick={() => handleOpenQuickAdd('expense')}
        className="fixed bottom-20 right-5 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-xl shadow-teal-950/30 flex items-center justify-center active:scale-90 transition-all border-2 border-white/20 group"
        title="Catat Transaksi Baru"
      >
        <Plus className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Quick Add Transaction Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialType={quickAddType}
      />

      {/* Excel Importer Modal */}
      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
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
