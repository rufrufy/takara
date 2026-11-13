import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import type { WalletType } from '../../types';
import {
  Wallet as WalletIcon,
  Plus,
  Building2,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  Check,
  X,
  CreditCard
} from 'lucide-react';

export const WalletsView: React.FC = () => {
  const { wallets, transactions, addWallet, totalBalance } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('checking');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    const openingBalance = openingBalanceStr ? parseInt(openingBalanceStr.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    addWallet(walletName.trim(), walletType, openingBalance);

    setWalletName('');
    setOpeningBalanceStr('');
    setIsModalOpen(false);
  };

  const getWalletIcon = (type: WalletType) => {
    if (type === 'cash') return <Banknote className="w-5 h-5 text-emerald-600" />;
    if (type === 'digital') return <Smartphone className="w-5 h-5 text-amber-600" />;
    return <Building2 className="w-5 h-5 text-teal-700" />;
  };

  // Filter transactions for selected wallet
  const selectedWalletTransactions = selectedWalletId
    ? transactions.filter(t => t.sourceWalletId === selectedWalletId || t.destinationWalletId === selectedWalletId)
    : [];

  return (
    <div className="space-y-4 pb-20 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Title & Add Wallet Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Manajemen Dompet</h1>
          <p className="text-xs text-slate-500">
            Total {wallets.length} dompet aktif • Saldo Total {formatIDR(totalBalance)}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white hover:bg-teal-800 rounded-xl text-xs font-semibold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Dompet</span>
        </button>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {wallets.map(w => {
          const isSelected = selectedWalletId === w.id;
          const wTxs = transactions.filter(t => t.sourceWalletId === w.id || t.destinationWalletId === w.id);

          return (
            <div
              key={w.id}
              onClick={() => setSelectedWalletId(isSelected ? null : w.id)}
              className={`bg-white border rounded-3xl p-5 shadow-2xs cursor-pointer transition-all ${
                isSelected
                  ? 'border-teal-600 ring-2 ring-teal-600/20 shadow-md'
                  : 'border-slate-200/80 hover:border-teal-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-2xs">
                    {getWalletIcon(w.type)}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm leading-tight">{w.name}</h2>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {w.type === 'cash' ? 'Uang Tunai' : w.type === 'digital' ? 'E-Wallet / Digital' : 'Rekening Bank'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {wTxs.length} mutasi
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Saldo Tersedia</span>
                <span
                  className={`text-lg font-extrabold tabular-nums ${
                    w.balance < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatIDR(w.balance)}
                </span>
              </div>

              {isSelected && (
                <div className="mt-2 text-right">
                  <span className="text-[11px] text-teal-700 font-semibold">
                    Sedang melihat mutasi dompet ini ▼
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Wallet Transactions Detail */}
      {selectedWalletId && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Mutasi Dompet: {wallets.find(w => w.id === selectedWalletId)?.name}
            </h3>
            <button
              onClick={() => setSelectedWalletId(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Tutup Rincian
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {selectedWalletTransactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Belum ada transaksi pada dompet ini.
              </div>
            ) : (
              selectedWalletTransactions.map(t => {
                const isIncoming = t.destinationWalletId === selectedWalletId;
                const isTransfer = t.type === 'transfer';

                return (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {t.description || t.categoryName || (isTransfer ? 'Transfer' : 'Transaksi')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(t.effectiveAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        {t.addedBy ? ` • Oleh ${t.addedBy.split(' ')[0]}` : ''}
                      </div>
                    </div>

                    <div
                      className={`text-xs font-bold tabular-nums ${
                        isIncoming ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isIncoming ? `+${formatIDR(t.amount)}` : `-${formatIDR(t.amount)}`}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Wallet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">Tambah Dompet Baru</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Nama Dompet / Rekening
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA Tabungan, Dana Darurat, GoPay"
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Jenis Dompet
                </label>
                <select
                  value={walletType}
                  onChange={e => setWalletType(e.target.value as WalletType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="checking">Rekening Bank (Checking / Giro)</option>
                  <option value="digital">Dompet Digital (E-Wallet)</option>
                  <option value="cash">Uang Tunai (Cash / Dompet Pegangan)</option>
                  <option value="custom">Lainnya / Khusus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Saldo Awal (Opsional, Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0 (Dicatat sebagai Opening Balance)"
                  value={openingBalanceStr ? parseInt(openingBalanceStr, 10).toLocaleString('id-ID') : ''}
                  onChange={e => setOpeningBalanceStr(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Saldo awal tidak dihitung sebagai pemasukan bulanan, menjaga laporan tetap murni.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 rounded-xl shadow-xs"
                >
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
