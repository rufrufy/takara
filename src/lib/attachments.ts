import type {User} from '../types';
import {ensureReceiptAuth,getReceiptAuthClient} from './receiptAuth';
const uploads=new Map<string,Promise<string>>();
const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','application/pdf':'pdf'};
export function clearReceiptSession(_userId:string){uploads.clear();}
export async function uploadReceiptPhoto(file:File|string,householdId:string,user:User):Promise<string>{
  if(typeof file==='string'&&file.startsWith('supabase-storage://receipts/')){
    if(!file.startsWith('supabase-storage://receipts/'+householdId+'/'))throw new Error('Lampiran berasal dari household berbeda.');
    return file;
  }
  let blob:Blob;
  if(typeof file==='string'){
    if(!/^data:(image\/(jpeg|png|webp|heic|heif)|application\/pdf);base64,/.test(file))throw new Error('Format lampiran tidak didukung.');
    blob=await(await fetch(file)).blob();
  }else blob=file;
  if(!extensions[blob.type]||!blob.size||blob.size>10485760)throw new Error('Gunakan gambar atau PDF maksimal 10 MB.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const key=user.id+':'+householdId+':'+digest;
  if(uploads.has(key))return uploads.get(key)!;
  const task=(async()=>{
    const client=await ensureReceiptAuth(user);
    const auth=await client.auth.getUser();if(!auth.data.user)throw new Error('Silakan login ulang.');
    const path=householdId+'/'+auth.data.user.id+'/'+crypto.randomUUID()+'.'+extensions[blob.type];
    const result=await client.storage.from('receipts').upload(path,blob,{contentType:blob.type,upsert:false});
    if(result.error)throw new Error('Unggah Supabase belum berhasil: '+result.error.message);
    const verified=await client.storage.from('receipts').createSignedUrl(path,300);
    if(verified.error)throw new Error('File terunggah, tetapi akses household belum dapat diverifikasi.');
    return 'supabase-storage://receipts/'+path;
  })();
  uploads.set(key,task);if(uploads.size>20)uploads.delete(uploads.keys().next().value!);
  try{return await task;}catch(error){uploads.delete(key);throw error;}
}
export async function resolveReceiptUrl(reference:string,user:User):Promise<string>{
  if(!reference.startsWith('supabase-storage://receipts/'))return reference;
  const path=reference.slice('supabase-storage://receipts/'.length);
  if(path.includes('..'))throw new Error('Referensi lampiran tidak valid.');
  const client=await ensureReceiptAuth(user);
  const signed=await client.storage.from('receipts').createSignedUrl(path,300);
  if(signed.error)throw new Error('Lampiran tidak dapat dibuka oleh akun ini.');
  return signed.data.signedUrl;
}
