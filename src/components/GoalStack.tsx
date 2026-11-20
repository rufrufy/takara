import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Plus } from 'lucide-react';
import { formatIDR } from '../lib/money';
import { getReadableHeaderText } from '../lib/walletColors';
import type { SavingsGoal } from '../types';

interface GoalStackProps {
  goals: SavingsGoal[];
  showBalance: boolean;
  onManageGoals: () => void;
  compact?: boolean;
}

export const GoalStack: React.FC<GoalStackProps> = ({
  goals,
  showBalance,
  onManageGoals,
  compact = false
}) => {
  const sortedGoals = useMemo(
    () =>
      [...goals].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
        const pctA = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
        const pctB = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
        return pctB - pctA || a.title.localeCompare(b.title, 'id');
      }),
    [goals]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffleDir, setShuffleDir] = useState<'next' | 'prev' | null>(null);
  const touchStartX = useRef<number | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const count = sortedGoals.length;
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
        <section className="wallet-deck-wrapper is-compact" aria-label="Kartu goal impian">
          <div className="wallet-deck-stage">
            <div className="wallet-deck-card" data-active="true" onClick={onManageGoals} role="button" tabIndex={0}>
              <div
                style={{ backgroundColor: '#DDD6FE', color: '#073B4C' }}
                className="wallet-deck-card-header"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white border-2 border-[#073B4C] shadow-[1.5px_1.5px_0_#073B4C] flex items-center justify-center shrink-0 text-sm">
                    🎯
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="deck-title truncate">Goal Impian</p>
                    <p className="deck-sub truncate">Tabungan</p>
                  </div>
                </div>
              </div>
              <div className="wallet-deck-card-body">
                <div className="flex flex-col justify-between h-full gap-2">
                  <div>
                    <span className="deck-sub block text-[#365664]">Belum ada goal</span>
                    <strong className="deck-amount block text-[#073B4C] mt-0.5">Buat target</strong>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageGoals();
                      }}
                      className="deck-manage-btn"
                    >
                      <Plus className="w-3 h-3 stroke-[2.8]" />
                      <span>Buat</span>
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
          onClick={onManageGoals}
          className="w-full nb-card p-4 bg-white flex items-center justify-between gap-3 hover:bg-[#DDD6FE]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#C4B5FD] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center text-lg">
              🎯
            </span>
            <div className="text-left">
              <p className="text-sm font-extrabold text-[#073B4C]">Tambah goal impian</p>
              <p className="text-xs font-bold text-[#365664]">Pantau progres tabungan keluarga di beranda</p>
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
      aria-label="Tumpukan kartu goal impian"
    >
      <div
        className="wallet-deck-stage"
        style={{ paddingBottom: `${Math.max(0, visibleLayers - 1) * layerStepY}px` }}
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
        {sortedGoals.map((g, idx) => {
          const offset = (idx - safeIndex + count) % count;
          const isHidden = offset >= maxLayers;
          const hc = g.color || '#C4B5FD';
          const ht = getReadableHeaderText(hc);
          const isFront = offset === 0;
          const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));

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
              key={g.id}
              data-active={isFront}
              role={isFront && count > 1 ? 'button' : undefined}
              tabIndex={isFront ? 0 : -1}
              aria-hidden={!isFront}
              aria-label={
                isFront
                  ? `Goal ${g.title}, progres ${pct} persen${
                      count > 1 ? '. Ketuk untuk goal berikutnya.' : ''
                    }`
                  : undefined
              }
              onClick={() => {
                if (!isFront) return;
                if (count > 1) triggerShuffle('next');
                else onManageGoals();
              }}
              onKeyDown={(e) => {
                if (!isFront) return;
                if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (count > 1) triggerShuffle('next');
                  else onManageGoals();
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
              {/* Colored Goal Header */}
              <div
                style={{ backgroundColor: hc, color: ht }}
                className="wallet-deck-card-header"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`${
                      compact ? 'w-7 h-7 rounded-lg text-sm' : 'w-8 h-8 rounded-xl text-base'
                    } bg-white border-2 border-[#073B4C] shadow-[1.5px_1.5px_0_#073B4C] flex items-center justify-center shrink-0`}
                  >
                    {g.icon || '🎯'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`${compact ? 'deck-title' : 'text-sm font-extrabold leading-tight'} truncate`}
                      style={{ color: ht }}
                    >
                      {g.title}
                    </p>
                    <p
                      className={`${compact ? 'deck-sub' : 'wallet-sub-label text-[11px] font-bold leading-none mt-0.5'} opacity-85 truncate`}
                      style={{ color: ht }}
                    >
                      {g.isCompleted ? 'Tercapai ✓' : 'Goal / Impian'}
                    </p>
                  </div>
                </div>

                <span className="deck-count bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] rounded-full shrink-0">
                  {idx + 1}/{count}
                </span>
              </div>

              {/* Card Body */}
              <div className="wallet-deck-card-body">
                {compact ? (
                  <div className="flex flex-col justify-between h-full gap-1.5">
                    <div className="flex items-baseline justify-between gap-1.5 min-w-0">
                      <strong className="deck-amount text-[#073B4C] truncate">
                        {showBalance ? formatIDR(g.currentAmount) : 'Rp ••••'}
                      </strong>
                      <span className="deck-pct-pill shrink-0">{pct}%</span>
                    </div>

                    <div className="deck-progress-track">
                      <div
                        className="deck-progress-fill"
                        style={{ width: `${pct}%`, backgroundColor: hc }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <span className="deck-sub text-[#365664] truncate">
                        {count > 1 ? 'Ketuk ↻' : showBalance ? formatIDR(g.targetAmount) : 'Target'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageGoals();
                        }}
                        className="deck-manage-btn shrink-0"
                      >
                        <span>Kelola</span>
                        <ArrowRight className="w-3 h-3 stroke-[2.8]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wide text-[#365664] block">
                          Terkumpul ({pct}%)
                        </span>
                        <strong className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight block mt-0.5 truncate text-[#073B4C]">
                          {showBalance ? formatIDR(g.currentAmount) : 'Rp ••••••'}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageGoals();
                        }}
                        className="nb-chip bg-[#DDD6FE] hover:bg-[#C4B5FD] text-[#073B4C] px-3 py-1.5 text-xs inline-flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>Kelola</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.6]" />
                      </button>
                    </div>
                    <div className="deck-progress-track">
                      <div
                        className="deck-progress-fill"
                        style={{ width: `${pct}%`, backgroundColor: hc }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deck Controls & Indicator Dots */}
      <div className="wallet-deck-controls">
        {count > 1 ? (
          <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
            <button
              type="button"
              onClick={() => triggerShuffle('prev')}
              aria-label="Goal sebelumnya"
              className="wallet-deck-nav-btn"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.8]" />
            </button>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {sortedGoals.map((g, idx) => {
                const isSelected = idx === safeIndex;
                const hc = g.color || '#C4B5FD';
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-label={`Pilih goal ${g.title}`}
                    onClick={() => {
                      if (idx !== safeIndex) {
                        const forwardSteps = (idx - safeIndex + count) % count;
                        triggerShuffle(forwardSteps <= count / 2 ? 'next' : 'prev', idx);
                      }
                    }}
                    className={`h-2 rounded-full border border-[#073B4C] transition-all shrink-0 ${
                      isSelected ? 'w-5' : 'w-2 bg-white hover:bg-[#DDD6FE]'
                    }`}
                    style={isSelected ? { backgroundColor: hc } : undefined}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => triggerShuffle('next')}
              aria-label="Goal berikutnya"
              className="wallet-deck-nav-btn"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.8]" />
            </button>
          </div>
        ) : (
          <span className="deck-sub text-[#365664] truncate">
            Goal aktif ({count})
          </span>
        )}
      </div>
    </section>
  );
};
