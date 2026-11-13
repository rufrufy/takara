import React from 'react';

export interface IconOption {
  name: string;
  label: string;
  group: 'Makanan' | 'Belanja' | 'Rumah' | 'Transport' | 'Kesehatan' | 'Hiburan' | 'Keuangan' | 'Lainnya';
  defaultBg: string;
}

/**
 * 20 Aesthetic Soft Pastel Background Colors
 */
export const AVAILABLE_COLORS = [
  '#CCFBF1', // Pastel Teal / Mint
  '#D1FAE5', // Pastel Emerald / Sage
  '#E0F2FE', // Pastel Sky
  '#BAE6FD', // Pastel Baby Blue
  '#DBEAFE', // Pastel Soft Blue
  '#E0E7FF', // Pastel Periwinkle
  '#EDE9FE', // Pastel Lavender
  '#F3E8FF', // Pastel Lilac
  '#FAE8FF', // Pastel Orchid
  '#FCE7F3', // Pastel Pink / Cotton Candy
  '#FFE4E6', // Pastel Rose
  '#FEE2E2', // Pastel Coral
  '#FFEDD5', // Pastel Peach
  '#FED7AA', // Pastel Apricot
  '#FEF3C7', // Pastel Amber / Vanilla
  '#FEF9C3', // Pastel Butter / Lemon
  '#ECFCCB', // Pastel Lime / Matcha
  '#F1F5F9', // Pastel Cloud
  '#E2E8F0', // Pastel Mist
  '#E0E7EB', // Pastel Pearl
];

export const AVAILABLE_ICONS: IconOption[] = [
  // Makanan & Minuman
  { name: 'Utensils', label: 'Makanan / Resto', group: 'Makanan', defaultBg: '#FFEDD5' },
  { name: 'Coffee', label: 'Kopi & Cafe', group: 'Makanan', defaultBg: '#FEF3C7' },
  { name: 'Cake', label: 'Kue & Roti', group: 'Makanan', defaultBg: '#FCE7F3' },
  { name: 'Pizza', label: 'Fastfood / Pizza', group: 'Makanan', defaultBg: '#FFEDD5' },
  { name: 'Beer', label: 'Minuman & Jus', group: 'Makanan', defaultBg: '#E0F2FE' },
  { name: 'Apple', label: 'Buah & Sayuran', group: 'Makanan', defaultBg: '#D1FAE5' },

  // Belanja & Fashion
  { name: 'ShoppingCart', label: 'Supermarket / Pasar', group: 'Belanja', defaultBg: '#FCE7F3' },
  { name: 'ShoppingBag', label: 'Mall & Butik', group: 'Belanja', defaultBg: '#F3E8FF' },
  { name: 'Shirt', label: 'Pakaian & Fashion', group: 'Belanja', defaultBg: '#DBEAFE' },
  { name: 'Sparkles', label: 'Skincare & Kosmetik', group: 'Belanja', defaultBg: '#FEF9C3' },
  { name: 'Scissors', label: 'Salon & Barbershop', group: 'Belanja', defaultBg: '#FFE4E6' },
  { name: 'Package', label: 'Paket & Kurir', group: 'Belanja', defaultBg: '#FED7AA' },

  // Rumah Tangga & Utilitas
  { name: 'Home', label: 'Rumah & Sewa', group: 'Rumah', defaultBg: '#D1FAE5' },
  { name: 'Zap', label: 'Listrik & PLN', group: 'Rumah', defaultBg: '#FEF9C3' },
  { name: 'Droplet', label: 'Air & PDAM', group: 'Rumah', defaultBg: '#E0F2FE' },
  { name: 'Wifi', label: 'Internet & Wifi', group: 'Rumah', defaultBg: '#EDE9FE' },
  { name: 'Trash', label: 'Kebersihan & Iuran', group: 'Rumah', defaultBg: '#E2E8F0' },
  { name: 'Wrench', label: 'Perbaikan / Tukang', group: 'Rumah', defaultBg: '#E2E8F0' },

  // Transportasi
  { name: 'Fuel', label: 'Bensin & BBM', group: 'Transport', defaultBg: '#FEE2E2' },
  { name: 'Car', label: 'Mobil & Taksi', group: 'Transport', defaultBg: '#E0F2FE' },
  { name: 'Bike', label: 'Motor & Ojol', group: 'Transport', defaultBg: '#D1FAE5' },
  { name: 'Bus', label: 'Bus & Angkutan', group: 'Transport', defaultBg: '#FED7AA' },
  { name: 'Train', label: 'Kereta Api / KRL', group: 'Transport', defaultBg: '#EDE9FE' },
  { name: 'Plane', label: 'Pesawat & Liburan', group: 'Transport', defaultBg: '#E0F2FE' },
  { name: 'Parking', label: 'Parkir & Tol', group: 'Transport', defaultBg: '#E0E7EB' },

  // Kesehatan & Keluarga
  { name: 'Stethoscope', label: 'Dokter & RS', group: 'Kesehatan', defaultBg: '#FFE4E6' },
  { name: 'Pill', label: 'Obat & Apotek', group: 'Kesehatan', defaultBg: '#FFE4E6' },
  { name: 'Baby', label: 'Bayi & Anak', group: 'Kesehatan', defaultBg: '#FCE7F3' },
  { name: 'Dog', label: 'Hewan Peliharaan', group: 'Kesehatan', defaultBg: '#FED7AA' },
  { name: 'Heart', label: 'Donasi & Sedekah', group: 'Kesehatan', defaultBg: '#FCE7F3' },

  // Pendidikan & Hiburan
  { name: 'GraduationCap', label: 'Pendidikan & Sekolah', group: 'Hiburan', defaultBg: '#E0E7FF' },
  { name: 'BookOpen', label: 'Buku & Kursus', group: 'Hiburan', defaultBg: '#E0E7FF' },
  { name: 'Tv', label: 'Bioskop & Streaming', group: 'Hiburan', defaultBg: '#E0F2FE' },
  { name: 'Gamepad2', label: 'Game & Hobi', group: 'Hiburan', defaultBg: '#F3E8FF' },
  { name: 'Music', label: 'Musik & Konser', group: 'Hiburan', defaultBg: '#FAE8FF' },
  { name: 'Dumbbell', label: 'Gym & Olahraga', group: 'Hiburan', defaultBg: '#CCFBF1' },

  // Keuangan & Pemasukan
  { name: 'Briefcase', label: 'Gaji Pokok', group: 'Keuangan', defaultBg: '#D1FAE5' },
  { name: 'Coins', label: 'Bonus & THR', group: 'Keuangan', defaultBg: '#FEF3C7' },
  { name: 'TrendingUp', label: 'Investasi & Saham', group: 'Keuangan', defaultBg: '#D1FAE5' },
  { name: 'Building2', label: 'Bisnis & Usaha', group: 'Keuangan', defaultBg: '#DBEAFE' },
  { name: 'PiggyBank', label: 'Tabungan & Emas', group: 'Keuangan', defaultBg: '#FCE7F3' },
  { name: 'CreditCard', label: 'Cicilan & Utang', group: 'Keuangan', defaultBg: '#FEE2E2' },
  { name: 'Wallet', label: 'Uang Tunai', group: 'Keuangan', defaultBg: '#FEF3C7' },
  { name: 'Gift', label: 'Hadiah & Hibah', group: 'Keuangan', defaultBg: '#FFE4E6' },
  { name: 'Tag', label: 'Lainnya / Umum', group: 'Lainnya', defaultBg: '#CCFBF1' },
];

