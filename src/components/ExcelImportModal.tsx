import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { ExcelImportSummary } from '../types';
import { X, UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, ArrowRight } from 'lucide-react';
import { formatIDR } from '../lib/money';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose }) => {
  const { importExcelFile, resetToDefault, state } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [successSummary, setSuccessSummary] = useState<ExcelImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setErrorMsg('');
    setLoading(true);

    const res = await importExcelFile(file);
    setLoading(false);

    if (res.success && res.summary) {
      setSuccessSummary(res.summary);
    } else {
      setErrorMsg(res.error || 'Gagal membaca berkas Excel.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleResetData = () => {
    resetToDefault();
    setSuccessSummary(null);
    setErrorMsg('');
    onClose();
  };

  const latestImport = successSummary || (state.importHistory && state.importHistory[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Impor Berkas Excel Keuangan</h3>
              <p className="text-xs text-slate-500">Membaca ekspor transaksi (.xlsx)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />

            <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <div className="font-bold text-slate-800 text-sm">
              Klik atau tarik berkas Excel ke sini
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Mendukung format berkas <span className="font-mono text-emerald-700">Keuangan-Maruf-transactions-*.xlsx</span>
            </div>

            {loading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses dan memvalidasi transaksi...</span>
              </div>
            )}
          </div>

          {/* Quick Action: Reset to Preloaded Maruf Data */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-slate-800">
                Gunakan Data Bawaan (74 Transaksi)
              </div>
              <div className="text-[11px] text-slate-500">
                Muat ulang data Keuangan-Maruf-transactions-2026-11-10.xlsx
              </div>
            </div>
            <button
              onClick={handleResetData}
              className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Summary Report from Excel */}
          {latestImport && (
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-950 text-sm">
                    Status Rekonsiliasi Berkas Excel
                  </span>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-200/70 text-emerald-900 px-2.5 py-0.5 rounded-full">
                  Lulus Uji
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px]">Total Transaksi</div>
                  <div className="font-extrabold text-slate-900 text-base tabular-nums">
                    {latestImport.totalTransactions} Transaksi
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {latestImport.incomeCount} In • {latestImport.expenseCount} Out • {latestImport.transferCount} Transfer
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px]">Saldo Bersih (Net)</div>
                  <div className="font-extrabold text-emerald-700 text-base tabular-nums">
                    {formatIDR(latestImport.netBalance)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Periode Nov 2026
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px]">Total Pemasukan</div>
                  <div className="font-bold text-emerald-600 tabular-nums">
                    {formatIDR(latestImport.totalIncome)}
                  </div>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px]">Total Pengeluaran</div>
                  <div className="font-bold text-red-600 tabular-nums">
                    {formatIDR(latestImport.totalExpenses)}
                  </div>
                </div>
              </div>

              {/* Top Categories */}
              {latestImport.topCategories && latestImport.topCategories.length > 0 && (
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-emerald-950 mb-1.5">
                    Top Pengeluaran (Ringkasan Excel):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {latestImport.topCategories.map(cat => (
                      <span
                        key={cat.name}
                        className="bg-white/90 text-slate-700 border border-emerald-200/80 text-[11px] px-2 py-0.5 rounded-lg font-medium"
                      >
                        {cat.name}: <strong className="font-semibold text-slate-900">{cat.amountStr}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Close Action */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Lanjut ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
