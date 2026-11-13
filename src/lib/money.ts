/**
 * Helper pemformatan dan kalkulasi nominal Rupiah (IDR)
 * Invariant: Menggunakan integer Rupiah, hindari floating point error.
 */

export function formatIDR(amount: number, options?: { showSign?: boolean; compact?: boolean }): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  if (options?.compact && absAmount >= 1_000_000) {
    const millions = (absAmount / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',');
    const prefix = isNegative ? '-Rp ' : (options?.showSign ? '+Rp ' : 'Rp ');
    return `${prefix}${millions} jt`;
  }

  // Pemformatan ribuan dengan titik (id-ID)
  const formattedNumber = absAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (isNegative) {
    return `-Rp ${formattedNumber}`;
  }
  if (options?.showSign && amount > 0) {
    return `+Rp ${formattedNumber}`;
  }
  return `Rp ${formattedNumber}`;
}

export function parseIDRInput(value: string): number {
  if (!value) return 0;
  // Hapus semua karakter non-digit kecuali tanda minus
  const cleaned = value.replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