interface CategoryIconProps {
  name?: string;
  icon?: string;
  type?: 'income' | 'expense' | 'transfer' | 'opening_balance';
  bgColor?: string;
  className?: string;
}

/**
 * Icons8-Style Highly Colorful Multi-Tone Illustrated SVG Icons
 * Paired with aesthetic soft pastel backgrounds for peak visual contrast and delight.
 */
export const getIcons8ColorSlug = (name: string, icon: string, type?: string): string => {
  const n = (name + ' ' + icon).toLowerCase();
  if (type === 'transfer' || n.includes('transfer')) return 'card-exchange';
  if (n.includes('gaji') || n.includes('income') || n.includes('pendapatan') || n.includes('briefcase')) return 'receive-cash';
  if (n.includes('kopi') || n.includes('coffee') || n.includes('cafe')) return 'cafe';
  if (n.includes('makan') || n.includes('resto') || n.includes('kuliner') || n.includes('utensils')) return 'cutlery';
  if (n.includes('pasar') || n.includes('belanja') || n.includes('shoppingcart')) return 'shopping-cart--v1';
  if (n.includes('mall') || n.includes('butik') || n.includes('shoppingbag')) return 'shopping-bag';
  if (n.includes('skincare') || n.includes('kosmetik') || n.includes('sparkles')) return 'sparkling';
  if (n.includes('rumah') || n.includes('sewa') || n.includes('home')) return 'home--v1';
  if (n.includes('listrik') || n.includes('pln') || n.includes('zap')) return 'electricity';
  if (n.includes('air') || n.includes('pdam') || n.includes('droplet')) return 'water';
  if (n.includes('wifi') || n.includes('internet')) return 'internet';
  if (n.includes('bensin') || n.includes('bbm') || n.includes('fuel') || n.includes('spbu')) return 'gas-station';
  if (n.includes('mobil') || n.includes('taksi') || n.includes('car')) return 'car--v1';
  if (n.includes('motor') || n.includes('ojol') || n.includes('bike')) return 'car--v1';
  if (n.includes('bus') || n.includes('angkutan')) return 'bus';
  if (n.includes('kereta') || n.includes('krl') || n.includes('train')) return 'train';
  if (n.includes('pesawat') || n.includes('liburan') || n.includes('plane')) return 'airplane-take-off';
  if (n.includes('dokter') || n.includes('rs') || n.includes('obat') || n.includes('apotek') || n.includes('kesehatan')) return 'medical-doctor';
  if (n.includes('bayi') || n.includes('anak') || n.includes('baby')) return 'baby-bottle';
  if (n.includes('hewan') || n.includes('kucing') || n.includes('anjing') || n.includes('dog') || n.includes('pet')) return 'dog';
  if (n.includes('pendidikan') || n.includes('sekolah') || n.includes('kuliah') || n.includes('graduation')) return 'graduation-cap';
  if (n.includes('game') || n.includes('hobi') || n.includes('gamepad')) return 'controller';
  if (n.includes('bonus') || n.includes('thr') || n.includes('coins')) return 'coins';
  if (n.includes('investasi') || n.includes('saham') || n.includes('reksadana')) return 'money-box';
  if (n.includes('bank') || n.includes('bca') || n.includes('jago') || n.includes('bri') || n.includes('mandiri')) return 'bank-building';
  if (n.includes('utang') || n.includes('cicilan') || n.includes('pinjaman') || n.includes('debt')) return 'debt';
  if (n.includes('tagihan') || n.includes('bill')) return 'bill';
  if (n.includes('dompet') || n.includes('tunai') || n.includes('cash') || n.includes('wallet')) return 'wallet--v1';
  if (n.includes('hadiah') || n.includes('hibah') || n.includes('gift')) return 'gift';
  if (n.includes('gadget') || n.includes('hp') || n.includes('pulsa') || n.includes('smartphone')) return 'smartphone';
  return 'price-tag';
};

