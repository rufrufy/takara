import React,{useEffect,useMemo,useRef,useState} from 'react';
import {RotateCcw,CheckCircle2} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {jakartaDateTime} from '../lib/dateTime';
import {monthlyResetCheckpoint,monthlyResetPreview,isBalanceReset} from '../lib/monthlyBalance';
import {formatIDR} from '../lib/money';

export function MonthlyBalanceReset(){
 const {state,activeHousehold,members,transactions,resetMonthlyBalances}=useApp();
 const currentPeriod=jakartaDateTime().date.slice(0,7);
 const [year,setYear]=useState(Number(currentPeriod.slice(0,4))),[month,setMonth]=useState(Number(currentPeriod.slice(5,7)));
 const [confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const submitting=useRef(false);
 const currentHousehold=useRef(activeHousehold.id);currentHousehold.current=activeHousehold.id;
 const period=String(year)+'-'+String(month).padStart(2,'0');
 const checkpoint=monthlyResetCheckpoint(transactions,year,month);
 const allowed=activeHousehold.createdById===state.currentUser.id||members.some(m=>m.userId===state.currentUser.id&&['OWNER','ADMIN'].includes(m.role));
 const monthLabel=new Date(period+'-15T12:00:00+07:00').toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'});
 const years=useMemo(()=>{
  const recorded=transactions.flatMap(tx=>{try{return [Number(jakartaDateTime(tx.effectiveAt).date.slice(0,4))];}catch{return [];}});
  const last=Number(currentPeriod.slice(0,4)),first=Math.max(1900,Math.min(last-5,...recorded));
  return Array.from({length:last-first+1},(_,i)=>last-i);
 },[transactions,currentPeriod]);
 const lastReset=transactions.filter(tx=>isBalanceReset(tx)&&tx.status==='POSTED'&&tx.id.endsWith('-checkpoint')).flatMap(tx=>{try{return [jakartaDateTime(tx.effectiveAt).date.slice(0,7)];}catch{return [];}}).sort().at(-1);
 const blocked=Boolean(!checkpoint&&lastReset&&period<lastReset);
 const preview=useMemo(()=>monthlyResetPreview(state.wallets.filter(w=>w.householdId===activeHousehold.id),state.ledgerEntries,state.transactions,year,month),[state.wallets,state.ledgerEntries,state.transactions,activeHousehold.id,year,month]);
 useEffect(()=>{setConfirming(false);setMessage('');setError('');},[activeHousehold.id,period]);
 const execute=async()=>{
  if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
  const householdId=activeHousehold.id;
  try{
   const result=await resetMonthlyBalances(period);
   if(currentHousehold.current!==householdId)return;
   if(!result.success){setError(result.error||'Reset belum tersimpan.');return;}
   setMessage(result.error||(result.alreadyReset?'Periode ini sudah pernah direset.':'Saldo penutupan '+monthLabel+' pada '+result.count+' dompet sudah dinolkan. Transaksi sesudahnya tetap dihitung.'));setConfirming(false);
  }catch(e){setError(e instanceof Error?e.message:'Reset belum tersimpan.');}
  finally{submitting.current=false;setBusy(false);}
 };
 return <section className="monthly-balance-reset rounded-3xl p-5 space-y-4" aria-labelledby="monthly-reset-title">
  <div className="flex items-center gap-2"><RotateCcw size={19}/><h2 id="monthly-reset-title" className="font-bold text-sm">Reset saldo per bulan</h2></div>
  <div className="grid grid-cols-2 gap-3">
   <label className="min-w-0 text-xs font-semibold">Bulan reset<select aria-label="Bulan reset" disabled={busy} value={month} onChange={e=>setMonth(Number(e.target.value))} className="mt-1 block w-full rounded-xl p-2.5">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1} disabled={year===Number(currentPeriod.slice(0,4))&&i+1>Number(currentPeriod.slice(5,7))}>{new Intl.DateTimeFormat('id-ID',{month:'long'}).format(new Date(2020,i,15))}</option>)}</select></label>
   <label className="min-w-0 text-xs font-semibold">Tahun reset<select aria-label="Tahun reset" disabled={busy} value={year} onChange={e=>{const next=Number(e.target.value);setYear(next);if(next===Number(currentPeriod.slice(0,4)))setMonth(m=>Math.min(m,Number(currentPeriod.slice(5,7))));}} className="mt-1 block w-full rounded-xl p-2.5">{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
  </div>
  <p className="text-xs leading-relaxed">Nolkan saldo penutupan {monthLabel} dan mulai ulang hitungan bulan tersebut di {activeHousehold.name}. Transaksi bulan sesudahnya tetap dihitung. Riwayat dan sisa utang tetap tersimpan. Setiap periode hanya bisa direset sekali dan harus berurutan; bulan sebelum reset terakhir tidak dapat dipilih lagi.</p>
  {checkpoint&&<p className="text-xs font-semibold">Periode ini sudah direset pada {new Date(checkpoint.createdAt).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB.</p>}
  {blocked&&<p role="status" className="text-xs font-semibold">Periode ini mendahului reset terakhir ({lastReset}). Pilih periode setelah reset terakhir agar penutupan bulan tetap berurutan.</p>}
  {message&&<p role="status" className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 size={18}/>{message}</p>}
  {error&&<p role="alert" className="text-xs text-red-800">{error}</p>}
  {!allowed?<p className="text-xs">Hanya pemilik atau admin household yang dapat menjalankan reset.</p>:!confirming?<button type="button" disabled={busy||Boolean(checkpoint)||blocked||period>currentPeriod} onClick={()=>setConfirming(true)} className="monthly-reset-action">{checkpoint?'Periode sudah direset':'Tinjau reset '+monthLabel}</button>:<div className="space-y-3">
   <p className="text-sm font-semibold">Tinjau penutupan {monthLabel}</p>
   <ul className="space-y-3 text-xs">{preview.map(w=><li key={w.id} className="space-y-1 border-b border-orange-200 pb-2">
    <strong className="block">{w.name}{w.isArchived?' (arsip)':''}</strong>
    <div className="flex flex-wrap justify-between gap-1"><span>Saldo penutupan bulan</span><span className="tabular-nums">{formatIDR(w.closingBalance)} → Rp 0</span></div>
    <div className="flex flex-wrap justify-between gap-1"><span>Saldo dompet saat ini → setelah reset</span><span className="tabular-nums">{formatIDR(w.balance)} → {formatIDR(w.balanceAfterReset)}</span></div>
   </li>)}</ul>
   <p className="text-xs">Saldo dompet saat ini dapat tetap berisi atau menjadi negatif karena transaksi sesudah bulan terpilih. Di laporan, nonaktifkan “Hitungan sejak reset saldo” untuk melihat seluruh bulan. Reset belum bisa di-rollback otomatis.</p>
   <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>setConfirming(false)} className="monthly-reset-cancel">Batal</button><button type="button" disabled={busy} onClick={execute} className="monthly-reset-action" aria-busy={busy}>{busy?'Menyimpan reset…':'Ya, reset '+monthLabel}</button></div>
  </div>}
 </section>;
}
