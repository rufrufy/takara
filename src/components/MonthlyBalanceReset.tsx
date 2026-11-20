import React,{useEffect,useMemo,useRef,useState} from 'react';
import {RotateCcw,CheckCircle2} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {jakartaDateTime} from '../lib/dateTime';
import {monthlyResetCheckpoint,monthlyResetPreview,monthlyRollbackPreview,activeResetCheckpoints} from '../lib/monthlyBalance';
import {formatIDR} from '../lib/money';

export function MonthlyBalanceReset(){
 const {state,activeHousehold,members,transactions,resetMonthlyBalances,rollbackMonthlyBalance}=useApp();
 const currentPeriod=jakartaDateTime().date.slice(0,7);
 const [year,setYear]=useState(Number(currentPeriod.slice(0,4))),[month,setMonth]=useState(Number(currentPeriod.slice(5,7)));
 const [confirming,setConfirming]=useState<'reset'|'rollback'|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
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
 const lastReset=activeResetCheckpoints(transactions).flatMap(tx=>{try{return [jakartaDateTime(tx.effectiveAt).date.slice(0,7)];}catch{return [];}}).sort().at(-1);
 const blocked=Boolean(!checkpoint&&lastReset&&period<lastReset);
 const rollbackBlocked=Boolean(checkpoint&&lastReset&&period<lastReset);
 const preview=useMemo(()=>monthlyResetPreview(state.wallets.filter(w=>w.householdId===activeHousehold.id),state.ledgerEntries,state.transactions,year,month),[state.wallets,state.ledgerEntries,state.transactions,activeHousehold.id,year,month]);
 const rollbackPreview=useMemo(()=>monthlyRollbackPreview(state.wallets.filter(w=>w.householdId===activeHousehold.id),state.ledgerEntries,state.transactions,checkpoint?.id||''),[state.wallets,state.ledgerEntries,state.transactions,activeHousehold.id,checkpoint?.id]);
 useEffect(()=>{setConfirming(null);setMessage('');setError('');},[activeHousehold.id,period]);
 useEffect(()=>{setConfirming(null);},[checkpoint?.id]);
 const execute=async(action:'reset'|'rollback')=>{
  if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
  const householdId=activeHousehold.id;
  try{
   if(action==='rollback'&&!checkpoint)throw Error('Reset aktif tidak ditemukan. Muat ulang data terlebih dahulu.');
   const result=action==='rollback'?await rollbackMonthlyBalance(checkpoint!.id):await resetMonthlyBalances(period);
   if(currentHousehold.current!==householdId)return;
   if(!result.success){setError(result.error||'Reset belum tersimpan.');return;}
   setMessage(result.error||(action==='rollback'?'Reset '+monthLabel+' sudah dibatalkan. Saldo dan hitungan bulanan dipulihkan; transaksi lain tetap tersimpan.':('alreadyReset' in result&&result.alreadyReset?'Periode ini sudah pernah direset.':'Saldo penutupan '+monthLabel+' pada '+result.count+' dompet sudah dinolkan. Transaksi sesudahnya tetap dihitung.')));setConfirming(null);
  }catch(e){setError(e instanceof Error?e.message:'Reset belum tersimpan.');}
  finally{submitting.current=false;setBusy(false);}
 };
 return <section className="monthly-balance-reset bg-[#FFFDF5] rounded-3xl border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] p-5 space-y-4" aria-labelledby="monthly-reset-title">
  <div className="flex items-center gap-2.5">
   <span className="w-8 h-8 rounded-xl bg-[#FFD166] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0 text-[#073B4C]">
    <RotateCcw size={17} />
   </span>
   <h2 id="monthly-reset-title" className="font-extrabold text-sm text-[#073B4C]">Reset saldo per bulan</h2>
  </div>
  <div className="grid grid-cols-2 gap-3">
   <label className="min-w-0 text-xs font-semibold">Bulan reset<select aria-label="Bulan reset" disabled={busy} value={month} onChange={e=>setMonth(Number(e.target.value))} className="mt-1 block w-full rounded-xl p-2.5">{Array.from({length:12},(_,i)=><option key={i+1} value={i+1} disabled={year===Number(currentPeriod.slice(0,4))&&i+1>Number(currentPeriod.slice(5,7))}>{new Intl.DateTimeFormat('id-ID',{month:'long'}).format(new Date(2020,i,15))}</option>)}</select></label>
   <label className="min-w-0 text-xs font-semibold">Tahun reset<select aria-label="Tahun reset" disabled={busy} value={year} onChange={e=>{const next=Number(e.target.value);setYear(next);if(next===Number(currentPeriod.slice(0,4)))setMonth(m=>Math.min(m,Number(currentPeriod.slice(5,7))));}} className="mt-1 block w-full rounded-xl p-2.5">{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
  </div>
  <p className="text-xs leading-relaxed">Nolkan saldo penutupan {monthLabel} dan mulai ulang hitungan bulan tersebut di {activeHousehold.name}. Transaksi bulan sesudahnya tetap dihitung. Riwayat dan sisa utang tetap tersimpan. Reset dilakukan berurutan; rollback dimulai dari periode reset paling baru.</p>
  {checkpoint&&<p className="text-xs font-semibold">Periode ini sudah direset pada {new Date(checkpoint.createdAt).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB.</p>}
  {blocked&&<p role="status" className="text-xs font-semibold">Periode ini mendahului reset terakhir ({lastReset}). Pilih periode setelah reset terakhir agar penutupan bulan tetap berurutan.</p>}
  {rollbackBlocked&&<p role="status" className="text-xs font-semibold">Rollback periode {lastReset} terlebih dahulu sebelum membatalkan reset ini.</p>}
  {message&&<p role="status" className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 size={18}/>{message}</p>}
  {error&&<p role="alert" className="text-xs text-red-800">{error}</p>}
  {!allowed?<p className="text-xs">Hanya pemilik atau admin household yang dapat menjalankan reset dan rollback.</p>:!confirming?<button type="button" disabled={busy||blocked||rollbackBlocked||period>currentPeriod} onClick={()=>setConfirming(checkpoint?'rollback':'reset')} className="monthly-reset-action">{checkpoint?'Tinjau rollback '+monthLabel:'Tinjau reset '+monthLabel}</button>:confirming==='rollback'?<div className="p-4 rounded-2xl bg-[#FFFBEB] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] space-y-3">
   <p className="text-sm font-semibold">Batalkan reset {monthLabel}?</p>
   <ul className="space-y-3 text-xs">{rollbackPreview.map(w=><li key={w.id} className="space-y-1 border-b border-orange-200 pb-2"><strong className="block">{w.name}{w.isArchived?' (arsip)':''}</strong><div className="flex flex-wrap justify-between gap-1"><span>Saldo saat ini → setelah rollback</span><span className="tabular-nums">{formatIDR(w.balance)} → {formatIDR(w.balanceAfterRollback)}</span></div></li>)}</ul>
   <p className="text-xs">Hanya penyesuaian reset ini yang dibalik. Transaksi lain, termasuk yang ditambahkan setelah reset, tetap dihitung. Hitungan bulanan kembali mencakup transaksi sebelum reset. Riwayat reset dan rollback tetap tersimpan di Supabase.</p>
   <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>setConfirming(null)} className="monthly-reset-cancel">Batal</button><button type="button" disabled={busy} onClick={()=>execute('rollback')} className="monthly-reset-action" aria-busy={busy}>{busy?'Menyimpan rollback…':'Ya, rollback '+monthLabel}</button></div>
  </div>:<div className="p-4 rounded-2xl bg-[#FFFBEB] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] space-y-3">
   <p className="text-sm font-semibold">Tinjau penutupan {monthLabel}</p>
   <ul className="space-y-3 text-xs">{preview.map(w=><li key={w.id} className="space-y-1 border-b border-orange-200 pb-2">
    <strong className="block">{w.name}{w.isArchived?' (arsip)':''}</strong>
    <div className="flex flex-wrap justify-between gap-1"><span>Saldo penutupan bulan</span><span className="tabular-nums">{formatIDR(w.closingBalance)} → Rp 0</span></div>
    <div className="flex flex-wrap justify-between gap-1"><span>Saldo dompet saat ini → setelah reset</span><span className="tabular-nums">{formatIDR(w.balance)} → {formatIDR(w.balanceAfterReset)}</span></div>
   </li>)}</ul>
   <p className="text-xs">Saldo dompet saat ini dapat tetap berisi atau menjadi negatif karena transaksi sesudah bulan terpilih. Di laporan, nonaktifkan “Hitungan sejak reset saldo” untuk melihat seluruh bulan. Reset dapat dibatalkan melalui rollback, mulai dari periode paling baru.</p>
   <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>setConfirming(null)} className="monthly-reset-cancel">Batal</button><button type="button" disabled={busy} onClick={()=>execute('reset')} className="monthly-reset-action" aria-busy={busy}>{busy?'Menyimpan reset…':'Ya, reset '+monthLabel}</button></div>
  </div>}
 </section>;
}
