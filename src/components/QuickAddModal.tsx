import {CategoryAppearancePicker} from './CategoryAppearancePicker';
import {jakartaDateTime,jakartaDateTimeToISO} from '../lib/dateTime';
import {selectTransactionCategory} from '../lib/categorySelection';
import {uploadReceiptPhoto} from '../lib/attachments';
import {ReceiptAttachment} from './ReceiptAttachment';
import React, { useState, useEffect, useRef } from 'react';
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
  Calculator,
  RotateCcw,
  Mic
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { MagicInputBar } from './MagicInputBar';
import { formatIDR } from '../lib/money';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, initialType }) => {
  const { wallets, categories, labels, transactions, categoryBudgets, addTransaction, addCategory, addLabel, state } = useApp();
  const [showMagicInput, setShowMagicInput] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [amountFocused, setAmountFocused] = useState(false);
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id || '');
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [description, setDescription] = useState('');
  const [feeStr, setFeeStr] = useState('');
  const [transactionDate,setTransactionDate] = useState(()=>jakartaDateTime().date);
  const [transactionTime,setTransactionTime] = useState(()=>jakartaDateTime().time);
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
  const [newCatColor,setNewCatColor]=useState('#06D6A0');
  const [newCatIcon,setNewCatIcon]=useState('ShoppingCart');
  // Label creator in picker
  const [newLabelText, setNewLabelText] = useState('');

  // Kalkulator / Numpad Keypad State (Default aktif)
  const [showKeypad, setShowKeypad] = useState(true);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const keyboardActionRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardActionRef.current(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Inisialisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const targetType = initialType || 'expense';
      setType(targetType);
      setAmountStr('');
      setDescription('');
      setSelectedLabel('');
      setFeeStr('');
      const dateTime=jakartaDateTime();setTransactionDate(dateTime.date);setTransactionTime(dateTime.time);
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
  }, [isOpen, initialType, state.activeHouseholdId]);

  useEffect(()=>{
    if(!isOpen)return;
    const selected=selectTransactionCategory(categories,state.activeHouseholdId,type,categoryId);
    setCategoryId(selected?.id||'');setCategoryName(selected?.name||'');
  },[isOpen,type,categories,state.activeHouseholdId,categoryId]);
  const changeType=(next:TransactionType)=>{
    setType(next);setErrorMsg('');setCategorySearch('');setIsCreatingCategory(false);
    const selected=selectTransactionCategory(categories,state.activeHouseholdId,next,categoryId);
    setCategoryId(selected?.id||'');setCategoryName(selected?.name||'');
  };
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const [attachmentUploading,setAttachmentUploading] = useState(false);

  keyboardActionRef.current = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isLabelPickerOpen) {
        setIsLabelPickerOpen(false);
        return;
      }
      if (isCategoryPickerOpen) {
        setIsCategoryPickerOpen(false);
        return;
      }
      if (isWalletPickerOpen) {
        setIsWalletPickerOpen(false);
        return;
      }
      onClose();
      return;
    }

    if (isLabelPickerOpen || isCategoryPickerOpen || isWalletPickerOpen) return;

    const active = document.activeElement as HTMLElement | null;
    const isEditable =
      !!active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable);

    if (isEditable) return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      handleKeypadPress(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleKeypadPress('backspace');
    } else if (e.key === 'Delete') {
      e.preventDefault();
      handleKeypadPress('clear');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void executeSave(false);
    }
  };

  if (!isOpen) return null;

  const resetForm=()=>{
    const nextType=initialType||'expense';
    const dateTime=jakartaDateTime();setTransactionDate(dateTime.date);setTransactionTime(dateTime.time);
    setType(nextType);setAmountStr('');setFeeStr('');setDescription('');setSelectedLabel('');setReceiptImage('');
    setSourceWalletId(wallets[0]?.id||'');setDestinationWalletId(wallets[1]?.id||wallets[0]?.id||'');
    const selected=selectTransactionCategory(categories,state.activeHouseholdId,nextType);
    setCategoryId(selected?.id||'');setCategoryName(selected?.name||'');
    setCategorySearch('');setNewCatName('');setNewLabelText('');setIsCreatingCategory(false);
    setIsCategoryPickerOpen(false);setIsWalletPickerOpen(false);setIsLabelPickerOpen(false);
    setErrorMsg('');setSuccessToast('Form dikosongkan.');setShowKeypad(true);
  };

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
  const selectedCategory = categories.find(c => c.id === categoryId && c.type === type && c.householdId === state.activeHouseholdId);

  // Keypad Calculator Handler
  const handleKeypadPress = (val: string) => {
    if (saving || attachmentUploading) return;
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
      if (prev.length >= 12) return prev;
      if (!prev || prev === '0') return val;
      return prev + val;
    });
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (saving || attachmentUploading) return;
    setAmountStr(String(Math.min(current + addValue, 999999999999)));
  };

  // Lampiran Struk Handler (Murni membaca file gambar)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0];if(!file||attachmentUploading)return;
    setAttachmentUploading(true);setErrorMsg('');
    try { const reference=await uploadReceiptPhoto(file,state.activeHouseholdId,state.currentUser);setReceiptImage(reference); }
    catch(error){setErrorMsg(error instanceof Error?error.message:'Unggah lampiran gagal.');}
    finally{setAttachmentUploading(false);e.target.value='';}
  };

  // Simpan Transaksi Core Function
  const executeSave = async (isAddMore: boolean) => {
    if(attachmentUploading){setErrorMsg('Tunggu lampiran selesai diunggah.');return;}
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
      if (!selectedCategory) {
        setErrorMsg('Silakan pilih salah satu kategori.');
        return false;
      }
    }

    let effectiveAt:string;
    try{effectiveAt=jakartaDateTimeToISO(transactionDate,transactionTime);}catch(error){setErrorMsg((error as Error).message);return;}
    const incomeWalletId = destinationWalletId || sourceWalletId;
    const incomeWallet = wallets.find(w => w.id === incomeWalletId) || selectedDestWallet;

    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    let res;
    try {res = await addTransaction({
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
      effectiveAt,
      dateStr:transactionDate
    });}catch(error){res={success:false,error:error instanceof Error?error.message:'Transaksi belum tersimpan. Coba lagi.'};}
    finally{savingRef.current=false;setSaving(false);}

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
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const result = await addCategory(
      newCatName.trim(),
      type === 'income' ? 'income' : 'expense',
      newCatIcon,
      newCatColor
    );
    if(!result.success||!result.category){setErrorMsg(result.error||'Kategori belum tersimpan.');return;}
    const created=result.category;
    setCategoryId(created.id);
    setCategoryName(created.name);
    setNewCatName('');
    setIsCreatingCategory(false);
    setIsCategoryPickerOpen(false);
  };

  // Buat Label Baru dari Picker
  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim()) return;
    const clean = newLabelText.trim().replace(/^#/, '');
    if(savingRef.current)return;
    savingRef.current=true;setSaving(true);
    try{
    const result=await addLabel(clean);
    if(!result.success){setErrorMsg(result.error||'Label belum tersimpan.');return;}
    setSelectedLabel(clean);
    setNewLabelText('');
    setIsLabelPickerOpen(false);
    }catch(error){setErrorMsg(error instanceof Error?error.message:'Label belum tersimpan.');}
    finally{savingRef.current=false;setSaving(false);}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#073B4C]/45 animate-in fade-in duration-150">
      <div
        data-transaction-type={type}
        className="entry-sheet w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[96vh] animate-in slide-in-from-bottom duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Tabs: Pengeluaran, Pemasukan, Transfer */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="entry-type-tabs grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl flex-1 min-w-0 mr-2">
            <button
              type="button"
              data-entry-type="expense"
              aria-pressed={type === 'expense'}
              onClick={() => {
                changeType('expense');
                setErrorMsg('');
              }}
              className={`entry-type-tab py-1.5 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-w-0 transition-all ${
                type === 'expense'
                  ? 'bg-teal-100 text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Pengeluaran</span>
            </button>

            <button
              type="button"
              data-entry-type="income"
              aria-pressed={type === 'income'}
              onClick={() => {
                changeType('income');
                setErrorMsg('');
              }}
              className={`entry-type-tab py-1.5 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-w-0 transition-all ${
                type === 'income'
                  ? 'bg-teal-100 text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Pemasukan</span>
            </button>

            <button
              type="button"
              data-entry-type="transfer"
              aria-pressed={type === 'transfer'}
              onClick={() => {
                changeType('transfer');
                setErrorMsg('');
              }}
              className={`entry-type-tab py-1.5 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-w-0 transition-all ${
                type === 'transfer'
                  ? 'bg-teal-100 text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Transfer</span>
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

          {showMagicInput && (
            <MagicInputBar
              mode="prefill"
              onApplyToForm={parsed => {
                setType(parsed.type);
                if (parsed.amount > 0) setAmountStr(String(parsed.amount));
                if (parsed.categoryId) setCategoryId(parsed.categoryId);
                if (parsed.categoryName) setCategoryName(parsed.categoryName);
                if (parsed.sourceWalletId) setSourceWalletId(parsed.sourceWalletId);
                if (parsed.destinationWalletId) setDestinationWalletId(parsed.destinationWalletId);
                if (parsed.label) setSelectedLabel(parsed.label);
                if (parsed.description) setDescription(parsed.description);
                setShowMagicInput(false);
              }}
            />
          )}

          {/* DISPLAY NOMINAL BESAR */}
          <div
            onClick={() => {
              setShowKeypad(true);
              amountInputRef.current?.focus();
            }}
            className="p-3.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer rounded-2xl border border-slate-200/90 transition-all text-center group"
          >
            <div className="flex items-center justify-between gap-1.5 text-[11px] font-semibold text-slate-500 mb-1 flex-wrap">
              <label htmlFor="modal-nominal-amount">Nominal ({type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Transfer'})</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMagicInput(v => !v);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#073B4C] bg-[#FFD166] px-2.5 py-0.5 text-[11px] font-extrabold text-[#073B4C]"
                >
                  <Mic className="w-3 h-3" />
                  <span>Ketik / Suara</span>
                </button>
                <button type="button" disabled={saving||attachmentUploading} onClick={e=>{e.stopPropagation();resetForm();}} aria-label="Reset semua input transaksi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-teal-700 hover:bg-teal-100 disabled:opacity-40"><RotateCcw className="w-3.5 h-3.5" />Reset</button>
              </div>
            </div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-xl font-extrabold text-[#365664] shrink-0">Rp</span>
              <input
                ref={amountInputRef}
                id="modal-nominal-amount"
                aria-label="Nominal transaksi"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                disabled={saving || attachmentUploading}
                placeholder="0"
                value={amountFocused ? amountStr : amountStr ? Number(amountStr).toLocaleString('id-ID') : ''}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void executeSave(false);
                  }
                }}
                onChange={e => {
                  setAmountStr(e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, 12));
                  setErrorMsg('');
                }}
                style={{
                  width: `${Math.max((amountFocused ? amountStr : Number(amountStr || 0).toLocaleString('id-ID')).length, 2)}ch`,
                  minWidth: '2ch'
                }}
                className="entry-amount-input font-extrabold tracking-tight tabular-nums"
              />
            </div>
          </div>

          <div className="entry-datetime">
            <label className="text-xs font-semibold text-slate-600">Tanggal<input type="date" required disabled={saving || attachmentUploading} value={transactionDate} onInput={e=>setTransactionDate(e.currentTarget.value)} onChange={e=>setTransactionDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-teal-600" /></label>
            <label className="text-xs font-semibold text-slate-600">Jam (WIB)<input type="time" required disabled={saving} value={transactionTime} onInput={e=>setTransactionTime(e.currentTarget.value)} onChange={e=>setTransactionTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-teal-600" /></label>
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
                        style={{ backgroundColor: selectedCategory.color || '#06D6A0' }}
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

          {/* Live Category Budget Status Indicator */}
          {type === 'expense' && categoryName && (() => {
            const bgt = categoryBudgets.find(
              b => (categoryId && b.categoryId === categoryId) || b.categoryName.toLowerCase() === categoryName.toLowerCase()
            );
            if (!bgt) return null;
            const monthPrefix = transactionDate.slice(0, 7);
            const spentSoFar = transactions
              .filter(
                t =>
                  t.type === 'expense' &&
                  t.status !== 'VOIDED' &&
                  jakartaDateTime(t.effectiveAt).date.startsWith(monthPrefix) &&
                  ((bgt.categoryId && t.categoryId === bgt.categoryId) ||
                    (t.categoryName || '').toLowerCase() === bgt.categoryName.toLowerCase())
              )
              .reduce((s, t) => s + t.amount, 0);
            const typedAmt = parseInt(amountStr || '0', 10) || 0;
            const projected = spentSoFar + typedAmt;
            const pct = bgt.monthlyLimit > 0 ? Math.round((projected / bgt.monthlyLimit) * 100) : 0;
            const isOver = projected > bgt.monthlyLimit;
            const isWarn = !isOver && pct >= bgt.alertThreshold;

            return (
              <div
                className={`px-3 py-2 rounded-2xl border-2 border-[#073B4C] text-[11px] font-extrabold flex items-center justify-between gap-2 ${
                  isOver ? 'bg-[#FFE0E5] text-[#911D35]' : isWarn ? 'bg-[#FEF3C7] text-[#784D05]' : 'bg-[#D1FAE5] text-[#064E3B]'
                }`}
              >
                <span>
                  {isOver ? 'Lewat pagu' : isWarn ? 'Mendekati pagu' : 'Pagu'} {bgt.categoryName}
                </span>
                <span className="tabular-nums">
                  {formatIDR(projected)} / {formatIDR(bgt.monthlyLimit)} ({pct}%)
                </span>
              </div>
            );
          })()}

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
                <span className="text-[10px] text-slate-400">{attachmentUploading ? 'Mengunggah ke Supabase…' : 'Gambar / PDF, maksimal 10 MB'}</span>
              </div>
            </div>

            {receiptImage ? (
              <div className="flex items-center gap-2">
                <ReceiptAttachment reference={receiptImage} className="w-8 h-8 rounded-lg object-cover border border-slate-300" />
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
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
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
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

        </div>

        {/* Simpan dan lanjut input melalui tombol plus. */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 flex gap-2 shrink-0 shadow-lg">
          {/* Tombol 1: + Lagi (Proporsi 1) */}
          <button
            type="button"
            id="btn-tambah-lagi"
            aria-label={saving ? 'Menyimpan transaksi' : 'Simpan dan tambah transaksi lagi'}
            disabled={saving || attachmentUploading}
            onClick={() => executeSave(true)}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1 border border-slate-200"
            title="Simpan transaksi dan langsung lanjut input lagi"
          >
            {saving ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
          </button>

          {/* Tombol 2: Catat (Proporsi 4) */}
          <button
            type="button"
            id="btn-catat-transaksi"
            disabled={saving}
            onClick={() => executeSave(false)}
            className={`flex-[4] py-3 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${
              type === 'expense'
                ? 'bg-teal-700 hover:bg-teal-800'
                : type === 'income'
                ? 'bg-teal-700 hover:bg-teal-800'
                : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {saving ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5 stroke-[2.5]" />}
            <span role={saving?'status':undefined}>{saving ? 'Menyimpan ke Supabase…' : attachmentUploading ? 'Mengunggah lampiran…' : 'Catat'}</span>
          </button>
        </div>

        {/* ========================================= */}
        {/* POP-UP MODAL 1: PICKER DOMPET             */}
        {/* ========================================= */}
        {isWalletPickerOpen && (
          <div className="entry-picker-backdrop" onClick={e=>{if(e.target===e.currentTarget)setIsWalletPickerOpen(false);}}>
            <div className="entry-picker p-4 space-y-3" role="dialog" aria-modal="true" aria-label="Pilih dompet">
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
                  aria-label="Tutup pilihan dompet"
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
          <div className="entry-picker-backdrop" onClick={e=>{if(e.target===e.currentTarget){setIsCategoryPickerOpen(false);setIsCreatingCategory(false);}}}>
            <div className="entry-picker p-4 space-y-3" role="dialog" aria-modal="true" aria-label="Pilih kategori">
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
                  aria-label="Tutup pilihan kategori"
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
                  <CategoryAppearancePicker icon={newCatIcon} color={newCatColor} onIcon={setNewCatIcon} onColor={setNewCatColor} />
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
                  const catColor = cat.color || '#06D6A0';
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
          <div className="absolute inset-0 z-50 bg-[#073B4C]/40 flex flex-col justify-end animate-in fade-in">
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
