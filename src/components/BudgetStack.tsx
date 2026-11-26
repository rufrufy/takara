import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Plus, Gauge } from 'lucide-react';
import { formatIDR } from '../lib/money';
import { jakartaDateTime } from '../lib/dateTime';
import { getReadableHeaderText } from '../lib/walletColors';
import { CategoryIcon } from './CategoryIcon';
import type { Category, CategoryBudget, FinancialTransaction } from '../types';

interface BudgetStackProps {
  budgets: CategoryBudget[];
  transactions: FinancialTransaction[];
  categories: Category[];
  showBalance: boolean;
  onManageBudgets: () => void;
  compact?: boolean;
}

export const BudgetStack: React.FC<BudgetStackProps> = ({
  budgets,
  transactions,
  categories,
  showBalance,
  onManageBudgets,
  compact = false
}) => {
  const currentMonth = useMemo(() => jakartaDateTime(new Date().toISOString()).date.slice(0, 7), []);

  const sortedBudgets = useMemo(() => {
    const expenseTxs = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.status !== 'VOIDED' &&
        jakartaDateTime(t.effectiveAt).date.startsWith(currentMonth)
    );

    return budgets
      .map((b) => {
        const cat = categories.find(
          (c) =>
            c.type === 'expense' &&
            ((b.categoryId && c.id === b.categoryId) ||
              c.name.toLowerCase() === b.categoryName.toLowerCase())
        );
        const spent = expenseTxs
          .filter(
            (t) =>
              (b.categoryId && t.categoryId === b.categoryId) ||
              (t.categoryName || '').toLowerCase() === b.categoryName.toLowerCase()
          )
          .reduce((s, t) => s + t.amount, 0);
        const pct = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
        const status: 'over' | 'warn' | 'safe' =
          pct >= 100 ? 'over' : pct >= b.alertThreshold ? 'warn' : 'safe';
        return { budget: b, cat, spent, pct, status };
      })
      .sort((a, b) => b.pct - a.pct || a.budget.categoryName.localeCompare(b.budget.categoryName, 'id'));
  }, [budgets, transactions, categories, currentMonth]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffleDir, setShuffleDir] = useState<'next' | 'prev' | null>(null);
  const touchStartX = useRef<number | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const count = sortedBudgets.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;

  const triggerShuffle = (dir: 'next' | 'prev', targetIdx?: number) => {
    if (count <= 1) return;
    if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    setShuffleDir(dir);
    setActiveIndex((prev) => {
      if (targetIdx !== undefined) return targetIdx % count;
      return dir === 'next' ? (prev + 1) % count : (prev - 1 + count) % count;
    });
    shuffleTimerRef.current = setTimeout(() => {
      setShuffleDir(null);
    }, 360);
  };

  if (count === 0) {
    if (compact) {
      return (
        <section className="wallet-deck-wrapper is-compact" aria-label="Kartu pagu anggaran">
          <div className="wallet-deck-stage" style={{ paddingBottom: '14px' }}>
            <div className="wallet-deck-card is-empty" data-active="true" onClick={onManageBudgets} role="button" tabIndex={0}>
              <div
                style={{ backgroundColor: '#FFD166', color: '#073B4C' }}
                className="wallet-deck-card-header"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white border-2 border-[#073B4C] shadow-[1.5px_1.5px_0_#073B4C] flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4 text-[#073B4C]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="deck-title truncate">Pagu Anggaran</p>
                    <p className="deck-sub truncate">Batas bulanan</p>
                  </div>
                </div>
              </div>
              <div className="wallet-deck-card-body">
                <div className="flex flex-col justify-between h-full gap-2">
                  <div>
                    <span className="deck-sub block text-[#365664]">Belum ada pagu</span>
                    <strong className="deck-amount block text-[#073B4C] mt-0.5">Atur batas</strong>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageBudgets();
                      }}
                      className="deck-manage-btn"
                    >
                      <Plus className="w-3 h-3 stroke-[2.8]" />
                      <span>Atur</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <div className="my-3">
        <button
          type="button"
          onClick={onManageBudgets}
          className="w-full nb-card p-4 bg-white flex items-center justify-between gap-3 hover:bg-[#FEF3C7]/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#FFD166] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center">
              <Gauge className="w-5 h-5 text-[#073B4C]" />
            </span>
            <div className="text-left">
              <p className="text-sm font-extrabold text-[#073B4C]">Atur pagu anggaran</p>
              <p className="text-xs font-bold text-[#365664]">Pantau batas belanja bulanan keluarga di beranda</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#073B4C]" />
        </button>
      </div>
    );
  }

  const maxLayers = compact ? 3 : 4;
  const visibleLayers = Math.min(count, maxLayers);
  const layerStepY = compact ? 7 : 11;

  return (
    <section
      className={`wallet-deck-wrapper ${compact ? 'is-compact' : ''}`}
      aria-label="Tumpukan kartu pagu anggaran"
    >
      <div
        className="wallet-deck-stage"
        style={{ paddingBottom: compact ? '14px' : `${Math.max(0, visibleLayers - 1) * layerStepY}px` }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || count <= 1) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const deltaX = endX - touchStartX.current;
          touchStartX.current = null;
          if (deltaX < -32) triggerShuffle('next');
          else if (deltaX > 32) triggerShuffle('prev');
        }}
      >
        {sortedBudgets.map(({ budget, cat, spent, pct, status }, idx) => {
          const offset = (idx - safeIndex + count) % count;
          const isHidden = offset >= maxLayers;
          const hc =
            status === 'over'
              ? '#FF6B6B'
              : status === 'warn'
              ? '#FFD166'
              : cat?.color || '#06D6A0';
          const ht = getReadableHeaderText(hc);
          const isFront = offset === 0;
          const statusLabel =
            status === 'over' ? 'Lewat Pagu!' : status === 'warn' ? 'Hampir Penuh' : 'Pagu Aman';
          const pillStyle =
            status === 'over'
              ? { backgroundColor: '#FFE0E5', color: '#911D35' }
              : status === 'warn'
              ? { backgroundColor: '#FEF3C7', color: '#784D05' }
              : { backgroundColor: '#D1FAE5', color: '#064E3B' };

          const tiltDeg = compact
            ? 0
            : offset === 0
            ? 0
            : offset === 1
            ? -1.4
            : offset === 2
            ? 1.5
            : -0.9;
          const translateX = compact
            ? 0
            : offset === 0
            ? 0
            : offset === 1
            ? 4
            : offset === 2
            ? -4
            : 2;
          const translateY = offset * layerStepY;
          const scale = compact
            ? Math.max(0.9, 1 - offset * 0.04)
            : Math.max(0.88, 1 - offset * 0.036);

          return (
            <div
              key={budget.id}
              data-active={isFront}
              role={isFront && count > 1 ? 'button' : undefined}
              tabIndex={isFront ? 0 : -1}
              aria-hidden={!isFront}
              aria-label={
                isFront
                  ? `Pagu ${budget.categoryName}, terpakai ${pct} persen${
                      count > 1 ? '. Ketuk untuk pagu berikutnya.' : ''
                    }`
                  : undefined
              }
              onClick={() => {
                if (!isFront) return;
                if (count > 1) triggerShuffle('next');
                else onManageBudgets();
              }}
              onKeyDown={(e) => {
                if (!isFront) return;
                if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (count > 1) triggerShuffle('next');
                  else onManageBudgets();
                } else if (e.key === 'ArrowLeft' && count > 1) {
                  e.preventDefault();
                  triggerShuffle('prev');
                }
              }}
              style={{
                zIndex: isHidden ? 1 : 30 - offset,
                opacity: isHidden ? 0 : Math.max(0.78, 1 - offset * 0.08),
                pointerEvents: isFront ? 'auto' : 'none',
                transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${tiltDeg}deg)`
              }}
              className={`wallet-deck-card ${
                isFront && shuffleDir === 'next'
                  ? 'is-shuffling-next'
                  : isFront && shuffleDir === 'prev'
                  ? 'is-shuffling-prev'
                  : ''
              }`}
            >
              {/* Colored Budget Header */}
              <div
                style={{ backgroundColor: hc, color: ht }}
                className="wallet-deck-card-header"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`${
                      compact ? 'w-7 h-7 rounded-lg text-sm' : 'w-8 h-8 rounded-xl text-base'
                    } bg-white text-[#073B4C] border-2 border-[#073B4C] shadow-[1.5px_1.5px_0_#073B4C] flex items-center justify-center shrink-0`}
                  >
                    <CategoryIcon
                      name={budget.categoryName}
                      type="expense"
                      icon={cat?.icon}
                      className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`${compact ? 'deck-title' : 'text-sm font-extrabold leading-tight'} truncate`}
                      style={{ color: ht }}
                    >
                      {budget.categoryName}
                    </p>
                    <p
                      className={`${compact ? 'deck-sub' : 'wallet-sub-label text-[11px] font-bold leading-none mt-0.5'} opacity-90 truncate`}
                      style={{ color: ht }}
                    >
                      {statusLabel}
                    </p>
                  </div>
                </div>

                <span
                  className={`${
                    compact ? 'deck-count' : 'text-[11px] font-extrabold px-2.5 py-0.5'
                  } bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] rounded-full shrink-0`}
                >
                  {idx + 1}/{count}
                </span>
              </div>

              {/* Card Body */}
              <div className="wallet-deck-card-body">
                {compact ? (
                  <div className="flex flex-col justify-between h-full gap-1.5">
                    <div className="flex items-baseline justify-between gap-1.5 min-w-0">
                      <strong className="deck-amount text-[#073B4C] truncate tabular-nums">
                        {showBalance ? formatIDR(spent) : 'Rp ••••'}
                      </strong>
                      <span className="deck-pct-pill shrink-0 tabular-nums" style={pillStyle}>
                        {pct}%
                      </span>
                    </div>

                    <div className="deck-progress-track">
                      <div
                        className="deck-progress-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: hc
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <span className="deck-sub text-[#365664] truncate tabular-nums">
                        {showBalance ? `Batas ${formatIDR(budget.monthlyLimit)}` : 'Batas ••••'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageBudgets();
                        }}
                        className="deck-manage-btn shrink-0"
                      >
                        <span>Atur</span>
                        <ArrowRight className="w-3 h-3 stroke-[2.8]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wide text-[#365664] block">
                          Terpakai ({pct}%)
                        </span>
                        <strong className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight block mt-0.5 truncate text-[#073B4C]">
                          {showBalance ? formatIDR(spent) : 'Rp ••••••'}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageBudgets();
                        }}
                        className="nb-chip bg-[#FEF3C7] hover:bg-[#FFD166] text-[#073B4C] px-3 py-1.5 text-xs inline-flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>Atur</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.6]" />
                      </button>
                    </div>
                    <div className="deck-progress-track">
                      <div
                        className="deck-progress-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: hc
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deck Controls & Indicator Dots (hidden on compact Beranda for tap-direct symmetry) */}
      {!compact && (
        <div className="wallet-deck-controls">
          {count > 1 ? (
            <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
              <button
                type="button"
                onClick={() => triggerShuffle('prev')}
                aria-label="Pagu sebelumnya"
                className="wallet-deck-nav-btn"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.8]" />
              </button>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {sortedBudgets.map(({ budget, cat, status }, idx) => {
                  const isSelected = idx === safeIndex;
                  const hc =
                    status === 'over'
                      ? '#FF6B6B'
                      : status === 'warn'
                      ? '#FFD166'
                      : cat?.color || '#06D6A0';
                  return (
                    <button
                      key={budget.id}
                      type="button"
                      aria-label={`Pilih pagu ${budget.categoryName}`}
                      onClick={() => {
                        if (idx !== safeIndex) {
                          const forwardSteps = (idx - safeIndex + count) % count;
                          triggerShuffle(forwardSteps <= count / 2 ? 'next' : 'prev', idx);
                        }
                      }}
                      className={`h-2 rounded-full border border-[#073B4C] transition-all shrink-0 ${
                        isSelected ? 'w-5' : 'w-2 bg-white hover:bg-[#FEF3C7]'
                      }`}
                      style={isSelected ? { backgroundColor: hc } : undefined}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => triggerShuffle('next')}
                aria-label="Pagu berikutnya"
                className="wallet-deck-nav-btn"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.8]" />
              </button>
            </div>
          ) : (
            <span className="deck-sub text-[#365664] truncate">
              Pagu aktif ({count})
            </span>
          )}
        </div>
      )}
    </section>
  );
};
