// One-time migration using the official Auth Admin API; never writes to auth.users via SQL.
// Run only after setup-supabase-auth-mapping.sql and with a SERVER-ONLY key in .env.
import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Isi SUPABASE_SERVICE_ROLE_KEY di .env server terlebih dahulu.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:profiles,error}=await client.from('app_users').select('id,username,display_name,pin_hash,role,auth_user_id');
if(error)throw new Error(error.message);
const existing=new Map();
for(let page=1;;page++){
  const result=await client.auth.admin.listUsers({page,perPage:200});if(result.error)throw new Error(result.error.message);
  for(const user of result.data.users)existing.set(user.email?.toLowerCase(),user);
  if(result.data.users.length<200)break;
}
for(const profile of profiles){
  if(profile.username.startsWith('codex_check_'))continue;
  if(profile.auth_user_id){console.log(profile.username+': sudah terhubung');continue;}
  if(!/^\d{5}$/.test(profile.pin_hash))throw new Error('Format PIN akun '+profile.username+' perlu ditinjau.');
  const email=profile.username.toLowerCase()+'@takara.invalid';
  let user=existing.get(email);
  if(user&&user.app_metadata?.legacy_user_id!==profile.id)throw new Error('Identitas Auth sudah dipakai akun lain: '+profile.username);
  if(!user){
    const created=await client.auth.admin.createUser({email,password:'Takara::'+profile.pin_hash,email_confirm:true,app_metadata:{legacy_user_id:profile.id},user_metadata:{username:profile.username,display_name:profile.display_name}});
    if(created.error)throw new Error('Gagal memigrasikan '+profile.username+': '+created.error.message);
    user=created.data.user;
  }
  const linked=await client.from('app_users').update({auth_user_id:user.id,pin_hash:'AUTH_MANAGED'}).eq('id',profile.id);
  if(linked.error)throw new Error(linked.error.message);
  console.log(profile.username+': terhubung ke Supabase Auth');
}
console.log('Migrasi akun selesai. Aktifkan kebijakan akses Storage berdasarkan auth_user_id sebelum menguji lampiran.');
