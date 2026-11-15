import {ChevronDown} from 'lucide-react';
import {CategoryAppearancePicker} from './CategoryAppearancePicker';
import {CategoryIcon} from './CategoryIcon';
import React,{useEffect,useState,useRef} from 'react';
import {useApp} from '../context/AppContext';
import type {Category} from '../types';
export const CategorySettings:React.FC=()=>{
  const {state,activeHousehold,categories,addCategory,updateCategory,deleteCategory}=useApp();
  const [expanded,setExpanded]=useState(false);
  const [icon,setIcon]=useState('Tag');const [color,setColor]=useState('#CCFBF1');
  const [type,setType]=useState<'income'|'expense'>('expense');
  const [name,setName]=useState('');const [editing,setEditing]=useState<Category|null>(null);
  const [confirm,setConfirm]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);const inFlight=useRef(false);
  useEffect(()=>{setEditing(null);setName('');setError('');setNotice('');setConfirm('');},[state.activeHouseholdId]);
  const canEdit=activeHousehold.createdById===state.currentUser.id||state.members.some(m=>m.householdId===activeHousehold.id&&m.userId===state.currentUser.id&&m.role!=='VIEWER');
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setNotice('');
    try{const result=editing?await updateCategory(editing.id,{name,icon,color}):await addCategory(name,type,icon,color);
      if(!result.success)setError(result.error||'Kategori belum tersimpan.');else{setName('');setEditing(null);setNotice('Kategori tersimpan di Supabase.');}
    }finally{inFlight.current=false;setBusy(false);}
  };
  const remove=async(id:string)=>{
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setNotice('');
    try{const result=await deleteCategory(id);if(!result.success)setError(result.error||'Kategori belum terhapus.');else{setConfirm('');setNotice('Kategori dihapus dari pilihan transaksi baru. Riwayat transaksi tetap tersimpan.');if(editing?.id===id){setEditing(null);setName('');}}}
    finally{inFlight.current=false;setBusy(false);}
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
    <button type="button" onClick={()=>setExpanded(open=>!open)} aria-expanded={expanded} aria-controls="category-settings-panel" className="flex w-full items-center justify-between gap-3 text-left"><span><span className="block text-sm font-bold text-slate-900">Kategori transaksi</span><span className="mt-1 block text-xs text-slate-600">{activeHousehold.name} · {categories.length} kategori</span></span><ChevronDown className={'h-4 w-4 text-slate-600 transition-transform '+(expanded?'rotate-180':'')} /></button>
    {expanded&&<div id="category-settings-panel" className="space-y-4">
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm text-teal-700">{notice}</p>}
    <div className="flex gap-2">{(['expense','income'] as const).map(value=><button type="button" disabled={busy} key={value} onClick={()=>{setType(value);setEditing(null);setName('');setConfirm('');}} aria-pressed={type===value} className={'rounded-xl px-3 py-2 text-xs font-bold '+(type===value?'bg-teal-700 text-white':'bg-slate-100 text-slate-700')}>{value==='income'?'Pemasukan':'Pengeluaran'}</button>)}</div>
    {canEdit?<form onSubmit={save} className="flex flex-wrap items-end gap-2"><label className="flex-1 min-w-40 text-xs font-semibold text-slate-700">{editing?'Ubah nama kategori':'Kategori baru'}<input required maxLength={80} disabled={busy} value={name} onChange={e=>setName(e.target.value)} placeholder={type==='income'?'Contoh: Gaji':'Contoh: Belanja bulanan'} className="mt-1 block w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-2 focus:ring-teal-600" /></label><button disabled={busy||!name.trim()} className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy?'Menyimpan…':editing?'Simpan perubahan':'Tambah kategori'}</button>{editing&&<button type="button" disabled={busy} onClick={()=>{setEditing(null);setName('');}} className="px-3 py-2 text-xs text-slate-600">Batal</button>}<CategoryAppearancePicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} disabled={busy} /></form>:<p className="text-xs text-slate-500">Akun ini hanya dapat melihat kategori.</p>}
    <ul className="divide-y divide-slate-100">{categories.filter(c=>c.type===type).map(category=><li key={category.id} className="py-3 space-y-2"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-slate-800 break-words"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor:category.color||'#CCFBF1'}}><CategoryIcon icon={category.icon} name={category.name} type={category.type} className="h-6 w-6" /></span>{category.name}</span>{canEdit&&<div className="flex shrink-0 gap-2"><button disabled={busy} type="button" onClick={()=>{setEditing(category);setName(category.name);setIcon(category.icon||'Tag');setColor(category.color||'#CCFBF1');setError('');}} className="px-2 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-lg" aria-label={'Ubah kategori '+category.name}>Ubah</button><button disabled={busy} type="button" onClick={()=>setConfirm(category.id)} className="px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg" aria-label={'Hapus kategori '+category.name}>Hapus</button></div>}</div>{confirm===category.id&&<div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 space-y-2"><p>Hapus {category.name} dari pilihan baru? Transaksi lama tidak berubah.</p><button disabled={busy} type="button" onClick={()=>remove(category.id)} className="font-bold text-red-700 mr-4">Ya, hapus</button><button disabled={busy} type="button" onClick={()=>setConfirm('')}>Batal</button></div>}</li>)}</ul>
    {!categories.some(c=>c.type===type)&&<p className="text-sm text-slate-500">Belum ada kategori {type==='income'?'pemasukan':'pengeluaran'} untuk household ini.</p>}
    </div>}
  </section>;
};
