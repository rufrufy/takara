import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType, Category } from '../types';
import {
  X,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  AlertCircle,
  Plus,
  Tag as TagIcon,
  Sparkles,
  Search,
  CheckCircle2,
  Palette,
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
  Pencil
} from 'lucide-react';
import { CategoryIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from './CategoryIcon';
import { uploadReceiptPhoto } from '../lib/supabase';
import { scanReceiptWithAI } from '../lib/aiScanner';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, initialType }) => {
  const { wallets, categories, labels, members, addTransaction, addCategory, updateCategory, addLabel, state } = useApp();
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id || '');
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [description, setDescription] = useState('');
  const [feeStr, setFeeStr] = useState('');
  const [addedBy, setAddedBy] = useState(state.currentUser.displayName || 'Maruf H');
  const [errorMsg, setErrorMsg] = useState('');

  // Receipt Photo & AI Scanner state
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [receiptSuccessToast, setReceiptSuccessToast] = useState('');
  // Category Creator & Editor state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [selectedIconName, setSelectedIconName] = useState<string>('ShoppingCart');
  const [selectedColor, setSelectedColor] = useState<string>('#EA580C');
  const [iconGroupFilter, setIconGroupFilter] = useState<string>('Semua');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Synchronize type and reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetType = initialType || 'expense';
      setType(targetType);
      setCategoryId('');
      setCategoryName('');
      setErrorMsg('');
      setSelectedIconName(targetType === 'income' ? 'Briefcase' : 'ShoppingCart');
      setSelectedColor(targetType === 'income' ? '#059669' : '#EA580C');
      setIsAddingCategory(false);
      setEditingCategory(null);
      if (wallets.length > 0) {
        setSourceWalletId(wallets[0]!.id);
        setDestinationWalletId(wallets[0]!.id);
      }
    }
  }, [isOpen, initialType, wallets]);
  // Inline Label Creator state
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');

  if (!isOpen) return null;

  // Filter categories according to selected type and search
  const availableCategories = categories.filter(c => {
    if (c.type !== type) return false;
    if (categorySearchQuery.trim()) {
      return c.name.toLowerCase().includes(categorySearchQuery.toLowerCase());
    }
    return true;
  });

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
    setAmountStr(String(current + addValue));
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: newCatName.trim(),
        icon: selectedIconName,
        color: selectedColor
      });
      setCategoryName(newCatName.trim());
      setEditingCategory(null);
      setIsAddingCategory(false);
    } else {
      const created = addCategory(
        newCatName.trim(),
        type === 'income' ? 'income' : 'expense',
        selectedIconName,
        selectedColor
      );
      setCategoryId(created.id);
      setCategoryName(created.name);
      setNewCatName('');
      setIsAddingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setSelectedIconName(cat.icon || (cat.type === 'income' ? 'Briefcase' : 'Tag'));
    setSelectedColor(cat.color || '#0F766E');
    setIsAddingCategory(true);
  };
  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim()) return;

    const cleanLabel = newLabelText.trim();
    addLabel(cleanLabel);
    setSelectedLabel(cleanLabel);
    setNewLabelText('');
    setIsAddingLabel(false);
  };
  // Handle Receipt Image Selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setErrorMsg('');

    try {
      const res = await uploadReceiptPhoto(file, state.supabaseConfig);
      setReceiptPreviewUrl(res.url);

      // Auto trigger AI extraction for delightful UX
      handleTriggerAIScan(res.url);
    } catch {
      setErrorMsg('Gagal memproses gambar foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTriggerAIScan = async (imageUrlToScan: string) => {
    if (!imageUrlToScan) return;
    setIsScanningAI(true);
    setReceiptSuccessToast('');

    try {
      const categoryNames = categories.filter(c => c.type === 'expense').map(c => c.name);
      const aiResult = await scanReceiptWithAI(imageUrlToScan, state.aiConfig, categoryNames);

      if (aiResult.success && aiResult.data) {
        const d = aiResult.data;
        if (d.amount > 0) {
          setAmountStr(String(d.amount));
        }
        if (d.description) {
          setDescription(d.description);
        }
        if (d.type) {
          setType(d.type);
        }
        if (d.categoryName) {
          const catSearch = d.categoryName.toLowerCase();
          const matched = categories.find(c => {
            const cName = c.name.toLowerCase();
            return cName === catSearch || cName.includes(catSearch) || catSearch.includes(cName);
          });
          if (matched) {
            setCategoryId(matched.id);
            setCategoryName(matched.name);
          }
        }
        setReceiptSuccessToast(`✓ Form terisi otomatis dari AI: ${d.description} (Rp ${d.amount.toLocaleString('id-ID')})`);
        setTimeout(() => setReceiptSuccessToast(''), 5000);
      }
    } catch (e: unknown) {
      console.warn('AI Scan failed:', e);
    } finally {
      setIsScanningAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (amount <= 0) {
      setErrorMsg('Masukkan nominal yang valid.');
      return;
    }

    const fee = feeStr ? parseInt(feeStr.replace(/[^0-9]/g, ''), 10) || 0 : 0;

    if (type === 'transfer') {
      if (!sourceWalletId || !destinationWalletId) {
        setErrorMsg('Pilih dompet asal dan tujuan.');
        return;
      }
      if (sourceWalletId === destinationWalletId) {
        setErrorMsg('Dompet asal dan tujuan tidak boleh sama.');
        return;
      }
    } else {
      if (!categoryId) {
        setErrorMsg('Silakan pilih salah satu kategori di bawah.');
        return;
      }
    }

    const res = addTransaction({
      type,
      amount,
      fee: fee > 0 ? fee : undefined,
      sourceWalletId: type === 'expense' || type === 'transfer' ? sourceWalletId : undefined,
      destinationWalletId: type === 'income' ? destinationWalletId : (type === 'transfer' ? destinationWalletId : undefined),
      categoryId: categoryId || undefined,
      categoryName: categoryName || (type === 'transfer' ? 'Transfer' : undefined),
      label: selectedLabel.trim() || undefined,
      description: description.trim() || selectedLabel.trim() || undefined,
      imageUrl: receiptPreviewUrl || undefined,
      addedBy,
      effectiveAt: new Date().toISOString()
    });
    if (res.success) {
      // Reset form
      setAmountStr('');
      setDescription('');
      setSelectedLabel('');
      setCategoryId('');
      setCategoryName('');
      setFeeStr('');
      setReceiptPreviewUrl('');
      setReceiptSuccessToast('');
      setErrorMsg('');
      onClose();
      setErrorMsg(res.error || 'Terjadi kesalahan saat menyimpan transaksi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full mr-3">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryId('');
                setCategoryName('');
                setErrorMsg('');
                setSelectedIconName('ShoppingCart');
                setSelectedColor('#EA580C');
                setIsAddingCategory(false);
                setEditingCategory(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryId('');
                setCategoryName('');
                setErrorMsg('');
                setSelectedIconName('Briefcase');
                setSelectedColor('#059669');
                setIsAddingCategory(false);
                setEditingCategory(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pemasukan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountStr ? parseInt(amountStr, 10).toLocaleString('id-ID') : ''}
                onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xl sm:text-2xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white tabular-nums"
                autoFocus
              />
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[10000, 20000, 50000, 100000, 500000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors tabular-nums"
                >
                  +{val >= 1000 ? `${val / 1000}rb` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Transfer Source & Destination */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Dari Dompet (Sumber)
                </label>
                <select
                  value={sourceWalletId}
                  onChange={e => setSourceWalletId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Rp {w.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Ke Dompet (Tujuan)
                </label>
                <select
                  value={destinationWalletId}
                  onChange={e => setDestinationWalletId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id} disabled={w.id === sourceWalletId}>
                      {w.name} (Rp {w.balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Biaya Admin (Opsional, Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0 (Gratis biaya transfer)"
                  value={feeStr ? parseInt(feeStr, 10).toLocaleString('id-ID') : ''}
                  onChange={e => setFeeStr(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                />
                <p className="text-[11px] text-blue-700/80 mt-1">
                  💡 Transfer adalah perpindahan aset. Saldo berpindah tanpa mengubah total uang keluarga.
                </p>
              </div>
            </div>
          ) : (
            /* Expense / Income Wallet & Visual Category Selector (NO DROPDOWN) */
            <div className="space-y-3.5">
              {/* Wallet Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {type === 'expense' ? 'Dari Dompet (Sumber)' : 'Ke Dompet (Tujuan)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {wallets.map(w => {
                    const isSelected = (type === 'expense' ? sourceWalletId : destinationWalletId) === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          if (type === 'expense') setSourceWalletId(w.id);
                          else setDestinationWalletId(w.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/20 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 truncate">{w.name}</div>
                        <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                          Rp {w.balance.toLocaleString('id-ID')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VISUAL CATEGORY PICKER (Setiap Kategori Ada Gambarnya/Ikon) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">Pilih Kategori</span>
                    {categoryName && (
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/80">
                        {categoryName}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingCategory ? 'Tutup Form' : '+ Tambah Kategori'}</span>
                  </button>
                </div>

                {/* Inline Custom Category Creator Panel (Custom Nama, Icon, & Warna) */}
                {isAddingCategory && (
                  <div className="p-4 bg-gradient-to-b from-teal-50/80 to-slate-50 rounded-2xl border border-teal-200 shadow-2xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-950">
                        <Sparkles className="w-4 h-4 text-teal-700" />
                        <span>{editingCategory ? 'Ubah Ikon & Warna Kategori' : 'Buat Kategori Kustom Baru'}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">Ikon & background kustom</span>
                    </div>

                    {/* Category Name Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Kategori
                      </label>
                      <input
                        type="text"
                        placeholder={type === 'income' ? 'Contoh: Bonus, Freelance, Dividen...' : 'Contoh: Kopi, Bensin, Skincare...'}
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600"
                        autoFocus
                      />
                    </div>

                    {/* Live Preview Card */}
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all"
                          style={{ backgroundColor: selectedColor }}
                        >
                          <CategoryIcon icon={selectedIconName} bgColor={selectedColor} className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {newCatName.trim() || 'Nama Kategori'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {type === 'income' ? 'Pemasukan' : 'Pengeluaran'} • Ikon: <span className="font-semibold text-teal-800">{selectedIconName}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: selectedColor }}>
                        Preview
                      </span>
                    </div>

                    {/* Background Color Swatches (18 colors) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                          <Palette className="w-3.5 h-3.5 text-teal-700" />
                          <span>Pilih Warna Background Ikon (18 Warna)</span>
                        </label>
                        <span className="text-[10px] font-mono font-bold text-slate-500">{selectedColor}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 py-1">
                        {AVAILABLE_COLORS.map(c => {
                          const isColorSelected = selectedColor === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedColor(c)}
                              className={`w-7 h-7 rounded-xl shrink-0 transition-all flex items-center justify-center ${
                                isColorSelected ? 'scale-115 ring-2 ring-slate-900 ring-offset-2 shadow-sm' : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            >
                              {isColorSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Icon Shape Picker (45+ Icons grouped) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Pilih Bentuk Ikon (45+ Pilihan Bervariasi)
                        </label>
                        <span className="text-[10px] text-teal-700 font-bold">
                          {selectedIconName}
                        </span>
                      </div>

                      {/* Icon Group Filter Tabs */}
                      <div className="flex gap-1 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                        {['Semua', 'Makanan', 'Belanja', 'Rumah', 'Transport', 'Kesehatan', 'Hiburan', 'Keuangan'].map(grp => (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => setIconGroupFilter(grp)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-colors ${
                              iconGroupFilter === grp ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {grp}
                          </button>
                        ))}
                      </div>

                      {/* Icon Grid */}
                      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                        {(iconGroupFilter === 'Semua' ? AVAILABLE_ICONS : AVAILABLE_ICONS.filter(i => i.group === iconGroupFilter)).map(item => {
                          const isIconSelected = selectedIconName === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setSelectedIconName(item.name)}
                              title={`${item.label} (${item.group})`}
                              className={`h-11 rounded-xl flex flex-col items-center justify-center p-1 transition-all ${
                                isIconSelected
                                  ? 'bg-teal-50 border-2 border-teal-600 shadow-2xs scale-105'
                                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <CategoryIcon icon={item.name} bgColor={isIconSelected ? selectedColor : undefined} className="w-5 h-5" />
                              <span className="text-[8px] text-slate-500 truncate w-full text-center mt-0.5">{item.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-teal-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setEditingCategory(null);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={!newCatName.trim()}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingCategory ? 'Simpan Perubahan' : 'Simpan & Pilih Kategori'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Search / Filter Categories Bar */}
                {availableCategories.length > 8 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari kategori..."
                      value={categorySearchQuery}
                      onChange={e => setCategorySearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                )}

                {/* CATEGORIES TILES GRID (Visual Card Selector) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                  {/* Plus Add Category Card */}
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="p-2.5 rounded-xl border border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50/50 flex items-center gap-2 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 group-hover:bg-teal-200">
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-teal-900 leading-tight">+ Baru</div>
                      <div className="text-[10px] text-teal-600">Tambah Kategori</div>
                    </div>
                  </button>

                  {/* Render Visual Category Cards with Icons */}
                  {availableCategories.map(cat => {
                    const isSelected = categoryId === cat.id;
                    const catColor = cat.color || '#0F766E';

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setCategoryName(cat.name);
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Colored Icon Container */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs"
                            style={{ backgroundColor: catColor }}
                          >
                            <CategoryIcon icon={cat.icon} name={cat.name} type={cat.type} bgColor={catColor} className="w-4 h-4" />
                          </div>

                          <div className="truncate flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate" title={cat.name}>
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {cat.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCategory(cat);
                            }}
                            className="p-1 rounded-lg text-slate-300 hover:text-teal-700 hover:bg-slate-100 transition-colors"
                            title="Ubah ikon & warna kategori ini"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>

                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Category Customization Banner */}
                {categoryName && (
                  <div className="flex items-center justify-between px-1 pt-1 text-xs">
                    <span className="text-slate-500 text-[11px]">Kategori: <strong className="text-slate-900">{categoryName}</strong></span>
                    {availableCategories.find(c => c.id === categoryId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const c = availableCategories.find(c => c.id === categoryId);
                          if (c) handleStartEditCategory(c);
                        }}
                        className="text-teal-700 hover:underline font-bold text-[11px] flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Ubah Ikon & Background</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Label / Sub-Kategori Section */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <TagIcon className="w-3.5 h-3.5 text-teal-700" />
                    <span>Label / Sub-Kategori (Opsional)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingLabel(!isAddingLabel)}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAddingLabel ? 'Tutup' : '+ Buat Label Baru'}</span>
                  </button>
                </div>

                {/* Inline Label Creator Form */}
                {isAddingLabel && (
                  <div className="flex gap-1.5 p-1 bg-white border border-teal-200 rounded-xl">
                    <input
                      type="text"
                      placeholder="Contoh: Sarapan, Reina, AI, Vitamin, Galon..."
                      value={newLabelText}
                      onChange={e => setNewLabelText(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateLabel}
                      className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg"
                    >
                      Pilih & Simpan
                    </button>
                  </div>
                )}

                {/* Labels Chips Selector */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                  {labels.map(lbl => {
                    const isSelected = selectedLabel === lbl;
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setSelectedLabel(isSelected ? '' : lbl)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-teal-700 text-white font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        #{lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Photo Storage & AI Receipt Scanner Section */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Camera className="w-3.5 h-3.5 text-teal-700" />
                <span>Lampiran Foto Struk / Nota</span>
              </div>
              {receiptPreviewUrl && (
                <button
                  type="button"
                  onClick={() => handleTriggerAIScan(receiptPreviewUrl)}
                  disabled={isScanningAI}
                  className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  {isScanningAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
                  <span>{isScanningAI ? 'Membaca AI...' : 'Baca dengan AI'}</span>
                </button>
              )}
            </div>

            {receiptSuccessToast && (
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                <span>{receiptSuccessToast}</span>
              </div>
            )}

            {!receiptPreviewUrl ? (
              <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-xl cursor-pointer bg-white transition-colors group">
                <div className="flex items-center gap-2 text-slate-500 group-hover:text-teal-700 text-xs font-semibold">
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingPhoto ? 'Mengunggah...' : 'Pilih Foto Struk / Nota Belanja'}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Foto tersimpan di Supabase Cloud Storage & otomatis dibaca AI
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={receiptPreviewUrl}
                    alt="Struk Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Foto Struk Terlampir</div>
                    <div className="text-[10px] text-slate-500">Tersimpan ke database Supabase</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerAIScan(receiptPreviewUrl)}
                    disabled={isScanningAI}
                    className="px-2.5 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {isScanningAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-teal-700" />}
                    <span>{isScanningAI ? 'Membaca...' : 'Scan AI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReceiptPreviewUrl('')}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Hapus Foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
            {/* Tombol Baca Ulang AI tepat di bawah kotak lampiran */}
            {receiptPreviewUrl && (
              <button
                type="button"
                onClick={() => handleTriggerAIScan(receiptPreviewUrl)}
                disabled={isScanningAI}
                className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all"
              >
                {isScanningAI ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" /> : <Sparkles className="w-3.5 h-3.5 text-teal-700" />}
                <span>{isScanningAI ? 'AI sedang membaca ulang struk...' : 'Baca Ulang AI & Isi Form Otomatis'}</span>
              </button>
            )}
          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Keterangan / Rincian
            </label>
            <input
              type="text"
              placeholder={type === 'expense' ? 'Contoh: Ikan, Sayur, Makan siang' : 'Contoh: Gaji bulanan, Bonus'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
            />
          </div>

          {/* Added By (Family Member) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Dicatat Oleh
            </label>
            <div className="flex gap-2">
              {['Maruf H', 'Zakia Nurul Hanifa'].map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setAddedBy(name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    addedBy === name
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Tombol Baca Ulang AI sebelum Simpan */}
          {receiptPreviewUrl && (
            <button
              type="button"
              onClick={() => handleTriggerAIScan(receiptPreviewUrl)}
              disabled={isScanningAI}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              {isScanningAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              <span>{isScanningAI ? 'AI sedang memproses...' : 'Baca Ulang Nota dengan AI'}</span>
            </button>
          )}
          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all ${
                type === 'expense'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Simpan Catatan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
