import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  Delete,
  Shield,
  ShieldCheck,
  KeyRound,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Cpu,
  Users
} from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { loginUser } = useApp();
  const [loginRole, setLoginRole] = useState<'admin' | 'user'>('user');
  const [username, setUsername] = useState('maruf');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Auto focus PIN input when role or username is selected
  useEffect(() => {
    if (username.trim()) {
      pinInputRef.current?.focus();
    }
  }, [loginRole, username]);

  // Global PC keyboard listener for PIN input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isUsernameFocused = activeEl?.id === 'username-input';

      if (isUsernameFocused) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const targetUser = loginRole === 'admin' ? 'admin' : username.trim();
          if (!targetUser) {
            setErrorMsg('Silakan pilih akun atau ketik username terlebih dahulu.');
            return;
          }
          if (code.length === 5) {
            handleExecuteLogin(targetUser, code);
          } else {
            pinInputRef.current?.focus();
          }
        }
        return;
      }

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
        const targetUser = loginRole === 'admin' ? 'admin' : username.trim();
        if (!targetUser) {
          setErrorMsg('Silakan pilih akun atau ketik username terlebih dahulu.');
          return;
        }
        handleExecuteLogin(targetUser, code.trim() || '12345');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, username, loginRole, isLoading]);
  const handleKeyPress = (digit: string) => {
    if (code.length < 5) {
      const nextCode = code + digit;
      setCode(nextCode);
      setErrorMsg('');

      // Auto submit on 5 digits
      if (nextCode.length === 5) {
        const targetUser = loginRole === 'admin' ? 'admin' : username.trim();
        if (!targetUser) {
          setErrorMsg('Silakan pilih akun atau ketik username terlebih dahulu.');
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

  const handleExecuteLogin = (userToLogin: string, codeToVerify: string) => {
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = loginUser(userToLogin, codeToVerify);
      if (!res.success) {
        setErrorMsg(res.error || 'Kode unik 5-digit salah.');
        setCode('');
      }
      setIsLoading(false);
    }, 200);
  };

  const handleSwitchRole = (role: 'admin' | 'user') => {
    setLoginRole(role);
    setCode('');
    setErrorMsg('');
    if (role === 'admin') {
      setUsername('admin');
    } else {
      setUsername('maruf');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#0F766E] via-[#115E59] to-[#042F2E] text-white flex flex-col justify-between items-center p-4 sm:p-6 select-none animate-in fade-in duration-200 overflow-y-auto">
      {/* Top Branding */}
      <div className="w-full max-w-sm flex flex-col items-center pt-3 sm:pt-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal-800/80 border border-teal-500/30 flex items-center justify-center mb-2 shadow-xl shadow-teal-950/40 p-2 overflow-hidden">
          <img src="/Takara_logo_original_transparan.png" alt="Takara" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Takara</h1>
        <p className="text-teal-200/90 text-xs mt-0.5">
          Sistem Keuangan Keluarga & Admin Dashboard
        </p>

        {/* 2 DISTINCT ROLES SELECTOR */}
        <div className="mt-4 w-full bg-teal-950/60 p-1 rounded-2xl border border-teal-700/60 flex">
          <button
            type="button"
            onClick={() => handleSwitchRole('user')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              loginRole === 'user'
                ? 'bg-white text-teal-950 shadow-md ring-2 ring-teal-300'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-700" />
            <span>Role 1: User Keuangan</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchRole('admin')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              loginRole === 'admin'
                ? 'bg-amber-300 text-slate-950 shadow-md ring-2 ring-amber-200'
                : 'text-amber-300/80 hover:text-amber-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Role 2: Admin Dashboard</span>
          </button>
        </div>

        {/* Role Description Note */}
        <div className="mt-2 text-[11px] text-teal-200/80 text-center leading-relaxed">
          {loginRole === 'admin' ? (
            <span className="text-amber-200 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-500/30 inline-block">
              🛡️ <strong>Khusus Admin:</strong> Kelola akun user, AI, dan database. Tidak mencatat keuangan.
            </span>
          ) : (
            <span>
              💰 <strong>Pencatatan Keuangan:</strong> Catat transaksi, dompet, dan cicilan keluarga.
            </span>
          )}
        </div>

        {/* Quick User Chips (Only for User role) */}
        {loginRole === 'user' && (
          <div className="mt-3 w-full">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setUsername('maruf');
                  setCode('12345');
                  handleExecuteLogin('maruf', '12345');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  username.toLowerCase() === 'maruf'
                    ? 'bg-white text-teal-900 shadow-md ring-2 ring-teal-300'
                    : 'bg-teal-900/60 text-teal-100 hover:bg-teal-800/80 border border-teal-700/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Maruf (Data Finansial)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('budi');
                  setCode('12345');
                  handleExecuteLogin('budi', '12345');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  username.toLowerCase() === 'budi'
                    ? 'bg-white text-teal-900 shadow-md ring-2 ring-teal-300'
                    : 'bg-teal-900/60 text-teal-100 hover:bg-teal-800/80 border border-teal-700/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Budi (User Baru)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Login Box: Username & 5-Digit PIN */}
      <div className="w-full max-w-xs flex flex-col items-center my-2 space-y-2.5">
        {/* Username Input Field */}
        <div className="w-full">
          <label className="block text-[11px] font-bold text-teal-200 uppercase tracking-wider mb-1 text-center">
            {loginRole === 'admin' ? 'Username Admin' : 'Username'}
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-teal-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="username-input"
              type="text"
              value={username}
              disabled={loginRole === 'admin'}
              onChange={e => {
                setUsername(e.target.value);
                setErrorMsg('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pinInputRef.current?.focus();
                }
              }}
              placeholder={loginRole === 'admin' ? 'admin' : 'Ketik username baru (misal: budi)'}
              className="w-full pl-10 pr-4 py-2 bg-teal-900/50 border border-teal-500/40 rounded-xl text-xs sm:text-sm font-bold text-white placeholder-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-300 text-center disabled:opacity-80"
            />
          </div>
          {loginRole === 'user' && (
            <p className="text-[10px] text-teal-300/70 text-center mt-1">
              * Username baru otomatis dibuatkan pembukuan baru yang bersih
            </p>
          )}
        </div>

        {/* 5-Digit Code Label */}
        <div className="w-full text-center">
          <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
            5 Digit Kode Unik
          </span>
          <div className="text-[11px] text-teal-300/80 mt-0.5">
            Default kode: <span className="font-mono font-bold text-white underline">12345</span>
          </div>
        </div>

        {/* 5 Digits Box Display with Keyboard Support */}
        <div
          onClick={() => pinInputRef.current?.focus()}
          className="relative flex justify-center items-center gap-2.5 py-1 cursor-text group"
          title="Klik untuk ketik PIN via keyboard PC"
        >
          <input
            ref={pinInputRef}
            id="pin-hidden-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            value={code}
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
              setCode(val);
              setErrorMsg('');
              if (val.length === 5) {
                handleExecuteLogin(loginRole === 'admin' ? 'admin' : (username.trim() || 'maruf'), val);
              }
            }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-text z-10"
            autoComplete="one-time-code"
          />

          {[0, 1, 2, 3, 4].map(idx => {
            const isFilled = code.length > idx;
            const isCurrent = code.length === idx;
            return (
              <div
                key={idx}
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-extrabold transition-all ${
                  isFilled
                    ? loginRole === 'admin'
                      ? 'bg-amber-300 text-slate-950 shadow-md ring-2 ring-amber-400 scale-105'
                      : 'bg-white text-teal-900 shadow-md ring-2 ring-teal-300 scale-105'
                    : isCurrent
                    ? 'bg-teal-900/80 border-2 border-teal-300 text-teal-200 ring-2 ring-teal-400/40 animate-pulse'
                    : 'bg-teal-900/60 border border-teal-600/50 text-teal-400'
                }`}
              >
                {isFilled ? '•' : ''}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-teal-200/80 text-center flex items-center justify-center gap-1">
          <span>⌨️</span>
          <span>Bisa ketik PIN langsung via keyboard PC (0-9)</span>
        </p>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-red-200 bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-500/40 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Numeric Keypad for 5-Digit Code */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-2 pb-1">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleKeyPress(d)}
            disabled={isLoading}
            className="h-11 sm:h-12 rounded-2xl bg-teal-800/50 hover:bg-teal-700/60 active:scale-95 transition-all text-xl font-bold border border-teal-600/30 flex items-center justify-center shadow-xs"
          >
            {d}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          className="h-11 sm:h-12 rounded-2xl bg-teal-900/50 hover:bg-teal-800/60 active:scale-95 transition-all text-xs font-bold text-teal-300 border border-teal-700/40 flex items-center justify-center"
        >
          Hapus
        </button>

        {/* 0 Button */}
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          disabled={isLoading}
          className="h-11 sm:h-12 rounded-2xl bg-teal-800/50 hover:bg-teal-700/60 active:scale-95 transition-all text-xl font-bold border border-teal-600/30 flex items-center justify-center shadow-xs"
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          onClick={handleDelete}
          className="h-11 sm:h-12 rounded-2xl bg-teal-900/50 hover:bg-teal-800/60 active:scale-95 transition-all text-teal-300 border border-teal-700/40 flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Login Enter Footer */}
      <div className="w-full max-w-xs pb-3 pt-1 text-center flex flex-col gap-1.5">
        <button
          onClick={() => {
            const targetUser = loginRole === 'admin' ? 'admin' : username.trim();
            if (!targetUser) {
              setErrorMsg('Silakan pilih akun atau ketik username terlebih dahulu.');
              return;
            }
            handleExecuteLogin(targetUser, code.trim() || '12345');
          }}
          disabled={isLoading || (loginRole === 'user' && !username.trim())}
          className={`w-full py-2.5 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all ${
            loginRole === 'admin'
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white'
          }`}
        >
          <span>
            {loginRole === 'admin'
              ? 'Masuk ke Admin Dashboard'
              : `Masuk Sebagai @${username.trim() || 'username'}`}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center justify-center gap-1 text-[11px] text-teal-300/80">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
          <span>Terenkripsi aman di perangkat keluarga</span>
        </div>
      </div>
    </div>
  );
};
