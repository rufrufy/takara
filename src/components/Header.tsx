import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Building, Plus, Lock, Check, LogOut, Download, Users, Link as LinkIcon } from 'lucide-react';
import { getSyncStatus, SYNC_EVENT_NAME, processSyncQueue, type SyncEngineStatus } from '../lib/syncEngine';
interface HeaderProps {
  onOpenImport?: () => void;
  onOpenInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport, onOpenInstall }) => {
  const { activeHousehold, households, switchHousehold, createHousehold, joinHouseholdByCode, lockApp, logoutUser, state } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isJoiningHousehold, setIsJoiningHousehold] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(getSyncStatus);

  useEffect(() => {
    const handleSyncChange = (e: Event) => {
      const custom = e as CustomEvent<SyncEngineStatus>;
      if (custom.detail) setSyncStatus(custom.detail);
    };
    window.addEventListener(SYNC_EVENT_NAME, handleSyncChange);
    return () => window.removeEventListener(SYNC_EVENT_NAME, handleSyncChange);
  }, []);
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (joinCode.trim()) {
      const res = joinHouseholdByCode(joinCode.trim());
      if (res.success) {
        setJoinCode('');
        setIsJoiningHousehold(false);
        setDropdownOpen(false);
      } else {
        setJoinError(res.error || 'Kode household tidak valid');
      }
    }
  };
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHouseholdName.trim()) {
      createHousehold(newHouseholdName.trim());
      setNewHouseholdName('');
      setIsCreatingHousehold(false);
      setDropdownOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Household Switcher */}
        <div className="relative">
          <button
            type="button"
            id="header-household-dropdown-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-800/80 border border-teal-600/40 flex items-center justify-center p-1 shadow-sm overflow-hidden">
              <img src="/Takara_logo_original_transparan.png" alt="Takara" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-base leading-tight">
                  {activeHousehold.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {state.currentUser.displayName}
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setDropdownOpen(false);
                  setIsCreatingHousehold(false);
                  setIsJoiningHousehold(false);
                  setJoinError('');
                }}
              />
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  Pilih Household
                </div>

                {households.map(h => (
                  <button
                    key={h.id}
                    onClick={() => {
                      switchHousehold(h.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      h.id === activeHousehold.id
                        ? 'bg-teal-50 text-teal-800'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-teal-700" />
                      <span>{h.name}</span>
                    </div>
                    {h.id === activeHousehold.id && (
                      <Check className="w-4 h-4 text-teal-700" />
                    )}
                  </button>
                ))}

                <div className="border-t border-slate-100 my-1 pt-1 space-y-1">
                  {/* Form Buat Household Baru */}
                  {!isCreatingHousehold && !isJoiningHousehold && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingHousehold(true);
                          setIsJoiningHousehold(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-teal-700 hover:bg-teal-50 font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat Household Baru</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsJoiningHousehold(true);
                          setIsCreatingHousehold(false);
                          setJoinError('');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-blue-700 hover:bg-blue-50 font-semibold transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Gabung via Kode</span>
                      </button>
                    </>
                  )}

                  {isCreatingHousehold && (
                    <form onSubmit={handleCreate} className="p-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Nama Household..."
                        value={newHouseholdName}
                        onChange={e => setNewHouseholdName(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsCreatingHousehold(false)}
                          className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 text-xs bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800"
                        >
                          Simpan
                        </button>
                      </div>
                    </form>
                  )}

                  {isJoiningHousehold && (
                    <form onSubmit={handleJoin} className="p-2 space-y-2">
                      {joinError && (
                        <div className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded-md font-medium">
                          {joinError}
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Kode TK-XXXX-XXXX..."
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full text-xs px-2.5 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono uppercase tracking-wider"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsJoiningHousehold(false);
                            setJoinError('');
                          }}
                          className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                        >
                          Gabung
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={() => processSyncQueue()}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-semibold border transition-all ${
              syncStatus.state === 'offline_pending'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : syncStatus.state === 'syncing'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
            }`}
            title={
              syncStatus.state === 'offline_pending'
                ? `Offline Buffer (${syncStatus.pendingCount} antrean). Klik untuk coba sinkronkan.`
                : syncStatus.state === 'syncing'
                ? 'Menghubungkan ke cloud...'
                : 'Tersinkronisasi'
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus.state === 'offline_pending' ? 'bg-amber-500 animate-pulse' : syncStatus.state === 'syncing' ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'
            }`} />
            <span className="hidden md:inline">
              {syncStatus.state === 'offline_pending'
                ? `Offline (${syncStatus.pendingCount})`
                : syncStatus.state === 'syncing'
                ? 'Sync...'
                : 'Synced'}
            </span>
          </button>
          {/* PWA Install Button */}
          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200/80 rounded-xl hover:bg-teal-100 transition-colors text-xs font-semibold shadow-xs"
              title="Pasang Takara di Layar Utama HP (Android & iOS)"
            >
              <Download className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Quick Logout Button */}
          <button
            onClick={logoutUser}
            className="w-9 h-9 rounded-xl bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors"
            title="Keluar dari Akun (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
          {/* User Avatar */}
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-200">
            {state.currentUser.displayName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
