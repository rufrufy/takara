import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatIDR } from '../lib/money';
import { CategoryIcon, categoryAppearance } from './CategoryIcon';
import type { FinancialTransaction } from '../types';
import { Plus, Trash2, X, ShieldCheck, AlertTriangle, Gauge } from 'lucide-react';

interface CategoryBudgetSectionProps {
  periodTransactions: FinancialTransaction[];
  periodLabel: string;
}

export const CategoryBudgetSection: React.FC<CategoryBudgetSectionProps> = ({
  periodTransactions,
  periodLabel
}) => {
  const { categories, categoryBudgets, upsertCategoryBudget, deleteCategoryBudget } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [threshold, setThreshold] = useState(80);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === 'expense' && !c.isArchived),
    [categories]
  );

  // Compute remaining days in month for daily safe-spend hint
  const remainingDays = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDay - now.getDate() + 1);
  }, []);

  const budgetRows = useMemo(() => {
    const expenses = periodTransactions.filter(t => t.type === 'expense' && t.status !== 'VOIDED');
    return categoryBudgets.map(b => {
      const cat = expenseCategories.find(
        c => (b.categoryId && c.id === b.categoryId) || c.name.toLowerCase() === b.categoryName.toLowerCase()
      );
      const spent = expenses
        .filter(
          t =>
            (b.categoryId && t.categoryId === b.categoryId) ||
            (t.categoryName || '').toLowerCase() === b.categoryName.toLowerCase()
        )
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
      const status: 'safe' | 'warn' | 'over' =
        pct >= 100 ? 'over' : pct >= b.alertThreshold ? 'warn' : 'safe';
      const remaining = b.monthlyLimit - spent;
      const safePerDay = remaining > 0 ? Math.floor(remaining / remainingDays) : 0;
      return {
        budget: b,
        cat,
        spent,
        pct,
        status,
        remaining,
        safePerDay
      };
    });
  }, [categoryBudgets, periodTransactions, expenseCategories, remainingDays]);

  const openModalFor = (catName = '', currentLimit = 0, currentThreshold = 80) => {
    setSelectedCatName(catName || expenseCategories[0]?.name || '');
    setLimitStr(currentLimit > 0 ? String(currentLimit) : '');
    setThreshold(currentThreshold || 80);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const limit = parseInt(limitStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (!selectedCatName.trim()) {
      setErrorMsg('Pilih kategori pengeluaran terlebih dahulu.');
      return;
    }
    if (limit <= 0) {
      setErrorMsg('Masukkan batas anggaran bulanan lebih dari Rp 0.');
      return;
    }
    const matchedCat = expenseCategories.find(
      c => c.name.toLowerCase() === selectedCatName.trim().toLowerCase()
    );
    setBusy(true);
    try {
      const res = await upsertCategoryBudget(selectedCatName.trim(), limit, matchedCat?.id, threshold);
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menyimpan pagu anggaran.');
        return;
      }
      setIsModalOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const totalBudgetLimit = budgetRows.reduce((s, r) => s + r.budget.monthlyLimit, 0);
  const totalBudgetSpent = budgetRows.reduce((s, r) => s + r.spent, 0);
  const totalPct = totalBudgetLimit > 0 ? Math.min(100, Math.round((totalBudgetSpent / totalBudgetLimit) * 100)) : 0;

  return (
    <div className="bg-white rounded-3xl border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-[#073B4C] text-base flex items-center gap-1.5">
            <Gauge className="w-4 h-4 shrink-0" />
            <span>Pagu Anggaran Kategori</span>
          </h2>
          <p className="text-xs font-semibold text-[#365664]">
            Pantauan batas belanja bulanan · {periodLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModalFor()}
          className="nb-btn bg-[#FFD166] text-[#073B4C] px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
          <span>Atur Pagu</span>
        </button>
      </div>

      {budgetRows.length > 0 && (
        <div className="saldo-mini-hero saldo-hero--butter p-3.5 rounded-2xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-[#073B4C]">
            <span>Total Terpakai di Pos Berpagu</span>
            <span className="tabular-nums">
              {formatIDR(totalBudgetSpent)} / {formatIDR(totalBudgetLimit)} ({totalPct}%)
            </span>
          </div>
          <div className="w-full h-3 bg-white border-2 border-[#073B4C] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${totalPct}%`,
                backgroundColor: totalPct >= 100 ? '#FF6B6B' : totalPct >= 80 ? '#FFD166' : '#06D6A0'
              }}
            />
          </div>
        </div>
      )}

      {budgetRows.length === 0 ? (
        <div className="p-6 rounded-2xl border-2 border-dashed border-[#073B4C]/40 bg-[#FFFDF5] text-center space-y-2.5">
          <p className="text-xs font-bold text-[#365664]">
            Belum ada batas anggaran bulanan. Pasang pagu pada pos seperti <strong>Makan</strong>, <strong>Jajan</strong>, atau <strong>Belanja</strong> agar tak kebobolan!
          </p>
          <button
            type="button"
            onClick={() => openModalFor()}
            className="nb-btn bg-[#06D6A0] text-[#073B4C] px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pasang Pagu Pertama</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetRows.map(({ budget, cat, spent, pct, status, remaining, safePerDay }) => {
            const barColor = status === 'over' ? '#FF6B6B' : status === 'warn' ? '#FFD166' : '#06D6A0';
            const badgeBg = status === 'over' ? 'bg-[#FFE0E5] text-[#911D35]' : status === 'warn' ? 'bg-[#FEF3C7] text-[#784D05]' : 'bg-[#D1FAE5] text-[#064E3B]';
            const badgeText = status === 'over' ? 'Lewat Pagu' : status === 'warn' ? 'Hampir Penuh' : 'Aman';

            return (
              <div
                key={budget.id}
                onClick={() => openModalFor(budget.categoryName, budget.monthlyLimit, budget.alertThreshold)}
                className="p-3.5 rounded-2xl border-2 border-[#073B4C] bg-white hover:bg-[#FFFDF5] transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={categoryAppearance(cat?.color)}
                      className="w-9 h-9 rounded-xl border-2 border-[#073B4C] grid place-items-center shrink-0"
                    >
                      <CategoryIcon name={budget.categoryName} type="expense" icon={cat?.icon} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs sm:text-sm text-[#073B4C] truncate">
                        {budget.categoryName}
                      </div>
                      <div className="text-[11px] font-bold text-[#365664] tabular-nums">
                        {formatIDR(spent)} dari {formatIDR(budget.monthlyLimit)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] ${badgeBg}`}>
                      {badgeText} · {pct}%
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        deleteCategoryBudget(budget.id);
                      }}
                      aria-label={`Hapus pagu ${budget.categoryName}`}
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 border border-[#073B4C]/40 grid place-items-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-3.5 bg-slate-100 border-2 border-[#073B4C] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold">
                  {remaining >= 0 ? (
                    <>
                      <span className="text-[#046C4E]">Sisa kuota: {formatIDR(remaining)}</span>
                      <span className="text-[#365664]">Aman ~{formatIDR(safePerDay)}/hari</span>
                    </>
                  ) : (
                    <span className="text-[#B42340] inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Melebihi batas pagu sebesar {formatIDR(Math.abs(remaining))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ATUR PAGU KATEGORI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#073B4C]/45 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C]">
            <div className="px-5 py-4 bg-[#FFD166] border-b-[2.5px] border-[#073B4C] flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#073B4C] flex items-center gap-1.5">
                <Gauge className="w-4 h-4 shrink-0" />
                <span>Setel Pagu Bulanan Kategori</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] grid place-items-center text-[#073B4C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-red-50 border-2 border-[#073B4C] text-red-800 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Kategori Pengeluaran</label>
                <select
                  value={selectedCatName}
                  onChange={e => setSelectedCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                >
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Batas Maksimal per Bulan (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={limitStr ? parseInt(limitStr, 10).toLocaleString('id-ID') : ''}
                  onChange={e => setLimitStr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1.500.000"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-sm font-extrabold tabular-nums"
                  required
                />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[500000, 1000000, 2000000, 3000000].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLimitStr(String(preset))}
                      className="py-1.5 rounded-xl bg-[#E0F2FE] hover:bg-[#38BDF8] border-[1.5px] border-[#073B4C] text-[11px] font-extrabold text-[#073B4C] tabular-nums"
                    >
                      {preset >= 1000000 ? `${preset / 1000000}jt` : `${preset / 1000}rb`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                  Peringatan Kuning Saat Mencapai ({threshold}%)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[70, 80, 90].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setThreshold(val)}
                      className={`py-2 rounded-xl border-2 border-[#073B4C] text-xs font-extrabold ${
                        threshold === val ? 'bg-[#FFD166] shadow-[2px_2px_0_#073B4C]' : 'bg-white'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-extrabold text-[#073B4C] bg-slate-100 border-2 border-[#073B4C] rounded-full"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="nb-btn px-5 py-2 text-xs bg-[#06D6A0] text-[#073B4C]"
                >
                  Simpan Pagu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
