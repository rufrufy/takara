import {jakartaDateTime,jakartaDateTimeToISO} from '../lib/dateTime';
import {uploadReceiptPhoto} from '../lib/attachments';
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType } from '../types';
import {
  X,
  ScanLine,
  Camera,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  Receipt,
  RotateCcw,
  Tag as TagIcon
} from 'lucide-react';
import { scanReceiptWithAI } from '../lib/aiScanner';

interface AIScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AIScanModal: React.FC<AIScanModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { wallets, categories, labels, addTransaction, addLabel, state } = useApp();

  const [previewImage, setPreviewImage] = useState<string>('');
  const [receiptReference,setReceiptReference] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hasil Analisis AI
  const [amount, setAmount] = useState<number>(0);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(()=>jakartaDateTime().date);
  const [transactionTime,setTransactionTime] = useState(()=>jakartaDateTime().time);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [labelSaving, setLabelSaving] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    if(isScanning)return;
    setSelectedCategoryId('');setSelectedCategoryName('');
    setReceiptReference('');
    setIsScanning(true);
    setHasScanned(false);

    try {
      // Baca DataURL
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const dataUrl = await dataUrlPromise;
      setPreviewImage(dataUrl);

      const reference=await uploadReceiptPhoto(file,state.activeHouseholdId,state.currentUser);
      setReceiptReference(reference);
      // Jalankan AI Scan
      const categoryNames = categories.filter(c => c.type === transactionType).map(c => c.name);
      const aiResult = await scanReceiptWithAI(dataUrl, state.aiConfig, categoryNames);

      if (aiResult.success && aiResult.data) {
        const d = aiResult.data;
        setAmount(d.amount);
        setAmountStr(d.amount > 0 ? String(d.amount) : '');
        setDescription(d.description || 'Belanja Nota');
        setTransactionType(d.type || 'expense');
        if (d.date) {
          const ymd=d.date.match(/^(\d{4})-(\d{2})-(\d{2})/),dmy=d.date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if(ymd)setTransactionDate(ymd[0]);else if(dmy)setTransactionDate(dmy[3]+'-'+dmy[2]!.padStart(2,'0')+'-'+dmy[1]!.padStart(2,'0'));
        }

        // Cocokkan kategori
        if (d.categoryName) {
          const catSearch = d.categoryName.toLowerCase();
          const matched = categories.filter(c=>c.type===(d.type==='income'?'income':'expense')).find(c => {
            const cName = c.name.toLowerCase();
            return cName === catSearch || cName.includes(catSearch) || catSearch.includes(cName);
          });
          if (matched) {
            setSelectedCategoryId(matched.id);
            setSelectedCategoryName(matched.name);
          } else {
            setSelectedCategoryId('');
            setSelectedCategoryName(d.categoryName);
          }
        }
        setHasScanned(true);
      } else {
        setErrorMsg(aiResult.error || 'AI belum berhasil membaca nominal struk. Anda dapat mengisi nominal manual.');
        setHasScanned(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses foto struk';
      setErrorMsg(msg);
      setHasScanned(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setPreviewImage('');
    setReceiptReference('');
    setHasScanned(false);
    setAmount(0);
    setAmountStr('');
    setDescription('');
    setSelectedCategoryId('');
    setSelectedCategoryName('');
    setSelectedLabel('');
    setIsLabelPickerOpen(false);
    setNewLabelText('');
    setErrorMsg('');
  };

  const handleCreateLabel = async () => {
    const clean = newLabelText.trim().replace(/^#/, '');
    if (!clean || labelSaving) return;
    setLabelSaving(true);
    setErrorMsg('');
    try {
      const result = await addLabel(clean);
      if (!result.success) {
        setErrorMsg(result.error || 'Label belum tersimpan.');
        return;
      }
      setSelectedLabel(clean);
      setNewLabelText('');
      setIsLabelPickerOpen(false);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Label belum tersimpan.');
    } finally {
      setLabelSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || amount;
    if (finalAmount <= 0) {
      setErrorMsg('Nominal transaksi harus lebih dari 0.');
      return;
    }
    if (!selectedWalletId) {
      setErrorMsg('Pilih dompet sumber pembayaran.');
      return;
    }

    if(previewImage && !receiptReference){setErrorMsg('Foto belum tersimpan di Supabase. Unggah ulang sebelum menyimpan transaksi.');return;}
    const pickedWallet = wallets.find(w => w.id === selectedWalletId);

    let safeEffectiveAt:string;
    try{safeEffectiveAt=jakartaDateTimeToISO(transactionDate,transactionTime);}catch(error){setErrorMsg((error as Error).message);return;}
    const safeDateStr=transactionDate;

    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const res = await addTransaction({
      type: transactionType,
      amount: finalAmount,
      sourceWalletId: transactionType === 'expense' ? selectedWalletId : undefined,
      destinationWalletId: transactionType === 'income' ? selectedWalletId : undefined,
      sourceAsset: transactionType === 'expense' ? pickedWallet?.name : undefined,
      destinationAsset: transactionType === 'income' ? pickedWallet?.name : undefined,
      categoryId: selectedCategoryId || undefined,
      categoryName: selectedCategoryName || (transactionType === 'income' ? 'Pemasukan Lainnya' : 'Belanja'),
      label: selectedLabel.trim().replace(/^#/, '') || undefined,
      description: description.trim() || 'Belanja Struk AI',
      imageUrl: receiptReference || undefined,
      addedBy: state.currentUser.displayName || 'Maruf H',
      effectiveAt: safeEffectiveAt,
      dateStr: safeDateStr
    });
    savingRef.current = false;
    setSaving(false);

    if (res.success) {
      handleReset();
      onClose();
      onSaved?.();
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan transaksi');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#073B4C]/45 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#FFFDF5] rounded-t-3xl sm:rounded-3xl border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C] overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between bg-[#FFD166]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center text-[#073B4C]">
              <ScanLine className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#073B4C]">Scan Nota AI Vision</h2>
              <p className="text-[11px] font-bold text-[#365664]">Foto struk/nota, AI otomatis membaca nominal & tanggal</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => { handleReset(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#073B4C] hover:bg-[#FFE0E5] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-[#FFE0E5] text-[#911D35] rounded-2xl text-xs font-extrabold border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Area / Image Preview */}
          {!previewImage ? (
            <div className="p-6 border-2 border-dashed border-[#073B4C] rounded-3xl bg-white text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#D1FAE5] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#073B4C] flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#073B4C] block">Pilih Sumber Foto Struk / Nota</span>
                <span className="text-xs font-bold text-[#365664] max-w-xs block mx-auto mt-0.5">
                  Bisa foto langsung dari kamera HP atau pilih dari galeri foto
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Opsi 1: Kamera HP */}
                <label className="nb-btn cursor-pointer py-3 px-3 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] rounded-2xl text-xs font-extrabold flex flex-col items-center justify-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Opsi 2: Galeri HP (Tanpa capture) */}
                <label className="nb-btn cursor-pointer py-3 px-3 bg-white hover:bg-[#FFFBEB] text-[#073B4C] rounded-2xl text-xs font-extrabold flex flex-col items-center justify-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#073B4C]" />
                  <span>Pilih dari Galeri</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#073B4C] bg-[#F7F4E8] max-h-56 flex items-center justify-center">
                <img src={previewImage} alt="Preview Struk" className="object-contain max-h-56 w-full" />
                {isScanning && (
                  <div className="absolute inset-0 bg-[#073B4C]/80 flex flex-col items-center justify-center text-white p-4">
                    <Loader2 className="w-8 h-8 text-[#06D6A0] animate-spin mb-2" />
                    <span className="text-xs font-extrabold">AI Sedang Menganalisis Struk...</span>
                    <span className="text-[10px] font-bold text-[#FEF3C7] mt-0.5">Mengekstrak total harga & tanggal</span>
                  </div>
                )}
                {!isScanning && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="nb-chip absolute top-2 right-2 px-2.5 py-1 bg-white text-[#073B4C] hover:bg-[#FFD166] text-xs font-extrabold flex items-center gap-1"
                    title="Ganti Foto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form Hasil Scan */}
          {hasScanned && (
            <form onSubmit={handleSave} className="space-y-3 pt-2 border-t-2 border-dashed border-[#073B4C]/20 animate-in fade-in">
              <div className="p-3.5 bg-white border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#073B4C]">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#073B4C]" />
                    <span>Hasil Deteksi Nota</span>
                  </div>
                  <span className="text-[11px] text-[#365664] font-bold">Dapat diedit jika perlu</span>
                </div>

                {/* Nominal Input */}
                <div>
                  <label className="block text-[11px] font-extrabold text-[#073B4C] uppercase mb-1">
                    Total Nominal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#365664] font-extrabold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountStr ? parseInt(amountStr, 10).toLocaleString('id-ID') : (amount > 0 ? amount.toLocaleString('id-ID') : '')}
                      onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2.5 bg-[#FFFDF5] border-2 border-[#073B4C] rounded-xl text-lg font-extrabold text-[#073B4C] focus:outline-none tabular-nums"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-extrabold text-[#073B4C]">Tanggal<input type="date" required disabled={saving} value={transactionDate} onInput={e=>setTransactionDate(e.currentTarget.value)} onChange={e=>setTransactionDate(e.target.value)} className="mt-1 w-full rounded-xl bg-[#FFFDF5] border-2 border-[#073B4C] p-2.5 text-sm font-bold text-[#073B4C]" /></label>
                  <label className="text-xs font-extrabold text-[#073B4C]">Jam (WIB)<input type="time" required disabled={saving} value={transactionTime} onInput={e=>setTransactionTime(e.currentTarget.value)} onChange={e=>setTransactionTime(e.target.value)} className="mt-1 w-full rounded-xl bg-[#FFFDF5] border-2 border-[#073B4C] p-2.5 text-sm font-bold text-[#073B4C]" /></label>
                </div>
                {/* Deskripsi Toko / Nota */}
                <div>
                  <label className="block text-[11px] font-extrabold text-[#073B4C] mb-1">
                    Keterangan Toko / Barang
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Contoh: Indomaret, Supermarket, dll."
                    className="w-full px-3 py-2.5 bg-[#FFFDF5] border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] focus:outline-none"
                  />
                </div>

                {/* Dompet & Lampiran */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#073B4C] mb-1">
                      Bayar Pakai Dompet
                    </label>
                    <select
                      value={selectedWalletId}
                      onChange={e => setSelectedWalletId(e.target.value)}
                      className="w-full p-2.5 bg-[#FFFDF5] border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] focus:outline-none"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} (Rp {w.balance.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="self-center text-xs font-bold text-[#365664]">{receiptReference?'Lampiran tersimpan di Supabase.':'Lampiran belum tersimpan.'}</p>
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-[11px] font-extrabold text-[#073B4C] mb-1">
                    Kategori {transactionType==='income'?'Pemasukan':'Pengeluaran'}
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={e => {
                      setSelectedCategoryId(e.target.value);
                      const cat = categories.find(c => c.id === e.target.value);
                      if (cat) setSelectedCategoryName(cat.name);
                    }}
                    className="w-full p-2.5 bg-[#FFFDF5] border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] focus:outline-none"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.filter(c => c.type === (transactionType === 'income' ? 'income' : 'expense')).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Label (Opsional) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Label (Opsional)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLabelPickerOpen(v => !v)}
                      className={`flex-1 px-3 py-2 rounded-xl border-2 border-[#073B4C] text-xs font-extrabold flex items-center justify-between gap-2 transition-colors ${
                        selectedLabel
                          ? 'bg-[#D1FAE5] text-[#073B4C] shadow-[2px_2px_0_#073B4C]'
                          : 'bg-white hover:bg-[#FFFBEB] text-[#073B4C]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <TagIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {selectedLabel ? `#${selectedLabel}` : '+ Pilih / Tambah Label'}
                        </span>
                      </span>
                      <span className="text-[11px] shrink-0">{isLabelPickerOpen ? '▲' : '▾'}</span>
                    </button>
                    {selectedLabel && (
                      <button
                        type="button"
                        onClick={() => setSelectedLabel('')}
                        aria-label="Hapus label terpilih"
                        className="px-2.5 py-2 rounded-xl border-2 border-[#073B4C] bg-[#FFE0E5] text-[#911D35] text-xs font-extrabold shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isLabelPickerOpen && (
                    <div className="mt-2 p-3 rounded-2xl border-2 border-[#073B4C] bg-white shadow-[3px_3px_0_#073B4C] space-y-2.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Buat label baru..."
                          value={newLabelText}
                          onChange={e => setNewLabelText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleCreateLabel();
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-[#FFFDF5] border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={labelSaving || !newLabelText.trim()}
                          onClick={() => void handleCreateLabel()}
                          className="px-3 py-1.5 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] font-extrabold text-xs rounded-xl shrink-0 disabled:opacity-50"
                        >
                          {labelSaving ? 'Menyimpan…' : 'Tambah'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLabel('');
                            setIsLabelPickerOpen(false);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border-[1.5px] border-[#073B4C] ${
                            !selectedLabel ? 'bg-[#073B4C] text-white' : 'bg-[#F7F4E8] text-[#073B4C]'
                          }`}
                        >
                          (Tanpa Label)
                        </button>
                        {labels.map(lbl => {
                          const active = selectedLabel === lbl;
                          return (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => {
                                setSelectedLabel(lbl);
                                setIsLabelPickerOpen(false);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border-[1.5px] border-[#073B4C] transition-all ${
                                active
                                  ? 'bg-[#FFD166] text-[#073B4C] shadow-[2px_2px_0_#073B4C]'
                                  : 'bg-white text-[#073B4C] hover:bg-[#FFFBEB]'
                              }`}
                            >
                              #{lbl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit" disabled={saving}
                className="nb-btn w-full py-3 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] font-extrabold text-xs flex items-center justify-center gap-1.5"
              >
                {saving?<Loader2 className="w-4 h-4 animate-spin" />:<Check className="w-4 h-4 stroke-[2.5]" />}
                <span role={saving?'status':undefined}>{saving?'Menyimpan ke Supabase…':'Simpan Transaksi Struk Ini'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
