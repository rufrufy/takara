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
  const [householdSaving,setHouseholdSaving] = useState(false);
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
    if(householdSaving)return;
    setJoinError('');
    if (joinCode.trim()) {
      setHouseholdSaving(true);
      let res;
      try {res=await joinHouseholdByCode(joinCode.trim());}
      catch(error){res={success:false,error:error instanceof Error?error.message:'Gagal bergabung ke household.'};}
      finally{setHouseholdSaving(false);}
      if (res.success) {
        setJoinCode('');
        setIsJoiningHousehold(false);
        setDropdownOpen(false);
      } else {
        setJoinError(res.error || 'Kode household tidak valid');
      }
    }
  };
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(householdSaving)return;
    if (newHouseholdName.trim()) {
      setHouseholdSaving(true);setJoinError('');
      try {
      const result=await createHousehold(newHouseholdName.trim());
      if(!result.success){setJoinError(result.error||'Household belum tersimpan.');return;}
      setNewHouseholdName('');
      setIsCreatingHousehold(false);
      setDropdownOpen(false);
      }catch(error){setJoinError(error instanceof Error?error.message:'Household belum tersimpan.');}
      finally{setHouseholdSaving(false);}
    }
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-cluster">
          <span className="brand-badge" aria-hidden="true">T</span>
          <span className="wordmark">Takara</span>
        </div>
        {/* Household Switcher */}
        <div className="relative">
          <button
            type="button"
            id="header-household-dropdown-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="household-switch" aria-expanded={dropdownOpen} aria-label={`Pilih household, ${activeHousehold.name}`}>
            <House size={17} strokeWidth={2.3}/><span>{activeHousehold.name}</span><ChevronDown size={15} strokeWidth={2.6}/>
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
              <div className="absolute left-0 mt-2.5 w-68 bg-white rounded-3xl border-[3px] border-[#073B4C] shadow-[6px_6px_0_#073B4C] z-50 p-2.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[11px] font-extrabold text-[#365664] px-3 py-1.5 uppercase tracking-wider">
                  Pilih Household
                </div>

                {households.map(h => (
                  <button
                    key={h.id}
                    onClick={() => {
                      switchHousehold(h.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm font-extrabold transition-all mb-1 ${
                      h.id === activeHousehold.id
                        ? 'bg-[#FFD166] text-[#073B4C] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C]'
                        : 'text-[#073B4C] hover:bg-[#FEF3C7]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#073B4C]" />
                      <span>{h.name}</span>
                    </div>
                    {h.id === activeHousehold.id && (
                      <Check className="w-4 h-4 text-[#073B4C] stroke-[2.8]" />
                    )}
                  </button>
                ))}

                <div className="border-t-2 border-dashed border-[#073B4C]/25 my-1.5 pt-2 space-y-1">
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
                      {joinError&&<p role="alert" className="text-xs text-red-700">{joinError}</p>}
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
                          type="submit" disabled={householdSaving}
                          className="px-2.5 py-1 text-xs bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800"
                        >
                          {householdSaving?'Menyimpan…':'Simpan'}
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
                          type="submit" disabled={householdSaving}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                        >
                          {householdSaving?'Menghubungkan…':'Gabung'}
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
