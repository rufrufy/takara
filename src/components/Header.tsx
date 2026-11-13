import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Building, Plus, Lock, FileSpreadsheet, Check, LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenImport }) => {
  const { activeHousehold, households, switchHousehold, createHousehold, lockApp, logoutUser, state } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');

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

                <div className="border-t border-slate-100 my-1 pt-1">
                  {!isCreatingHousehold ? (
                    <button
                      onClick={() => setIsCreatingHousehold(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-teal-700 hover:bg-teal-50 font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Household Baru</span>
                    </button>
                  ) : (
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
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Excel Importer Trigger Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl hover:bg-emerald-100/70 transition-colors text-xs font-semibold shadow-xs"
            title="Impor / Periksa Berkas Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Impor Excel</span>
          </button>

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
