import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_AI_CONFIG, testRealAIConnection, detectAIProvider, resolveGeminiEndpoint, normalizeAIEndpoint, getSystemAIConfig } from '../../lib/aiScanner';
import { DEFAULT_SUPABASE_CONFIG, testSupabaseConnection } from '../../lib/supabase';
import {
  Shield,
  Cpu,
  Database,
  Users,
  Key,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Server,
  CloudUpload,
  Plus,
  Trash2,
  CheckCircle2,
  LogOut,
  Laptop,
  Smartphone as PhoneIcon,
  Activity,
  Home,
  Edit2,
  X,
  Code,
  ArrowRightLeft,
  UserPlus
} from 'lucide-react';
import type { UserRole, HouseholdMember, Household, User } from '../../types';

interface AdminDashboardViewProps {
  onBack?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBack }) => {
  const {
    state,
    activeHousehold,
    households,
    switchHousehold,
    createHousehold,
    updateHousehold,
    deleteHousehold,
    updateAIConfig,
    updateSupabaseConfig,
    inviteMember,
    updateMember,
    removeMember,
    syncAllToSupabase,
    syncFromSupabase,
    supabaseSyncStatus,
    logoutUser,
    terminateSession,
    sessions,
    addMemberToHousehold,
    removeMemberFromHousehold,
    registeredUsers,
    adminCreateUser,
    updateRegisteredUser,
    deleteUser,
    allHouseholds,
    allMembers
  } = useApp();

  const currentAI = getSystemAIConfig();
  const currentSupabase = state.supabaseConfig || DEFAULT_SUPABASE_CONFIG;

  const [activeTab, setActiveTab] = useState<'members' | 'households' | 'ai' | 'supabase' | 'sessions'>('members');

  // AI Configuration State
  const [provider, setProvider] = useState(currentAI.provider);
  const [apiUrl, setApiUrl] = useState(currentAI.apiUrl);
  const [apiKey, setApiKey] = useState(currentAI.apiKey);
  const [model, setModel] = useState(currentAI.model);
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(currentAI.systemPrompt || DEFAULT_AI_CONFIG.systemPrompt || '');

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState(currentSupabase.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentSupabase.anonKey);
  const [supabaseSecretKey, setSupabaseSecretKey] = useState(currentSupabase.secretKey || '');
  const [supabaseBucket, setSupabaseBucket] = useState(currentSupabase.bucket);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  // New User State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('OWNER');
  const [newMemberPin, setNewMemberPin] = useState('12345');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // Edit User State
  const [editingRegisteredUser, setEditingRegisteredUser] = useState<User | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberUsername, setEditMemberUsername] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<UserRole>('OWNER');
  const [editMemberPin, setEditMemberPin] = useState('12345');
  const [editMemberError, setEditMemberError] = useState('');
  // Household Management State
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [editHouseholdName, setEditHouseholdName] = useState('');
  const [householdError, setHouseholdError] = useState('');
  const [householdSuccess, setHouseholdSuccess] = useState('');
  const [hhNewMemberName, setHhNewMemberName] = useState('');
  const [hhNewMemberUsername, setHhNewMemberUsername] = useState('');
  const [hhNewMemberRole, setHhNewMemberRole] = useState<UserRole>('MEMBER');
  const [hhMemberError, setHhMemberError] = useState('');
  // Status & Feedback
  const [saveToast, setSaveToast] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<string | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Presets
  const applyPreset = (selectedPreset: 'openai' | 'gemini' | 'custom') => {
    setProvider(selectedPreset);
    if (selectedPreset === 'openai') {
      setApiUrl('https://api.openai.com/v1/chat/completions');
      setModel('gpt-4o-mini');
    } else if (selectedPreset === 'gemini') {
      setApiUrl('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
      setModel('gemini-1.5-flash');
    } else if (selectedPreset === 'custom') {
      setApiUrl('https://9r.bkpp.web.id/v1');
      setModel('ag/gemini-3.8-flash');
      if (!apiKey || apiKey.startsWith('AIza')) {
        setApiKey('sk-915bde2d5d0f619a-u6ajkz-0330dedf');
      }
    }
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    // Auto-detect hanya bila apiUrl masih default/kosong
    const isDefaultUrl = !apiUrl || apiUrl.includes('api.openai.com') || apiUrl.includes('googleapis.com');
    if (isDefaultUrl) {
      const detected = detectAIProvider(val);
      if (detected) {
        setProvider(detected.provider);
        setModel(detected.model);
        setApiUrl(detected.apiUrl);
      }
    }
  };

  const handleModelChange = (val: string) => {
    setModel(val);
    if (provider === 'gemini') {
      setApiUrl(resolveGeminiEndpoint(apiUrl, val));
    }
  };

  const handleSaveAI = () => {
    const normalizedUrl = provider === 'gemini'
      ? resolveGeminiEndpoint(apiUrl, model)
      : normalizeAIEndpoint(apiUrl, provider);

    updateAIConfig({
      provider,
      apiUrl: normalizedUrl,
      apiKey: apiKey.trim(),
      model: model.trim(),
      systemPrompt: systemPrompt.trim()
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleSaveSupabase = () => {
    updateSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
      secretKey: supabaseSecretKey.trim(),
      bucket: supabaseBucket.trim() || 'receipts'
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  // Real live test to AI endpoint
  const handleTestAI = async () => {
    setIsTestingAI(true);
    setTestResult(null);

    try {
      const normalizedUrl = provider === 'gemini'
        ? resolveGeminiEndpoint(apiUrl, model)
        : normalizeAIEndpoint(apiUrl, provider);

      const res = await testRealAIConnection({
        provider,
        apiUrl: normalizedUrl,
        apiKey: apiKey.trim(),
        model: model.trim(),
        systemPrompt: systemPrompt.trim()
      });

      if (res.success) {
        setTestResult(
          `✓ Uji Koneksi AI Sukses! Layanan: ${res.provider} • Model: ${res.model} • Latensi: ${res.latencyMs}ms • Respon: "${res.replyText}"`
        );
      } else {
        setTestResult(`❌ Gagal Terhubung: ${res.error || 'Periksa API Key atau URL Endpoint'}`);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Uji AI gagal';
      setTestResult(`❌ Error saat pengujian: ${err}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  // Real live test to Supabase REST endpoint
  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);

    try {
      const res = await testSupabaseConnection({
        url: supabaseUrl.trim(),
        anonKey: supabaseAnonKey.trim(),
        secretKey: supabaseSecretKey.trim(),
        bucket: supabaseBucket.trim() || 'receipts'
      });

      if (res.success) {
        setSupabaseTestResult(`✓ ${res.message || 'Supabase REST API aktif & terhubung normal!'}`);
      } else {
        setSupabaseTestResult(`❌ Gagal: ${res.error || 'Tidak dapat menjangkau Supabase'}`);
      }
    } catch (e: unknown) {
      setSupabaseTestResult(`❌ Error: ${e instanceof Error ? e.message : 'Gagal test koneksi'}`);
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Push all local data to Supabase Cloud
  const handleMigrateToSupabase = async () => {
    setIsSyncing(true);
    setSyncToast('Sedang mengunggah seluruh data keuangan ke Supabase Cloud...');

    try {
      const res = await syncAllToSupabase();
      setSyncToast(res.message);
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: unknown) {
      setSyncToast(`Gagal: ${err instanceof Error ? err.message : 'Migrasi gagal'}`);
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull data from Supabase Cloud
  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    setSyncToast('Sedang mengunduh data dari Supabase Cloud...');

    try {
      const res = await syncFromSupabase();
      setSyncToast(res.message);
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: unknown) {
      setSyncToast(`Gagal: ${err instanceof Error ? err.message : 'Sync gagal'}`);
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');
    if (!newMemberName.trim()) {
      setMemberError('Nama pengguna wajib diisi');
      return;
    }
    const cleanUser = (newMemberUsername || newMemberName).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      setMemberError('Username minimal 3 karakter');
      return;
    }
    if (newMemberPin.trim().length !== 5) {
      setMemberError('Kode PIN harus tepat 5 digit angka');
      return;
    }

    const res = adminCreateUser(
      newMemberName.trim(),
      cleanUser,
      newMemberPin.trim(),
      newMemberRole
    );
    if (res.success) {
      setMemberSuccess(`✓ Pengguna "${newMemberName}" (@${cleanUser}) berhasil didaftarkan!`);
      setNewMemberName('');
      setNewMemberUsername('');
      setNewMemberPin('12345');
      setTimeout(() => setMemberSuccess(''), 4000);
    } else {
      setMemberError(res.error || 'Gagal menambahkan pengguna');
    }
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegisteredUser) return;
    setEditMemberError('');

    if (!editMemberName.trim()) {
      setEditMemberError('Nama pengguna wajib diisi');
      return;
    }
    if (editMemberPin.trim().length !== 5) {
      setEditMemberError('PIN harus tepat 5 digit angka');
      return;
    }

    const res = updateRegisteredUser(editingRegisteredUser.username, {
      displayName: editMemberName.trim(),
      role: editMemberRole,
      pin5Digit: editMemberPin.trim()
    });

    if (res.success) {
      setEditingRegisteredUser(null);
      setMemberSuccess(`✓ Data pengguna @${editingRegisteredUser.username} berhasil diperbarui!`);
      setTimeout(() => setMemberSuccess(''), 4000);
    } else {
      setEditMemberError(res.error || 'Gagal memperbarui pengguna');
    }
  };

  const handleCreateNewHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    setHouseholdError('');
    const clean = newHouseholdName.trim();
    if (!clean) {
      setHouseholdError('Nama household / rumah tangga wajib diisi.');
      return;
    }

    createHousehold(clean);
    setNewHouseholdName('');
    setHouseholdSuccess(`✓ Household "${clean}" berhasil dibuat! Data tersendiri & terisolasi.`);
    setTimeout(() => setHouseholdSuccess(''), 4000);
  };

  const handleSaveEditHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHousehold) return;
    const clean = editHouseholdName.trim();
    if (!clean) return;

    updateHousehold(editingHousehold.id, clean);
    setHouseholdSuccess(`✓ Nama household berhasil diubah menjadi "${clean}"`);
    setTimeout(() => setHouseholdSuccess(''), 3000);
  };

  const handleAddMemberToEditingHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHousehold) return;
    setHhMemberError('');
    if (!hhNewMemberName.trim()) {
      setHhMemberError('Nama anggota keluarga wajib diisi.');
      return;
    }
    const res = addMemberToHousehold(
      editingHousehold.id,
      hhNewMemberName.trim(),
      hhNewMemberUsername.trim(),
      hhNewMemberRole
    );
    if (!res.success) {
      setHhMemberError(res.error || 'Gagal menambahkan anggota.');
    } else {
      setHhNewMemberName('');
      setHhNewMemberUsername('');
      setHhNewMemberRole('MEMBER');
      setHouseholdSuccess(`✓ Anggota "${hhNewMemberName}" berhasil ditambahkan ke ${editingHousehold.name}`);
      setTimeout(() => setHouseholdSuccess(''), 3000);
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Kembali ke Aplikasi Utama"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Dashboard Admin Sistem
              </h1>
              <span className="text-[10px] bg-teal-100 text-teal-900 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                ADMIN ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola Pengguna, Household Multi-Akun, AI Vision Struk, dan Cloud Supabase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveToast && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Berhasil Disimpan</span>
            </div>
          )}
          <button
            type="button"
            onClick={logoutUser}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Keluar dari Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </div>
      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'members'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Pengguna ({registeredUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('households')}
          className={`flex-1 min-w-[140px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'households'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-teal-700" />
          <span>Household View ({allHouseholds.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 min-w-[130px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'ai'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-amber-600" />
          <span>AI Vision Struk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className={`flex-1 min-w-[140px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'supabase'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Supabase Cloud</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 min-w-[110px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'sessions'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          <span>Sesi ({sessions.length})</span>
        </button>
      </div>

      {/* TAB 1: MEMBERS / REGISTERED USERS MANAGEMENT */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Daftar Pengguna Aplikasi (Superadmin)</h2>
                <p className="text-xs text-slate-500">
                  Kelola seluruh pengguna terdaftar, hak akses peran, dan PIN 5-digit login
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                Total: {registeredUsers.length} Pengguna
              </span>
            </div>

            {memberSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in">
                {memberSuccess}
              </div>
            )}

            {/* Registered Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Pengguna</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Peran Akses</th>
                    <th className="py-2.5 px-3">PIN 5-Digit</th>
                    <th className="py-2.5 px-3">Terdaftar</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registeredUsers.length > 0 ? (
                    registeredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-900 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-200">
                            {u.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{u.displayName}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          @{u.username}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : u.role === 'OWNER'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {u.role === 'ADMIN' ? 'Superadmin' : u.role === 'OWNER' ? 'Kepala Keluarga (Owner)' : u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {u.pinHash || '12345'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRegisteredUser(u);
                                setEditMemberName(u.displayName);
                                setEditMemberUsername(u.username);
                                setEditMemberRole(u.role || 'OWNER');
                                setEditMemberPin(u.pinHash || '12345');
                                setEditMemberError('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Edit Pengguna"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus pengguna @${u.username}?`)) {
                                  deleteUser(u.username);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                        Belum ada pengguna terdaftar. Daftarkan pengguna baru di form bawah.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add New User Form */}
            <form onSubmit={handleAddMember} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>Daftarkan Pengguna Baru ke Aplikasi</span>
              </div>

              {memberError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {memberError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Nama Lengkap (misal: Maruf H)"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
                <input
                  type="text"
                  placeholder="Username (misal: maruf)"
                  value={newMemberUsername}
                  onChange={e => setNewMemberUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
                <select
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value as UserRole)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="OWNER">Pengguna / Kepala Keluarga</option>
                  <option value="ADMIN">Superadmin</option>
                  <option value="MEMBER">Anggota Keluarga</option>
                  <option value="VIEWER">Viewer (Hanya Lihat)</option>
                </select>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="PIN 5-Digit (12345)"
                  value={newMemberPin}
                  onChange={e => setNewMemberPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  + Daftarkan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: HOUSEHOLD VIEW & ISOLATION */}
      {activeTab === 'households' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Manajemen Household (Rumah Tangga Terisolasi)</h2>
              <p className="text-xs text-slate-500">
                Pemisahan data keuangan antar rumah tangga. Setiap user/keluarga memiliki data transaksi, dompet, dan utang piutang masing-masing tanpa bercampur.
              </p>
            </div>

            {householdSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {householdSuccess}
              </div>
            )}

            {householdError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {householdError}
              </div>
            )}

            {/* List of Households */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allHouseholds.map(h => {
                const isActive = h.id === activeHousehold.id;
                const hMembers = allMembers.filter(m => m.householdId === h.id);
                return (
                  <div
                    key={h.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-teal-700 bg-teal-50/40 ring-1 ring-teal-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm">{h.name}</h3>
                          {isActive && (
                            <span className="text-[10px] font-bold bg-teal-700 text-white px-2 py-0.5 rounded-full">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {h.id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Kode Undangan: <span className="font-mono font-bold text-teal-800">{h.inviteCode || 'DK-KLRG-8921'}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold flex items-center gap-1.5 pt-0.5">
                          <Users className="w-3.5 h-3.5 text-teal-700" />
                          <span>{hMembers.length} Anggota Terdaftar:</span>
                        </div>
                        {hMembers.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {hMembers.slice(0, 5).map(m => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-100/70 text-[10px] font-bold text-teal-900 border border-teal-200/60"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                <span>{m.displayName}</span>
                                <span className="text-[9px] text-teal-700 font-normal">({m.role})</span>
                              </span>
                            ))}
                            {hMembers.length > 5 && (
                              <span className="text-[10px] text-slate-500 font-semibold px-1">
                                +{hMembers.length - 5} lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-700 font-medium italic pt-0.5">
                            Belum ada anggota (klik edit untuk tambah)
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHousehold(h);
                            setEditHouseholdName(h.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg hover:bg-slate-100"
                          title="Ganti Nama Household"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {households.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteHousehold(h.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Hapus Household"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Mata Uang: <strong>{h.baseCurrency || 'IDR'}</strong>
                      </span>
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => switchHousehold(h.id)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Pilih Household Ini</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Sedang Digunakan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Household Form */}
            <form onSubmit={handleCreateNewHousehold} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-teal-700" />
                <span>Buat Household / Entitas Keuangan Baru</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Membuat buku kas terpisah (misal: "Keluarga Utama", "Usaha / Side Hustle", "Keluarga Besar"). Data transaksi dan dompet tidak akan tercampur.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Household (e.g. Rumah Tangga Kedua, Bisnis Keluarga)"
                  value={newHouseholdName}
                  onChange={e => setNewHouseholdName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                >
                  + Tambah Household
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: AI VISION CONFIGURATION & REAL TEST */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Konfigurasi AI Pembaca Foto Struk & Nota</h2>
              <p className="text-xs text-slate-500">
                Hubungkan API OpenAI, Google Gemini, Groq, atau Custom Endpoint untuk mengekstrak nominal, toko, dan kategori secara otomatis.
              </p>
            </div>

            {/* Presets Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Provider Layanan AI:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('openai')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    provider === 'openai'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">OpenAI (GPT-4o-mini)</div>
                  <div className="text-[11px] text-slate-500">Cepat, akurat, hemat token</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('gemini')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    provider === 'gemini'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">Google Gemini 1.5 Flash</div>
                  <div className="text-[11px] text-slate-500">Kapasitas harian gratis besar</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('custom')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    provider === 'custom'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">Custom / Groq / OpenRouter</div>
                  <div className="text-[11px] text-slate-500">Proxy sendiri / Local LLM</div>
                </button>
              </div>
            </div>

            {/* API Endpoint URL */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                API Endpoint URL
              </label>
              <div className="relative">
                <Server className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => handleApiKeyChange(e.target.value)}
                  placeholder="Tempel API Key (AIzaSy... untuk Gemini, atau sk-... untuk OpenAI)"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Model Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Model Name
              </label>
              <input
                type="text"
                value={model}
                onChange={e => handleModelChange(e.target.value)}
                placeholder="gemini-1.5-flash / gpt-4o-mini"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* System Prompt (Extraction Rules) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Prompt Ekstraksi JSON (Instruksi AI)
              </label>
              <textarea
                rows={3}
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              />
            </div>

            {/* Actions: Test Connection & Save AI */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestAI}
                disabled={isTestingAI}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-teal-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>{isTestingAI ? 'Menghubungi Server AI...' : 'Uji Koneksi AI Asli'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAI}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Simpan Konfigurasi AI
              </button>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-2xl border text-xs font-mono leading-relaxed ${
                  testResult.startsWith('✓')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE CLOUD DATABASE & LIVE SYNC */}
      {activeTab === 'supabase' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Database & Cloud Storage Supabase</h2>
                <p className="text-xs text-slate-500">
                  Semua transaksi, aset, dompet, utang piutang, dan kategori disinkronkan ke PostgreSQL Cloud
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {supabaseSyncStatus.status === 'synced'
                  ? `✓ Sinkron (${supabaseSyncStatus.lastSynced || 'OK'})`
                  : 'Siap Sinkron'}
              </span>
            </div>

            {/* Cloud Action Buttons */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-emerald-700" />
                <span>Sinkronisasi Data Finansial ke Supabase Cloud</span>
              </div>
              <p className="text-xs text-emerald-900">
                Pindahkan seluruh pencatatan lokal ke server Supabase, atau unduh data terbaru dari cloud.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleMigrateToSupabase}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Migrasikan Semua Data Lokal ke Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan dari Supabase Cloud</span>
                </button>
              </div>

              {syncToast && (
                <div className="p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 animate-in fade-in">
                  {syncToast}
                </div>
              )}
            </div>

            {/* Configuration Inputs */}
            <div className="space-y-3">
              {/* Supabase URL */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Supabase Anon Key */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Supabase Publishable / Anon Key
                </label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                    placeholder="sb_publishable_..."
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Secret Key */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Supabase Secret Key (Admin Direct Bypass)
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={supabaseSecretKey}
                    onChange={e => setSupabaseSecretKey(e.target.value)}
                    placeholder="sb_secret_..."
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bucket */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Storage Bucket Struk
                </label>
                <input
                  type="text"
                  value={supabaseBucket}
                  onChange={e => setSupabaseBucket(e.target.value)}
                  placeholder="receipts"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Test & Save Supabase */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200"
              >
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isTestingSupabase ? 'Menghubungi Supabase...' : 'Uji Koneksi Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSupabase}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Simpan Pengaturan Supabase
              </button>
            </div>

            {supabaseTestResult && (
              <div
                className={`p-3 rounded-2xl border text-xs font-mono leading-relaxed ${
                  supabaseTestResult.startsWith('✓')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {supabaseTestResult}
              </div>
            )}

            {/* View SQL Schema Accordion */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1.5"
              >
                <Code className="w-4 h-4" />
                <span>{showSqlSchema ? 'Sembunyikan SQL Migration Schema' : 'Lihat Skema SQL Database Supabase (DDL)'}</span>
              </button>

              {showSqlSchema && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono overflow-x-auto space-y-2">
                  <div className="text-slate-400">
                    Skema database tersedia di berkas <code>supabase_schema.sql</code>. Copy & Paste ke SQL Editor di dashboard Supabase Anda.
                  </div>
                  <pre className="text-emerald-400">
{`-- Tabel: households, household_members, wallets,
-- categories, transactions, ledger_entries, debts, app_users
-- Lihat berkas: D:/Project/Takara/supabase_schema.sql`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SESSIONS MONITORING */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pemantauan Sesi Aktif & Keamanan</h2>
              <p className="text-xs text-slate-500">
                Daftar browser dan perangkat yang sedang masuk ke akun keluarga
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {sessions.map(sess => {
                const isCurrent = sess.id === state.activeSessionId || sess.isCurrent;
                return (
                  <div key={sess.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        {sess.device.includes('Phone') ? (
                          <PhoneIcon className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{sess.device}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                              Sesi Anda Saat Ini
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {sess.browser} • Masuk: {sess.loginAt.split('T')[0]} • User: {sess.displayName}
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => terminateSession(sess.id)}
                        className="px-2.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Cabut Akses
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

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
        </div>
      )}

      {/* EDIT REGISTERED USER MODAL */}
      {editingRegisteredUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Edit Pengguna</h2>
                <p className="text-xs text-slate-500">Perbarui nama lengkap, peran, dan PIN pengguna</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRegisteredUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editMemberError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {editMemberError}
              </div>
            )}

            <form onSubmit={handleSaveEditMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editMemberName}
                  onChange={e => setEditMemberName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username (ID Akun)</label>
                <input
                  type="text"
                  value={editMemberUsername}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Peran Akses</label>
                <select
                  value={editMemberRole}
                  onChange={e => setEditMemberRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="OWNER">Pengguna / Kepala Keluarga</option>
                  <option value="ADMIN">Superadmin</option>
                  <option value="MEMBER">Anggota Keluarga</option>
                  <option value="VIEWER">Viewer (Hanya Lihat)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">PIN 5-Digit</label>
                <input
                  type="text"
                  maxLength={5}
                  value={editMemberPin}
                  onChange={e => setEditMemberPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRegisteredUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOUSEHOLD & MEMBERS MODAL */}
      {editingHousehold && (() => {
        const householdMembers = allMembers.filter(m => m.householdId === editingHousehold.id);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-base leading-tight">
                      {editingHousehold.name}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ID: <span className="font-mono">{editingHousehold.id}</span> • Kode: <strong className="text-teal-800">{editingHousehold.inviteCode || 'DK-KLRG-8921'}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingHousehold(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SECTION 1: UBAH NAMA HOUSEHOLD */}
              <form onSubmit={handleSaveEditHousehold} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Household
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editHouseholdName}
                    onChange={e => setEditHouseholdName(e.target.value)}
                    placeholder="Nama household..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-700"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    Simpan Nama
                  </button>
                </div>
              </form>

              {/* SECTION 2: DAFTAR ANGGOTA HOUSEHOLD */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-700" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Anggota Terdaftar di Household Ini
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {householdMembers.length} Anggota
                  </span>
                </div>

                {householdMembers.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {householdMembers.map(m => (
                      <div key={m.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-900 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-200">
                            {m.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {m.displayName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              @{m.userId.replace('user-', '')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            m.role === 'OWNER'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : m.role === 'ADMIN'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : m.role === 'VIEWER'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {m.role}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeMemberFromHousehold(m.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus / Keluarkan dari Household ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    Belum ada anggota yang terhubung ke household ini.
                  </div>
                )}
              </div>

              {/* SECTION 3: TAMBAH ANGGOTA LANGSUNG KE HOUSEHOLD */}
              <form onSubmit={handleAddMemberToEditingHousehold} className="p-4 bg-teal-50/40 rounded-2xl border border-teal-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <UserPlus className="w-3.5 h-3.5 text-teal-700" />
                  <span>Tambah Anggota ke Household Ini</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={hhNewMemberName}
                      onChange={e => setHhNewMemberName(e.target.value)}
                      placeholder="Nama anggota..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Username (Opsional)</label>
                    <input
                      type="text"
                      value={hhNewMemberUsername}
                      onChange={e => setHhNewMemberUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="username unik..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Peran Akses</label>
                    <select
                      value={hhNewMemberRole}
                      onChange={e => setHhNewMemberRole(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="MEMBER">MEMBER (Pencatat Transaksi)</option>
                      <option value="ADMIN">ADMIN (Pengelola Anggaran)</option>
                      <option value="OWNER">OWNER (Pemilik Penuh)</option>
                      <option value="VIEWER">VIEWER (Hanya Lihat)</option>
                    </select>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                    >
                      + Tambahkan
                    </button>
                  </div>
                </div>

                {hhMemberError && (
                  <p className="text-[11px] font-semibold text-red-600">{hhMemberError}</p>
                )}
              </form>

              {/* Modal Footer Close */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingHousehold(null)}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
