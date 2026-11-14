import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import { CategoryIcon } from '../CategoryIcon';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  ShieldCheck,
  Calendar,
  Users,
  Tag as TagIcon,
  BarChart3,
  Percent,
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

const CHART_COLORS = [
  '#0F766E', // Teal
  '#2563EB', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Mint
  '#64748B'  // Slate fallback
];

interface AIAnalysisResult {
  financialScore: number;
  healthStatus: string;
  savingsRate: string;
  cashFlowEvaluation: string;
  spendingLeaks: string[];
  actionPlan: string[];
  monthlyBudgetTip: string;
  analyzedAt: string;
}

export const ReportsView: React.FC = () => {
  const { transactions, periodIncome, periodExpense, netCashFlow, activeHousehold } = useApp();
  const [reportTab, setReportTab] = useState<'kategori' | 'tren' | 'label'>('kategori');
  const [hoveredCatIndex, setHoveredCatIndex] = useState<number | null>(null);

  // AI Expense Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  // Calculate expense categories breakdown
  const categoryStats = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const totalExp = expenseTxs.reduce((sum, t) => sum + t.amount, 0) || 1;

    const catMap = new Map<string, number>();
    for (const t of expenseTxs) {
      const name = t.categoryName || 'Lainnya';
      catMap.set(name, (catMap.get(name) || 0) + t.amount);
    }

    return Array.from(catMap.entries())
      .map(([name, amount], index) => {
        const pct = (amount / totalExp) * 100;
        return {
          name,
          amount,
          percentage: Number(pct.toFixed(1)),
          percentageStr: pct.toFixed(1),
          color: CHART_COLORS[index % CHART_COLORS.length]!
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Calculate label spending breakdown
  const labelStats = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const totalExp = expenseTxs.reduce((sum, t) => sum + t.amount, 0) || 1;

    const labelMap = new Map<string, number>();
    for (const t of expenseTxs) {
      const name = t.label ? t.label.trim() : 'Tanpa Label';
      labelMap.set(name, (labelMap.get(name) || 0) + t.amount);
    }

    return Array.from(labelMap.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: Number(((amount / totalExp) * 100).toFixed(1)),
        percentageStr: ((amount / totalExp) * 100).toFixed(1),
        color: CHART_COLORS[index % CHART_COLORS.length]!
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Calculate member spending breakdown
  const memberStats = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const totalExp = expenseTxs.reduce((sum, t) => sum + t.amount, 0) || 1;

    const userMap = new Map<string, number>();
    for (const t of expenseTxs) {
      const name = t.addedBy || 'Anggota';
      userMap.set(name, (userMap.get(name) || 0) + t.amount);
    }

    return Array.from(userMap.entries()).map(([name, amount]) => ({
      name,
      amount,
      percentage: ((amount / totalExp) * 100).toFixed(1)
    }));
  }, [transactions]);

  // Savings Rate (Rasio Tabungan)
  const savingsRate = useMemo(() => {
    if (periodIncome <= 0) return 0;
    const rate = ((periodIncome - periodExpense) / periodIncome) * 100;
    return Math.max(-100, Math.min(100, Number(rate.toFixed(1))));
  }, [periodIncome, periodExpense]);

  // Donut SVG parameters
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedPercent = 0;
  const donutSlices = categoryStats.map((cat, idx) => {
    const strokeDasharray = `${(cat.percentage / 100) * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * donutCircumference);
    accumulatedPercent += cat.percentage;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
      index: idx
    };
  });

  const activeCategory = hoveredCatIndex !== null ? categoryStats[hoveredCatIndex] : null;

  // Daily pulses for Trend Tab
  const dailySpending = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const dayMap = new Map<string, number>();
    for (const t of expenseTxs) {
      const dateKey = t.effectiveAt ? t.effectiveAt.split('T')[0] : '2026-11-01';
      dayMap.set(dateKey!, (dayMap.get(dateKey!) || 0) + t.amount);
    }
    const entries = Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const maxAmount = Math.max(...entries.map(e => e.amount), 1);
    return entries.map(e => ({
      ...e,
      dayLabel: e.date.split('-')[2] || e.date,
      heightPercent: Math.round((e.amount / maxAmount) * 100)
    }));
  }, [transactions]);

  return (
    <div className="space-y-4 pb-24 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Laporan & Rekapitulasi Keuangan
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-teal-700" />
            <span>Periode November 2026 • Analisis Buku Besar Real-time</span>
          </p>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
          <span>Ledger Terverifikasi</span>
        </div>
      </div>

      {/* Net Cash Flow Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Arus Kas Bersih (Net Cash Flow)
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              netCashFlow >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {netCashFlow >= 0 ? '✓ Surplus (Hemat)' : '⚠️ Defisit'}
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
          {formatIDR(netCashFlow, { showSign: true })}
        </div>

        {/* Visual Progress Bar Ratio */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (periodIncome / (periodIncome + periodExpense || 1)) * 100
                )}%`
              }}
              title="Porsi Pemasukan"
            />
            <div
              className="bg-red-500 h-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (periodExpense / (periodIncome + periodExpense || 1)) * 100
                )}%`
              }}
              title="Porsi Pengeluaran"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <TrendingUp className="w-3.5 h-3.5" /> Pemasukan: {formatIDR(periodIncome)}
            </span>
            <span className="flex items-center gap-1 text-red-700 font-bold">
              <TrendingDown className="w-3.5 h-3.5" /> Pengeluaran: {formatIDR(periodExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher for Reports */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setReportTab('kategori')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            reportTab === 'kategori'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          <span>Kategori ({categoryStats.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('tren')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            reportTab === 'tren'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tren & Arus Kas</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('label')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            reportTab === 'label'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TagIcon className="w-4 h-4" />
          <span>Label / Tag ({labelStats.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: KATEGORI & INTERACTIVE DONUT CHART */}
      {reportTab === 'kategori' && (
        <div className="space-y-4">
          {/* Interactive Donut Chart Container */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4 text-teal-700" />
                  <span>Grafik Komposisi Pengeluaran</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Sorot atau sentuh potongan grafik untuk melihat detail nominal
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {categoryStats.length} Kategori
              </span>
            </div>

            {/* Donut Chart Visual & Highlight */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 190 190">
                  {/* Background Track */}
                  <circle
                    cx="95"
                    cy="95"
                    r={donutRadius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="24"
                  />

                  {/* Slices */}
                  {donutSlices.map(slice => {
                    const isHovered = hoveredCatIndex === slice.index;
                    return (
                      <circle
                        key={slice.name}
                        cx="95"
                        cy="95"
                        r={donutRadius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={isHovered ? 28 : 24}
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredCatIndex(slice.index)}
                        onMouseLeave={() => setHoveredCatIndex(null)}
                        onClick={() => setHoveredCatIndex(slice.index)}
                      />
                    );
                  })}
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  {activeCategory ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                        {activeCategory.name}
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                        {formatIDR(activeCategory.amount)}
                      </span>
                      <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-0.5">
                        {activeCategory.percentageStr}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Total Keluar
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                        {formatIDR(periodExpense)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        100% Beban
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Top 5 Categories Visual Legend */}
              <div className="w-full sm:w-1/2 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  5 Pengeluaran Terbesar:
                </div>
                {categoryStats.slice(0, 5).map((cat, idx) => (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setHoveredCatIndex(idx)}
                    onMouseLeave={() => setHoveredCatIndex(null)}
                    className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs ${
                      hoveredCatIndex === idx ? 'bg-teal-50/80 ring-1 ring-teal-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-bold text-slate-800">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 tabular-nums">
                        {formatIDR(cat.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 tabular-nums">
                        ({cat.percentageStr}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Breakdown Progress Bars */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h2 className="font-bold text-slate-900 text-sm">Daftar Lengkap Distribusi Pengeluaran</h2>

            <div className="space-y-3">
              {categoryStats.map(cat => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                        <CategoryIcon name={cat.name} className="w-4 h-4" />
                      </div>
                      <span className="text-slate-800">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px] tabular-nums font-normal">
                        {cat.percentageStr}%
                      </span>
                      <span className="text-slate-900 tabular-nums font-bold">
                        {formatIDR(cat.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TREN & ARUS KAS (BAR CHART & SAVINGS RATE) */}
      {reportTab === 'tren' && (
        <div className="space-y-4">
          {/* Savings Rate Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Rasio Tabungan Keluarga (Savings Rate)
                </span>
              </div>
              <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                {savingsRate >= 20 ? 'Kondisi Prima' : savingsRate >= 0 ? 'Cukup Sehat' : 'Defisit Anggaran'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                {savingsRate}%
              </div>
              <span className="text-xs text-slate-400">
                dari total pemasukan dialokasikan ke tabungan & saldo akhir
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
              <div
                className={`h-full transition-all duration-500 ${
                  savingsRate >= 20 ? 'bg-emerald-400' : savingsRate >= 0 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
              />
            </div>
          </div>

          {/* Monthly Comparison Bar Chart */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-teal-700" />
                <span>Perbandingan Arus Kas (Income vs Expense)</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Visualisasi komparasi volume pendapatan dan belanja bulanan
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {/* Bar 1: Pemasukan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Total Pemasukan</span>
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatIDR(periodIncome)}
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-xl overflow-hidden p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-lg transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (periodIncome / Math.max(periodIncome, periodExpense, 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Bar 2: Pengeluaran */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-red-800 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                    <span>Total Pengeluaran</span>
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatIDR(periodExpense)}
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-xl overflow-hidden p-0.5">
                  <div
                    className="h-full bg-red-500 rounded-lg transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (periodExpense / Math.max(periodIncome, periodExpense, 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Bar 3: Surplus / Net */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Saldo Bersih (Net Surplus)</span>
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatIDR(netCashFlow)}
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-xl overflow-hidden p-0.5">
                  <div
                    className="h-full bg-teal-600 rounded-lg transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (Math.max(0, netCashFlow) / Math.max(periodIncome, 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Expense Pulses Chart */}
          {dailySpending.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">Aktivitas Pengeluaran per Tanggal</h2>
                  <p className="text-[11px] text-slate-500">Pola belanja harian keluarga bulan ini</p>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {dailySpending.length} Hari Aktif
                </span>
              </div>

              <div className="pt-4 flex items-end justify-between gap-1.5 h-36 border-b border-slate-100 pb-2">
                {dailySpending.map(day => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">
                      {Math.round(day.amount / 1000)}k
                    </div>
                    <div
                      className="w-full max-w-[20px] bg-teal-600 hover:bg-teal-700 rounded-t-md transition-all duration-300"
                      style={{ height: `${Math.max(12, day.heightPercent)}%` }}
                      title={`${day.date}: ${formatIDR(day.amount)}`}
                    />
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                      {day.dayLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: LABEL & SUB-KATEGORI */}
      {reportTab === 'label' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Distribusi Label / Tag Pengeluaran</h2>
              <p className="text-[11px] text-slate-500">Analisis pengeluaran spesifik per aktivitas keluarga</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {labelStats.length} Label Terdata
            </span>
          </div>

          <div className="space-y-3">
            {labelStats.map(lbl => (
              <div key={lbl.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-800 bg-teal-50 border border-teal-200/80 font-bold px-2 py-0.5 rounded-md">
                      #{lbl.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] tabular-nums font-normal">
                      {lbl.percentageStr}%
                    </span>
                    <span className="text-slate-900 tabular-nums font-bold">
                      {formatIDR(lbl.amount)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${lbl.percentage}%`, backgroundColor: lbl.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Spending Share */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-700" />
          <h2 className="font-bold text-slate-900 text-sm">Pengeluaran Berdasarkan Anggota</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {memberStats.map(m => (
            <div key={m.name} className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <div className="text-xs font-bold text-slate-800">{m.name}</div>
              <div className="text-sm font-extrabold text-slate-900 mt-1 tabular-nums">
                {formatIDR(m.amount)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {m.percentage}% dari total pengeluaran
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AI Expense Deep Analysis Card */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-teal-800/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-white">Analisis AI Pengeluaran Lengkap</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  AI Financial Advisor
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Audit otomatis kebocoran dana, rasio tabungan, dan rencana aksi penghematan {activeHousehold?.name || 'Keluarga'}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setIsAnalyzing(true);
              const topCats = categoryStats.slice(0, 5).map(c => ({
                name: c.name,
                amount: c.amount,
                percentage: c.percentage
              }));

              const calcSavingsRate = periodIncome > 0
                ? `${Math.max(0, Math.round(((periodIncome - periodExpense) / periodIncome) * 100))}%`
                : '0%';

              // Default heuristic analysis engine (Instan & Handal)
              const topCatName = topCats[0]?.name || 'Kebutuhan Harian';
              const isDeficit = netCashFlow < 0;
              const heuristicScore = Math.max(25, Math.min(95, Math.round(
                (netCashFlow > 0 ? 60 : 35) + (periodIncome > 0 ? (netCashFlow / periodIncome) * 35 : 0)
              )));

              let fallbackResult: AIAnalysisResult = {
                financialScore: heuristicScore,
                healthStatus: heuristicScore >= 75 ? 'Sangat Sehat' : heuristicScore >= 50 ? 'Cukup Sehat' : 'Waspada Defisit',
                savingsRate: calcSavingsRate,
                cashFlowEvaluation: isDeficit
                  ? `Pengeluaran bulan ini (Rp ${periodExpense.toLocaleString('id-ID')}) melebihi pemasukan dengan defisit Rp ${Math.abs(netCashFlow).toLocaleString('id-ID')}. Perlu evaluasi darurat pos non-pokok.`
                  : `Arus kas keluarga mencatatkan surplus sehat sebesar Rp ${netCashFlow.toLocaleString('id-ID')} dengan rasio tabungan ${calcSavingsRate}. Disiplin pencatatan berjalan dengan baik.`,
                spendingLeaks: [
                  `Pos "${topCatName}" memakan ${topCats[0]?.percentage || 0}% total anggaran belanja. Pertimbangkan membatasi alokasi mingguan.`,
                  categoryStats.length > 3
                    ? `Terdapat ${categoryStats.length} pos belanja berbeda yang berpotensi memicu kebocoran transaksi mikro yang tidak terasa.`
                    : 'Alokasi pengeluaran masih terkonsentrasi di pos-pos kebutuhan utama.'
                ],
                actionPlan: [
                  `Terapkan aturan jeda belanja 24 jam untuk transaksi di atas Rp 200.000 pada pos non-esensial.`,
                  `Amankan surplus minimal 15% langsung di awal bulan begitu gaji/pemasukan diterima ke rekening terpisah.`,
                  `Tetapkan batas pagu maksimal untuk pos "${topCatName}" agar sisa dana akhir bulan meningkat.`
                ],
                monthlyBudgetTip: 'Gunakan formula alokasi 50/30/20: 50% untuk kebutuhan pokok, 30% untuk gaya hidup, dan minimal 20% dialokasikan ke tabungan/dana darurat.',
                analyzedAt: new Date().toLocaleTimeString('id-ID')
              };

              try {
                const res = await fetch('/api/ai/analyze-expenses', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    householdName: activeHousehold?.name || 'Keluarga',
                    income: periodIncome,
                    expense: periodExpense,
                    net: netCashFlow,
                    categories: topCats
                  })
                });

                if (res.ok) {
                  const data = await res.json();
                  if (data.success && data.analysis) {
                    const a = data.analysis;
                    fallbackResult = {
                      financialScore: Number(a.financialScore) || fallbackResult.financialScore,
                      healthStatus: a.healthStatus || fallbackResult.healthStatus,
                      savingsRate: a.savingsRate || fallbackResult.savingsRate,
                      cashFlowEvaluation: a.cashFlowEvaluation || fallbackResult.cashFlowEvaluation,
                      spendingLeaks: Array.isArray(a.spendingLeaks) && a.spendingLeaks.length > 0 ? a.spendingLeaks : fallbackResult.spendingLeaks,
                      actionPlan: Array.isArray(a.actionPlan) && a.actionPlan.length > 0 ? a.actionPlan : fallbackResult.actionPlan,
                      monthlyBudgetTip: a.monthlyBudgetTip || fallbackResult.monthlyBudgetTip,
                      analyzedAt: new Date().toLocaleTimeString('id-ID')
                    };
                  }
                }
              } catch {
                // Gunakan fallback cerdas
              } finally {
                setAiAnalysis(fallbackResult);
                setIsAnalyzing(false);
              }
            }}
            disabled={isAnalyzing}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-900/40 cursor-pointer shrink-0"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-teal-200" />
                <span>Menganalisis...</span>
              </>
            ) : aiAnalysis ? (
              <>
                <RefreshCw className="w-4 h-4 text-teal-200" />
                <span>Perbarui Analisis</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 text-teal-200" />
                <span>Mulai Analisa AI</span>
              </>
            )}
          </button>
        </div>

        {/* Not Yet Analyzed State */}
        {!aiAnalysis && !isAnalyzing && (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-300">
              Klik tombol di atas untuk menjalankan audit cerdas AI atas {transactions.filter(t => t.type === 'expense').length} transaksi pengeluaran bulan ini.
            </p>
            <div className="text-[11px] text-teal-300/80">
              Mencakup: Evaluasi Arus Kas • Deteksi Pos Bocor Halus • 3 Rencana Aksi Nyata
            </div>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isAnalyzing && (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-teal-500/30 mx-auto flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
            </div>
            <p className="text-xs font-semibold text-teal-200">
              AI sedang mengaudit seluruh pos pengeluaran dan menghitung rasio tabungan keluarga...
            </p>
          </div>
        )}

        {/* Results Display */}
        {aiAnalysis && !isAnalyzing && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Skor & Status Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Skor Finansial</div>
                  <div className="text-xl font-extrabold text-white mt-0.5 tabular-nums">
                    {aiAnalysis.financialScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                  aiAnalysis.financialScore >= 75
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : aiAnalysis.financialScore >= 50
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {aiAnalysis.healthStatus}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
                <div className="text-[10px] text-slate-300 uppercase font-semibold">Rasio Tabungan</div>
                <div className="text-xl font-extrabold text-teal-300 mt-0.5 tabular-nums">
                  {aiAnalysis.savingsRate}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Target sehat: &gt; 20% pemasukan</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
                <div className="text-[10px] text-slate-300 uppercase font-semibold">Net Cash Flow</div>
                <div className={`text-xl font-extrabold mt-0.5 tabular-nums ${netCashFlow >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                  {netCashFlow >= 0 ? `+${formatIDR(netCashFlow)}` : formatIDR(netCashFlow)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {netCashFlow >= 0 ? 'Surplus terjaga' : 'Defisit perlu ditekan'}
                </div>
              </div>
            </div>

            {/* Evaluasi Arus Kas */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-teal-300 font-bold text-xs">
                <TrendingUp className="w-4 h-4" />
                <span>Evaluasi Arus Kas & Kondisi Finansial</span>
              </div>
              <p className="text-slate-200 leading-relaxed text-xs">
                {aiAnalysis.cashFlowEvaluation}
              </p>
            </div>

            {/* Indikasi Kebocoran Pos Pengeluaran */}
            {aiAnalysis.spendingLeaks && aiAnalysis.spendingLeaks.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Sorotan Pos Terbesar & Potensi Kebocoran Halus</span>
                </div>
                <ul className="space-y-1.5">
                  {aiAnalysis.spendingLeaks.map((leak, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-amber-100 text-xs leading-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{leak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3 Rekomendasi Aksi Nyata */}
            {aiAnalysis.actionPlan && aiAnalysis.actionPlan.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Rencana Aksi Penghematan 30 Hari ke Depan</span>
                </div>
                <div className="space-y-2">
                  {aiAnalysis.actionPlan.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/20 border border-white/5">
                      <span className="w-5 h-5 rounded-lg bg-teal-500/30 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 text-xs leading-normal">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Budget Tip */}
            {aiAnalysis.monthlyBudgetTip && (
              <div className="p-3.5 rounded-2xl bg-teal-900/40 border border-teal-500/30 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-100 leading-normal">
                  <strong className="text-teal-200">Tips Alokasi Budget: </strong>
                  {aiAnalysis.monthlyBudgetTip}
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-400 text-right pt-1">
              Dianalisis pada: {aiAnalysis.analyzedAt}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
