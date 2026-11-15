import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Building, Plus, Lock, Check, LogOut, Download, Users, Link as LinkIcon, House, UserRound } from 'lucide-react';
import { getSyncStatus, SYNC_EVENT_NAME, processSyncQueue, type SyncEngineStatus } from '../lib/syncEngine';
interface HeaderProps {
  onOpenImport?: () => void;
  onOpenInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport, onOpenInstall }) => {
  const { activeHousehold, households, switchHousehold, createHousehold, joinHouseholdByCode, lockApp, logoutUser, state } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
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
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (joinCode.trim()) {
      const res = await joinHouseholdByCode(joinCode.trim());
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
    <header className="app-header">
      <div className="header-inner">
        <span className="wordmark">Takara</span>
        {/* Household Switcher */}
        <div className="relative">
          <button
            type="button"
            id="header-household-dropdown-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="household-switch" aria-expanded={dropdownOpen} aria-label={`Pilih household, ${activeHousehold.name}`}>
            <House size={18} strokeWidth={1.6}/><span>{activeHousehold.name}</span><ChevronDown size={15}/>
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

        <div className="profile-area">
          <button className="profile-button" onClick={()=>setProfileOpen(!profileOpen)} aria-label="Menu akun" aria-expanded={profileOpen}><UserRound size={21} strokeWidth={1.6}/></button>
          {profileOpen&&<>
            <button className="menu-dismiss" onClick={()=>setProfileOpen(false)} aria-label="Tutup menu akun"/>
            <div className="profile-menu">
              <strong>{state.currentUser.displayName}</strong>
              <button onClick={()=>processSyncQueue()}><span className="sync-dot"/>{syncStatus.state==='syncing'?'Menyinkronkan…':syncStatus.state==='offline_pending'?'Coba sinkronkan':'Tersinkronisasi'}</button>
              {onOpenImport&&<button onClick={()=>{setProfileOpen(false);onOpenImport();}}><Download size={17}/>Impor data</button>}
              {onOpenInstall&&<button onClick={()=>{setProfileOpen(false);onOpenInstall();}}><Download size={17}/>Pasang aplikasi</button>}
              <button onClick={lockApp}><Lock size={17}/>Kunci aplikasi</button>
              <button onClick={logoutUser}><LogOut size={17}/>Keluar akun</button>
            </div>
          </>}
        </div>
      </div>
    </header>
  );
};
