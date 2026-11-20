import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatIDR } from '../lib/money';
import {
  WALLET_HEADER_COLORS,
  getReadableHeaderText
} from '../lib/walletColors';
import type { SavingsGoal } from '../types';
import { Plus, Target, Check, X, Trash2, Edit2, Sparkles, PiggyBank } from 'lucide-react';

const GOAL_ICONS = ['🏖️', '🎓', '🛟', '🏠', '🚗', '🕌', '💍', '💻', '👶', '🎯'];

export const SavingsGoalsSection: React.FC = () => {
  const {
    savingsGoals,
    wallets,
    addSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    deleteSavingsGoal
  } = useApp();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [topupGoal, setTopupGoal] = useState<SavingsGoal | null>(null);

  // Create / Edit Form State
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [currentStr, setCurrentStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('🏖️');
  const [color, setColor] = useState('#06D6A0');
  const [linkedWalletId, setLinkedWalletId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Top-up Modal State
  const [topupAmountStr, setTopupAmountStr] = useState('');
  const [topupWalletId, setTopupWalletId] = useState('none');
  const [topupNotice, setTopupNotice] = useState('');

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetStr('');
    setCurrentStr('');
    setDeadline('');
    setIcon('🏖️');
    setColor('#06D6A0');
    setLinkedWalletId('');
    setNotes('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setTargetStr(String(g.targetAmount));
    setCurrentStr(String(g.currentAmount));
    setDeadline(g.deadline || '');
    setIcon(g.icon || '🎯');
    setColor(g.color || '#06D6A0');
    setLinkedWalletId(g.linkedWalletId || '');
    setNotes(g.notes || '');
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError('');
    const targetAmt = parseInt(targetStr.replace(/[^0-9]/g, ''), 10) || 0;
    const currentAmt = parseInt(currentStr.replace(/[^0-9]/g, ''), 10) || 0;

    if (!title.trim()) {
      setFormError('Nama impian wajib diisi.');
      return;
    }
    if (targetAmt <= 0) {
      setFormError('Target nominal harus lebih dari Rp 0.');
      return;
    }

    setBusy(true);
    try {
      const res = editingGoal
        ? await updateSavingsGoal(editingGoal.id, {
            title: title.trim(),
            targetAmount: targetAmt,
            currentAmount: currentAmt,
            deadline: deadline || undefined,
            icon,
            color,
            linkedWalletId: linkedWalletId || undefined,
            notes: notes.trim() || undefined
          })
        : await addSavingsGoal({
            title: title.trim(),
            targetAmount: targetAmt,
            currentAmount: currentAmt,
            deadline: deadline || undefined,
            icon,
            color,
            linkedWalletId: linkedWalletId || undefined,
            notes: notes.trim() || undefined
          });

      if (!res.success) {
        setFormError(res.error || 'Gagal menyimpan kantong impian.');
        return;
      }
      setIsCreateOpen(false);
      setEditingGoal(null);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupGoal || busy) return;
    const amt = parseInt(topupAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (amt <= 0) {
      setFormError('Masukkan nominal tabungan lebih dari Rp 0.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const res = await contributeToSavingsGoal(
        topupGoal.id,
        amt,
        topupWalletId !== 'none' ? topupWalletId : undefined
      );
      if (!res.success) {
        setFormError(res.error || 'Gagal mencatat tabungan.');
        return;
      }
      const goalName = topupGoal.title;
      setTopupGoal(null);
      setTopupAmountStr('');
      setTopupNotice(`Berhasil menabung ${formatIDR(amt)} ke "${goalName}"! 🎉`);
      setTimeout(() => setTopupNotice(''), 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {topupNotice && (
        <div className="p-3 bg-[#D1FAE5] border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] text-[#064E3B] rounded-2xl text-xs font-extrabold flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{topupNotice}</span>
        </div>
      )}

      {/* Summary Hero Card */}
      <div className="saldo-hero saldo-hero--orchid rounded-3xl p-5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="nb-chip bg-white px-3 py-0.5 text-xs uppercase tracking-wide">
            🎯 Total Tabungan Impian
          </span>
          <span className="nb-chip bg-[#FFD166] px-2.5 py-0.5 text-xs">
            {overallPct}% Tercapai
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[#073B4C] break-all">
          {formatIDR(totalSaved)}{' '}
          <span className="text-sm font-bold text-[#365664]">/ {formatIDR(totalTarget)}</span>
        </div>
        <div className="w-full h-4 bg-white border-2 border-[#073B4C] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#06D6A0] transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-extrabold text-[#073B4C] text-sm">
          Daftar Kantong Impian ({savingsGoals.length})
        </h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="nb-btn flex items-center gap-1.5 text-xs bg-[#06D6A0] text-[#073B4C] px-3.5 py-2"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
          <span>Buat Impian</span>
        </button>
      </div>

      {/* Goals Grid */}
      {savingsGoals.length === 0 ? (
        <div className="bg-white rounded-3xl border-[2.5px] border-dashed border-[#073B4C] p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FFD166] border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] grid place-items-center text-2xl mx-auto">
            🏖️
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#073B4C]">Belum Ada Kantong Impian</h3>
            <p className="text-xs font-semibold text-[#365664] max-w-xs mx-auto mt-1">
              Rencanakan dana liburan keluarga, pendidikan anak, dana darurat, atau kurban dengan target terukur!
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="nb-btn bg-[#06D6A0] text-[#073B4C] px-5 py-2.5 text-xs inline-flex items-center gap-1.5"
          >
            <Target className="w-4 h-4" />
            <span>Mulai Impian Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {savingsGoals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const headerText = getReadableHeaderText(g.color || '#06D6A0');
            const isDone = g.isCompleted || g.currentAmount >= g.targetAmount;

            return (
              <div
                key={g.id}
                className="rounded-3xl border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] overflow-hidden bg-white flex flex-col justify-between"
              >
                {/* Colored Card Header */}
                <div
                  style={{ backgroundColor: g.color || '#06D6A0', color: headerText }}
                  className="px-4 py-3.5 border-b-[2.5px] border-[#073B4C] flex items-start justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] grid place-items-center text-xl shrink-0">
                      {g.icon || '🎯'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm leading-tight break-words" style={{ color: headerText }}>
                        {g.title}
                      </h3>
                      <span className="text-[11px] font-bold opacity-90 block mt-0.5" style={{ color: headerText }}>
                        {g.deadline
                          ? `Target: ${new Date(`${g.deadline}T12:00:00+07:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : 'Fleksibel tanpa tenggat'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-extrabold bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] px-2 py-0.5 rounded-full">
                      {isDone ? '🎉 Lunas!' : `${pct}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(g)}
                      className="w-7 h-7 bg-white text-[#073B4C] border-[1.5px] border-[#073B4C] hover:bg-[#FFFBEB] rounded-full grid place-items-center"
                      title="Edit Impian"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Progress & Actions Body */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <span className="text-base font-extrabold text-[#073B4C] tabular-nums">
                      {formatIDR(g.currentAmount)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">
                      dari {formatIDR(g.targetAmount)}
                    </span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-100 border-2 border-[#073B4C] rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isDone ? '#06D6A0' : g.color || '#FFD166'
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-bold text-[#365664]">
                      {isDone ? 'Target impian tercapai! 🌟' : `Kurang ${formatIDR(remaining)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTopupGoal(g);
                        setTopupAmountStr('');
                        setTopupWalletId(wallets[0]?.id || 'none');
                        setFormError('');
                      }}
                      className="nb-btn bg-[#FFD166] text-[#073B4C] px-3 py-1.5 text-xs inline-flex items-center gap-1 shrink-0"
                    >
                      <PiggyBank className="w-3.5 h-3.5" />
                      <span>+ Tabung</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT GOAL MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C]">
            <div
              style={{ backgroundColor: color, color: getReadableHeaderText(color) }}
              className="px-5 py-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] grid place-items-center text-lg shrink-0">
                  {icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm truncate" style={{ color: getReadableHeaderText(color) }}>
                    {title.trim() || (editingGoal ? 'Edit Kantong Impian' : 'Kantong Impian Baru')}
                  </h3>
                  <p className="text-[11px] font-bold opacity-90" style={{ color: getReadableHeaderText(color) }}>
                    Pilih ikon & warna header impian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] grid place-items-center text-[#073B4C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-5 space-y-3.5 max-h-[78vh] overflow-y-auto">
              {formError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#073B4C] text-red-800 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Nama Impian</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Misal: Liburan Keluarga ke Bali"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Pilih Ikon</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {GOAL_ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`h-9 rounded-xl border-2 border-[#073B4C] text-base grid place-items-center ${
                        icon === ic ? 'bg-[#FFD166] shadow-[2px_2px_0_#073B4C]' : 'bg-white'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Target (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetStr ? parseInt(targetStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setTargetStr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="5.000.000"
                    className="w-full px-3 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-extrabold tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Terkumpul Awal</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentStr ? parseInt(currentStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setCurrentStr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Target Tanggal (Opsional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Warna Header Kartu</label>
                <div className="grid grid-cols-4 gap-2">
                  {WALLET_HEADER_COLORS.map(preset => {
                    const active = color.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setColor(preset.hex)}
                        style={{ backgroundColor: preset.hex, color: getReadableHeaderText(preset.hex) }}
                        className={`py-1.5 px-2 rounded-xl border-2 border-[#073B4C] text-[11px] font-extrabold flex items-center justify-center gap-1 ${
                          active ? 'shadow-[2.5px_2.5px_0_#073B4C] -translate-y-0.5' : 'opacity-90'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                {editingGoal ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Hapus kantong impian "${editingGoal.title}"?`)) return;
                      await deleteSavingsGoal(editingGoal.id);
                      setIsCreateOpen(false);
                    }}
                    className="px-3 py-2 text-xs font-extrabold text-red-700 bg-red-50 border-2 border-[#073B4C] rounded-full inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-3.5 py-2 text-xs font-extrabold text-[#073B4C] bg-slate-100 border-2 border-[#073B4C] rounded-full"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="nb-btn px-4 py-2 text-xs bg-[#06D6A0] text-[#073B4C]"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOP-UP / NABUNG MODAL */}
      {topupGoal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C]">
            <div
              style={{
                backgroundColor: topupGoal.color || '#FFD166',
                color: getReadableHeaderText(topupGoal.color || '#FFD166')
              }}
              className="px-5 py-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] grid place-items-center text-lg">
                  {topupGoal.icon}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm" style={{ color: getReadableHeaderText(topupGoal.color || '#FFD166') }}>
                    Tabung ke {topupGoal.title}
                  </h3>
                  <p className="text-[11px] font-bold opacity-90" style={{ color: getReadableHeaderText(topupGoal.color || '#FFD166') }}>
                    Terkumpul: {formatIDR(topupGoal.currentAmount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopupGoal(null)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] grid place-items-center text-[#073B4C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTopup} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#073B4C] text-red-800 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1.5">Nominal Tabungan (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={topupAmountStr ? parseInt(topupAmountStr, 10).toLocaleString('id-ID') : ''}
                  onChange={e => setTopupAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="100.000"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-base font-extrabold tabular-nums"
                  autoFocus
                  required
                />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[50000, 100000, 250000, 500000].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setTopupAmountStr(prev => String((parseInt(prev || '0', 10) || 0) + preset))
                      }
                      className="py-1.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FFD166] border-[1.5px] border-[#073B4C] text-[11px] font-extrabold text-[#073B4C] tabular-nums"
                    >
                      +{preset / 1000}rb
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Sumber Dana Dompet</label>
                <select
                  value={topupWalletId}
                  onChange={e => setTopupWalletId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                >
                  <option value="none">Catat progres saja (tanpa potong saldo dompet)</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      Potong dari {w.name} ({formatIDR(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTopupGoal(null)}
                  className="px-4 py-2 text-xs font-extrabold text-[#073B4C] bg-slate-100 border-2 border-[#073B4C] rounded-full"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="nb-btn px-5 py-2 text-xs bg-[#06D6A0] text-[#073B4C]"
                >
                  Simpan Tabungan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
