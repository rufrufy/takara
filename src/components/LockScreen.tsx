import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getRequiredPinLength, isValidPinFormat } from '../lib/receiptAuth';
import {
  User as UserIcon,
  Delete,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle2
} from 'lucide-react';

interface LockScreenProps {
  onBackToLanding?: () => void;
  initialTab?: 'login' | 'register';
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onBackToLanding,
  initialTab = 'login'
}) => {
  const { loginUser, registerUser } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

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

  // Sync tab change
  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMsg('');
    setSuccessMsg('');
    setCode('');
  }, [initialTab]);


  const requiredPinLength = activeTab === 'login' ? getRequiredPinLength(username) : 5;

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
            if (!targetUser) {
              setErrorMsg('Username wajib diisi terlebih dahulu.');
            } else if (code.length === requiredPinLength) {
              handleExecuteLogin(targetUser, code);
            } else {
              (activeEl as HTMLElement)?.blur();
            }
          } else if (activeTab === 'register') {
            handleExecuteRegister();
          }
        }
        return;
      }

      // PIN entry keyboard capture
      if (activeTab === 'login') {
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
          const targetUser = username.trim();
          if (!targetUser) {
            setErrorMsg('Username atau PIN salah. Masukkan username terlebih dahulu.');
            setCode('');
            return;
          }
          handleExecuteLogin(targetUser, code.trim());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, username, activeTab, requiredPinLength, isLoading, regFullName, regUsername, regPin, regConfirmPin]);

  const handleKeyPress = (digit: string) => {
    if (isLoading || loginInFlight.current) return;
    if (code.length < requiredPinLength) {
      const nextCode = code + digit;
      setCode(nextCode);
      setErrorMsg('');

      if (nextCode.length === requiredPinLength) {
        const targetUser = username.trim();
        if (!targetUser) {
          setErrorMsg('Username atau PIN salah. Masukkan username terlebih dahulu.');
          setCode('');
          return;
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

  const loginInFlight = useRef(false);
  const handleExecuteLogin = async (userToLogin: string, codeToVerify: string) => {
    if (loginInFlight.current) return;
    const cleanUser = userToLogin.trim().toLowerCase();
    const cleanCode = codeToVerify.trim();
    const expectedLen = getRequiredPinLength(cleanUser);
    if (!cleanUser) {
      setErrorMsg('Username atau PIN salah. Masukkan username terlebih dahulu.');
      setCode('');
      return;
    }
    if (!isValidPinFormat(cleanUser, cleanCode)) {
      setErrorMsg(`PIN harus terdiri dari ${expectedLen} digit angka.`);
      return;
    }
    loginInFlight.current = true;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await loginUser(cleanUser, cleanCode);
      if (!res.success) {
        setErrorMsg(res.error || 'Login gagal.');
        setCode('');
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat akun dan saldo.');
      setCode('');
    } finally {
      loginInFlight.current = false;
      setIsLoading(false);
    }
  };

  const handleExecuteRegister = async () => {
    if(isLoading)return;
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
    try {
      const res = await registerUser(regFullName.trim(), cleanU, regPin, regHouseholdCode.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal mendaftarkan pengguna baru.');
      } else {
        setSuccessMsg(`Akun "${regFullName}" berhasil dibuat! Membuka aplikasi...`);
      }
    } catch(error) {
      setErrorMsg(error instanceof Error?error.message:'Gagal mendaftarkan pengguna baru.');
    } finally {setIsLoading(false);}
  };

  return (
    <div className="auth-screen fixed inset-0 z-50 bg-[#FFFDF5] text-[#073B4C] flex flex-col justify-between items-center p-4 sm:p-6 select-none animate-in fade-in duration-200 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between pt-1">
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FEF3C7] text-[#073B4C] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-xs font-extrabold transition-all active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md flex flex-col items-center my-auto py-4 text-center">
        {/* Brand Icon */}
        <img
          src="/Takara.png"
          alt="Takara"
          className="w-20 h-20 object-contain mb-2"
        />
        <h1 className="text-2xl font-extrabold tracking-tight">Takara Keuangan</h1>
        <p className="text-teal-200/90 text-xs mt-0.5">
          Akses Masuk & Pendaftaran Pengguna
        </p>

        {/* 2 MODE TABS (Masuk & Daftar Baru — admin masuk lewat form yang sama) */}
        <div className="auth-mode-tabs mt-3.5 w-full bg-teal-950/70 p-1 rounded-2xl border border-teal-700/60 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setSuccessMsg('');
              setCode('');
            }}
            aria-pressed={activeTab === 'login'} data-mode="login"
            className={`auth-mode-tab py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === 'login'
                ? 'bg-white text-teal-950 shadow-md ring-2 ring-teal-300'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate">Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setSuccessMsg('');
              setCode('');
            }}
            aria-pressed={activeTab === 'register'} data-mode="register"
            className={`auth-mode-tab py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === 'register'
                ? 'bg-emerald-400 text-slate-950 shadow-md ring-2 ring-emerald-200'
                : 'text-emerald-200/90 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-950 shrink-0" />
            <span className="truncate sm:hidden">Daftar</span>
            <span className="hidden sm:inline truncate">Daftar Baru</span>
          </button>
        </div>

        {/* TAB 1: LOGIN PENGGUNA & ADMIN */}
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
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={e => {
                    const nextU = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    setUsername(nextU);
                    setCode(prev => prev.slice(0, getRequiredPinLength(nextU)));
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
                Masukkan PIN {requiredPinLength}-Digit
              </span>
              <div className={`flex ${requiredPinLength > 5 ? 'gap-2' : 'gap-3'} justify-center mb-2`}>
                {Array.from({ length: requiredPinLength }, (_, idx) => (
                  <div
                    key={idx}
                    className={`${requiredPinLength > 5 ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full border-2 border-[#073B4C] transition-all duration-150 ${
                      code.length > idx
                        ? 'bg-[#06D6A0] scale-125 shadow-[2px_2px_0_#073B4C]'
                        : 'bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="w-full max-w-[330px] grid grid-cols-3 gap-2.5 my-2">
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
              className="auth-submit mt-3 w-full max-w-[330px] py-2.5 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] font-extrabold text-sm rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memuat akun dan saldo…</span>
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
                <p className="text-[10px] text-[#365664] mt-1">
                  Masukkan kode jika diajak oleh keluarga. Kosongkan jika ingin buat keluarga baru.
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleExecuteRegister}
                className="auth-submit w-full mt-2 py-3 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] font-extrabold text-sm rounded-full transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Mendaftarkan...' : 'Daftar & Langsung Masuk'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error or Success Notification */}
        {errorMsg && (
          <div role="alert" className="auth-message-error mt-3 w-full p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="auth-message-success mt-3 w-full p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-sm text-center pt-2 pb-1 text-[11px] text-teal-300/70">
        Takara · Keuangan keluarga
      </div>
    </div>
  );
};
