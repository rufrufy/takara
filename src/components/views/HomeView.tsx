import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import { CategoryIcon } from '../CategoryIcon';
import {
  Eye,
  EyeOff,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Wallet as WalletIcon,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Banknote,
  Smartphone,
  Sparkles
} from 'lucide-react';
import type { ActiveTab } from '../BottomNav';
import type { TransactionType } from '../../types';

interface HomeViewProps {
  onOpenQuickAdd: (type?: TransactionType) => void;
  onOpenImport: () => void;
  onChangeTab: (tab: ActiveTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenQuickAdd, onOpenImport, onChangeTab }) => {
  const { wallets, transactions, totalBalance, periodIncome, periodExpense, netCashFlow, state } = useApp();
  const [showBalance, setShowBalance] = useState(true);

  const recentTransactions = transactions.slice(0, 7);

  const getWalletIcon = (type: string) => {
    if (type === 'cash') return <Banknote className="w-4 h-4 text-emerald-600" />;
    if (type === 'digital') return <Smartphone className="w-4 h-4 text-amber-600" />;
    return <Building2 className="w-4 h-4 text-teal-700" />;
  };

  return (
    <div className="space-y-4 pb-20 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Excel Active Badge or Fresh Welcome Banner */}
      {transactions.length > 0 ? (
        <div
          onClick={onOpenImport}
          className="bg-emerald-50 hover:bg-emerald-100/80 cursor-pointer border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-emerald-950">Data Keuangan Terhubung</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-emerald-700">
                {transactions.length} transaksi dimuat • Net {formatIDR(netCashFlow)}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 flex items-center">
            Kelola <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </div>
      ) : (
        <div className="bg-teal-50/80 border border-teal-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-200" />
            </div>
            <div>
              <span className="font-bold text-xs text-teal-950">Pembukuan Baru Siap</span>
              <p className="text-[11px] text-teal-700">
                Mulai catat transaksi pertama Anda dengan tombol (+) di bawah
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenQuickAdd?.()}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Catat
          </button>
        </div>
      )}
      {/* Main Household Balance Card */}
      <div className="bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-teal-900/10 relative overflow-hidden">
        {/* Subtle decorative background circle */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-teal-100/90 tracking-wide uppercase">
            Total Saldo Household
          </span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1 rounded-lg hover:bg-white/10 text-teal-200 transition-colors"
            title={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Big Balance Number */}
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5 tabular-nums">
          {showBalance ? formatIDR(totalBalance) : 'Rp ••••••••'}
        </div>

        {/* Income & Expense Pills inside Balance card */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-teal-600/50">
          <button
            type="button"
            onClick={() => onOpenQuickAdd('income')}
            className="bg-teal-800/50 hover:bg-teal-800/70 cursor-pointer backdrop-blur-xs p-3 rounded-2xl border border-teal-500/20 text-left transition-all active:scale-98 group"
            title="Klik untuk catat pemasukan"
          >
            <div className="flex items-center gap-1.5 text-teal-200 text-xs mb-1 group-hover:text-white">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
              <span>Pemasukan</span>
            </div>
            <div className="font-bold text-sm sm:text-base text-white tabular-nums">
              {showBalance ? formatIDR(periodIncome) : 'Rp ••••••'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAdd('expense')}
            className="bg-teal-800/50 hover:bg-teal-800/70 cursor-pointer backdrop-blur-xs p-3 rounded-2xl border border-teal-500/20 text-left transition-all active:scale-98 group"
            title="Klik untuk catat pengeluaran"
          >
            <div className="flex items-center gap-1.5 text-teal-200 text-xs mb-1 group-hover:text-white">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-300" />
              <span>Pengeluaran</span>
            </div>
            <div className="font-bold text-sm sm:text-base text-white tabular-nums">
              {showBalance ? formatIDR(periodExpense) : 'Rp ••••••'}
            </div>
          </button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => onOpenQuickAdd('expense')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Pengeluaran</span>
        </button>

        <button
          onClick={() => onOpenQuickAdd('income')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Pemasukan</span>
        </button>

        <button
          onClick={() => onOpenQuickAdd('transfer')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Transfer</span>
        </button>
      </div>

      {/* Wallets Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-teal-700" />
            <h2 className="font-bold text-slate-900 text-sm">Daftar Dompet ({wallets.length})</h2>
          </div>
          <button
            onClick={() => onChangeTab('profil-keuangan')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center"
          >
            Kelola <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Wallets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {wallets.map(w => (
            <div
              key={w.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-teal-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  {getWalletIcon(w.type)}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {w.type}
                </span>
              </div>
              <div className="font-bold text-slate-800 text-xs truncate" title={w.name}>
                {w.name}
              </div>
              <div
                className={`text-sm font-extrabold mt-1 tabular-nums ${
                  w.balance < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {showBalance ? formatIDR(w.balance) : '••••••'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Transaksi Terakhir</h2>
          <button
            onClick={() => onChangeTab('transaksi')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center"
          >
            Semua ({transactions.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada transaksi di household ini.
            </div>
          ) : (
            recentTransactions.map(t => {
              const isIncome = t.type === 'income';
              const isTransfer = t.type === 'transfer';

              return (
                <div key={t.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : isTransfer
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      <CategoryIcon name={t.categoryName} type={t.type} className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {t.description || t.categoryName || (isTransfer ? 'Transfer Antar Dompet' : 'Transaksi')}
                        </span>
                        {t.addedBy && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-md">
                            {t.addedBy.split(' ')[0]}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span>{t.categoryName}</span>
                        {isTransfer && t.sourceWalletId && t.destinationWalletId && (
                          <span className="text-blue-600 font-medium">
                            • {wallets.find(w => w.id === t.sourceWalletId)?.name || 'Sumber'} → {wallets.find(w => w.id === t.destinationWalletId)?.name || 'Tujuan'}
                          </span>
                        )}
                        {!isTransfer && t.sourceWalletId && (
                          <span>• {wallets.find(w => w.id === t.sourceWalletId)?.name}</span>
                        )}
                        {!isTransfer && t.destinationWalletId && (
                          <span>• {wallets.find(w => w.id === t.destinationWalletId)?.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-bold text-xs sm:text-sm tabular-nums ${
                        isIncome
                          ? 'text-emerald-600'
                          : isTransfer
                          ? 'text-blue-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? `+${formatIDR(t.amount)}` : isTransfer ? formatIDR(t.amount) : `-${formatIDR(t.amount)}`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(t.effectiveAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      {t.time ? ` • ${t.time}` : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
