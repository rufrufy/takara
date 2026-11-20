import React from 'react';
import { House, ReceiptText, Wallet, ChartNoAxesCombined, Settings2 } from 'lucide-react';
export type ActiveTab = 'beranda' | 'transaksi' | 'profil-keuangan' | 'laporan' | 'pengaturan';
interface BottomNavProps { activeTab: ActiveTab; onChangeTab: (tab: ActiveTab) => void }
const tabs = [
  {id:'beranda', label:'Beranda', icon:House},
  {id:'transaksi', label:'Transaksi', icon:ReceiptText},
  {id:'profil-keuangan', label:'Dompet', icon:Wallet},
  {id:'laporan', label:'Laporan', icon:ChartNoAxesCombined},
  {id:'pengaturan', label:'Setelan', icon:Settings2},
] as const;
export const BottomNav: React.FC<BottomNavProps> = ({activeTab,onChangeTab}) => (
  <nav className="bottom-dock" aria-label="Navigasi utama">
    {tabs.map(({id,label,icon:Icon}) => <button key={id} type="button" data-nav-tab={id} aria-current={activeTab===id?'page':undefined} onClick={()=>onChangeTab(id)}>
      <Icon size={22} strokeWidth={2.3} aria-hidden="true"/><span>{label}</span>
    </button>)}
  </nav>
);
