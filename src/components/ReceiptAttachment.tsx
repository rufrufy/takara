import React, {useEffect,useState} from 'react';
import {useApp} from '../context/AppContext';
import {resolveReceiptUrl} from '../lib/attachments';
export const ReceiptAttachment: React.FC<{reference:string;className?:string}> = ({reference,className}) => {
  const {state}=useApp(); const [url,setUrl]=useState(''); const [error,setError]=useState(''); const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;setUrl('');setError('');
    resolveReceiptUrl(reference,state.currentUser).then(value=>{if(active)setUrl(value);}).catch(error=>{if(active)setError(error.message);});
    const timer=setTimeout(()=>setRevision(n=>n+1),240000);
    return()=>{active=false;clearTimeout(timer);};
  },[reference,state.currentUser.id,revision]);
  if(error)return <span role="alert" className="text-xs text-red-700">{error}<button type="button" onClick={()=>setRevision(n=>n+1)} className="ml-2 underline">Coba lagi</button></span>;
  if(!url)return <span role="status" className="text-xs text-slate-500">Memuat lampiran…</span>;
  const pdf=reference.endsWith('.pdf')||reference.startsWith('data:application/pdf');
  return <a href={url} target="_blank" rel="noopener noreferrer" className={pdf?'text-sm text-teal-700 underline':undefined}>{pdf?'Buka lampiran PDF':<img src={url} alt="Lampiran struk" className={className || 'max-h-56 w-full object-contain'} onError={()=>setError('Lampiran belum dapat ditampilkan. Gunakan tautan atau coba lagi.')} />}</a>;
};
