import React, { useMemo, useRef, useState } from 'react';
import {
  Wallet as WalletIcon,
  Banknote,
  Smartphone,
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutGrid,
  Edit2,
  ArrowRight
} from 'lucide-react';
import { formatIDR } from '../lib/money';
import { resolveWalletHeaderColor, getReadableHeaderText } from '../lib/walletColors';
import type { FinancialTransaction, Wallet, WalletType } from '../types';

const getWalletTypeLabel = (type: WalletType) => {
  if (type === 'cash') return 'Uang Tunai';
  if (type === 'digital') return 'E-Wallet / Digital';
  if (type === 'custom') return 'Tabungan / Aset';
  return 'Rekening Bank';
};

const renderWalletIcon = (type: WalletType, className = 'w-4 h-4') => {
  if (type === 'cash') return <Banknote className={`${className} text-emerald-700`} />;
  if (type === 'digital') return <Smartphone className={`${className} text-amber-600`} />;
  return <Building2 className={`${className} text-teal-800`} />;
};

interface HomeWalletStackProps {
  variant: 'home';
  wallets: Wallet[];
  showBalance: boolean;
  onManageWallets: () => void;
}

interface ProfileWalletStackProps {
  variant: 'profile';
  wallets: Wallet[];
  transactions: FinancialTransaction[];
  selectedWalletId: string | null;
  onSelectWallet: (id: string | null) => void;
  onEditWallet: (wallet: Wallet) => void;
  onAddWallet: () => void;
}

export type WalletStackProps = HomeWalletStackProps | ProfileWalletStackProps;

export const WalletStack: React.FC<WalletStackProps> = (props) => {
  if (props.variant === 'home') {
    return <HomeWalletDeck {...props} />;
  }
  return <ProfileWalletStack {...props} />;
};

