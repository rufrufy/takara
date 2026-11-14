import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  User as UserIcon,
  Delete,
  Shield,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle2
} from 'lucide-react';

interface LockScreenProps {
  onBackToLanding?: () => void;
  initialTab?: 'login' | 'register' | 'admin';
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onBackToLanding,
  initialTab = 'login'
}) => {
  const { loginUser, registerUser, registeredUsers } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'admin'>(initialTab);

  // Login form state
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regHouseholdCode, setRegHouseholdCode] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Sync tab change
  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMsg('');
    setSuccessMsg('');
    setCode('');
  }, [initialTab]);


  // Global PC keyboard listener for PIN input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea';

      // If typing in normal text input (like username or register fields), let normal typing happen
      if (isInput && activeEl?.id !== 'pin-hidden-input') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (activeTab === 'login') {
            const targetUser = username.trim();
            if (targetUser && code.length === 5) {
              handleExecuteLogin(targetUser, code);
            } else {
              pinInputRef.current?.focus();
            }
          } else if (activeTab === 'register') {
            handleExecuteRegister();
          }
        }
        return;
      }

      // PIN entry keyboard capture
      if (activeTab === 'login' || activeTab === 'admin') {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleDelete();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleClear();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const targetUser = activeTab === 'admin' ? 'admin' : username.trim();
          if (!targetUser) {
            setErrorMsg('Silakan pilih akun atau ketik username terlebih dahulu.');
            return;
          }
          handleExecuteLogin(targetUser, code.trim() || '12345');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, username, activeTab, isLoading, regFullName, regUsername, regPin, regConfirmPin]);

  const handleKeyPress = (digit: string) => {
    if (code.length < 5) {
      const nextCode = code + digit;
      setCode(nextCode);
      setErrorMsg('');

      // Auto submit on 5 digits
      if (nextCode.length === 5) {
        const targetUser = activeTab === 'admin' ? 'admin' : (username.trim() || 'maruf');
        if (!username && targetUser === 'maruf') {
          setUsername('maruf');
        }
        handleExecuteLogin(targetUser, nextCode);
      }
    }
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setCode('');
    setErrorMsg('');
  };

  const handleExecuteLogin = (userToLogin: string, codeToVerify: string) => {
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = loginUser(userToLogin, codeToVerify);
      if (!res.success) {
        setErrorMsg(res.error || 'Kode unik 5-digit tidak cocok.');
        setCode('');
      }
      setIsLoading(false);
    }, 150);
  };

  const handleExecuteRegister = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!regFullName.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }
    const cleanU = regUsername.trim().toLowerCase();
    if (!cleanU || cleanU.length < 3) {
      setErrorMsg('Username minimal 3 karakter (huruf kecil dan angka).');
      return;
    }
    if (regPin.length !== 5 || !/^\d{5}$/.test(regPin)) {
      setErrorMsg('PIN harus terdiri dari 5 digit angka.');
      return;
    }
    if (regPin !== regConfirmPin) {
      setErrorMsg('Konfirmasi PIN tidak cocok dengan PIN yang dibuat.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = registerUser(regFullName.trim(), cleanU, regPin, regHouseholdCode.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal mendaftarkan pengguna baru.');
        setIsLoading(false);
      } else {
        setSuccessMsg(`Akun "${regFullName}" berhasil dibuat! Membuka aplikasi...`);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#0F766E] via-[#115E59] to-[#042F2E] text-white flex flex-col justify-between items-center p-4 sm:p-6 select-none animate-in fade-in duration-200 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between pt-1">
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-900/60 hover:bg-teal-900 text-teal-200 hover:text-white border border-teal-700/50 text-xs font-semibold transition-all active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </button>
        ) : (
          <div />
        )}

        <div className="text-[11px] text-teal-300 font-semibold px-2.5 py-1 rounded-full bg-teal-950/40 border border-teal-700/40">
          Takara Security v3.0
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md flex flex-col items-center my-auto py-4 text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-teal-800/90 border border-teal-500/40 flex items-center justify-center mb-2 shadow-xl shadow-teal-950/50 p-2 overflow-hidden">
          <img
            src="/Takara_logo_original_transparan.png"
            alt="Takara"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Takara Keuangan</h1>
        <p className="text-teal-200/90 text-xs mt-0.5">
          Akses Masuk & Pendaftaran Pengguna
        </p>

        {/* 3 MODE TABS */}
        <div className="mt-4 w-full bg-teal-950/70 p-1 rounded-2xl border border-teal-700/60 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setCode('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-teal-950 shadow-md ring-2 ring-teal-300'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-700" />
            <span>Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setCode('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-emerald-400 text-slate-950 shadow-md ring-2 ring-emerald-200'
                : 'text-emerald-200/90 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-950" />
            <span>Daftar Baru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg('');
              setCode('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-amber-300 text-slate-950 shadow-md ring-2 ring-amber-200'
                : 'text-amber-300/80 hover:text-amber-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin</span>
          </button>
        </div>

        {/* TAB 1: LOGIN PENGGUNA */}
        {activeTab === 'login' && (
          <div className="w-full mt-4 flex flex-col items-center">
            {/* Manual Username Field */}
            <div className="w-full mb-3 text-left">
              <label className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider block mb-1">
                Username Akun
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username-input"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                    setErrorMsg('');
                  }}
                  placeholder="Ketik username Anda..."
                  className="w-full bg-teal-950/80 border border-teal-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium"
                />
                <UserIcon className="w-4 h-4 text-teal-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* PIN Dots Display */}
            <div className="mb-2">
              <span className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider block mb-2">
                Masukkan PIN 5-Digit
              </span>
              <div className="flex gap-3 justify-center mb-2">
                {[0, 1, 2, 3, 4].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      code.length > idx
                        ? 'bg-teal-300 scale-125 shadow-sm shadow-teal-300/50'
                        : 'border border-teal-400/40 bg-teal-950/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="w-full max-w-[260px] grid grid-cols-3 gap-2.5 my-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(String(num))}
                  className="w-full aspect-square rounded-2xl bg-teal-900/60 hover:bg-teal-800 text-xl font-bold text-white border border-teal-700/50 flex items-center justify-center active:scale-95 transition-all shadow-xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="w-full aspect-square rounded-2xl bg-teal-950/60 hover:bg-teal-900 text-xs font-semibold text-teal-300 border border-teal-800/40 flex items-center justify-center active:scale-95 transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="w-full aspect-square rounded-2xl bg-teal-900/60 hover:bg-teal-800 text-xl font-bold text-white border border-teal-700/50 flex items-center justify-center active:scale-95 transition-all shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full aspect-square rounded-2xl bg-teal-950/60 hover:bg-teal-900 text-teal-300 border border-teal-800/40 flex items-center justify-center active:scale-95 transition-all"
                title="Hapus Digit"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Login Action Button */}
            <button
              type="button"
              disabled={isLoading || !username.trim()}
              onClick={() => handleExecuteLogin(username.trim(), code)}
              className="mt-3 w-full max-w-[260px] py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-teal-950 font-extrabold text-sm rounded-xl shadow-lg shadow-teal-950/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
            >
              {isLoading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: DAFTAR PENGGUNA BARU */}
        {activeTab === 'register' && (
          <div className="w-full mt-4 flex flex-col items-center text-left">
            <div className="w-full bg-teal-950/50 border border-teal-700/50 rounded-2xl p-4 sm:p-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-teal-200 block mb-1">
                  Nama Lengkap / Panggilan
                </label>
                <input
                  type="text"
                  id="reg-full-name"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-sm text-white placeholder-teal-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-teal-200 block mb-1">
                  Username Akun (Huruf kecil & angka)
                </label>
                <input
                  type="text"
                  id="reg-username"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="Contoh: ahmad"
                  className="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-sm text-white placeholder-teal-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-teal-200 block mb-1">
                    PIN 5-Digit
                  </label>
                  <input
                    type="password"
                    id="reg-pin"
                    maxLength={5}
                    value={regPin}
                    onChange={e => setRegPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="12345"
                    className="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-sm text-white placeholder-teal-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium tracking-widest text-center"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-teal-200 block mb-1">
                    Konfirmasi PIN
                  </label>
                  <input
                    type="password"
                    id="reg-confirm-pin"
                    maxLength={5}
                    value={regConfirmPin}
                    onChange={e => setRegConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="12345"
                    className="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-sm text-white placeholder-teal-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium tracking-widest text-center"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-teal-200 block mb-1">
                  Kode Household (Opsional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="reg-household-code"
                    value={regHouseholdCode}
                    onChange={e => setRegHouseholdCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: TK-XXXX-XXXX"
                    className="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-sm text-white placeholder-teal-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono uppercase tracking-wider font-semibold"
                  />
                  <Users className="w-4 h-4 text-teal-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[10px] text-teal-300/80 mt-1">
                  💡 Masukkan kode jika diajak oleh keluarga. Kosongkan jika ingin buat keluarga baru.
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleExecuteRegister}
                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Mendaftarkan...' : 'Daftar & Langsung Masuk'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && (
          <div className="w-full mt-4 flex flex-col items-center">
            <div className="w-full p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 mb-3 text-left">
              <strong>Admin Dashboard:</strong> Akses penuh konfigurasi sistem, API AI Vision, dan manajemen anggota. PIN Superadmin: <code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono font-bold">99999</code>.
            </div>

            {/* PIN Dots Display */}
            <div className="mb-2">
              <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider block mb-2">
                PIN Admin (5-Digit)
              </span>
              <div className="flex gap-3 justify-center mb-2">
                {[0, 1, 2, 3, 4].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      code.length > idx
                        ? 'bg-amber-300 scale-125 shadow-sm shadow-amber-300/50'
                        : 'border border-amber-400/40 bg-amber-950/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="w-full max-w-[260px] grid grid-cols-3 gap-2.5 my-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(String(num))}
                  className="w-full aspect-square rounded-2xl bg-amber-950/50 hover:bg-amber-900/70 text-xl font-bold text-amber-100 border border-amber-600/40 flex items-center justify-center active:scale-95 transition-all shadow-xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="w-full aspect-square rounded-2xl bg-amber-950/80 hover:bg-amber-900/80 text-xs font-semibold text-amber-300 border border-amber-700/40 flex items-center justify-center active:scale-95 transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="w-full aspect-square rounded-2xl bg-amber-950/50 hover:bg-amber-900/70 text-xl font-bold text-amber-100 border border-amber-600/40 flex items-center justify-center active:scale-95 transition-all shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full aspect-square rounded-2xl bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-700/40 flex items-center justify-center active:scale-95 transition-all"
                title="Hapus Digit"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Login Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleExecuteLogin('admin', code)}
              className="mt-3 w-full max-w-[260px] py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
            >
              <Shield className="w-4 h-4 text-slate-950" />
              <span>Masuk Admin Dashboard</span>
            </button>
          </div>
        )}

        {/* Error or Success Notification */}
        {errorMsg && (
          <div className="mt-3 w-full p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 w-full p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-sm text-center pt-2 pb-1 text-[11px] text-teal-300/70">
        Takara Keuangan Keluarga • Double-Entry & Multi-Household
      </div>
    </div>
  );
};
