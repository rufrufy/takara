import React from 'react';
import { Utensils, Coffee, Cake, Pizza, Beer, Apple, ShoppingCart, ShoppingBag, Shirt, Sparkles, Scissors, Package, Home, Zap, Droplet, Wifi, Trash, Wrench, Fuel, Car, Bike, Bus, Train, Plane, SquareParking as Parking, Stethoscope, Pill, Baby, Dog, Heart, GraduationCap, BookOpen, Tv, Gamepad2, Music, Dumbbell, Briefcase, Coins, TrendingUp, Building2, PiggyBank, CreditCard, Wallet, Gift, Tag, ArrowLeftRight, type LucideIcon } from 'lucide-react';

export interface IconOption {
  name: string;
  label: string;
  group: 'Makanan' | 'Belanja' | 'Rumah' | 'Transport' | 'Kesehatan' | 'Hiburan' | 'Keuangan' | 'Lainnya';
  defaultBg: string;
}

/**
 * Tropical palette followed by readable tints; existing saved colors stay unchanged.
 */
export const AVAILABLE_COLORS = [
  '#06D6A0', '#1B9AAA', '#EF476F', '#FFD166', '#073B4C',
  '#D7F7EE', '#D9F1F3', '#FFE0E8', '#FFF1CC', '#E6F0F4',
  '#A4EFDB', '#A6DFE4', '#FFC0D0', '#FFE6A3', '#B8CCD6',
  '#FFFFFF', '#F4FBFD', '#FFF2F5', '#FFFAF0', '#EDF9FB',
];

