import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import { CategoryIcon } from '../CategoryIcon';
import {
  Search,
  Filter,
  Trash2,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Plus,
  AlertCircle,
  Tag as TagIcon,
  Table as TableIcon,
  LayoutList,
  X,
  Calendar,
  Clock,
  User,
  Info,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Wallet as WalletIcon,
  RotateCcw,
  Edit3,
  Check,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import type { TransactionType, FinancialTransaction } from '../../types';

interface TransactionsViewProps {
  onOpenQuickAdd: (type?: TransactionType) => void;
}

const safeDisplayDate = (dateStr?: string, effectiveAt?: string): string => {
  if (dateStr && dateStr.trim()) return dateStr.trim();
  if (!effectiveAt) return '';
  try {
    const d = new Date(effectiveAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }
  } catch {
    // fallback
  }
  return String(effectiveAt).split('T')[0] || '';
};

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onOpenQuickAdd }) => {
  const { transactions, wallets, categories, labels, households, members, allMembers, voidTransaction, editTransaction, state } = useApp();

  // Search & Filter State (5 Kriteria: Tipe, Anggota, Aset, Kategori, Label)
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [filterDimension, setFilterDimension] = useState<'type' | 'member' | 'asset' | 'category' | 'label'>('type');

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Selected Transaction for 21-column Detail Modal & Edit Mode
  const [detailTransaction, setDetailTransaction] = useState<FinancialTransaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);

  // Edit form states
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editSourceWalletId, setEditSourceWalletId] = useState('');
  const [editDestWalletId, setEditDestWalletId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDateStr, setEditDateStr] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAddedBy, setEditAddedBy] = useState('');
  const [editFeeStr, setEditFeeStr] = useState('');
  const [editHouseholdId, setEditHouseholdId] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const availableMemberNames = useMemo(() => {
    const names = new Set<string>();
    if (state.currentUser?.displayName) names.add(state.currentUser.displayName);
    for (const m of members) {
      if (m.displayName) names.add(m.displayName);
    }
    for (const m of allMembers) {
      if (m.displayName) names.add(m.displayName);
    }
    if (detailTransaction?.addedBy) names.add(detailTransaction.addedBy);
    return Array.from(names);
  }, [state.currentUser, members, allMembers, detailTransaction]);
  // Extract unique members from transactions
  const uniqueMembers = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.addedBy && t.addedBy.trim()) {
        set.add(t.addedBy.trim());
      }
    }
    return Array.from(set);
  }, [transactions]);

  // Extract unique assets (dompet) from wallets
  const uniqueAssets = useMemo(() => {
    return wallets.map(w => w.name);
  }, [wallets]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (memberFilter !== 'all') count++;
    if (assetFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (labelFilter !== 'all') count++;
    return count;
  }, [typeFilter, memberFilter, assetFilter, categoryFilter, labelFilter]);

  // Reset all 5 filters
  const handleResetFilters = () => {
    setTypeFilter('all');
    setMemberFilter('all');
    setAssetFilter('all');
    setCategoryFilter('all');
    setLabelFilter('all');
    setSearchQuery('');
  };

  // Filtered transactions computation
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Tipe (income, expense, transfer)
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // 2. Anggota (Maruf H, Zakia Nurul Hanifa, dll.)
      if (memberFilter !== 'all' && t.addedBy !== memberFilter) return false;

      // 3. Aset / Dompet (Cash, Bank Jago, Bank Jateng, dll.)
      if (assetFilter !== 'all') {
        const srcName = t.sourceAsset || wallets.find(w => w.id === t.sourceWalletId)?.name;
        const dstName = t.destinationAsset || wallets.find(w => w.id === t.destinationWalletId)?.name;
        if (srcName !== assetFilter && dstName !== assetFilter) {
          return false;
        }
      }

      // 4. Kategori (Makan, Belanja Harian, Langganan, dll.)
      if (categoryFilter !== 'all' && t.categoryName !== categoryFilter) return false;

      // 5. Label (#Sarapan, #AI, #Reina, dll.)
      if (labelFilter !== 'all' && t.label !== labelFilter) return false;

      // 6. Pencarian teks bebas
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const cat = (t.categoryName || '').toLowerCase();
        const lbl = (t.label || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const user = (t.addedBy || '').toLowerCase();
        const src = (t.sourceAsset || '').toLowerCase();
        const dst = (t.destinationAsset || '').toLowerCase();
        if (
          !desc.includes(q) &&
          !cat.includes(q) &&
          !lbl.includes(q) &&
          !notes.includes(q) &&
          !user.includes(q) &&
          !src.includes(q) &&
          !dst.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    transactions,
    typeFilter,
    memberFilter,
    assetFilter,
    categoryFilter,
    labelFilter,
    searchQuery,
    wallets
  ]);

  // Recalculate income, expense, and net balance dynamically from filtered transactions
  // Default is the whole active month's total when no filter is applied
  const { filteredIncome, filteredExpense, filteredNet, isFiltered } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        inc += t.amount;
      } else if (t.type === 'expense') {
        exp += t.amount;
      } else if (t.type === 'transfer' && t.fee && t.fee > 0) {
        exp += t.fee;
      }
    }

    const hasActive = activeFilterCount > 0 || searchQuery.trim() !== '';

    return {
      filteredIncome: inc,
      filteredExpense: exp,
      filteredNet: inc - exp,
      isFiltered: hasActive
    };
  }, [filteredTransactions, activeFilterCount, searchQuery]);

  // Export CSV helper with all 21 properties
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Date',
      'Day',
      'Time',
      'Type',
      'Category',
      'Category Type',
      'Label',
      'Amount',
      'Description',
      'Notes',
      'Source Asset',
      'Source Asset Type',
      'Destination Asset',
      'Transfer Fee',
      'Added By',
      'Auto Income',
      'From Savings',
      'From Investment',
      'Created At',
      'Last Updated'
    ];

    const rows = filteredTransactions.map((t, idx) => [
      t.no || idx + 1,
      t.dateStr || safeDisplayDate(undefined, t.effectiveAt),
      t.day || '',
      t.time || '',
      t.type,
      t.categoryName || '',
      t.categoryType || (t.type === 'income' ? 'income' : 'expense'),
      t.label || '',
      t.amount,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.sourceAsset || (wallets.find(w => w.id === t.sourceWalletId)?.name || ''),
      t.sourceAssetType || '',
      t.destinationAsset || (wallets.find(w => w.id === t.destinationWalletId)?.name || ''),
      t.fee || 0,
      t.addedBy,
      t.autoIncome ? 'Yes' : 'No',
      t.fromSavings ? 'Yes' : 'No',
      t.fromInvestment ? 'Yes' : 'No',
      t.createdAt,
      t.updatedAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transaksi-dompetkita-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmVoid = (id: string) => {
    voidTransaction(id);
    setVoidConfirmId(null);
    if (detailTransaction?.id === id) {
      setDetailTransaction(null);
    }
  };

  // Open detail modal and initialize edit state
  const handleOpenDetail = (t: FinancialTransaction) => {
    setDetailTransaction(t);
    setIsEditing(false);
    setEditErrorMsg('');
    setEditAmountStr(String(t.amount));
    setEditHouseholdId(t.householdId || state.activeHouseholdId);
    setEditType(t.type);
    const matchedDst = t.destinationWalletId || wallets.find(w => w.name.toLowerCase().trim() === (t.destinationAsset || t.sourceAsset)?.toLowerCase().trim())?.id || (t.type === 'income' ? matchedSrc : '') || wallets[1]?.id || wallets[0]?.id || '';
    setEditSourceWalletId(matchedSrc);
    setEditDestWalletId(matchedDst);
    if (t.type === 'transfer') {
      setEditCategoryName('Transfer Antar Dompet');
      setEditCategoryId('');
    } else {
      const typeCats = categories.filter(c => c.type === t.type);
      const matchedCat = typeCats.find(c => c.id === t.categoryId || c.name.toLowerCase() === t.categoryName?.toLowerCase());
      setEditCategoryId(matchedCat ? matchedCat.id : (typeCats[0]?.id || ''));
      setEditCategoryName(matchedCat ? matchedCat.name : (t.categoryName || typeCats[0]?.name || ''));
    }
    setEditLabel(t.label || '');
    setEditDescription(t.description || '');
    setEditDateStr(t.dateStr || safeDisplayDate(undefined, t.effectiveAt));
    setEditTime(t.time || '');
    setEditAddedBy(t.addedBy || 'Maruf H');
    setEditFeeStr(t.fee ? String(t.fee) : '');
  };

  // Handle saving transaction edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTransaction) return;
    setEditErrorMsg('');

    const amount = parseInt(editAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (amount <= 0) {
      setEditErrorMsg('Nominal transaksi harus lebih dari 0.');
      return;
    }

    const fee = editFeeStr ? parseInt(editFeeStr.replace(/[^0-9]/g, ''), 10) || 0 : 0;

    if (editType === 'transfer') {
      if (!editSourceWalletId || !editDestWalletId) {
        setEditErrorMsg('Pilih dompet asal dan dompet tujuan.');
        return;
      }
      if (editSourceWalletId === editDestWalletId) {
        setEditErrorMsg('Dompet asal dan tujuan tidak boleh sama.');
        return;
      }
    }

    const srcWallet = wallets.find(w => w.id === editSourceWalletId);
    const dstWallet = wallets.find(w => w.id === editDestWalletId);

    const res = editTransaction(detailTransaction.id, {
      householdId: editHouseholdId || detailTransaction.householdId,
      amount,
      type: editType,
      sourceWalletId: editType === 'expense' || editType === 'transfer' ? editSourceWalletId : undefined,
      destinationWalletId: editType === 'income' ? editDestWalletId : (editType === 'transfer' ? editDestWalletId : undefined),
      sourceAsset: editType === 'expense' || editType === 'transfer' ? (srcWallet?.name || detailTransaction.sourceAsset) : undefined,
      destinationAsset: editType === 'income' ? (dstWallet?.name || detailTransaction.destinationAsset) : (editType === 'transfer' ? dstWallet?.name : undefined),
      categoryId: editType === 'transfer' ? undefined : (editCategoryId || undefined),
      categoryName: editType === 'transfer' ? 'Transfer Antar Dompet' : (editCategoryName || (editType === 'income' ? 'Pemasukan Lainnya' : 'Pengeluaran Lainnya')),
      label: editLabel.trim() || undefined,
      description: editDescription.trim() || undefined,
      addedBy: editAddedBy.trim() || state.currentUser?.displayName || 'Maruf H',
      time: editTime || undefined,
      fee: editType === 'transfer' && fee > 0 ? fee : undefined
    });

    if (res.success) {
      setDetailTransaction(prev => (prev ? {
        ...prev,
        amount,
        type: editType,
        sourceWalletId: editSourceWalletId,
        destinationWalletId: editDestWalletId,
        sourceAsset: srcWallet?.name,
        destinationAsset: dstWallet?.name,
        categoryId: editCategoryId,
        categoryName: editCategoryName,
        label: editLabel.trim() || undefined,
        description: editDescription.trim() || undefined,
        addedBy: editAddedBy,
        time: editTime,
        fee: fee > 0 ? fee : undefined
      } : null));
      setIsEditing(false);
    } else {
      setEditErrorMsg(res.error || 'Gagal menyimpan perubahan transaksi.');
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Riwayat Transaksi</h1>
          <p className="text-xs text-slate-500">
            Total {filteredTransactions.length} dari {transactions.length} transaksi tercatat
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs"
            title="Ekspor CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC RECALCULATED SUMMARY BANNER (Bulan Berjalan / Terfilter) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isFiltered ? 'bg-amber-500 animate-pulse' : 'bg-teal-600'}`} />
            <span className="text-xs font-bold text-slate-800">
              {isFiltered ? (
                <>
                  Hasil Filter Terhitung Ulang ({filteredTransactions.length} Transaksi)
                </>
              ) : (
                'Ringkasan Bulan Berjalan (November 2026)'
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
            {!isFiltered && (
              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                {filteredTransactions.length} Transaksi
              </span>
            )}
          </div>
        </div>

        {/* 3 Metrics: Pemasukan, Pengeluaran, Net Balance */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'income' ? 'all' : 'income')}
            className={`p-3 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer ${
              typeFilter === 'income'
                ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                : 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-100'
            }`}
            title="Klik untuk filter hanya pemasukan"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pemasukan</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {formatIDR(filteredIncome)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')}
            className={`p-3 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer ${
              typeFilter === 'expense'
                ? 'bg-red-100/90 border-red-400 ring-2 ring-red-500/30 shadow-xs'
                : 'bg-red-50/70 hover:bg-red-100/60 border-red-100'
            }`}
            title="Klik untuk filter hanya pengeluaran"
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-red-800">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
              <span>Pengeluaran</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-red-700 tabular-nums mt-0.5">
              {formatIDR(filteredExpense)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`p-3 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
            }`}
            title="Tampilkan semua transaksi"
          >
            <div className="text-[11px] font-semibold text-slate-600">
              Arus Kas (Net)
            </div>
            <div className={`text-sm sm:text-base font-extrabold tabular-nums mt-0.5 ${filteredNet >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
              {formatIDR(filteredNet, { showSign: true })}
            </div>
          </button>
        </div>
      </div>

      {/* SEARCH BAR & 2-LINE COMPACT FILTER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs space-y-2.5">
        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi (keterangan, #label, dompet, anggota)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* BARIS 1: PILIHAN KRITERIA FILTER (Tipe, Anggota, Aset, Kategori, Label) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setFilterDimension('type')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filterDimension === 'type'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span>Tipe Transaksi</span>
            {typeFilter !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterDimension('member')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filterDimension === 'member'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span>Anggota Keluarga</span>
            {memberFilter !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterDimension('asset')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filterDimension === 'asset'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span>Aset / Dompet</span>
            {assetFilter !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterDimension('category')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filterDimension === 'category'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span>Kategori</span>
            {categoryFilter !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterDimension('label')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filterDimension === 'label'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            <span>Label</span>
            {labelFilter !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 whitespace-nowrap transition-all ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* BARIS 2: ISIAN DARI KRITERIA YANG DIPILIH DI BARIS 1 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {/* 1. Isian Tipe Transaksi */}
          {filterDimension === 'type' && (
            <>
              {[
                { key: 'all', label: 'Semua' },
                { key: 'income', label: 'Pemasukan' },
                { key: 'expense', label: 'Pengeluaran' },
                { key: 'transfer', label: 'Transfer' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTypeFilter(opt.key as 'all' | TransactionType)}
                  className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                    typeFilter === opt.key
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </>
          )}

          {/* 2. Isian Anggota Keluarga */}
          {filterDimension === 'member' && (
            <>
              <button
                type="button"
                onClick={() => setMemberFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                  memberFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                }`}
              >
                Semua Anggota
              </button>
              {uniqueMembers.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMemberFilter(m)}
                  className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                    memberFilter === m
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                  }`}
                >
                  {m}
                </button>
              ))}
            </>
          )}

          {/* 3. Isian Aset / Dompet */}
          {filterDimension === 'asset' && (
            <>
              <button
                type="button"
                onClick={() => setAssetFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                  assetFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                }`}
              >
                Semua Dompet
              </button>
              {uniqueAssets.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAssetFilter(a)}
                  className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                    assetFilter === a
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                  }`}
                >
                  {a}
                </button>
              ))}
            </>
          )}

          {/* 4. Isian Kategori */}
          {filterDimension === 'category' && (
            <>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.name)}
                  className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                    categoryFilter === c.name
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </>
          )}

          {/* 5. Isian Label */}
          {filterDimension === 'label' && (
            <>
              <button
                type="button"
                onClick={() => setLabelFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                  labelFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                }`}
              >
                Semua Label
              </button>
              {labels.map(lbl => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setLabelFilter(lbl)}
                  className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all ${
                    labelFilter === lbl
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                  }`}
                >
                  #{lbl}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Cards List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Tidak ada transaksi yang cocok dengan filter pencarian.
            </div>
          ) : (
            filteredTransactions.map(t => {
              const isIncome = t.type === 'income';
              const isTransfer = t.type === 'transfer';

              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenDetail(t)}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors group cursor-pointer"
                >
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {t.description || t.label || t.categoryName || (isTransfer ? 'Transfer Antar Dompet' : 'Transaksi')}
                        </span>

                        {/* Label Badge */}
                        {t.label && (
                          <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200/80 font-bold px-1.5 py-0.5 rounded-md">
                            #{t.label}
                          </span>
                        )}

                        {t.addedBy && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-md">
                            {t.addedBy.split(' ')[0]}
                          </span>
                        )}

                        {t.imageUrl && (
                          <span className="p-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200" title="Ada Foto Struk">
                            <Camera className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>{t.categoryName}</span>
                        {isTransfer && t.sourceWalletId && t.destinationWalletId && (
                          <span className="text-blue-600 font-medium">
                            • {wallets.find(w => w.id === t.sourceWalletId)?.name || 'Sumber'} → {wallets.find(w => w.id === t.destinationWalletId)?.name || 'Tujuan'}
                          </span>
                        )}
                        {isIncome && (
                          <span className="text-emerald-700 font-medium">
                            • Masuk ke: {wallets.find(w => w.id === (t.destinationWalletId || t.sourceWalletId))?.name || t.destinationAsset || t.sourceAsset || 'Dompet Utama'}
                          </span>
                        )}
                        {!isIncome && !isTransfer && (
                          <span>
                            • {wallets.find(w => w.id === (t.sourceWalletId || t.destinationWalletId))?.name || t.sourceAsset || t.destinationAsset || 'Dompet'}
                          </span>
                        )}
                        {t.fee && t.fee > 0 && (
                          <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded">
                            Biaya admin: {formatIDR(t.fee)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
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
                        {safeDisplayDate(t.dateStr, t.effectiveAt)}
                        {t.time ? ` • ${t.time}` : ''}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              );
            })
          )}
      </div>

      {/* Transaction Detail Modal & Inline Edit Modal (Ref: pen.html '08 - Detail Transaksi & Kolaborasi') */}
      {detailTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    detailTransaction.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600'
                      : detailTransaction.type === 'transfer'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  <CategoryIcon name={detailTransaction.categoryName} type={detailTransaction.type} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {isEditing ? 'Ubah Rincian Transaksi' : 'Rincian Transaksi Excel'}
                  </h3>
                  <p className="text-xs text-slate-500">ID: {detailTransaction.id} • No. #{detailTransaction.no || '1'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl flex items-center gap-1 transition-colors"
                    title="Ubah Data Transaksi"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Batal Edit
                  </button>
                )}

                <button
                  onClick={() => setDetailTransaction(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content: View Mode vs Edit Mode */}
            {!isEditing ? (
              /* VIEW DETAIL MODE */
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Big Amount Card */}
                <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-200/80">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Nominal Transaksi</div>
                  <div
                    className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${
                      detailTransaction.type === 'income'
                        ? 'text-emerald-600'
                        : detailTransaction.type === 'transfer'
                        ? 'text-blue-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {detailTransaction.type === 'income'
                      ? `+${formatIDR(detailTransaction.amount)}`
                      : detailTransaction.type === 'transfer'
                      ? formatIDR(detailTransaction.amount)
                      : `-${formatIDR(detailTransaction.amount)}`}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-1">
                    {detailTransaction.description || detailTransaction.label || 'Tanpa keterangan'}
                  </div>
                </div>
                {/* Receipt Photo Preview if available */}
                {detailTransaction.imageUrl && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-teal-700" />
                      <span>Foto Struk / Nota Pembayaran</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-900/5 flex items-center justify-center">
                      <img
                        src={detailTransaction.imageUrl}
                        alt="Foto Struk"
                        className="w-full h-auto max-h-56 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* 21 Properties Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Tipe Transaksi</div>
                    <div className="font-bold text-slate-900 mt-0.5 capitalize">{detailTransaction.type}</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Kategori</div>
                    <div className="font-bold text-slate-900 mt-0.5">{detailTransaction.categoryName}</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Label / Sub</div>
                    <div className="font-bold text-teal-700 mt-0.5">
                      {detailTransaction.label ? `#${detailTransaction.label}` : '-'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Dicatat Oleh</div>
                    <div className="font-bold text-slate-900 mt-0.5">{detailTransaction.addedBy}</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Dompet Sumber</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {detailTransaction.sourceAsset || (wallets.find(w => w.id === detailTransaction.sourceWalletId)?.name || '-')}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Dompet Tujuan / Penerima</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {detailTransaction.destinationAsset || (wallets.find(w => w.id === (detailTransaction.destinationWalletId || detailTransaction.sourceWalletId))?.name || detailTransaction.sourceAsset || '-')}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Tanggal & Hari</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {safeDisplayDate(detailTransaction.dateStr, detailTransaction.effectiveAt)}
                      {detailTransaction.day ? ` (${detailTransaction.day})` : ''}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Waktu</div>
                    <div className="font-bold text-slate-900 mt-0.5">{detailTransaction.time || '-'}</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Biaya Admin</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {detailTransaction.fee ? formatIDR(detailTransaction.fee) : 'Rp 0'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Auto Income / Savings</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {detailTransaction.autoIncome ? 'Auto Income' : 'Manual'} • {detailTransaction.fromSavings ? 'From Savings' : 'Normal'}
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-[11px] text-slate-400 pt-1 space-y-0.5">
                  <div>Dibuat: {detailTransaction.createdAt}</div>
                  <div>Terakhir diperbarui: {detailTransaction.updatedAt}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setVoidConfirmId(detailTransaction.id)}
                    className="flex-1 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Batalkan / Void</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Ubah / Edit</span>
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT TRANSACTION FORM MODE */
              <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-3.5 text-xs">
                {editErrorMsg && (
                  <div className="p-2.5 bg-red-50 text-red-700 rounded-xl font-medium border border-red-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editErrorMsg}</span>
                  </div>
                )}

                {/* Tipe Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipe Transaksi</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setEditType(t);
                          if (t === 'transfer') {
                            setEditCategoryName('Transfer Antar Dompet');
                            setEditCategoryId('');
                          } else {
                            const typeCats = categories.filter(c => c.type === t);
                            const currentMatch = typeCats.find(c => c.name === editCategoryName);
                            if (currentMatch) {
                              setEditCategoryId(currentMatch.id);
                            } else if (typeCats.length > 0) {
                              setEditCategoryName(typeCats[0]!.name);
                              setEditCategoryId(typeCats[0]!.id);
                            }
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition-all ${
                          editType === t
                            ? t === 'expense'
                              ? 'bg-red-600 text-white shadow-2xs'
                              : t === 'income'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Transfer Antar Dompet'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nominal Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nominal (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editAmountStr ? parseInt(editAmountStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-base text-slate-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                {/* Wallets Selectors */}
                {editType === 'transfer' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Dompet</label>
                      <select
                        value={editSourceWalletId}
                        onChange={e => setEditSourceWalletId(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Ke Dompet</label>
                      <select
                        value={editDestWalletId}
                        onChange={e => setEditDestWalletId(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {editType === 'expense' ? 'Dari Dompet' : 'Ke Dompet'}
                    </label>
                    <select
                      value={editType === 'expense' ? editSourceWalletId : editDestWalletId}
                      onChange={e => {
                        if (editType === 'expense') setEditSourceWalletId(e.target.value);
                        else setEditDestWalletId(e.target.value);
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category & Label (Dibedakan tegas per Tipe Transaksi) */}
                {editType !== 'transfer' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Kategori {editType === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </label>
                      <select
                        value={editCategoryName}
                        onChange={e => {
                          setEditCategoryName(e.target.value);
                          const c = categories.find(cat => cat.name === e.target.value);
                          if (c) setEditCategoryId(c.id);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                      >
                        {categories
                          .filter(c => c.type === editType)
                          .map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Label (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Sarapan, AI, Reina"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* Form Khusus Transfer Antar Dompet */
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Tipe Mutasi</label>
                      <div className="p-2 bg-blue-50 text-blue-800 rounded-xl font-bold border border-blue-200 text-xs">
                        Transfer Antar Dompet
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Biaya Admin (Opsional)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0 (Gratis)"
                        value={editFeeStr ? parseInt(editFeeStr, 10).toLocaleString('id-ID') : ''}
                        onChange={e => setEditFeeStr(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl tabular-nums font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                {/* Description Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Keterangan / Deskripsi</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                {/* Pilihan Milik Household & Dicatat Oleh */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Milik Household</label>
                    <select
                      value={editHouseholdId}
                      onChange={e => setEditHouseholdId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                    >
                      {households.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Dicatat Oleh / Milik Anggota</label>
                    <div className="space-y-1">
                      <select
                        value={availableMemberNames.includes(editAddedBy) ? editAddedBy : '__custom__'}
                        onChange={e => {
                          if (e.target.value !== '__custom__') {
                            setEditAddedBy(e.target.value);
                          }
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                      >
                        {availableMemberNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="__custom__">Nama Lain (Ketik Manual)...</option>
                      </select>

                      {(!availableMemberNames.includes(editAddedBy) || editAddedBy === '') && (
                        <input
                          type="text"
                          value={editAddedBy}
                          onChange={e => setEditAddedBy(e.target.value)}
                          placeholder="Ketik nama anggota"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-white font-bold bg-teal-700 hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Void Confirmation Dialog */}
      {voidConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Batalkan Transaksi?</h3>
                <p className="text-xs text-slate-500">
                  Saldo dompet terkait akan disesuaikan secara otomatis melalui pembalikan ledger.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVoidConfirmId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => handleConfirmVoid(voidConfirmId)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
