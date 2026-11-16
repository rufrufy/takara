import {createClient} from '@supabase/supabase-js';
type Env=Record<string,string|undefined>;
const profiles='id,username,display_name,role,avatar_url,created_at,auth_user_id';
const safe=(r:any)=>({id:r.id,username:r.username,displayName:r.display_name,pinHash:'',role:r.role,avatarUrl:r.avatar_url||undefined,createdAt:r.created_at});
const attempts=new Map<string,{count:number,until:number}>();
export async function handleAuthRequest(request:Request,env:Env):Promise<Response|null>{
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/auth/'))return null;
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method!=='POST')return json({success:false,error:'Metode tidak diizinkan.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({success:false,error:'Origin tidak diizinkan.'},403);
 const base=env.SUPABASE_URL||env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY,pub=env.VITE_SUPABASE_ANON_KEY;
 if(!base||!key||!pub)return json({success:false,error:'Konfigurasi akun server belum lengkap.'},503);
 const admin=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=createClient(base,pub,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  if(Number(request.headers.get('content-length')||0)>8192)return json({success:false,error:'Permintaan terlalu besar.'},413);
  const body=await request.json() as any;
  const action=url.pathname.slice('/api/auth/'.length);
  const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'');
  let actor:any=null;
  if(bearer){const verified=await admin.auth.getUser(bearer);if(verified.error)return json({success:false,error:'Sesi berakhir. Silakan masuk kembali.'},401);const p=await admin.from('app_users').select(profiles).eq('auth_user_id',verified.data.user.id).single();actor=p.data;}
  const isAdmin=actor?.role==='ADMIN';
  if(action!=='register'&&!actor)return json({success:false,error:'Silakan masuk terlebih dahulu.'},401);
  if(action.startsWith('admin-')&&!isAdmin)return json({success:false,error:'Akses admin diperlukan.'},403);
  if(action==='change-pin'){
   if(!/^\d{5}$/.test(body.newPin)||!/^\d{5}$/.test(body.currentPin))return json({success:false,error:'PIN harus 5 digit.'},400);
   const verified=await auth.auth.signInWithPassword({email:actor.username+'@takara.invalid',password:'Takara::'+body.currentPin});if(verified.error)return json({success:false,error:'PIN lama tidak sesuai.'},400);
   const changed=await admin.auth.admin.updateUserById(actor.auth_user_id,{password:'Takara::'+body.newPin});if(changed.error)throw changed.error;
   const next=await auth.auth.signInWithPassword({email:actor.username+'@takara.invalid',password:'Takara::'+body.newPin});if(next.error)throw next.error;return json({success:true,session:next.data.session});
  }
  if(action==='register'||action==='admin-create'||action==='invite'){
   const username=String(body.username||'').trim().toLowerCase(),displayName=String(body.displayName||'').trim();
   if(!/^[a-z0-9_]{3,40}$/.test(username)||!/^\d{5}$/.test(body.pin)||!displayName||displayName.length>100)return json({success:false,error:'Nama, username, atau PIN tidak valid.'},400);
   if(action==='register'){
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'local';const now=Date.now(),entry=attempts.get(ip);if(entry&&entry.until>now&&entry.count>=10)return json({success:false,error:'Terlalu banyak percobaan. Coba lagi nanti.'},429);attempts.set(ip,{count:entry&&entry.until>now?entry.count+1:1,until:now+3600000});
   }
   const role=action==='admin-create'&&['OWNER','ADMIN','MEMBER','VIEWER'].includes(body.role)?body.role:(body.householdCode?'MEMBER':'OWNER');
   let household:any=null;if(action==='invite'){const owner=await admin.from('households').select('id,created_by_id').eq('id',body.householdId).single();if(owner.error||(!isAdmin&&owner.data.created_by_id!==actor.id))return json({success:false,error:'Hanya pemilik household dapat mengundang akun.'},403);if(!['MEMBER','VIEWER'].includes(body.role||'MEMBER'))return json({success:false,error:'Peran anggota tidak valid.'},400);household=owner.data;}if(body.householdCode){const h=await admin.from('households').select('id').eq('invite_code',String(body.householdCode).trim().toUpperCase()).maybeSingle();household=h.data;if(!household)return json({success:false,error:'Kode household tidak ditemukan.'},400);}
   const id='user-'+crypto.randomUUID();const created=await admin.auth.admin.createUser({email:username+'@takara.invalid',password:'Takara::'+body.pin,email_confirm:true,app_metadata:{legacy_user_id:id}});if(created.error)return json({success:false,error:'Username sudah digunakan atau akun tidak dapat dibuat.'},400);
   const profileRole=action==='invite'?(body.role||'MEMBER'):role;
   const saved=await admin.rpc('provision_auth_account',{p_auth_id:created.data.user.id,p_id:id,p_username:username,p_display:displayName,p_role:profileRole,p_household:household?.id||null});if(saved.error){await admin.auth.admin.deleteUser(created.data.user.id);throw saved.error;}const row=saved.data;
   if(action==='register'){const login=await auth.auth.signInWithPassword({email:username+'@takara.invalid',password:'Takara::'+body.pin});if(login.error)throw login.error;return json({success:true,user:safe(row),session:login.data.session});}
   return json({success:true,user:safe(row)});
  }
  if(action==='join-household'){
   const h=await admin.from('households').select('*').eq('invite_code',String(body.code||'').trim().toUpperCase()).maybeSingle();if(h.error||!h.data)return json({success:false,error:'Kode household tidak ditemukan.'},400);
   const existing=await admin.from('household_members').select('id,role').eq('household_id',h.data.id).eq('user_id',actor.id).maybeSingle();if(existing.error)throw existing.error;
   if(!existing.data){const saved=await admin.from('household_members').upsert({id:'mem-'+actor.id+'-'+h.data.id,household_id:h.data.id,user_id:actor.id,display_name:actor.display_name,role:'MEMBER',joined_at:new Date().toISOString()},{onConflict:'household_id,user_id',ignoreDuplicates:true});if(saved.error)throw saved.error;}
   return json({success:true,household:{id:h.data.id,name:h.data.name,createdById:h.data.created_by_id,inviteCode:h.data.invite_code,createdAt:h.data.created_at,baseCurrency:'IDR'}});
  }
  if(action==='admin-update'){
   const target=await admin.from('app_users').select(profiles).eq('id',body.userId).single();if(target.error)throw target.error;
   const changes:any={};if(body.displayName)changes.display_name=String(body.displayName).trim();if(body.username){if(!/^[a-z0-9_]{3,40}$/.test(body.username))return json({success:false,error:'Username tidak valid.'},400);changes.username=body.username;}
   if(body.role){if(!['OWNER','ADMIN','MEMBER','VIEWER'].includes(body.role))return json({success:false,error:'Peran tidak valid.'},400);changes.role=body.role;}
   const authChanges:any={};if(body.pin5Digit){if(!/^\d{5}$/.test(body.pin5Digit))return json({success:false,error:'PIN harus 5 digit.'},400);authChanges.password='Takara::'+body.pin5Digit;}if(changes.username)authChanges.email=changes.username+'@takara.invalid';
   if(Object.keys(authChanges).length){const changed=await admin.auth.admin.updateUserById(target.data.auth_user_id,authChanges);if(changed.error)throw changed.error;}
   if(Object.keys(changes).length){const saved=await admin.from('app_users').update(changes).eq('id',body.userId);if(saved.error)throw saved.error;}return json({success:true});
  }
  if(action==='admin-delete'){
   if(actor.id===body.userId)return json({success:false,error:'Akun aktif tidak dapat dihapus.'},400);
   const p=await admin.from('app_users').select(profiles).eq('id',body.userId).single();if(p.error)throw p.error;
   const deleted=await admin.auth.admin.deleteUser(p.data.auth_user_id);if(deleted.error)throw deleted.error;
   const removed=await admin.from('app_users').delete().eq('id',body.userId);if(removed.error)throw removed.error;return json({success:true});
  }
  return json({success:false,error:'Endpoint tidak ditemukan.'},404);
 }catch(error){console.error('Account operation failed:',error instanceof Error?error.message:'Supabase error');return json({success:false,error:'Perubahan akun belum tersimpan. Silakan coba lagi.'},500);}
}
