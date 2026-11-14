import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType } from '../types';
import {
  X,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  AlertCircle,
  Plus,
  Tag as TagIcon,
  Search,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  Wallet as WalletIcon,
  FolderOpen,
  Delete,
  Calculator
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, initialType }) => {
  const { wallets, categories, labels, addTransaction, addCategory, addLabel, state } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id || '');
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [description, setDescription] = useState('');
  const [feeStr, setFeeStr] = useState('');
  const addedBy = state.currentUser.displayName || 'Maruf H';
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Lampiran Struk (Murni lampiran bukti tanpa auto-AI)
  const [receiptImage, setReceiptImage] = useState<string>('');

  // Sub-modal Pop-Up Pickers
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [walletPickerTarget, setWalletPickerTarget] = useState<'source' | 'destination'>('source');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);

  // Category search & creator in picker
  const [categorySearch, setCategorySearch] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const newCatColor = '#0F766E';
  const newCatIcon = 'ShoppingCart';
  // Label creator in picker
  const [newLabelText, setNewLabelText] = useState('');

  // Kalkulator / Numpad Keypad State (Default aktif)
  const [showKeypad, setShowKeypad] = useState(true);

  // Inisialisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const targetType = initialType || 'expense';
      setType(targetType);
      setAmountStr('');
      setDescription('');
      setSelectedLabel('');
      setFeeStr('');
      setReceiptImage('');
      setErrorMsg('');
      setSuccessToast('');
      setShowKeypad(true);

      if (wallets.length > 0) {
        setSourceWalletId(wallets[0]!.id);
        setDestinationWalletId(wallets[1]?.id || wallets[0]!.id);
      }

      // Set default category untuk tipe
      const defaultCats = categories.filter(c => c.type === targetType);
      if (defaultCats.length > 0) {
        setCategoryId(defaultCats[0]!.id);
        setCategoryName(defaultCats[0]!.name);
      } else {
        setCategoryId('');
        setCategoryName('');
      }
    }
  }, [isOpen, initialType, wallets, categories]);

  if (!isOpen) return null;

  // Filter kategori sesuai tipe & search
  const availableCategories = categories.filter(c => {
    if (c.type !== type) return false;
    if (categorySearch.trim()) {
      return c.name.toLowerCase().includes(categorySearch.toLowerCase());
    }
    return true;
  });

  const selectedSourceWallet = wallets.find(w => w.id === sourceWalletId) || wallets[0];
  const selectedDestWallet = wallets.find(w => w.id === destinationWalletId) || wallets[1] || wallets[0];
  const selectedCategory = categories.find(c => c.id === categoryId);

  // Keypad Calculator Handler
  const handleKeypadPress = (val: string) => {
    setErrorMsg('');
    if (val === 'clear') {
      setAmountStr('');
      return;
    }
    if (val === 'backspace') {
      setAmountStr(prev => prev.slice(0, -1));
      return;
    }
    if (val === '000') {
      setAmountStr(prev => {
        if (!prev || prev === '0') return prev;
        if (prev.length > 9) return prev;
        return prev + '000';
      });
      return;
    }

    // Angka 0-9
    setAmountStr(prev => {
      if (prev.length > 10) return prev;
      if (!prev || prev === '0') return val;
      return prev + val;
    });
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
    setAmountStr(String(current + addValue));
  };

  // Lampiran Struk Handler (Murni membaca file gambar)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Simpan Transaksi Core Function
  const executeSave = (isAddMore: boolean) => {
    setErrorMsg('');
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (amount <= 0) {
      setErrorMsg('Masukkan nominal transaksi yang valid.');
      return false;
    }

    const fee = feeStr ? parseInt(feeStr.replace(/[^0-9]/g, ''), 10) || 0 : 0;

    if (type === 'transfer') {
      if (!sourceWalletId || !destinationWalletId) {
        setErrorMsg('Pilih dompet asal dan tujuan.');
        return false;
      }
      if (sourceWalletId === destinationWalletId) {
        setErrorMsg('Dompet asal dan tujuan tidak boleh sama.');
        return false;
      }
    } else {
      if (!categoryId) {
        setErrorMsg('Silakan pilih salah satu kategori.');
        return false;
      }
    }

    const incomeWalletId = destinationWalletId || sourceWalletId;
    const incomeWallet = wallets.find(w => w.id === incomeWalletId) || selectedDestWallet;

    const res = addTransaction({
      type,
      amount,
      fee: fee > 0 ? fee : undefined,
      sourceWalletId: type === 'expense' || type === 'transfer' ? sourceWalletId : undefined,
      destinationWalletId: type === 'income' ? incomeWalletId : (type === 'transfer' ? destinationWalletId : undefined),
      sourceAsset: type === 'expense' || type === 'transfer' ? selectedSourceWallet?.name : undefined,
      destinationAsset: type === 'income' ? incomeWallet?.name : (type === 'transfer' ? selectedDestWallet?.name : undefined),
      categoryId: type === 'transfer' ? undefined : (categoryId || undefined),
      categoryName: type === 'transfer' ? 'Uncategorized' : (categoryName || undefined),
      label: selectedLabel.trim() || undefined,
      description: description.trim() || (type === 'transfer' ? 'Transfer Antar Dompet' : categoryName) || 'Transaksi',
      imageUrl: receiptImage || undefined,
      addedBy,
      effectiveAt: new Date().toISOString()
    });

    if (res.success) {
      if (isAddMore) {
        // Reset form nominal & deskripsi agar siap untuk input berikutnya
        setAmountStr('');
        setDescription('');
        setFeeStr('');
        setReceiptImage('');
        setSuccessToast('✓ Catatan tersimpan! Siap untuk input lagi.');
        setTimeout(() => setSuccessToast(''), 3000);
      } else {
        onClose();
      }
      return true;
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan transaksi.');
      return false;
    }
  };

  // Buat Kategori Baru dari Picker
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const created = addCategory(
      newCatName.trim(),
      type === 'income' ? 'income' : 'expense',
      newCatIcon,
      newCatColor
    );
    setCategoryId(created.id);
    setCategoryName(created.name);
    setNewCatName('');
    setIsCreatingCategory(false);
    setIsCategoryPickerOpen(false);
  };

  // Buat Label Baru dari Picker
  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim()) return;
    const clean = newLabelText.trim().replace(/^#/, '');
    addLabel(clean);
    setSelectedLabel(clean);
    setNewLabelText('');
    setIsLabelPickerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[96vh] animate-in slide-in-from-bottom duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Tabs: Pengeluaran, Pemasukan, Transfer */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full mr-2">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                type === 'expense'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Pengeluaran</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>

          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successToast && (
            <div id="quickadd-success-toast" className="flex items-center gap-2 p-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{successToast}</span>
            </div>
          )}

          {/* DISPLAY NOMINAL BESAR */}
          <div
            onClick={() => setShowKeypad(true)}
            className="p-3.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer rounded-2xl border border-slate-200/90 transition-all text-center group"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>Nominal ({type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Transfer'})</span>
              <span className="flex items-center gap-1 text-teal-700 font-bold">
                <Calculator className="w-3 h-3" />
                <span>Kalkulator Aktif</span>
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-lg font-bold text-slate-400">Rp</span>
              <span id="modal-nominal-amount" className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
                amountStr ? 'text-slate-900' : 'text-slate-300'
              }`}>
                {amountStr ? parseInt(amountStr, 10).toLocaleString('id-ID') : '0'}
              </span>
            </div>
          </div>

          {/* KEYPAD KALKULATOR NUMERIK TERPADU */}
          {showKeypad && (
            <div className="pt-1 select-none animate-in fade-in duration-100">
              {/* Shortcut Chips */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[10000, 20000, 50000, 100000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddAmount(val)}
                    className="py-1 px-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors tabular-nums active:scale-95 text-center"
                  >
                    +{val >= 1000 ? `${val / 1000}rb` : val}
                  </button>
                ))}
              </div>

              {/* Grid Tombol Kalkulator 4 x 3 */}
              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    data-key={num}
                    onClick={() => handleKeypadPress(num)}
                    className="h-11 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-base font-bold text-slate-800 flex items-center justify-center active:scale-95 transition-all shadow-2xs border border-slate-200/60"
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  data-key="000"
                  onClick={() => handleKeypadPress('000')}
                  className="h-11 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-xs font-extrabold text-slate-800 flex items-center justify-center active:scale-95 transition-all shadow-2xs border border-slate-200/60"
                >
                  000
                </button>

                <button
                  type="button"
                  data-key="0"
                  onClick={() => handleKeypadPress('0')}
                  className="h-11 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-base font-bold text-slate-800 flex items-center justify-center active:scale-95 transition-all shadow-2xs border border-slate-200/60"
                >
                  0
                </button>

                <button
                  type="button"
                  data-key="backspace"
                  onClick={() => handleKeypadPress('backspace')}
                  className="h-11 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-600 hover:text-red-600 flex items-center justify-center active:scale-95 transition-all shadow-2xs border border-slate-200/60"
                  title="Hapus Satu Digit"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TRIGGER SELECTOR POP-UP: DOMPET & KATEGORI (RINGKAS & TIDAK MEMENUHI LAYAR) */}
          {type === 'transfer' ? (
            /* Pop-Up Triggers untuk Transfer */
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setWalletPickerTarget('source');
                  setIsWalletPickerOpen(true);
                }}
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Dari Dompet</span>
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1 mt-0.5">
                    <WalletIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className="truncate">{selectedSourceWallet?.name}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs ml-1">▾</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWalletPickerTarget('destination');
                  setIsWalletPickerOpen(true);
                }}
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Ke Dompet</span>
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1 mt-0.5">
                    <WalletIcon className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="truncate">{selectedDestWallet?.name}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs ml-1">▾</span>
              </button>
            </div>
          ) : (
            /* Pop-Up Triggers untuk Pengeluaran / Pemasukan */
            <div className="grid grid-cols-2 gap-2">
              {/* Trigger Pop-Up Dompet */}
              <button
                type="button"
                onClick={() => {
                  setWalletPickerTarget(type === 'income' ? 'destination' : 'source');
                  setIsWalletPickerOpen(true);
                }}
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    {type === 'expense' ? 'Dari Dompet' : 'Ke Dompet'}
                  </span>
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5 mt-0.5">
                    <WalletIcon className={`w-3.5 h-3.5 shrink-0 ${type === 'income' ? 'text-emerald-700' : 'text-teal-700'}`} />
                    <span className="truncate">
                      {type === 'income' ? (selectedDestWallet?.name || selectedSourceWallet?.name) : selectedSourceWallet?.name}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs ml-1">▾</span>
              </button>

              {/* Trigger Pop-Up Kategori */}
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(true)}
                className={`p-2.5 rounded-2xl text-left transition-all flex items-center justify-between border ${
                  categoryId
                    ? 'bg-white border-slate-200 hover:bg-slate-50'
                    : 'bg-amber-50/70 border-amber-300 text-amber-900'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Kategori</span>
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5 mt-0.5">
                    {selectedCategory ? (
                      <div
                        className="w-4 h-4 rounded-md flex items-center justify-center text-white shrink-0 text-[10px]"
                        style={{ backgroundColor: selectedCategory.color || '#0F766E' }}
                      >
                        <CategoryIcon icon={selectedCategory.icon} name={selectedCategory.name} type={selectedCategory.type} className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{categoryName || 'Pilih Kategori'}</span>
                  </div>
                </div>
                <span className="text-slate-400 text-xs ml-1">▾</span>
              </button>
            </div>
          )}

          {/* Biaya Admin untuk Transfer (Opsional) */}
          {type === 'transfer' && (
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900">Biaya Admin (Rp)</span>
              <input
                type="text"
                inputMode="numeric"
                value={feeStr ? parseInt(feeStr, 10).toLocaleString('id-ID') : ''}
                onChange={e => setFeeStr(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0 (Gratis)"
                className="w-32 px-2.5 py-1 bg-white border border-blue-300 rounded-xl text-right font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
              />
            </div>
          )}

          {/* Keterangan & Label Row Ringkas */}
          <div className="flex gap-2">
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Keterangan transaksi (opsional)..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
            />

            <button
              type="button"
              onClick={() => setIsLabelPickerOpen(true)}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <TagIcon className="w-3 h-3 text-teal-700" />
              <span>{selectedLabel ? `#${selectedLabel}` : '+ Label'}</span>
            </button>
          </div>

          {/* Lampirkan Foto Struk (Murni Tanpa AI) */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Lampiran Struk (Opsional)</span>
                <span className="text-[10px] text-slate-400">Simpan bukti foto tanpa proses AI</span>
              </div>
            </div>

            {receiptImage ? (
              <div className="flex items-center gap-2">
                <img src={receiptImage} alt="Struk" className="w-8 h-8 rounded-lg object-cover border border-slate-300" />
                <button
                  type="button"
                  onClick={() => setReceiptImage('')}
                  className="p-1 rounded-md text-red-500 hover:bg-red-50 text-[11px] font-bold"
                  title="Hapus Lampiran"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {/* Opsi 1: Kamera HP */}
                <label className="cursor-pointer px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1 active:scale-95">
                  <Camera className="w-3.5 h-3.5 text-teal-700" />
                  <span>Kamera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {/* Opsi 2: Galeri HP (Tanpa capture) */}
                <label className="cursor-pointer px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1 active:scale-95">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-700" />
                  <span>Galeri</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM FIXED BAR: TOMBOL "+ LAGI" & "CATAT" DENGAN KOMPOSISI 1 : 4 */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 flex gap-2 shrink-0 shadow-lg">
          {/* Tombol 1: + Lagi (Proporsi 1) */}
          <button
            type="button"
            id="btn-tambah-lagi"
            onClick={() => executeSave(true)}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1 border border-slate-200"
            title="Simpan transaksi dan langsung lanjut input lagi"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-teal-700" />
            <span>+ Lagi</span>
          </button>

          {/* Tombol 2: Catat (Proporsi 4) */}
          <button
            type="button"
            id="btn-catat-transaksi"
            onClick={() => executeSave(false)}
            className={`flex-[4] py-3 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${
              type === 'expense'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                : type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Catat</span>
          </button>
        </div>

        {/* ========================================= */}
        {/* POP-UP MODAL 1: PICKER DOMPET             */}
        {/* ========================================= */}
        {isWalletPickerOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="bg-white rounded-t-3xl p-4 space-y-3 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <WalletIcon className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-900">
                    Pilih Dompet {walletPickerTarget === 'source' ? 'Asal' : 'Tujuan'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWalletPickerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {wallets.map(w => {
                  const isSelected = (type === 'income' ? (destinationWalletId || sourceWalletId) : (walletPickerTarget === 'source' ? sourceWalletId : destinationWalletId)) === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        if (type === 'income') {
                          setDestinationWalletId(w.id);
                        } else if (walletPickerTarget === 'source') {
                          setSourceWalletId(w.id);
                        } else {
                          setDestinationWalletId(w.id);
                        }
                        setIsWalletPickerOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{w.name}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                          Saldo: Rp {w.balance.toLocaleString('id-ID')}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* POP-UP MODAL 2: PICKER KATEGORI           */}
        {/* ========================================= */}
        {isCategoryPickerOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="bg-white rounded-t-3xl p-4 space-y-3 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-900">
                    Pilih Kategori {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryPickerOpen(false);
                    setIsCreatingCategory(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Tambah Kategori Baru di dalam Pop-up */}
              {isCreatingCategory ? (
                <form onSubmit={handleCreateCategory} className="p-3 bg-teal-50 border border-teal-200 rounded-2xl space-y-2.5 animate-in fade-in">
                  <div className="text-xs font-bold text-teal-950">+ Kategori Baru</div>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Nama kategori, contoh: Kopi, Bensin..."
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl"
                    >
                      Simpan & Pilih
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari kategori..."
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Baru</span>
                  </button>
                </div>
              )}

              {/* Grid Tiles Kategori di dalam Pop-up */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-0.5">
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
                        setIsCategoryPickerOpen(false);
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs text-[10px]"
                        style={{ backgroundColor: catColor }}
                      >
                        <CategoryIcon icon={cat.icon} name={cat.name} type={cat.type} bgColor={catColor} className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate flex-1 text-xs font-bold text-slate-800">
                        {cat.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* POP-UP MODAL 3: PICKER LABEL             */}
        {/* ========================================= */}
        {isLabelPickerOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="bg-white rounded-t-3xl p-4 space-y-3 max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <TagIcon className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-900">Pilih Label / Sub-Kategori</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLabelPickerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Tambah Label */}
              <form onSubmit={handleCreateLabel} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Buat label baru..."
                  value={newLabelText}
                  onChange={e => setNewLabelText(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl"
                >
                  Tambah
                </button>
              </form>

              {/* Chips Label */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLabel('');
                    setIsLabelPickerOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    !selectedLabel ? 'bg-slate-800 text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  (Tanpa Label)
                </button>
                {labels.map(lbl => {
                  const isSelected = selectedLabel === lbl;
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => {
                        setSelectedLabel(lbl);
                        setIsLabelPickerOpen(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-700 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
      </div>
    </div>
  );
};
