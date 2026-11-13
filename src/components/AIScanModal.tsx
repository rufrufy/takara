import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { TransactionType } from '../types';
import {
  X,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { scanReceiptWithAI } from '../lib/aiScanner';

interface AIScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AIScanModal: React.FC<AIScanModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { wallets, categories, addTransaction, state } = useApp();

  const [previewImage, setPreviewImage] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hasil Analisis AI
  const [amount, setAmount] = useState<number>(0);
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [hasScanned, setHasScanned] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
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

      // Jalankan AI Scan
      const categoryNames = categories.filter(c => c.type === 'expense').map(c => c.name);
      const aiResult = await scanReceiptWithAI(dataUrl, state.aiConfig, categoryNames);

      if (aiResult.success && aiResult.data) {
        const d = aiResult.data;
        setAmount(d.amount);
        setAmountStr(d.amount > 0 ? String(d.amount) : '');
        setDescription(d.description || 'Belanja Nota');
        setTransactionType(d.type || 'expense');
        if (d.date) setTransactionDate(d.date);

        // Cocokkan kategori
        if (d.categoryName) {
          const catSearch = d.categoryName.toLowerCase();
          const matched = categories.find(c => {
            const cName = c.name.toLowerCase();
            return cName === catSearch || cName.includes(catSearch) || catSearch.includes(cName);
          });
          if (matched) {
            setSelectedCategoryId(matched.id);
            setSelectedCategoryName(matched.name);
          } else {
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
    setHasScanned(false);
    setAmount(0);
    setAmountStr('');
    setDescription('');
    setSelectedCategoryId('');
    setSelectedCategoryName('');
    setErrorMsg('');
  };

  const handleSave = (e: React.FormEvent) => {
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

    const res = addTransaction({
      type: transactionType,
      amount: finalAmount,
      sourceWalletId: selectedWalletId,
      categoryId: selectedCategoryId || undefined,
      categoryName: selectedCategoryName || 'Belanja',
      description: description.trim() || 'Belanja Struk AI',
      imageUrl: previewImage || undefined,
      addedBy: state.currentUser.displayName || 'Maruf H',
      effectiveAt: transactionDate ? `${transactionDate}T12:00:00.000Z` : new Date().toISOString()
    });

    if (res.success) {
      handleReset();
      onClose();
      onSaved?.();
    } else {
      setErrorMsg(res.error || 'Gagal menyimpan transaksi');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-900 to-teal-800 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">Scan Nota AI Vision</h2>
              <p className="text-[11px] text-teal-200">Foto struk/nota, AI otomatis membaca nominal & tanggal</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => { handleReset(); onClose(); }}
            className="w-8 h-8 rounded-full bg-teal-950/40 text-teal-200 hover:text-white hover:bg-teal-950/60 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Area / Image Preview */}
          {!previewImage ? (
            <div className="p-6 border-2 border-dashed border-teal-300 rounded-3xl bg-teal-50/40 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-xs">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-bold text-teal-950 block">Pilih Sumber Foto Struk / Nota</span>
                <span className="text-xs text-slate-500 max-w-xs block mx-auto mt-0.5">
                  Bisa foto langsung dari kamera HP atau pilih dari galeri foto
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Opsi 1: Kamera HP */}
                <label className="cursor-pointer py-3 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
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
                <label className="cursor-pointer py-3 px-3 bg-white hover:bg-slate-50 border border-teal-300 text-teal-900 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all">
                  <ImageIcon className="w-4 h-4 text-teal-700" />
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
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-56 flex items-center justify-center">
                <img src={previewImage} alt="Preview Struk" className="object-contain max-h-56 w-full" />
                {isScanning && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                    <Loader2 className="w-8 h-8 text-teal-300 animate-spin mb-2" />
                    <span className="text-xs font-bold">AI Sedang Menganalisis Struk...</span>
                    <span className="text-[10px] text-teal-200 mt-0.5">Mengekstrak total harga & tanggal</span>
                  </div>
                )}
                {!isScanning && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 text-xs font-medium flex items-center gap-1 transition-colors"
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
            <form onSubmit={handleSave} className="space-y-3 pt-1 border-t border-slate-100 animate-in fade-in">
              <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-teal-700" />
                    <span>Hasil Deteksi Nota</span>
                  </div>
                  <span className="text-[11px] text-teal-700 font-semibold">Dapat diedit jika perlu</span>
                </div>

                {/* Nominal Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Total Nominal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountStr ? parseInt(amountStr, 10).toLocaleString('id-ID') : (amount > 0 ? amount.toLocaleString('id-ID') : '')}
                      onChange={e => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-teal-300 rounded-xl text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                      required
                    />
                  </div>
                </div>

                {/* Deskripsi Toko / Nota */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Keterangan Toko / Barang
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Contoh: Indomaret, Supermarket, dll."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                {/* Dompet & Tanggal */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Bayar Pakai Dompet
                    </label>
                    <select
                      value={selectedWalletId}
                      onChange={e => setSelectedWalletId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} (Rp {w.balance.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tanggal Struk
                    </label>
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={e => setTransactionDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={e => {
                      setSelectedCategoryId(e.target.value);
                      const cat = categories.find(c => c.id === e.target.value);
                      if (cat) setSelectedCategoryName(cat.name);
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Simpan Transaksi Struk Ini</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
