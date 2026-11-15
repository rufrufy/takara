import {DEFAULT_SUPABASE_CONFIG,fetchUserHouseholds,pullAllDataFromSupabase} from './supabase';
export async function loadUserFinancialData(userId:string,preferred?:string|null) {
  const membership=await fetchUserHouseholds(userId);
  const selected=membership.households.find(h=>h.id===preferred)
    || membership.households.find(h=>h.createdById!==userId && membership.members.some(m=>m.householdId===h.id))
    || membership.households[0];
  if(!selected)throw new Error('Akun belum memiliki household di Supabase.');
  const result=await pullAllDataFromSupabase(DEFAULT_SUPABASE_CONFIG,selected.id);
  if(!result.success||!result.data)throw new Error(result.error || 'Data keuangan Supabase belum dapat dimuat.');
  return {householdId:selected.id,data:{...result.data,households:membership.households,members:Array.from(new Map([...membership.members,...(result.data.members||[])].map(m=>[m.id,m])).values())}};
}