/**
 * Icons8 Color Transparent & Colored Icon Component (https://icons8.com/icons/color)
 * Renders authentic transparent colored Icons8 icons with graceful fallback.
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = '',
  icon = '',
  type = 'expense',
  bgColor,
  className = 'w-6 h-6'
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const slug = getIcons8ColorSlug(name, icon, type);
  const icons8Url = `https://img.icons8.com/color/96/${slug}.png`;

  if (!imgFailed) {
    return (
      <img
        src={icons8Url}
        alt={name || slug}
        className={`${className} object-contain transition-transform`}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  const lowerName = name.toLowerCase();
  const lowerIcon = icon.toLowerCase();

  const renderBackground = (_defaultPastel: string) => {
    if (!bgColor) return null;
    return <rect width="48" height="48" rx="14" fill={bgColor} />;
  };
  // 1. Transfer
  if (type === 'transfer' || lowerName.includes('transfer') || lowerIcon.includes('transfer')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0F2FE')}
        <circle cx="24" cy="24" r="16" fill="#38BDF8" opacity="0.3" />
        <path d="M13 19h18m0 0l-5-5m5 5l-5 5" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 29H17m0 0l5-5m-5 5l5 5" stroke="#0369A1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="33" cy="19" r="2.5" fill="#38BDF8" />
        <circle cx="15" cy="29" r="2.5" fill="#0284C7" />
      </svg>
    );
  }

  // 2. Gaji / Income / Briefcase
  if (
    lowerIcon === 'briefcase' ||
    lowerName.includes('gaji') ||
    lowerName.includes('income') ||
    lowerName.includes('pendapatan')
  ) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#D1FAE5')}
        {/* Cash bills sticking out */}
        <rect x="18" y="10" width="12" height="7" rx="1.5" fill="#34D399" stroke="#059669" strokeWidth="1" />
        <rect x="15" y="12" width="18" height="5" rx="1" fill="#10B981" />
        {/* Briefcase Body */}
        <rect x="9" y="16" width="30" height="22" rx="4" fill="#047857" />
        <rect x="9" y="20" width="30" height="4" fill="#065F46" />
        {/* Golden Latches */}
        <rect x="15" y="18" width="4" height="6" rx="1" fill="#FBBF24" />
        <rect x="29" y="18" width="4" height="6" rx="1" fill="#FBBF24" />
        {/* Handle */}
        <path d="M19 16v-4a3 3 0 013-3h4a3 3 0 013 3v4" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 3. Bonus & THR / Coins
  if (lowerIcon === 'coins' || lowerName.includes('bonus') || lowerName.includes('thr') || lowerName.includes('koin')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEF3C7')}
        {/* Coin Stack Left */}
        <ellipse cx="19" cy="28" rx="8" ry="4" fill="#D97706" />
        <rect x="11" y="22" width="16" height="6" fill="#F59E0B" />
        <ellipse cx="19" cy="22" rx="8" ry="4" fill="#FBBF24" />
        <ellipse cx="19" cy="17" rx="8" ry="4" fill="#FDE68A" />
        {/* Standing Coin Right */}
        <circle cx="30" cy="22" r="9" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="30" cy="22" r="6.5" fill="#FDE047" />
        <path d="M30 18v8M28 20h4" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        {/* Star Sparkle */}
        <polygon points="36,11 37.5,14 40.5,15 37.5,16 36,19 34.5,16 31.5,15 34.5,14" fill="#F59E0B" />
      </svg>
    );
  }

  // 4. Investasi & Saham / TrendingUp
  if (lowerIcon === 'trendingup' || lowerName.includes('investasi') || lowerName.includes('saham') || lowerName.includes('crypto')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#D1FAE5')}
        {/* Candlesticks */}
        <rect x="12" y="24" width="4" height="12" rx="1" fill="#34D399" />
        <line x1="14" y1="20" x2="14" y2="38" stroke="#059669" strokeWidth="1.5" />
        <rect x="20" y="18" width="4" height="14" rx="1" fill="#10B981" />
        <line x1="22" y1="14" x2="22" y2="34" stroke="#047857" strokeWidth="1.5" />
        {/* Ascending Trend Arrow Line */}
        <path d="M12 32l9-9 6 5 11-13" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="38,15 39,22 32,21" fill="#047857" />
        <circle cx="38" cy="15" r="3" fill="#F59E0B" />
      </svg>
    );
  }

  // 5. Bisnis & Usaha / Building2
  if (lowerIcon === 'building2' || lowerName.includes('bisnis') || lowerName.includes('usaha') || lowerName.includes('kantor')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#DBEAFE')}
        {/* Bank Roof */}
        <polygon points="24,9 10,18 38,18" fill="#F59E0B" />
        <rect x="12" y="18" width="24" height="3" fill="#D97706" />
        {/* Columns */}
        <rect x="13" y="21" width="4" height="15" fill="#2563EB" />
        <rect x="20" y="21" width="4" height="15" fill="#3B82F6" />
        <rect x="27" y="21" width="4" height="15" fill="#2563EB" />
        <rect x="34" y="21" width="4" height="15" fill="#3B82F6" />
        {/* Steps */}
        <rect x="9" y="36" width="30" height="3" rx="1" fill="#1D4ED8" />
        <circle cx="24" cy="15" r="2" fill="#FEF08A" />
      </svg>
    );
  }

  // 6. Tabungan / PiggyBank
  if (lowerIcon === 'piggybank' || lowerName.includes('celengan')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FCE7F3')}
        {/* Piggy Body */}
        <ellipse cx="25" cy="27" rx="13" ry="11" fill="#F472B6" />
        {/* Snout */}
        <ellipse cx="14" cy="27" rx="3.5" ry="5" fill="#FB7185" />
        <circle cx="13" cy="26" r="1" fill="#881337" />
        <circle cx="13" cy="28.5" r="1" fill="#881337" />
        {/* Eye */}
        <circle cx="21" cy="23" r="1.5" fill="#881337" />
        {/* Ear */}
        <polygon points="22,18 27,15 28,21" fill="#DB2777" />
        {/* Coin dropping into slot */}
        <circle cx="26" cy="14" r="5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
        <rect x="23" y="17" width="6" height="2" rx="1" fill="#BE185D" />
      </svg>
    );
  }

  // 7. Makanan & Minuman / Utensils
  if (
    lowerIcon === 'utensils' ||
    lowerName.includes('makan') ||
    lowerName.includes('sarapan') ||
    lowerName.includes('siang') ||
    lowerName.includes('malam') ||
    lowerName.includes('ikan') ||
    lowerName.includes('ayam') ||
    lowerName.includes('tahu') ||
    lowerName.includes('tempe') ||
    lowerName.includes('sayur') ||
    lowerName.includes('resto') ||
    lowerName.includes('kuliner')
  ) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FFEDD5')}
        {/* Ramen Bowl */}
        <path d="M12 26c0 7.5 5.5 13 12 13s12-5.5 12-13H12z" fill="#DC2626" />
        <ellipse cx="24" cy="26" rx="12" ry="4" fill="#FBBF24" />
        {/* Broth & Toppings */}
        <circle cx="20" cy="25" r="2.5" fill="#FFFFFF" />
        <circle cx="20" cy="25" r="1.2" fill="#F97316" />
        <circle cx="27" cy="25" r="2" fill="#22C55E" />
        <rect x="23" y="23" width="3" height="4" rx="0.5" fill="#16A34A" />
        {/* Chopsticks */}
        <line x1="16" y1="13" x2="35" y2="24" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="11" x2="36" y2="22" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 8. Kopi & Cafe / Coffee
  if (lowerIcon === 'coffee' || lowerName.includes('kopi') || lowerName.includes('jajan') || lowerName.includes('cafe')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEF3C7')}
        {/* Saucer */}
        <ellipse cx="23" cy="37" rx="13" ry="2.5" fill="#B45309" />
        {/* Ceramic Mug */}
        <path d="M13 19h18v11a6 6 0 01-6 6h-6a6 6 0 01-6-6V19z" fill="#EA580C" />
        <ellipse cx="22" cy="19" rx="9" ry="2.5" fill="#451A03" />
        {/* Latte Heart Art */}
        <path d="M22 18.5a1.5 1.5 0 012-1c.8.3.8 1.2 0 1.8l-2 1.2-2-1.2c-.8-.6-.8-1.5 0-1.8a1.5 1.5 0 012 1z" fill="#FEF3C7" />
        {/* Handle */}
        <path d="M31 22h3a3 3 0 013 3v2a3 3 0 01-3 3h-3" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
        {/* Steam */}
        <path d="M18 13c0-2 2-3 2-4M24 12c0-2 2-3 2-4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 9. Kue & Roti / Cake
  if (lowerIcon === 'cake' || lowerName.includes('kue') || lowerName.includes('roti') || lowerName.includes('dessert')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FCE7F3')}
        {/* Bottom Tier */}
        <rect x="11" y="26" width="26" height="12" rx="3" fill="#FED7AA" />
        <path d="M11 26c3 3 6 0 9 2s6-1 9 1 5-2 8 0v-3H11z" fill="#F43F5E" />
        {/* Top Tier */}
        <rect x="16" y="17" width="16" height="9" rx="2" fill="#FED7AA" />
        <path d="M16 17c2 2 4 0 6 1s4-1 6 1 3-1 4 0v-2H16z" fill="#EC4899" />
        {/* Candle & Flame */}
        <rect x="23" y="11" width="2" height="6" fill="#38BDF8" />
        <circle cx="24" cy="9.5" r="2" fill="#F59E0B" />
        <circle cx="24" cy="9.5" r="1" fill="#EF4444" />
      </svg>
    );
  }

  // 10. Pizza / Fastfood / Burger
  if (lowerIcon === 'pizza' || lowerName.includes('pizza') || lowerName.includes('burger') || lowerName.includes('fastfood')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FFEDD5')}
        {/* Pizza Slice */}
        <polygon points="24,9 39,37 9,37" fill="#F59E0B" />
        {/* Crust */}
        <path d="M9 37c10 3 20 3 30 0" stroke="#B45309" strokeWidth="4.5" strokeLinecap="round" />
        {/* Melted Cheese Accent */}
        <polygon points="24,14 36,35 12,35" fill="#FDE047" />
        {/* Pepperoni & Toppings */}
        <circle cx="24" cy="22" r="3" fill="#DC2626" />
        <circle cx="17" cy="30" r="2.5" fill="#DC2626" />
        <circle cx="29" cy="30" r="2.5" fill="#DC2626" />
        <rect x="22" y="28" width="3" height="3" rx="1" fill="#16A34A" />
      </svg>
    );
  }

  // 11. Minuman & Jus / Beer
  if (lowerIcon === 'beer' || lowerName.includes('minum') || lowerName.includes('jus') || lowerName.includes('teh') || lowerName.includes('boba')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0F2FE')}
        {/* Cup */}
        <path d="M15 15l2 22a4 4 0 004 4h6a4 4 0 004-4l2-22H15z" fill="#38BDF8" />
        <path d="M16 20l1.5 17a3 3 0 003 3h5a3 3 0 003-3l1.5-17H16z" fill="#FB923C" />
        {/* Boba pearls / ice */}
        <circle cx="21" cy="35" r="2" fill="#78350F" />
        <circle cx="27" cy="35" r="2" fill="#78350F" />
        <circle cx="24" cy="32" r="2" fill="#78350F" />
        {/* Straw & Lime */}
        <line x1="24" y1="8" x2="28" y2="28" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="15" r="4" fill="#84CC16" />
      </svg>
    );
  }

  // 12. Buah & Sayur / Apple
  if (lowerIcon === 'apple' || lowerName.includes('buah') || lowerName.includes('apel') || lowerName.includes('sayuran')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#D1FAE5')}
        {/* Apple Body */}
        <circle cx="19" cy="27" r="10" fill="#EF4444" />
        <circle cx="29" cy="27" r="10" fill="#DC2626" />
        {/* White Gloss */}
        <path d="M16 22a6 6 0 015-3" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        {/* Green Leaf & Stem */}
        <path d="M24 17c0-4 1-6 2-7" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 13c3-4 7-2 7 1s-4 3-7-1z" fill="#16A34A" />
      </svg>
    );
  }

  // 13. Supermarket & Belanja / ShoppingCart
  if (
    lowerIcon === 'shoppingcart' ||
    lowerName.includes('belanja') ||
    lowerName.includes('pasar') ||
    lowerName.includes('supermarket') ||
    lowerName.includes('indomaret') ||
    lowerName.includes('alfamart')
  ) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FCE7F3')}
        {/* Items in cart */}
        <circle cx="23" cy="15" r="3.5" fill="#EF4444" />
        <rect x="27" y="13" width="6" height="6" rx="1" fill="#F59E0B" />
        <path d="M19 16c2-3 5-3 6 0" stroke="#16A34A" strokeWidth="2" />
        {/* Cart Wireframe */}
        <path d="M10 14h5l4 15h16l4-11H17" stroke="#0891B2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* Wheels */}
        <circle cx="21" cy="35" r="3" fill="#BE185D" />
        <circle cx="34" cy="35" r="3" fill="#BE185D" />
      </svg>
    );
  }

  // 14. Mall & Butik / ShoppingBag
  if (lowerIcon === 'shoppingbag' || lowerName.includes('mall') || lowerName.includes('butik')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#F3E8FF')}
        {/* Tissue paper */}
        <polygon points="20,16 24,10 28,16" fill="#F43F5E" />
        <rect x="12" y="16" width="24" height="23" rx="4" fill="#8B5CF6" />
        {/* Gold Emblem */}
        <circle cx="24" cy="27" r="4" fill="#FBBF24" />
        {/* Rope Handle */}
        <path d="M18 16v-4a6 6 0 0112 0v4" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // 15. Pakaian & Fashion / Shirt
  if (lowerIcon === 'shirt' || lowerName.includes('pakaian') || lowerName.includes('baju') || lowerName.includes('fashion')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#DBEAFE')}
        {/* Shirt Body */}
        <path d="M16 11l8 4 8-4 7 7-4 4-2-2v17a2 2 0 01-2 2H17a2 2 0 01-2-2V20l-2 2-4-4 7-7z" fill="#2563EB" />
        {/* White Collar & Gold Buttons */}
        <polygon points="19,11 29,11 24,17" fill="#FFFFFF" />
        <circle cx="24" cy="23" r="1.5" fill="#FDE047" />
        <circle cx="24" cy="28" r="1.5" fill="#FDE047" />
      </svg>
    );
  }

  // 16. Skincare & Kosmetik / Sparkles
  if (lowerIcon === 'sparkles' || lowerName.includes('skincare') || lowerName.includes('kosmetik') || lowerName.includes('cantik')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEF9C3')}
        {/* Perfume / Serum Bottle */}
        <rect x="17" y="18" width="14" height="19" rx="4" fill="#A855F7" />
        <rect x="19" y="21" width="10" height="13" rx="2" fill="#F472B6" />
        {/* Gold Sprayer Pump */}
        <rect x="22" y="14" width="4" height="4" fill="#F59E0B" />
        <ellipse cx="24" cy="14" rx="4" ry="1.5" fill="#D97706" />
        {/* Sparkle Stars */}
        <polygon points="37,12 38.5,15 41.5,16.5 38.5,18 37,21 35.5,18 32.5,16.5 35.5,15" fill="#EAB308" />
        <polygon points="11,28 12,30 14,31 12,32 11,34 10,32 8,31 10,30" fill="#EAB308" />
      </svg>
    );
  }

  // 17. Salon & Barbershop / Scissors
  if (lowerIcon === 'scissors' || lowerName.includes('salon') || lowerName.includes('barber') || lowerName.includes('rambut')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FFE4E6')}
        {/* Scissors Rings */}
        <circle cx="15" cy="33" r="4.5" stroke="#E11D48" strokeWidth="3" />
        <circle cx="33" cy="33" r="4.5" stroke="#E11D48" strokeWidth="3" />
        {/* Crossed Blades */}
        <line x1="18" y1="30" x2="34" y2="13" stroke="#64748B" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="30" y1="30" x2="14" y2="13" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="24" cy="23" r="2" fill="#F59E0B" />
      </svg>
    );
  }

  // 18. Paket & Kurir / Package
  if (lowerIcon === 'package' || lowerName.includes('paket') || lowerName.includes('kurir') || lowerName.includes('jne') || lowerName.includes('jnt')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FED7AA')}
        {/* 3D Box Faces */}
        <polygon points="24,10 38,18 24,26 10,18" fill="#F59E0B" />
        <polygon points="10,18 24,26 24,38 10,30" fill="#D97706" />
        <polygon points="38,18 24,26 24,38 38,30" fill="#B45309" />
        {/* Blue Tape & Red Fragile Label */}
        <path d="M19 13l10 6M17 22l14 8" stroke="#0284C7" strokeWidth="2.5" />
        <rect x="26" y="27" width="6" height="4" rx="0.5" fill="#EF4444" />
      </svg>
    );
  }

  // 19. Rumah & Sewa / Home
  if (lowerIcon === 'home' || lowerName.includes('rumah') || lowerName.includes('kos') || lowerName.includes('kontrakan')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#D1FAE5')}
        {/* Red Roof */}
        <polygon points="24,8 8,22 40,22" fill="#DC2626" />
        {/* House Walls */}
        <rect x="12" y="22" width="24" height="16" fill="#10B981" />
        {/* Chimney with Smoke */}
        <rect x="30" y="10" width="3.5" height="7" fill="#78350F" />
        <circle cx="32" cy="7" r="1.5" fill="#CBD5E1" />
        {/* Amber Windows & Wooden Door */}
        <rect x="15" y="25" width="5" height="5" rx="1" fill="#FEF08A" />
        <rect x="22" y="27" width="6" height="11" rx="1" fill="#92400E" />
      </svg>
    );
  }

  // 20. Listrik & PLN / Zap
  if (lowerIcon === 'zap' || lowerName.includes('listrik') || lowerName.includes('pln')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEF9C3')}
        {/* 3D Lightning Bolt */}
        <polygon points="27,6 13,24 23,24 20,42 36,21 26,21" fill="#EA580C" />
        <polygon points="26,8 15,23 23,23 21,38 33,22 25,22" fill="#FACC15" />
        {/* Cyan Energy Sparkles */}
        <circle cx="36" cy="14" r="2" fill="#06B6D4" />
        <circle cx="12" cy="32" r="1.5" fill="#06B6D4" />
      </svg>
    );
  }

  // 21. Air & PDAM / Droplet
  if (lowerIcon === 'droplet' || lowerName.includes('air') || lowerName.includes('pdam') || lowerName.includes('galon')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0F2FE')}
        {/* Water Droplet */}
        <path d="M24 8c-6 10-10 16-10 22a10 10 0 0020 0c0-6-4-12-10-22z" fill="#0284C7" />
        {/* Highlight Reflection */}
        <path d="M22 24c0-3.5 2-6.5 4-8.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ripple */}
        <ellipse cx="24" cy="38" rx="11" ry="2" fill="#38BDF8" opacity="0.6" />
      </svg>
    );
  }

  // 22. Wifi & Internet / Wifi
  if (lowerIcon === 'wifi' || lowerName.includes('wifi') || lowerName.includes('internet') || lowerName.includes('indihome')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#EDE9FE')}
        {/* Concentric Waves */}
        <path d="M12 17a17 17 0 0124 0" stroke="#7C3AED" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M16 22a11 11 0 0116 0" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 27a5 5 0 018 0" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="33" r="3" fill="#10B981" />
      </svg>
    );
  }

  // 23. Kebersihan / Trash
  if (lowerIcon === 'trash' || lowerName.includes('sampah') || lowerName.includes('kebersihan') || lowerName.includes('iuran')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E2E8F0')}
        {/* Wheelie Bin */}
        <rect x="14" y="16" width="20" height="21" rx="3" fill="#10B981" />
        <rect x="11" y="13" width="26" height="4" rx="1.5" fill="#059669" />
        {/* Recycling arrows */}
        <circle cx="24" cy="27" r="4.5" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6 3" />
        <circle cx="16" cy="37" r="2.5" fill="#1E293B" />
        <circle cx="32" cy="37" r="2.5" fill="#1E293B" />
      </svg>
    );
  }

  // 24. Perbaikan / Tukang / Wrench
  if (lowerIcon === 'wrench' || lowerName.includes('servis') || lowerName.includes('perbaikan') || lowerName.includes('tukang') || lowerName.includes('bengkel')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E2E8F0')}
        {/* Crossed Screwdriver & Wrench */}
        <line x1="12" y1="36" x2="36" y2="12" stroke="#EA580C" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="11" y="29" width="8" height="8" rx="2" fill="#DC2626" />
        <line x1="36" y1="36" x2="12" y2="12" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
        <circle cx="36" cy="36" r="3" fill="#475569" />
        <circle cx="14" cy="14" r="3" fill="#475569" />
      </svg>
    );
  }

  // 25. Bensin & BBM / Fuel
  if (lowerIcon === 'fuel' || lowerName.includes('bensin') || lowerName.includes('bbm') || lowerName.includes('spbu') || lowerName.includes('pertamina')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEE2E2')}
        {/* Fuel Pump */}
        <rect x="12" y="13" width="16" height="23" rx="3" fill="#DC2626" />
        <rect x="15" y="17" width="10" height="7" rx="1" fill="#FEF08A" />
        {/* Hose and Nozzle */}
        <path d="M28 17h3a3 3 0 013 3v10a2 2 0 01-2 2h-1" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="33" y="19" width="3" height="5" rx="1" fill="#F59E0B" />
      </svg>
    );
  }

  // 26. Mobil & Taksi / Car
  if (lowerIcon === 'car' || lowerName.includes('mobil') || lowerName.includes('taksi') || lowerName.includes('tol')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0F2FE')}
        {/* Car Silhouette */}
        <path d="M10 26l3-8a3 3 0 013-2h16a3 3 0 013 2l3 8v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2H16v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-8z" fill="#0284C7" />
        {/* Windshield */}
        <path d="M15 20h18l-1.5-4h-15L15 20z" fill="#BAE6FD" />
        {/* Yellow Headlights */}
        <circle cx="15" cy="28" r="2.5" fill="#FDE047" />
        <circle cx="33" cy="28" r="2.5" fill="#FDE047" />
      </svg>
    );
  }

  // 27. Motor & Ojol / Bike
  if (lowerIcon === 'bike' || lowerName.includes('motor') || lowerName.includes('ojol') || lowerName.includes('gojek') || lowerName.includes('grab')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#D1FAE5')}
        {/* Wheels */}
        <circle cx="15" cy="30" r="6" stroke="#1F2937" strokeWidth="3" fill="#9CA3AF" />
        <circle cx="33" cy="30" r="6" stroke="#1F2937" strokeWidth="3" fill="#9CA3AF" />
        {/* Frame in Green */}
        <path d="M15 30l6-13h7l5 13M21 17l4 13" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
        {/* Headlight */}
        <circle cx="28" cy="17" r="2" fill="#FDE047" />
      </svg>
    );
  }

  // 28. Bus / Bus
  if (lowerIcon === 'bus' || lowerName.includes('bus') || lowerName.includes('transjakarta')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FED7AA')}
        {/* Bus Body */}
        <rect x="12" y="11" width="24" height="24" rx="4" fill="#EAB308" />
        <rect x="14" y="15" width="20" height="9" rx="1.5" fill="#93C5FD" />
        {/* Lights and Wheels */}
        <circle cx="17" cy="29" r="2" fill="#FFFFFF" />
        <circle cx="31" cy="29" r="2" fill="#FFFFFF" />
        <rect x="16" y="35" width="4" height="3" fill="#1E293B" />
        <rect x="28" y="35" width="4" height="3" fill="#1E293B" />
      </svg>
    );
  }

  // 29. Kereta / Train
  if (lowerIcon === 'train' || lowerName.includes('kereta') || lowerName.includes('mrt') || lowerName.includes('krl')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#EDE9FE')}
        {/* Train Locomotive */}
        <rect x="13" y="10" width="22" height="27" rx="5" fill="#7C3AED" />
        <rect x="16" y="14" width="16" height="10" rx="2" fill="#DDD6FE" />
        {/* Front Lights */}
        <circle cx="18" cy="30" r="2" fill="#FDE047" />
        <circle cx="30" cy="30" r="2" fill="#FDE047" />
      </svg>
    );
  }

  // 30. Pesawat & Liburan / Plane
  if (lowerIcon === 'plane' || lowerName.includes('pesawat') || lowerName.includes('liburan') || lowerName.includes('wisata')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0F2FE')}
        {/* Cloud */}
        <ellipse cx="32" cy="34" rx="8" ry="4" fill="#FFFFFF" opacity="0.8" />
        {/* Jet Airplane */}
        <path d="M24 9l3 12 11 3-11 3-3 11-3-11-11-3 11-3z" fill="#2563EB" />
        <circle cx="24" cy="24" r="2" fill="#FBBF24" />
      </svg>
    );
  }

  // 31. Parkir / Parking
  if (lowerIcon === 'parking' || lowerName.includes('parkir')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0E7EB')}
        <rect x="11" y="11" width="26" height="26" rx="6" fill="#2563EB" />
        <path d="M20 31V17h6.5a4.5 4.5 0 010 9H20" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="33" cy="15" r="2.5" fill="#F59E0B" />
      </svg>
    );
  }

  // 32. Dokter & RS / Stethoscope
  if (lowerIcon === 'stethoscope' || lowerName.includes('dokter') || lowerName.includes('klinik') || lowerName.includes('rumah sakit')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FFE4E6')}
        {/* Hospital First Aid Kit */}
        <rect x="10" y="15" width="28" height="22" rx="5" fill="#E11D48" />
        {/* White Cross */}
        <path d="M24 20v12M18 26h12" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        {/* Chrome Handle */}
        <path d="M18 15V11a3 3 0 013-3h6a3 3 0 013 3v4" stroke="#BE123C" strokeWidth="2.5" />
      </svg>
    );
  }

  // 33. Obat & Apotek / Pill
  if (lowerIcon === 'pill' || lowerName.includes('obat') || lowerName.includes('apotek') || lowerName.includes('vitamin')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FFE4E6')}
        {/* Two-Tone Pill Capsule */}
        <g transform="rotate(-45 24 24)">
          <rect x="15" y="19" width="18" height="10" rx="5" fill="#EF4444" />
          <rect x="15" y="19" width="9" height="10" rx="5" fill="#FBBF24" />
          <line x1="24" y1="19" x2="24" y2="29" stroke="#B45309" strokeWidth="1" />
        </g>
      </svg>
    );
  }

  // 34. Bayi & Anak / Baby
  if (lowerIcon === 'baby' || lowerName.includes('bayi') || lowerName.includes('anak') || lowerName.includes('popok')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FCE7F3')}
        {/* Baby Face */}
        <circle cx="24" cy="24" r="11" fill="#F472B6" />
        <circle cx="20" cy="22" r="1.5" fill="#831843" />
        <circle cx="28" cy="22" r="1.5" fill="#831843" />
        <path d="M21 27a3 3 0 006 0" stroke="#831843" strokeWidth="2" strokeLinecap="round" />
        {/* Cute Bow */}
        <polygon points="24,13 21,9 27,9" fill="#FBBF24" />
      </svg>
    );
  }

  // 35. Hewan Peliharaan / Dog
  if (lowerIcon === 'dog' || lowerName.includes('hewan') || lowerName.includes('kucing') || lowerName.includes('anjing') || lowerName.includes('pet')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FED7AA')}
        {/* Dog Face */}
        <ellipse cx="24" cy="26" rx="10" ry="8.5" fill="#D97706" />
        {/* Chocolate Ears */}
        <ellipse cx="15" cy="20" rx="3.5" ry="5.5" fill="#78350F" />
        <ellipse cx="33" cy="20" rx="3.5" ry="5.5" fill="#78350F" />
        {/* Nose & Tongue */}
        <ellipse cx="24" cy="27" rx="3" ry="2" fill="#1F2937" />
        <path d="M24 29v3" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 36. Donasi / Sedekah / Heart
  if (lowerIcon === 'heart' || lowerName.includes('donasi') || lowerName.includes('sedekah') || lowerName.includes('amal') || lowerName.includes('zakat')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FCE7F3')}
        <path d="M24 37s-12-7-12-15a6.5 6.5 0 0112-3.5 6.5 6.5 0 0112 3.5c0 8-12 15-12 15z" fill="#E11D48" />
        {/* Gloss highlight */}
        <ellipse cx="18" cy="18" rx="2" ry="1" fill="#FFFFFF" opacity="0.7" />
        <circle cx="34" cy="14" r="2.5" fill="#FBBF24" />
      </svg>
    );
  }

  // 37. Pendidikan & Les / GraduationCap
  if (lowerIcon === 'graduationcap' || lowerName.includes('pendidikan') || lowerName.includes('sekolah') || lowerName.includes('kuliah') || lowerName.includes('les') || lowerName.includes('reina')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0E7FF')}
        {/* Mortarboard */}
        <polygon points="24,9 7,18 24,27 41,18" fill="#312E81" />
        <path d="M14 23v8c0 4 4.5 7 10 7s10-3 10-7v-8" stroke="#4338CA" strokeWidth="3" strokeLinecap="round" />
        {/* Gold Tassel */}
        <path d="M38 19v12" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="38" cy="32" r="2" fill="#D97706" />
      </svg>
    );
  }

  // 38. Buku & Kursus / BookOpen
  if (lowerIcon === 'bookopen' || lowerName.includes('buku') || lowerName.includes('kursus')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0E7FF')}
        {/* Open Hardcover */}
        <path d="M24 16c-4-3-8-3-12-2v17c4-1 8-1 12 2 4-3 8-3 12-2V14c-4-1-8-1-12 2z" fill="#3B82F6" />
        {/* Pages */}
        <path d="M24 16v17" stroke="#FEF3C7" strokeWidth="2.5" />
        <path d="M20 19H14M20 23H14M34 19H28M34 23H28" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 39. Bioskop & Streaming / Tv
  if (lowerIcon === 'tv' || lowerName.includes('bioskop') || lowerName.includes('streaming') || lowerName.includes('netflix') || lowerName.includes('film')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#E0F2FE')}
        {/* OLED Screen */}
        <rect x="9" y="13" width="30" height="21" rx="3" fill="#1E293B" />
        {/* Sunset gradient scene inside screen */}
        <rect x="11" y="15" width="26" height="17" rx="2" fill="#F43F5E" />
        <polygon points="21,19 29,23.5 21,28" fill="#FDE047" />
        {/* Stand */}
        <path d="M19 38h10M24 34v4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 40. Game & Hobi / Gamepad2
  if (lowerIcon === 'gamepad2' || lowerName.includes('game') || lowerName.includes('hobi')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#F3E8FF')}
        {/* Controller Body */}
        <rect x="9" y="15" width="30" height="19" rx="8" fill="#6D28D9" />
        {/* D-Pad */}
        <path d="M18 20v8M14 24h8" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        {/* ABXY Colored Buttons */}
        <circle cx="30" cy="21" r="1.5" fill="#EF4444" />
        <circle cx="34" cy="24" r="1.5" fill="#10B981" />
        <circle cx="30" cy="27" r="1.5" fill="#3B82F6" />
        <circle cx="26" cy="24" r="1.5" fill="#F59E0B" />
      </svg>
    );
  }

  // 41. Musik & Konser / Music
  if (lowerIcon === 'music' || lowerName.includes('musik') || lowerName.includes('spotify') || lowerName.includes('konser')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FAE8FF')}
        {/* Musical Notes */}
        <circle cx="17" cy="32" r="4.5" fill="#D946EF" />
        <circle cx="32" cy="27" r="4.5" fill="#D946EF" />
        <path d="M21 32V14l15-4v17" stroke="#A21CAF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="35" cy="11" r="2" fill="#FBBF24" />
      </svg>
    );
  }

  // 42. Gym & Olahraga / Dumbbell
  if (lowerIcon === 'dumbbell' || lowerName.includes('olahraga') || lowerName.includes('gym') || lowerName.includes('fitness')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#CCFBF1')}
        {/* Weights */}
        <rect x="13" y="17" width="4" height="14" rx="1.5" fill="#0D9488" />
        <rect x="9" y="19" width="3" height="10" rx="1" fill="#115E59" />
        <rect x="31" y="17" width="4" height="14" rx="1.5" fill="#0D9488" />
        <rect x="36" y="19" width="3" height="10" rx="1" fill="#115E59" />
        {/* Bar & Neon Grip */}
        <rect x="17" y="22" width="14" height="4" fill="#334155" />
        <rect x="21" y="21.5" width="6" height="5" rx="1" fill="#EA580C" />
      </svg>
    );
  }

  // 43. Cicilan & Utang / CreditCard
  if (lowerIcon === 'creditcard' || lowerName.includes('cicilan') || lowerName.includes('utang') || lowerName.includes('pinjol') || lowerName.includes('kpr')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEE2E2')}
        {/* Card Body in Crimson */}
        <rect x="7" y="14" width="34" height="21" rx="4" fill="#DC2626" />
        <rect x="7" y="18" width="34" height="4.5" fill="#7F1D1D" />
        {/* Golden EMV Chip & Hologram */}
        <rect x="11" y="26" width="6" height="5" rx="1" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
        <circle cx="33" cy="28.5" r="3" fill="#38BDF8" opacity="0.8" />
      </svg>
    );
  }

  // 44. Uang Tunai & Dompet / Wallet
  if (lowerIcon === 'wallet' || lowerName.includes('dompet') || lowerName.includes('tunai') || lowerName.includes('cash')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FEF3C7')}
        {/* Bills peeking out */}
        <rect x="12" y="11" width="20" height="6" rx="1" fill="#10B981" />
        {/* Leather Wallet */}
        <rect x="8" y="15" width="32" height="22" rx="4" fill="#854D0E" />
        <rect x="24" y="22" width="16" height="9" rx="2" fill="#B45309" />
        {/* Gold Clasp */}
        <circle cx="34" cy="26.5" r="2" fill="#FDE047" />
      </svg>
    );
  }

  // 45. Hadiah & THR / Gift
  if (lowerIcon === 'gift' || lowerName.includes('hadiah') || lowerName.includes('kado')) {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        {renderBackground('#FFE4E6')}
        {/* Magenta Box */}
        <rect x="9" y="19" width="30" height="19" rx="3" fill="#BE185D" />
        <rect x="7" y="13" width="34" height="6" rx="2" fill="#9D174D" />
        {/* Golden Ribbon */}
        <rect x="22" y="13" width="4" height="25" fill="#FBBF24" />
        {/* Bow */}
        <path d="M19 13c-3-4 1-5 4-2M29 13c3-4-1-5-4-2" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  // Default Tag Icon
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      {renderBackground('#CCFBF1')}
      <path d="M13 24L25 12h11v11L24 35 13 24z" fill="#0F766E" />
      <circle cx="30" cy="17" r="2.5" fill="#5EEAD4" />
    </svg>
  );
};
