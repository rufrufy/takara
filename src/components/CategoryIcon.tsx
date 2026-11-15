import React from 'react';
import { Utensils, Coffee, Cake, Pizza, Beer, Apple, ShoppingCart, ShoppingBag, Shirt, Sparkles, Scissors, Package, Home, Zap, Droplet, Wifi, Trash, Wrench, Fuel, Car, Bike, Bus, Train, Plane, SquareParking as Parking, Stethoscope, Pill, Baby, Dog, Heart, GraduationCap, BookOpen, Tv, Gamepad2, Music, Dumbbell, Briefcase, Coins, TrendingUp, Building2, PiggyBank, CreditCard, Wallet, Gift, Tag, ArrowLeftRight, type LucideIcon } from 'lucide-react';

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
  const n = (icon || name).toLowerCase();
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

const iconSet: Record<string,LucideIcon> = {Utensils, Coffee, Cake, Pizza, Beer, Apple, ShoppingCart, ShoppingBag, Shirt, Sparkles, Scissors, Package, Home, Zap, Droplet, Wifi, Trash, Wrench, Fuel, Car, Bike, Bus, Train, Plane, Parking, Stethoscope, Pill, Baby, Dog, Heart, GraduationCap, BookOpen, Tv, Gamepad2, Music, Dumbbell, Briefcase, Coins, TrendingUp, Building2, PiggyBank, CreditCard, Wallet, Gift, Tag};
const inferredIcons: Record<string,string> = {'receive-cash':'Briefcase',cafe:'Coffee',cutlery:'Utensils','shopping-cart--v1':'ShoppingCart','shopping-bag':'ShoppingBag',sparkling:'Sparkles','home--v1':'Home',electricity:'Zap',water:'Droplet',internet:'Wifi','gas-station':'Fuel','car--v1':'Car',bus:'Bus',train:'Train','airplane-take-off':'Plane','medical-doctor':'Stethoscope','baby-bottle':'Baby',dog:'Dog','graduation-cap':'GraduationCap',controller:'Gamepad2',coins:'Coins','money-box':'PiggyBank','bank-building':'Building2',debt:'CreditCard',bill:'CreditCard','wallet--v1':'Wallet',gift:'Gift',smartphone:'Wallet'};
export const CategoryIcon:React.FC<CategoryIconProps> = ({name='',icon='',type='expense',bgColor,className='w-6 h-6'})=>{
 const Icon = iconSet[icon] || (type==='transfer'?ArrowLeftRight:iconSet[inferredIcons[getIcons8ColorSlug(name,'',type)] || 'Tag'] || Tag);
 return <Icon aria-hidden="true" className={className} strokeWidth={1.65} style={bgColor?{backgroundColor:bgColor,borderRadius:12,padding:3}:undefined}/>;
};
