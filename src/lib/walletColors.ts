import type { Wallet, WalletType } from '../types';

export interface WalletColorPreset {
  hex: string;
  label: string;
}

export const WALLET_HEADER_COLORS: WalletColorPreset[] = [
  { hex: '#FFD166', label: 'Mango' },
  { hex: '#06D6A0', label: 'Mint' },
  { hex: '#38BDF8', label: 'Lagoon' },
  { hex: '#FF6B6B', label: 'Coral' },
  { hex: '#C4B5FD', label: 'Orchid' },
  { hex: '#BEF264', label: 'Lime' },
  { hex: '#FDBA74', label: 'Papaya' },
  { hex: '#F472B6', label: 'Berry' },
];

export const defaultWalletHeaderColor = (type?: WalletType | string): string => {
  if (type === 'digital') return '#06D6A0';
  if (type === 'cash') return '#C4B5FD';
  if (type === 'savings' || type === 'custom') return '#38BDF8';
  return '#FFD166';
};

export const resolveWalletHeaderColor = (wallet: Pick<Wallet, 'color' | 'type'>): string => {
  const c = wallet.color?.trim();
  if (c && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) {
    return c;
  }
  return defaultWalletHeaderColor(wallet.type);
};

export const getReadableHeaderText = (hexColor: string): string => {
  const clean = hexColor.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(ch => ch + ch)
          .join('')
      : clean;
  if (full.length !== 6) return '#073B4C';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 145 ? '#FFFFFF' : '#073B4C';
};
