import React,{useEffect,useRef,useState} from 'react';
import {RotateCcw,CheckCircle2} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {jakartaDateTime} from '../lib/dateTime';
import {monthlyResetCheckpoint} from '../lib/monthlyBalance';
import {formatIDR} from '../lib/money';

export function MonthlyBalanceReset(){
 const {state,activeHousehold,members,wallets,transactions,resetMonthlyBalances}=useApp();
 const [confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const submitting=useRef(false);
 const currentHousehold=useRef(activeHousehold.id);currentHousehold.current=activeHousehold.id;
 const period=jakartaDateTime().date;
 const checkpoint=monthlyResetCheckpoint(transactions,Number(period.slice(0,4)),Number(period.slice(5,7)));
 const allowed=activeHousehold.createdById===state.currentUser.id||members.some(m=>m.userId===state.currentUser.id&&['OWNER','ADMIN'].includes(m.role));
 const monthLabel=new Date(`${period.slice(0,7)}-15T12:00:00+07:00`).toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'});
 useEffect(()=>{setConfirming(false);setMessage('');setError('');},[activeHousehold.id]);
 const execute=async()=>{
  if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
  const householdId=activeHousehold.id;
  try{
   const result=await resetMonthlyBalances();
   if(currentHousehold.current!==householdId)return;
   if(!result.success){setError(result.error||'Reset belum tersimpan.');return;}
   setMessage(result.error||(result.alreadyReset?'Saldo bulan ini sudah pernah direset.':`Saldo ${result.count} dompet sudah dinolkan. Riwayat tetap tersimpan di Supabase.`));setConfirming(false);
  }catch(e){setError(e instanceof Error?e.message:'Reset belum tersimpan.');}
  finally{submitting.current=false;setBusy(false);}
 };
 return <section className="monthly-balance-reset rounded-3xl p-5 space-y-4" aria-labelledby="monthly-reset-title">
  <div className="flex items-center gap-2"><RotateCcw size={19}/><h2 id="monthly-reset-title" className="font-bold text-sm">Mulai saldo bulan ini dari nol</h2></div>
  <p className="text-xs leading-relaxed">Reset saldo semua dompet dan hitungan bulanan {activeHousehold.name} untuk {monthLabel}. Penyesuaian tercatat di riwayat; transaksi lama dan sisa utang tetap tersimpan. Tersedia sekali setiap bulan.</p>
  {checkpoint&&<p className="text-xs font-semibold">Sudah direset pada {new Date(checkpoint.createdAt).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB.</p>}
  {message&&<p role="status" className="flex items-center gap-2 text-xs font-semibold"><CheckCircle2 size={18}/>{message}</p>}
  {error&&<p role="alert" className="text-xs text-red-800">{error}</p>}
  {!allowed?<p className="text-xs">Hanya pemilik atau admin household yang dapat menjalankan reset.</p>:!confirming?<button type="button" disabled={busy||Boolean(checkpoint)} onClick={()=>setConfirming(true)} className="monthly-reset-action">{checkpoint?'Sudah direset bulan ini':'Reset saldo bulanan'}</button>:<div className="space-y-3">
   <p className="text-sm font-semibold">Nolkan saldo seluruh dompet sekarang?</p>
   <ul className="space-y-2 text-xs">{wallets.map(w=><li key={w.id} className="flex justify-between gap-3"><span>{w.name}</span><span className="tabular-nums">{formatIDR(w.balance)} → Rp 0</span></li>)}</ul>
   <p className="text-xs">Hitungan pemasukan dan pengeluaran dimulai lagi dari nol. Di laporan, nonaktifkan “Hitungan sejak reset saldo” untuk melihat seluruh bulan.</p>
   <div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>setConfirming(false)} className="monthly-reset-cancel">Batal</button><button type="button" disabled={busy} onClick={execute} className="monthly-reset-action" aria-busy={busy}>{busy?'Menyimpan reset…':'Ya, nolkan saldo'}</button></div>
  </div>}
 </section>;
}
