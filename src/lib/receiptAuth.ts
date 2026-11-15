import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {User} from '../types';
import {DEFAULT_SUPABASE_CONFIG} from './supabase';
let client:SupabaseClient|undefined;
export function getReceiptAuthClient():SupabaseClient {
  if(!client)client=createClient(DEFAULT_SUPABASE_CONFIG.url,DEFAULT_SUPABASE_CONFIG.anonKey!,{
    auth:{persistSession:true,autoRefreshToken:true,storageKey:'takara_auth_session',...(typeof window!=='undefined'?{storage:window.sessionStorage}:{})}
  });
  return client;
}
export async function ensureReceiptAuth(user:User) {
  const client=getReceiptAuthClient();
  const {data}=await client.auth.getSession();
  if(data.session?.user.app_metadata?.legacy_user_id===user.id)return client;
  await client.auth.signOut();
  const result=await client.auth.signInWithPassword({email:user.username.toLowerCase()+'@takara.invalid',password:'Takara::'+user.pinHash});
  if(result.error||result.data.user?.app_metadata?.legacy_user_id!==user.id)throw new Error('Akun Supabase Auth belum aktif atau sesi berakhir. Aktivasi migrasi akun diperlukan sebelum mengunggah lampiran.');
  return client;
}