export const AVAILABLE_ICONS: IconOption[] = [
  // Makanan & Minuman
  { name: 'Utensils', label: 'Makanan / Resto', group: 'Makanan', defaultBg: '#FFD166' },
  { name: 'Coffee', label: 'Kopi & Cafe', group: 'Makanan', defaultBg: '#FFD166' },
  { name: 'Cake', label: 'Kue & Roti', group: 'Makanan', defaultBg: '#EF476F' },
  { name: 'Pizza', label: 'Fastfood / Pizza', group: 'Makanan', defaultBg: '#FFD166' },
  { name: 'Beer', label: 'Minuman & Jus', group: 'Makanan', defaultBg: '#1B9AAA' },
  { name: 'Apple', label: 'Buah & Sayuran', group: 'Makanan', defaultBg: '#06D6A0' },

  // Belanja & Fashion
  { name: 'ShoppingCart', label: 'Supermarket / Pasar', group: 'Belanja', defaultBg: '#EF476F' },
  { name: 'ShoppingBag', label: 'Mall & Butik', group: 'Belanja', defaultBg: '#D9F1F3' },
  { name: 'Shirt', label: 'Pakaian & Fashion', group: 'Belanja', defaultBg: '#1B9AAA' },
  { name: 'Sparkles', label: 'Skincare & Kosmetik', group: 'Belanja', defaultBg: '#FFD166' },
  { name: 'Scissors', label: 'Salon & Barbershop', group: 'Belanja', defaultBg: '#EF476F' },
  { name: 'Package', label: 'Paket & Kurir', group: 'Belanja', defaultBg: '#FFD166' },

  // Rumah Tangga & Utilitas
  { name: 'Home', label: 'Rumah & Sewa', group: 'Rumah', defaultBg: '#06D6A0' },
  { name: 'Zap', label: 'Listrik & PLN', group: 'Rumah', defaultBg: '#FFD166' },
  { name: 'Droplet', label: 'Air & PDAM', group: 'Rumah', defaultBg: '#1B9AAA' },
  { name: 'Wifi', label: 'Internet & Wifi', group: 'Rumah', defaultBg: '#D9F1F3' },
  { name: 'Trash', label: 'Kebersihan & Iuran', group: 'Rumah', defaultBg: '#E6F0F4' },
  { name: 'Wrench', label: 'Perbaikan / Tukang', group: 'Rumah', defaultBg: '#E6F0F4' },

  // Transportasi
  { name: 'Fuel', label: 'Bensin & BBM', group: 'Transport', defaultBg: '#EF476F' },
  { name: 'Car', label: 'Mobil & Taksi', group: 'Transport', defaultBg: '#1B9AAA' },
  { name: 'Bike', label: 'Motor & Ojol', group: 'Transport', defaultBg: '#06D6A0' },
  { name: 'Bus', label: 'Bus & Angkutan', group: 'Transport', defaultBg: '#FFD166' },
  { name: 'Train', label: 'Kereta Api / KRL', group: 'Transport', defaultBg: '#D9F1F3' },
  { name: 'Plane', label: 'Pesawat & Liburan', group: 'Transport', defaultBg: '#1B9AAA' },
  { name: 'Parking', label: 'Parkir & Tol', group: 'Transport', defaultBg: '#E6F0F4' },

  // Kesehatan & Keluarga
  { name: 'Stethoscope', label: 'Dokter & RS', group: 'Kesehatan', defaultBg: '#EF476F' },
  { name: 'Pill', label: 'Obat & Apotek', group: 'Kesehatan', defaultBg: '#EF476F' },
  { name: 'Baby', label: 'Bayi & Anak', group: 'Kesehatan', defaultBg: '#EF476F' },
  { name: 'Dog', label: 'Hewan Peliharaan', group: 'Kesehatan', defaultBg: '#FFD166' },
  { name: 'Heart', label: 'Donasi & Sedekah', group: 'Kesehatan', defaultBg: '#EF476F' },

  // Pendidikan & Hiburan
  { name: 'GraduationCap', label: 'Pendidikan & Sekolah', group: 'Hiburan', defaultBg: '#D9F1F3' },
  { name: 'BookOpen', label: 'Buku & Kursus', group: 'Hiburan', defaultBg: '#D9F1F3' },
  { name: 'Tv', label: 'Bioskop & Streaming', group: 'Hiburan', defaultBg: '#1B9AAA' },
  { name: 'Gamepad2', label: 'Game & Hobi', group: 'Hiburan', defaultBg: '#D9F1F3' },
  { name: 'Music', label: 'Musik & Konser', group: 'Hiburan', defaultBg: '#FFE0E8' },
  { name: 'Dumbbell', label: 'Gym & Olahraga', group: 'Hiburan', defaultBg: '#06D6A0' },

  // Keuangan & Pemasukan
  { name: 'Briefcase', label: 'Gaji Pokok', group: 'Keuangan', defaultBg: '#06D6A0' },
  { name: 'Coins', label: 'Bonus & THR', group: 'Keuangan', defaultBg: '#FFD166' },
  { name: 'TrendingUp', label: 'Investasi & Saham', group: 'Keuangan', defaultBg: '#06D6A0' },
  { name: 'Building2', label: 'Bisnis & Usaha', group: 'Keuangan', defaultBg: '#1B9AAA' },
  { name: 'PiggyBank', label: 'Tabungan & Emas', group: 'Keuangan', defaultBg: '#EF476F' },
  { name: 'CreditCard', label: 'Cicilan & Utang', group: 'Keuangan', defaultBg: '#EF476F' },
  { name: 'Wallet', label: 'Uang Tunai', group: 'Keuangan', defaultBg: '#FFD166' },
  { name: 'Gift', label: 'Hadiah & Hibah', group: 'Keuangan', defaultBg: '#EF476F' },
  { name: 'Tag', label: 'Lainnya / Umum', group: 'Lainnya', defaultBg: '#06D6A0' },
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
/** Keep a household's chosen category background, with legible icon contrast. */
export function categoryAppearance(color?:string):React.CSSProperties|undefined {
 if(!color||!/^#[0-9a-f]{6}$/i.test(color))return undefined;
 const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=.2126*channels[0]!+.7152*channels[1]!+.0722*channels[2]!;
 const inkChannels=[7,59,76].map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const inkLuminance=.2126*inkChannels[0]!+.7152*inkChannels[1]!+.0722*inkChannels[2]!;
 return {backgroundColor:color,color:(luminance+.05)/(inkLuminance+.05)>=1.05/(luminance+.05)?'#073B4C':'#FFFFFF'};
}
export const CategoryIcon:React.FC<CategoryIconProps> = ({name='',icon='',type='expense',bgColor,className='w-6 h-6'})=>{
 const Icon = iconSet[icon] || (type==='transfer'?ArrowLeftRight:iconSet[inferredIcons[getIcons8ColorSlug(name,'',type)] || 'Tag'] || Tag);
 return <Icon aria-hidden="true" className={className} strokeWidth={1.65} style={bgColor?{...categoryAppearance(bgColor),borderRadius:12,padding:3}:undefined}/>;
};
