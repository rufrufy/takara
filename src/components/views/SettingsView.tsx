import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import {
  Shield,
  KeyRound,
  Users,
  Copy,
  Check,
  FileSpreadsheet,
  RefreshCw,
  Download,
  Lock,
  ChevronRight,
  Sparkles,
  Share2,
  Cpu,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Layers,
  LogOut,
  Laptop,
  Smartphone as PhoneIcon,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import type { UserRole } from '../../types';

interface SettingsViewProps {
  onOpenImport: () => void;
  onOpenAdmin: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenImport, onOpenAdmin }) => {
  const {
    state,
    activeHousehold,
    members,
    periodIncome,
    periodExpense,
    netCashFlow,
    updatePIN,
    resetToDefault,
    lockApp,
    logoutUser,
    terminateSession,
    sessions,
    activeSession,
    inviteMember,
    removeMember
  } = useApp();
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Invite Member Modal / Inline Form
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER');
  const [invitePin, setInvitePin] = useState('12345');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');

  const inviteCode = activeHousehold.inviteCode || 'DK-KLRG-8921';
  const inviteLink = `https://dompetkita.app/join?code=${inviteCode}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo! Yuk gabung ke pencatatan keuangan keluarga kita di DompetKita (${activeHousehold.name}).\n\nKode Undangan: ${inviteCode}\nTautan: ${inviteLink}\nPIN default: 12345`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 5) {
      updatePIN(newPin);
      setPinSuccess(true);
      setTimeout(() => {
        setIsChangingPin(false);
        setPinSuccess(false);
        setNewPin('');
      }, 1500);
    }
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;

    const res = inviteMember(
      inviteName.trim(),
      inviteUsername.trim() || inviteName.trim().toLowerCase().replace(/\s+/g, ''),
      inviteRole,
      invitePin.trim() || '12345'
    );

    if (res.success) {
      setInviteSuccessMsg(`✓ Anggota "${inviteName}" berhasil diundang!`);
      setInviteName('');
      setInviteUsername('');
      setInvitePin('12345');
      setIsAddingMember(false);
      setTimeout(() => setInviteSuccessMsg(''), 4000);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `backup-dompetkita-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDataImported = state.transactions.length >= 74;

  return (
    <div className="space-y-4 pb-24 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Pengaturan</h1>
        <p className="text-xs text-slate-500">
          Database Keuangan, undang keluarga, keamanan PIN 5-digit, dan dashboard admin AI
        </p>
      </div>

      {/* Success Notification */}
      {inviteSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{inviteSuccessMsg}</span>
        </div>
      )}

      {/* User Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-extrabold text-lg flex items-center justify-center border border-teal-200">
            {state.currentUser.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm leading-tight">
              {state.currentUser.displayName}
            </h2>
            <div className="text-xs text-slate-500">@{state.currentUser.username} • {state.currentUser.role || 'Owner Household'}</div>
            <span className="inline-block mt-1 text-[10px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full border border-teal-100">
              {activeHousehold.name}
            </span>
          </div>
        </div>

        <button
          onClick={logoutUser}
          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Keluar dari Akun (Logout)"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span>Keluar (Logout)</span>
        </button>
      </div>

      {/* SEKSI 1: STATUS DATABASE KEUANGAN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 text-sm">Status Database Transaksi</h2>
          </div>
          {state.transactions.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>{state.importHistory && state.importHistory.length > 0 ? 'Data Excel Terhubung' : 'Data Aktif'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
              <span>Database Baru (Kosong)</span>
            </span>
          )}
        </div>

        {/* Database Status Card */}
        <div className="p-4 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">
              {activeHousehold.name}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">
              {state.importHistory && state.importHistory.length > 0
                ? `Ekspor Excel: ${state.importHistory[0]?.exportedOn || '10 Nov 2026'}`
                : 'Pembukuan Mandiri'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold">Total Transaksi</div>
              <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                {state.transactions.length} Data
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold">Pemasukan</div>
              <div className="text-sm font-extrabold text-emerald-600 tabular-nums">
                {formatIDR(periodIncome)}
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold">Pengeluaran</div>
              <div className="text-sm font-extrabold text-red-600 tabular-nums">
                {formatIDR(periodExpense)}
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
              <div className="text-[10px] text-slate-500 font-semibold">Arus Kas Bersih</div>
              <div className="text-sm font-extrabold text-teal-700 tabular-nums">
                {netCashFlow >= 0 ? `+${formatIDR(netCashFlow)}` : formatIDR(netCashFlow)}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-emerald-800/80 pt-1 leading-relaxed">
            {state.transactions.length > 0
              ? 'Data transaksi dan dompet keluarga terhubung penuh ke sistem akuntansi ledger.'
              : 'Belum ada transaksi. Anda dapat mulai mencatat pengeluaran harian atau mengimpor data Excel (.xlsx).'}
          </p>
        </div>
        {/* Action Button: Import New Excel file */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={onOpenImport}
            className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Impor Berkas Excel Baru (.xlsx)</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Unduh Cadangan JSON</span>
          </button>
        </div>
      </div>

      {/* SEKSI 2: UNDANG KELUARGA (HOUSEHOLD INVITATION) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-700" />
            <h2 className="font-bold text-slate-900 text-sm">Kolaborasi & Anggota Keluarga ({members.length})</h2>
          </div>
          <button
            onClick={() => setIsAddingMember(!isAddingMember)}
            className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Undang Anggota</span>
          </button>
        </div>

        {/* Invite Code & WhatsApp Share Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-800">Kode Undangan Household</div>
              <div className="text-lg font-mono font-extrabold text-teal-800 tracking-wider mt-0.5">
                {inviteCode}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Undang via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Member Form (Inline Collapsible) */}
        {isAddingMember && (
          <form onSubmit={handleAddMemberSubmit} className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200 space-y-3 animate-in fade-in">
            <div className="text-xs font-bold text-teal-900 flex items-center justify-between">
              <span>Formulir Undangan Anggota Keluarga Baru</span>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Misal: Zakia Nurul Hanifa"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Username Login</label>
                <input
                  type="text"
                  placeholder="Misal: zakia"
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Peran di Household</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="ADMIN">Co-Admin (Pasangan)</option>
                  <option value="MEMBER">Anggota Keluarga (Member)</option>
                  <option value="VIEWER">Hanya Melihat (Viewer / Anak)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode Unik 5-Digit untuk Login</label>
                <input
                  type="text"
                  maxLength={5}
                  value={invitePin}
                  onChange={e => setInvitePin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Kirim & Daftarkan
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="divide-y divide-slate-100">
          {members.map(m => (
            <div key={m.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  {m.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{m.displayName}</div>
                  <div className="text-[10px] text-slate-400">
                    Peran: <span className="font-semibold text-teal-800">{m.role}</span> • Login: {m.userId.replace('user-', '')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                  Aktif
                </span>
                {members.length > 1 && m.displayName !== state.currentUser.displayName && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="p-1 text-slate-300 hover:text-red-600 rounded"
                    title="Keluarkan dari Household"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEKSI 3: KEAMANAN & KODE UNIK 5-DIGIT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-700" />
          <h2 className="font-bold text-slate-900 text-sm">Keamanan & Kode Unik 5-Digit</h2>
        </div>

        {!isChangingPin ? (
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-xs font-bold text-slate-800">Ubah 5-Digit Kode Unik Akun</div>
              <div className="text-[11px] text-slate-500">Kode unik saat ini: •••••</div>
            </div>
            <button
              onClick={() => setIsChangingPin(true)}
              className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold"
            >
              Ubah Kode 5-Digit
            </button>
          </div>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-700">Masukkan 5-Digit Kode Baru:</div>
            <input
              type="password"
              maxLength={5}
              inputMode="numeric"
              placeholder="Contoh: 12345"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-center text-lg tracking-widest font-bold focus:outline-none focus:ring-1 focus:ring-teal-600"
              autoFocus
            />
            {pinSuccess && (
              <div className="text-xs text-emerald-600 font-semibold text-center">
                ✓ Kode 5-digit berhasil diperbarui!
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsChangingPin(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={newPin.length !== 5}
                className="px-4 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg disabled:opacity-50"
              >
                Simpan Kode
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SEKSI 4: SESI LOGIN AKTIF & RIWAYAT PERANGKAT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-teal-700" />
            <h2 className="font-bold text-slate-900 text-sm">Sesi Login Aktif & Perangkat ({sessions.length})</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">Tersimpan Otomatis</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Sesi Anda tetap tersimpan di perangkat ini sehingga tidak perlu login ulang tiap membuka aplikasi, kecuali jika Anda menekan tombol keluar.
        </p>

        {/* Sessions List */}
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
          {sessions.map(sess => {
            const isDesktop = sess.device.toLowerCase().includes('windows') || sess.device.toLowerCase().includes('mac') || sess.device.toLowerCase().includes('desktop');
            const isCurrent = sess.id === state.activeSessionId || sess.isCurrent;

            return (
              <div key={sess.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isDesktop ? <Laptop className="w-4 h-4" /> : <PhoneIcon className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{sess.device}</span>
                      {isCurrent ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          Sesi Ini (Aktif)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-1.5 py-0.5 rounded">
                          Tersimpan
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {sess.browser} • Login: {new Date(sess.loginAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div>
                  {!isCurrent ? (
                    <button
                      type="button"
                      onClick={() => terminateSession(sess.id)}
                      className="px-2.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cabut
                    </button>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block mr-2" title="Aktif"></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Big Red Logout Button */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={logoutUser}
            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Keluar dari Akun (Logout Sesi Ini)</span>
          </button>
        </div>
      </div>

      {/* SEKSI 5: KONEKSI SUPABASE CLOUD */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-slate-900 text-sm">Koneksi Supabase Cloud</h2>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            Terhubung Langsung
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Project URL</span>
            <div className="font-mono text-slate-800 text-[11px] truncate">
              {state.supabaseConfig?.url || 'https://gnjrysgmiqapbjroishz.supabase.co'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Publishable Key</span>
            <div className="font-mono text-emerald-700 text-[11px] truncate font-semibold">
              {state.supabaseConfig?.anonKey || 'sb_publishable_3vfImmTVWfPlk9YsPQ64Mg_dAWg0jqT'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Secret Key (Admin Direct Bypass)</span>
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="text-slate-400 hover:text-slate-600 text-[11px] flex items-center gap-1"
              >
                {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showSecretKey ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
            </div>
            <div className="font-mono text-slate-800 text-[11px] truncate font-semibold">
              {showSecretKey ? (state.supabaseConfig?.secretKey || '(Belum dikonfigurasi / Kosong)') : '••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm">Dashboard Admin & Pengaturan AI</h2>
                <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-400/30">
                  SHADCN UI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur Vision API URL & Key untuk pembaca foto struk dan cloud Supabase
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Model: <span className="text-teal-300 font-mono font-semibold">{state.aiConfig?.model || 'gpt-4o-mini'}</span>
          </span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <span>Buka Dashboard Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
