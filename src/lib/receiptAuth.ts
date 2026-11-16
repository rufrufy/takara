import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {User} from '../types';
import {DEFAULT_SUPABASE_CONFIG} from './supabase';
let client:SupabaseClient|undefined;
let accessToken='';
export function getAuthAccessToken(){return accessToken;}
export function getReceiptAuthClient():SupabaseClient {
 if(!client){client=createClient(DEFAULT_SUPABASE_CONFIG.url,DEFAULT_SUPABASE_CONFIG.anonKey!,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'takara_auth_session',...(typeof window!=='undefined'?{storage:window.localStorage}:{})}});client.auth.onAuthStateChange((_event,session)=>{accessToken=session?.access_token||'';});}
 return client;
}
export function accountFromRow(r:any):User{return {id:r.id,username:r.username,displayName:r.display_name,pinHash:'',role:r.role,avatarUrl:r.avatar_url||undefined,createdAt:r.created_at};}
export async function getCurrentAccount():Promise<User|null>{
 const c=getReceiptAuthClient();const session=await c.auth.getSession();accessToken=session.data.session?.access_token||'';if(!accessToken)return null;
 const verified=await c.auth.getUser();if(verified.error||!verified.data.user){accessToken='';return null;}
 const profile=await c.from('app_users').select('id,username,display_name,role,avatar_url,created_at,auth_user_id').eq('auth_user_id',verified.data.user.id).single();
 if(profile.error)return null;return accountFromRow(profile.data);
}
export async function authenticateAccount(username:string,pin:string){
 const c=getReceiptAuthClient();const login=await c.auth.signInWithPassword({email:username.trim().toLowerCase()+'@takara.invalid',password:'Takara::'+pin});
 if(login.error)return {success:false,error:'Username atau PIN tidak sesuai.'};accessToken=login.data.session?.access_token||'';
 const user=await getCurrentAccount();if(!user){await signOutAccount();return {success:false,error:'Profil akun belum terhubung ke Supabase Auth.'};}return {success:true,user};
}
export async function accountRequest(path:string,body:unknown){
 const c=getReceiptAuthClient();const session=await c.auth.getSession();accessToken=session.data.session?.access_token||'';
 const response=await fetch('/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{})},body:JSON.stringify(body)});
 let result:any;try{result=await response.json();}catch{return {success:false,error:'Layanan akun belum tersedia. Jalankan ulang server aplikasi.'};}
 if(!response.ok||!result.success)return {success:false,error:result.error||'Permintaan akun gagal.'};
 if(result.session){await c.auth.setSession(result.session);accessToken=result.session.access_token;}
 return result;
}
export async function changeAccountPin(currentPin:string,newPin:string){return accountRequest('change-pin',{currentPin,newPin});}
export async function registerAccount(displayName:string,username:string,pin:string,householdCode?:string){return accountRequest('register',{displayName,username,pin,householdCode});}
export async function adminCreateAccount(displayName:string,username:string,pin:string,role?:string){return accountRequest('admin-create',{displayName,username,pin,role});}
export async function adminUpdateAccount(userId:string,updates:{displayName?:string;username?:string;pin5Digit?:string;role?:string}){return accountRequest('admin-update',{userId,...updates});}
export async function adminDeleteAccount(userId:string){return accountRequest('admin-delete',{userId});}
export async function signOutAccount(){accessToken='';await getReceiptAuthClient().auth.signOut({scope:'local'});}
export async function ensureReceiptAuth(user:User){const current=await getCurrentAccount();if(!current||current.id!==user.id)throw new Error('Sesi akun berakhir. Silakan masuk kembali sebelum mengunggah struk.');return getReceiptAuthClient();}

export async function inviteAccount(displayName:string,username:string,pin:string,householdId:string,role='MEMBER'){return accountRequest('invite',{displayName,username,pin,householdId,role});}