const HomeWalletDeck: React.FC<HomeWalletStackProps> = ({
  wallets,
  showBalance,
  onManageWallets
}) => {
  const sortedWallets = useMemo(
    () => [...wallets].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'id')),
    [wallets]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffleDir, setShuffleDir] = useState<'next' | 'prev' | null>(null);
  const touchStartX = useRef<number | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const count = sortedWallets.length;
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
    return (
      <div className="my-3">
        <button
          type="button"
          onClick={onManageWallets}
          className="w-full nb-card p-4 bg-white flex items-center justify-between gap-3 hover:bg-[#FEF3C7] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#06D6A0] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center">
              <Plus className="w-5 h-5 text-[#073B4C] stroke-[2.8]" />
            </span>
            <div className="text-left">
              <p className="text-sm font-extrabold text-[#073B4C]">Tambah dompet pertama</p>
              <p className="text-xs font-bold text-[#365664]">Mulai catat rekening, e-wallet, atau tunai</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#073B4C]" />
        </button>
      </div>
    );
  }

  const visibleLayers = Math.min(count, 4);

  return (
    <section className="wallet-deck-wrapper" aria-label="Tumpukan kartu dompet">
      <div
        className="wallet-deck-stage"
        style={{ paddingBottom: `${Math.max(0, visibleLayers - 1) * 11}px` }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || count <= 1) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
          const deltaX = endX - touchStartX.current;
          touchStartX.current = null;
          if (deltaX < -38) triggerShuffle('next');
          else if (deltaX > 38) triggerShuffle('prev');
        }}
      >
        {sortedWallets.map((w, idx) => {
          const offset = (idx - safeIndex + count) % count;
          const isHidden = offset >= 4;
          const hc = resolveWalletHeaderColor(w);
          const ht = getReadableHeaderText(hc);
          const isFront = offset === 0;

          const tiltDeg =
            offset === 0 ? 0 : offset === 1 ? -1.4 : offset === 2 ? 1.5 : -0.9;
          const translateX = offset === 0 ? 0 : offset === 1 ? 4 : offset === 2 ? -4 : 2;
          const translateY = offset * 11;
          const scale = Math.max(0.88, 1 - offset * 0.036);

          return (
            <div
              key={w.id}
              data-wallet-type={w.type}
              data-active={isFront}
              role={isFront && count > 1 ? 'button' : undefined}
              tabIndex={isFront ? 0 : -1}
              aria-hidden={!isFront}
              aria-label={
                isFront
                  ? `Dompet ${w.name}, saldo ${showBalance ? formatIDR(w.balance) : 'tersembunyi'}${
                      count > 1 ? '. Ketuk untuk kartu berikutnya.' : ''
                    }`
                  : undefined
              }
              onClick={() => {
                if (!isFront) return;
                if (count > 1) triggerShuffle('next');
                else onManageWallets();
              }}
              onKeyDown={(e) => {
                if (!isFront) return;
                if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (count > 1) triggerShuffle('next');
                  else onManageWallets();
                } else if (e.key === 'ArrowLeft' && count > 1) {
                  e.preventDefault();
                  triggerShuffle('prev');
                }
              }}
              style={{
                zIndex: isHidden ? 1 : 40 - offset,
                opacity: isHidden ? 0 : Math.max(0.75, 1 - offset * 0.07),
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
              {/* Colored Wallet Header */}
              <div
                style={{ backgroundColor: hc, color: ht }}
                className="wallet-deck-card-header"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0">
                    {renderWalletIcon(w.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold leading-tight truncate" style={{ color: ht }}>
                      {w.name}
                    </p>
                    <p className="text-[11px] font-bold opacity-85 leading-none mt-0.5" style={{ color: ht }}>
                      {getWalletTypeLabel(w.type)}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-extrabold bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] px-2.5 py-0.5 rounded-full shrink-0">
                  {idx + 1}/{count}
                </span>
              </div>

              {/* Card Body */}
              <div className="wallet-deck-card-body">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#365664] block">
                      Saldo dompet
                    </span>
                    <strong
                      className={`text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight block mt-0.5 truncate ${
                        w.balance < 0 ? 'text-red-600' : 'text-[#073B4C]'
                      }`}
                    >
                      {showBalance ? formatIDR(w.balance) : 'Rp ••••••'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageWallets();
                    }}
                    className="nb-chip bg-[#FEF3C7] hover:bg-[#FFD166] text-[#073B4C] px-3 py-1.5 text-xs inline-flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>Kelola</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.6]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deck Controls & Indicator Dots */}
      <div className="wallet-deck-controls">
        {count > 1 ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => triggerShuffle('prev')}
              aria-label="Dompet sebelumnya"
              className="wallet-deck-nav-btn"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.8]" />
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {sortedWallets.map((w, idx) => {
                const isSelected = idx === safeIndex;
                const hc = resolveWalletHeaderColor(w);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => triggerShuffle(idx > safeIndex ? 'next' : 'prev', idx)}
                    aria-label={`Pilih dompet ${w.name}`}
                    title={w.name}
                    style={{ backgroundColor: isSelected ? hc : '#FFFFFF' }}
                    className={`h-2.5 rounded-full border-[1.5px] border-[#073B4C] transition-all shrink-0 ${
                      isSelected ? 'w-7 shadow-[1.5px_1.5px_0_#073B4C]' : 'w-2.5 opacity-60 hover:opacity-100'
                    }`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => triggerShuffle('next')}
              aria-label="Dompet berikutnya"
              className="wallet-deck-nav-btn"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.8]" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-bold text-[#365664]">1 dompet aktif</span>
        )}

        <button
          type="button"
          onClick={onManageWallets}
          className="text-xs font-extrabold text-[#073B4C] hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <WalletIcon className="w-3.5 h-3.5" />
          <span>{count > 1 ? `Semua Dompet (${count})` : 'Detail Dompet'}</span>
        </button>
      </div>
    </section>
  );
};

const ProfileWalletStack: React.FC<ProfileWalletStackProps> = ({
  wallets,
  transactions,
  selectedWalletId,
  onSelectWallet,
  onEditWallet,
  onAddWallet
}) => {
  const [layoutMode, setLayoutMode] = useState<'stack' | 'grid'>('stack');
  const [isExpandedAll, setIsExpandedAll] = useState(false);

  if (wallets.length === 0) {
    return (
      <div className="bg-white rounded-3xl border-[2.5px] border-[#073B4C] p-6 text-center space-y-3">
        <p className="text-sm font-extrabold text-[#073B4C]">Belum ada dompet di household ini.</p>
        <button
          type="button"
          onClick={onAddWallet}
          className="nb-btn bg-[#06D6A0] text-[#073B4C] px-4 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.8]" />
          <span>Buat Dompet Pertama</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stack / Grid Toggle Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] font-bold text-[#365664]">
          {layoutMode === 'stack'
            ? selectedWalletId
              ? 'Klik kartu lagi untuk menutup rincian mutasi'
              : 'Klik salah satu kartu bertumpuk untuk membuka mutasi'
            : 'Menampilkan seluruh kartu dalam grid'}
        </p>

        <div className="flex items-center gap-1.5">
          {layoutMode === 'stack' && wallets.length > 1 && (
            <button
              type="button"
              onClick={() => setIsExpandedAll(!isExpandedAll)}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border-2 border-[#073B4C] bg-[#FEF3C7] hover:bg-[#FFD166] text-[#073B4C] shadow-[2px_2px_0_#073B4C] transition-colors"
            >
              {isExpandedAll ? 'Tumpuk Rapat' : 'Mekarkan'}
            </button>
          )}

          <div className="inline-flex p-0.5 rounded-full border-2 border-[#073B4C] bg-white shadow-[2px_2px_0_#073B4C]">
            <button
              type="button"
              onClick={() => setLayoutMode('stack')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 transition-colors ${
                layoutMode === 'stack' ? 'bg-[#06D6A0] text-[#073B4C]' : 'text-[#365664] hover:text-[#073B4C]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Tumpuk</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 transition-colors ${
                layoutMode === 'grid' ? 'bg-[#06D6A0] text-[#073B4C]' : 'text-[#365664] hover:text-[#073B4C]'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className={
          layoutMode === 'stack'
            ? 'wallet-vertical-stack'
            : 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
        }
      >
        {wallets.map((w, idx) => {
          const isSelected = selectedWalletId === w.id;
          const prevWasSelected = idx > 0 && wallets[idx - 1]?.id === selectedWalletId;
          const isCollapsed =
            layoutMode === 'stack' &&
            idx > 0 &&
            !isExpandedAll &&
            !isSelected &&
            !prevWasSelected;

          const wTxs = transactions.filter(
            (t) => t.sourceWalletId === w.id || t.destinationWalletId === w.id
          );
          const headerColor = resolveWalletHeaderColor(w);
          const headerText = getReadableHeaderText(headerColor);
          const stackTilt =
            layoutMode === 'stack' && !isExpandedAll && !isSelected
              ? idx % 2 === 0
                ? '-0.55deg'
                : '0.65deg'
              : '0deg';

          return (
            <div
              key={w.id}
              data-wallet-type={w.type}
              data-selected={isSelected}
              onClick={() => onSelectWallet(isSelected ? null : w.id)}
              style={
                layoutMode === 'stack'
                  ? ({ '--stack-tilt': stackTilt, zIndex: isSelected ? 25 : idx + 1 } as React.CSSProperties)
                  : undefined
              }
              className={`wallet-account-card rounded-3xl border-[2.5px] border-[#073B4C] cursor-pointer overflow-hidden bg-white ${
                layoutMode === 'stack' ? 'wallet-stack-item' : ''
              } ${isCollapsed ? 'is-collapsed' : ''} ${isSelected ? 'is-selected' : ''}`}
            >
              {/* Colored Card Header */}
              <div
                style={{ backgroundColor: headerColor, color: headerText }}
                className="px-4 py-3.5 border-b-[2.5px] border-[#073B4C] flex items-start justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0">
                    {renderWalletIcon(w.type, 'w-5 h-5')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold text-sm leading-tight break-words" style={{ color: headerText }}>
                      {w.name}
                    </h2>
                    <span className="text-[11px] font-bold opacity-90 block mt-0.5" style={{ color: headerText }}>
                      {getWalletTypeLabel(w.type)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {layoutMode === 'stack' && (
                    <span className="text-[11px] font-extrabold bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] px-2.5 py-0.5 rounded-full tabular-nums whitespace-nowrap">
                      {formatIDR(w.balance)}
                    </span>
                  )}
                  <span className="text-[10px] font-extrabold bg-white/95 text-[#073B4C] border-[1.5px] border-[#073B4C] px-2 py-0.5 rounded-full whitespace-nowrap">
                    {wTxs.length} mutasi
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditWallet(w);
                    }}
                    className="w-7 h-7 bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] hover:bg-[#FFFBEB] rounded-full flex items-center justify-center transition-colors"
                    title="Edit Dompet & Warna Header"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Balance Body */}
              <div className="p-4 bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">Saldo Tersedia</span>
                  <span
                    className={`text-lg font-extrabold tabular-nums break-all ${
                      w.balance < 0 ? 'text-red-600' : 'text-[#073B4C]'
                    }`}
                  >
                    {formatIDR(w.balance)}
                  </span>
                </div>

                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-dashed border-[#073B4C]/20 text-right">
                    <span className="text-[11px] text-teal-800 font-extrabold">
                      Melihat mutasi dompet ini ▼
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
