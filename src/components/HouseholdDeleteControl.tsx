import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Household } from '../types';

export const HouseholdDeleteControl: React.FC<{ household: Household; disabled?: boolean; onDeleted?: () => void }> = ({ household, disabled, onDeleted }) => {
  const { deleteHousehold } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const execute = async () => {
    if (busy || name !== household.name) return;
    setBusy(true); setError('');
    try {
      const result = await deleteHousehold(household.id);
      if (result.success) { setConfirming(false); onDeleted?.(); }
      else setError(result.error || 'Household belum terhapus. Coba lagi.');
    } catch { setError('Koneksi gagal. Coba lagi.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2">
    <button type="button" disabled={disabled || busy} onClick={() => { setConfirming(true); setError(''); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40" aria-label={'Hapus household ' + household.name}><Trash2 className="w-3.5 h-3.5" />Hapus household</button>
    {confirming && <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
      <p className="text-sm font-bold text-red-900">Hapus {household.name}?</p>
      <p className="text-xs text-red-800">Household beserta seluruh transaksi, dompet, kategori, utang/piutang, dan keanggotaan di dalamnya akan dihapus permanen dari Supabase. Data ini tidak dapat dipulihkan. Akun pengguna tetap ada.</p>
      <label className="block text-xs text-red-900">Ketik nama household untuk melanjutkan<input disabled={busy} value={name} onChange={e => setName(e.target.value)} placeholder={household.name} className="mt-1 block w-full rounded-lg border border-red-200 bg-white p-2 text-sm focus:ring-2 focus:ring-red-600" /></label>
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || name !== household.name} onClick={execute} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Menghapus dari Supabase…' : 'Hapus permanen'}</button><button type="button" disabled={busy} onClick={() => { setConfirming(false); setName(''); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white">Batal</button></div>
    </div>}
  </div>;
};
