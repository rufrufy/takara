import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import { jakartaDateTime } from '../../lib/dateTime';
import { resolveWalletHeaderColor, getReadableHeaderText } from '../../lib/walletColors';
import { CategoryIcon, categoryAppearance } from '../CategoryIcon';
import { Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Wallet, Plus, Search, SlidersHorizontal, Camera, ScanLine, FileUp, ChevronRight } from 'lucide-react';
import type { ActiveTab } from '../BottomNav';
import type { TransactionType } from '../../types';
interface HomeViewProps {
  onOpenQuickAdd: (type?: TransactionType) => void;
  onOpenAIScan?: () => void;
  onOpenImport: () => void;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenTransaction: (id: string) => void;
}
export const HomeView: React.FC<HomeViewProps> = ({onOpenQuickAdd,onOpenAIScan,onOpenImport,onChangeTab,onOpenTransaction}) => {
  const {wallets,transactions,categories,totalBalance,periodIncome,periodExpense,supabaseSyncStatus,syncFromSupabase} = useApp();
  const [showBalance,setShowBalance] = useState(true);
  const [query,setQuery] = useState('');
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [type,setType] = useState('all');
  const [walletId,setWalletId] = useState('all');
  const filtered = useMemo(()=>transactions.filter(t=>
    (type==='all'||t.type===type) && (walletId==='all'||t.sourceWalletId===walletId||t.destinationWalletId===walletId) &&
    `${t.description||''} ${t.categoryName||''} ${t.addedBy||''}`.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id'))
  ).sort((a,b)=>Date.parse(b.effectiveAt)-Date.parse(a.effectiveAt)).slice(0,12),[transactions,query,type,walletId]);
  const today = jakartaDateTime(new Date().toISOString()).date;
  const yesterday = jakartaDateTime(new Date(Date.now()-86400000).toISOString()).date;
  const groups = useMemo(()=> {
    const result = new Map<string, typeof filtered>();
    for(const t of filtered){ const key=jakartaDateTime(t.effectiveAt).date; result.set(key,[...(result.get(key)||[]),t]); }
    return [...result];
  },[filtered]);
  const displayDate=(date:string)=>date===today?'Hari ini':date===yesterday?'Kemarin':new Date(`${date}T12:00:00+07:00`).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  return <div className="home-view">
    {supabaseSyncStatus.status==='error'&&<div role="alert" className="sync-error"><p>{supabaseSyncStatus.error||'Data belum dapat dimuat.'}</p><button onClick={()=>syncFromSupabase()}>Coba lagi</button></div>}
    <section className="balance-panel" aria-label="Saldo household">
      <p className="balance-label">🌴 Saldo tersedia</p>
      <div className="balance-main"><div className="balance-value"><strong>{showBalance?formatIDR(totalBalance):'Rp ••••••'}</strong><button className="balance-eye" onClick={()=>setShowBalance(!showBalance)} aria-label={showBalance?'Sembunyikan saldo':'Tampilkan saldo'}>{showBalance?<Eye size={18} strokeWidth={2.3}/>:<EyeOff size={18} strokeWidth={2.3}/>}</button></div>
        <button className="record-button" onClick={onOpenAIScan} aria-label="Scan struk"><ScanLine size={19} strokeWidth={2.4}/><span>Scan AI</span></button>
      </div>
      <div className="balance-flows">
        <button onClick={()=>onOpenQuickAdd('income')} aria-label="Catat pemasukan"><ArrowDownLeft size={17} strokeWidth={2.6}/><span>Masuk <b>{showBalance?formatIDR(periodIncome):'••••••'}</b></span></button>
        <button onClick={()=>onOpenQuickAdd('expense')} aria-label="Catat pengeluaran"><ArrowUpRight size={17} strokeWidth={2.6}/><span>Keluar <b>{showBalance?formatIDR(periodExpense):'••••••'}</b></span></button>
      </div>
    </section>
    <div className="wallet-strip no-scrollbar" aria-label="Saldo tiap dompet">
      {[...wallets].sort((a,b)=>b.balance-a.balance||a.name.localeCompare(b.name,'id')).map(w=>{const hc=resolveWalletHeaderColor(w);const ht=getReadableHeaderText(hc);return <button key={w.id} data-wallet-type={w.type} onClick={()=>onChangeTab('profil-keuangan')}><span style={{backgroundColor:hc,color:ht}}><Wallet size={14} strokeWidth={2.4}/>{w.name}</span><b>{showBalance?formatIDR(w.balance):'••••••'}</b></button>;})}
      {!wallets.length&&<button onClick={()=>onChangeTab('profil-keuangan')}><span style={{backgroundColor:'#06D6A0',color:'#073B4C'}}><Plus size={15} strokeWidth={2.6}/>Tambah dompet</span><b>Mulai catat</b></button>}
    </div>
    <section className="daily-activity" aria-labelledby="daily-title">
      <div className="activity-heading"><h1 id="daily-title">Catatan Harian</h1><div className="activity-heading-actions"><button type="button" className="home-scan-button" onClick={onOpenAIScan} aria-label="Scan struk otomatis" title="Scan struk otomatis"><Camera size={20}/></button><button onClick={()=>onChangeTab('transaksi')} aria-label="Lihat semua transaksi"><ChevronRight size={20}/></button></div></div>
      <div className="home-search-panel"><div className="activity-search"><label><Search size={20}/><input type="search" aria-label="Cari catatan harian" placeholder="Cari transaksi…" value={query} onChange={e=>setQuery(e.target.value)}/></label><button aria-label="Filter catatan harian" aria-expanded={filtersOpen} aria-controls="daily-filters" className={type!=='all'||walletId!=='all'?'has-filter':''} onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={21}/></button></div>
      {filtersOpen&&<div className="daily-filters" id="daily-filters"><label>Jenis transaksi<select value={type} onChange={e=>setType(e.target.value)}><option value="all">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="transfer">Transfer</option></select></label><label>Dompet<select value={walletId} onChange={e=>setWalletId(e.target.value)}><option value="all">Semua dompet</option>{wallets.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>}
      </div>
      <div className="daily-list">
        {groups.map(([date,items])=><section key={date} className="day-group" aria-label={displayDate(date)}><h2>{displayDate(date)}</h2>{items.map(t=>{
          const category=categories.find(c=>c.householdId===t.householdId&&(c.id===t.categoryId||(c.type===t.type&&c.name.toLocaleLowerCase('id')===t.categoryName?.toLocaleLowerCase('id'))));
          return <button className="daily-row" key={t.id} onClick={()=>onOpenTransaction(t.id)} aria-label={`Lihat transaksi ${t.description||t.categoryName}, ${formatIDR(t.amount)}`}>
            <span className="daily-icon" style={categoryAppearance(category?.color)}><CategoryIcon name={t.categoryName} type={t.type} icon={category?.icon} className="w-5 h-5"/></span>
            <span className="daily-description"><strong>{t.description||t.categoryName||'Transfer antar dompet'}</strong><small>{t.time||jakartaDateTime(t.effectiveAt).time}{t.addedBy?` · ${t.addedBy.split(' ')[0]}`:''}</small></span>
            <span className={`daily-amount is-${t.type}`}>{t.type==='income'?'+':t.type==='expense'?'−':''}{formatIDR(t.amount)}</span>
          </button>;
        })}</section>)}
        {!filtered.length&&<div className="daily-empty"><p>{transactions.length?'Tidak ada transaksi yang cocok.':'Belum ada catatan di household ini.'}</p><button onClick={()=>{if(transactions.length){setQuery('');setType('all');setWalletId('all');}else onOpenQuickAdd();}}>{transactions.length?'Reset pencarian':'Catat transaksi pertama'}</button></div>}
      </div>
    </section>
    <div className="home-tools"><button onClick={onOpenAIScan}><Camera size={18}/>Scan struk</button><button onClick={onOpenImport}><FileUp size={18}/>Impor data</button><button onClick={()=>onChangeTab('transaksi')}>Semua transaksi<ChevronRight size={17}/></button></div>
  </div>;
};
