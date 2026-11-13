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
  Sparkles
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

export const ReportsView: React.FC = () => {
  const { transactions, periodIncome, periodExpense, netCashFlow } = useApp();
  const [reportTab, setReportTab] = useState<'kategori' | 'tren' | 'label'>('kategori');
  const [hoveredCatIndex, setHoveredCatIndex] = useState<number | null>(null);

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
    </div>
  );
};
