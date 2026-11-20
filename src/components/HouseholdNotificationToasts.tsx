import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Wallet,
  CreditCard,
  Sparkles,
  PieChart,
  Trophy,
  Users,
  Tag,
  X,
  RefreshCw,
  type LucideIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { HouseholdNotificationKind } from '../types';
import type { ActiveTab } from './BottomNav';

interface NotificationVisual {
  bg: string;
  color: string;
  Icon: LucideIcon;
}

export const getNotificationVisual = (kind: HouseholdNotificationKind): NotificationVisual => {
  switch (kind) {
    case 'transaction_income':
      return { bg: '#06D6A0', color: '#073B4C', Icon: ArrowDownLeft };
    case 'transaction_expense':
      return { bg: '#FF6B6B', color: '#FFFFFF', Icon: ArrowUpRight };
    case 'transaction_transfer':
      return { bg: '#38BDF8', color: '#073B4C', Icon: ArrowRightLeft };
    case 'wallet':
      return { bg: '#FFD166', color: '#073B4C', Icon: Wallet };
    case 'debt':
      return { bg: '#FECDD6', color: '#073B4C', Icon: CreditCard };
    case 'savings_goal':
      return { bg: '#C4B5FD', color: '#073B4C', Icon: Sparkles };
    case 'budget':
      return { bg: '#FDBA74', color: '#073B4C', Icon: PieChart };
    case 'challenge':
      return { bg: '#BEF264', color: '#073B4C', Icon: Trophy };
    case 'member':
      return { bg: '#A5F3FC', color: '#073B4C', Icon: Users };
    case 'category':
    default:
      return { bg: '#FDE68A', color: '#073B4C', Icon: Tag };
  }
};

export const formatRelativeTime = (iso: string): string => {
  const diffSec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (diffSec < 45) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

interface HouseholdNotificationToastsProps {
  onNavigate: (tab: ActiveTab, entityId?: string) => void;
  isUpdatingApp?: boolean;
}

export const HouseholdNotificationToasts: React.FC<HouseholdNotificationToastsProps> = ({
  onNavigate,
  isUpdatingApp = false
}) => {
  const { activeToasts, dismissToast, markNotificationRead } = useApp();

  if (!isUpdatingApp && activeToasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[90] flex flex-col gap-2.5 w-[min(360px,calc(100vw-24px))] pointer-events-none"
      aria-live="polite"
      aria-label="Notifikasi aktivitas household"
    >
      {isUpdatingApp && (
        <div
          role="status"
          className="pointer-events-auto nb-toast-enter flex items-center gap-3 p-3.5 rounded-2xl bg-[#FFD166] text-[#073B4C] border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C]"
        >
          <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-[#073B4C] animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold leading-tight">Versi baru Takara tersedia</p>
            <p className="text-[11px] font-bold text-[#365664] mt-0.5">
              Memuat pembaruan otomatis…
            </p>
          </div>
        </div>
      )}

      {activeToasts.map((toast) => {
        const { bg, color, Icon } = getNotificationVisual(toast.kind);
        return (
          <div
            key={toast.id}
            role="status"
            onClick={() => {
              markNotificationRead(toast.id);
              dismissToast(toast.id);
              onNavigate(toast.targetTab || 'beranda', toast.entityId);
            }}
            className="pointer-events-auto nb-toast-enter group flex items-start gap-3 p-3 rounded-2xl bg-white text-[#073B4C] border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            <div
              style={{ backgroundColor: bg, color }}
              className="w-9 h-9 rounded-xl border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0 mt-0.5"
            >
              <Icon className="w-4 h-4 stroke-[2.6]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-[#073B4C] leading-tight truncate">
                  {toast.title}
                </p>
                <span className="text-[10px] font-extrabold bg-[#FEF3C7] text-[#073B4C] border border-[#073B4C] px-1.5 py-0.5 rounded-full shrink-0">
                  {formatRelativeTime(toast.createdAt)}
                </span>
              </div>
              <p className="text-xs font-bold text-[#365664] mt-1 leading-snug line-clamp-2">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(toast.id);
              }}
              className="w-6 h-6 rounded-full border-[1.5px] border-[#073B4C] bg-[#FFE0E5] hover:bg-[#FF6B6B] hover:text-white text-[#073B4C] flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5 stroke-[2.8]" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
