import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { jakartaDateTime } from '../lib/dateTime';
import {
  calculateHouseholdStreak,
  calculateMemberContributions,
  evaluateFamilyBadges,
  evaluateChallengeProgress,
  CHALLENGE_TEMPLATES,
  type ChallengeTemplate
} from '../lib/gamification';
import { X, Flame, Trophy, Users, Plus, Trash2, Sparkles } from 'lucide-react';

interface FamilyGamificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FamilyGamificationModal: React.FC<FamilyGamificationModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    transactions,
    members,
    periodIncome,
    periodExpense,
    categoryBudgets,
    savingsGoals,
    familyChallenges,
    addFamilyChallenge,
    deleteFamilyChallenge,
    categories
  } = useApp();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customType, setCustomType] = useState<'spending_cap' | 'no_spend_category' | 'streak_days'>('spending_cap');
  const [customCat, setCustomCat] = useState('Makan');
  const [customMaxStr, setCustomMaxStr] = useState('350000');
  const [customDays, setCustomDays] = useState('7');
  const [busy, setBusy] = useState(false);

  const streak = useMemo(() => calculateHouseholdStreak(transactions), [transactions]);
  const contributions = useMemo(
    () => calculateMemberContributions(transactions, members),
    [transactions, members]
  );
  const badges = useMemo(
    () =>
      evaluateFamilyBadges({
        streak,
        periodIncome,
        periodExpense,
        budgets: categoryBudgets,
        transactions,
        goals: savingsGoals,
        contributions
      }),
    [streak, periodIncome, periodExpense, categoryBudgets, transactions, savingsGoals, contributions]
  );

  if (!isOpen) return null;

  const startTemplateChallenge = async (tpl: ChallengeTemplate) => {
    if (busy) return;
    setBusy(true);
    try {
      const today = jakartaDateTime(new Date().toISOString()).date;
      const endObj = new Date(`${today}T12:00:00+07:00`);
      endObj.setUTCDate(endObj.getUTCDate() + (tpl.targetDays - 1));
      const endDate = jakartaDateTime(endObj.toISOString()).date;

      await addFamilyChallenge({
        title: tpl.title,
        targetType: tpl.targetType,
        categoryName: tpl.categoryName,
        maxAmount: tpl.maxAmount,
        targetDays: tpl.targetDays,
        startDate: today,
        endDate,
        rewardBadge: tpl.rewardBadge
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || busy) return;
    setBusy(true);
    try {
      const days = Math.max(1, parseInt(customDays, 10) || 7);
      const today = jakartaDateTime(new Date().toISOString()).date;
      const endObj = new Date(`${today}T12:00:00+07:00`);
      endObj.setUTCDate(endObj.getUTCDate() + (days - 1));
      const endDate = jakartaDateTime(endObj.toISOString()).date;

      await addFamilyChallenge({
        title: customTitle.trim(),
        targetType: customType,
        categoryName: customType === 'streak_days' ? undefined : customCat,
        maxAmount: customType === 'spending_cap' ? parseInt(customMaxStr.replace(/[^0-9]/g, ''), 10) || 300000 : undefined,
        targetDays: days,
        startDate: today,
        endDate,
        rewardBadge: '🏆'
      });
      setCustomTitle('');
      setShowCustomForm(false);
    } finally {
      setBusy(false);
    }
  };

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FFFDF5] rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C] flex flex-col">
        {/* Tropical Header */}
        <div className="px-5 py-4 bg-[#FFD166] border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] grid place-items-center text-xl">
              🏆
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#073B4C] leading-tight">
                Arena & Streak Keluarga
              </h2>
              <p className="text-xs font-bold text-[#365664]">
                Semangat disiplin bareng keluarga setiap hari!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup arena keluarga"
            className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] grid place-items-center text-[#073B4C] hover:bg-[#FFE0E5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* 1. STREAK HERO CARD */}
          <section className="p-4 rounded-3xl bg-[#38BDF8] border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-12 h-12 rounded-2xl bg-[#FFD166] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] grid place-items-center text-2xl">
                  🔥
                </span>
                <div>
                  <div className="text-2xl font-extrabold text-[#073B4C] tabular-nums">
                    {streak.currentStreak} Hari Beruntun
                  </div>
                  <div className="text-xs font-bold text-[#073B4C]/90">
                    Rekor terbaik: {streak.bestStreak} hari · Aktif {streak.activeDaysThisMonth} hari bulan ini
                  </div>
                </div>
              </div>

              <span
                className={`nb-chip px-3 py-1 text-xs ${
                  streak.loggedToday ? 'bg-[#BEF264] text-[#073B4C]' : 'bg-white text-[#073B4C]'
                }`}
              >
                {streak.loggedToday ? '✓ Hari ini sudah catat!' : 'Yuk catat hari ini!'}
              </span>
            </div>

            {/* 7-Day Activity Strip */}
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {streak.last7Days.map(d => (
                <div
                  key={d.date}
                  className={`py-2 rounded-2xl border-2 border-[#073B4C] text-center ${
                    d.hasLog ? 'bg-[#BEF264] shadow-[2px_2px_0_#073B4C]' : 'bg-white/85'
                  }`}
                >
                  <div className="text-[10px] font-extrabold text-[#073B4C]">{d.dayShort}</div>
                  <div className="text-sm mt-0.5">{d.hasLog ? '🔥' : d.isToday ? '⏳' : '·'}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. ACTIVE FAMILY CHALLENGES */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#073B4C] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#05966F]" />
                <span>Tantangan Hemat Keluarga ({familyChallenges.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="nb-chip bg-[#06D6A0] text-[#073B4C] px-3 py-1 text-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                <span>Custom</span>
              </button>
            </div>

            {showCustomForm && (
              <form
                onSubmit={handleCreateCustom}
                className="p-4 rounded-2xl bg-white border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] space-y-3"
              >
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Judul Tantangan</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="Cth: Minggu Masak Sendiri di Rumah"
                    className="w-full px-3 py-2 border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Jenis Target</label>
                    <select
                      value={customType}
                      onChange={e => setCustomType(e.target.value as typeof customType)}
                      className="w-full px-2.5 py-2 border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                    >
                      <option value="spending_cap">Batas Belanja (Rp)</option>
                      <option value="no_spend_category">Puasa Belanja Pos</option>
                      <option value="streak_days">Target Hari Streak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Durasi (Hari)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={customDays}
                      onChange={e => setCustomDays(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {customType !== 'streak_days' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Pos / Kata Kunci</label>
                      <select
                        value={customCat}
                        onChange={e => setCustomCat(e.target.value)}
                        className="w-full px-2.5 py-2 border-2 border-[#073B4C] rounded-xl text-xs font-bold"
                      >
                        <option value="Semua">Semua Pengeluaran</option>
                        {categories
                          .filter(c => c.type === 'expense')
                          .map(c => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    {customType === 'spending_cap' && (
                      <div>
                        <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Maksimal (Rp)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customMaxStr ? parseInt(customMaxStr, 10).toLocaleString('id-ID') : ''}
                          onChange={e => setCustomMaxStr(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full px-3 py-2 border-2 border-[#073B4C] rounded-xl text-xs font-extrabold tabular-nums"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="px-3 py-1.5 text-xs font-extrabold border-2 border-[#073B4C] rounded-full bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="nb-btn px-4 py-1.5 text-xs bg-[#06D6A0] text-[#073B4C]"
                  >
                    Mulai Tantangan
                  </button>
                </div>
              </form>
            )}

            {/* Active Challenge Cards */}
            {familyChallenges.map(ch => {
              const ev = evaluateChallengeProgress(ch, transactions, streak);
              const barBg =
                ev.computedStatus === 'FAILED'
                  ? '#FF6B6B'
                  : ev.computedStatus === 'COMPLETED'
                  ? '#06D6A0'
                  : '#FFD166';

              return (
                <div
                  key={ch.id}
                  className="p-3.5 rounded-2xl bg-white border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#FEF3C7] border-2 border-[#073B4C] grid place-items-center text-lg shrink-0">
                        {ch.rewardBadge || '🏆'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm text-[#073B4C] break-words">
                          {ch.title}
                        </div>
                        <div className="text-[11px] font-bold text-[#365664]">{ev.detailLabel}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border-[1.5px] border-[#073B4C] bg-[#E0F2FE] text-[#073B4C]">
                        {ev.statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteFamilyChallenge(ch.id)}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 grid place-items-center"
                        title="Hapus tantangan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-slate-100 border-2 border-[#073B4C] rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${ev.progressPercent}%`, backgroundColor: barBg }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Quick Start Templates */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-extrabold text-[#365664] uppercase tracking-wide">
                ⚡ Mulai Cepat dari Template Seru:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHALLENGE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.title}
                    type="button"
                    disabled={busy}
                    onClick={() => startTemplateChallenge(tpl)}
                    className="p-2.5 rounded-2xl bg-[#FFF9DB] hover:bg-[#FFD166] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-left flex items-center gap-2 transition-colors"
                  >
                    <span className="text-lg shrink-0">{tpl.rewardBadge}</span>
                    <span className="text-xs font-extrabold text-[#073B4C] leading-snug">{tpl.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 3. STICKER BADGES COLLECTION */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#073B4C] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#05966F]" />
                <span>Koleksi Stiker Pencapaian ({unlockedCount}/{badges.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {badges.map(b => (
                <div
                  key={b.id}
                  style={{ backgroundColor: b.unlocked ? b.color : '#F7F4E8' }}
                  className={`p-3 rounded-2xl border-2 border-[#073B4C] flex flex-col justify-between ${
                    b.unlocked
                      ? 'shadow-[3px_3px_0_#073B4C]'
                      : 'border-dashed opacity-75 grayscale'
                  }`}
                >
                  <div>
                    <div className="text-2xl">{b.icon}</div>
                    <div className="font-extrabold text-xs text-[#073B4C] mt-1">{b.title}</div>
                    <p className="text-[10px] font-semibold text-[#073B4C]/85 mt-0.5 leading-snug">
                      {b.description}
                    </p>
                  </div>
                  <span className="mt-2 inline-block self-start text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-[#073B4C] text-[#073B4C]">
                    {b.unlocked ? '✓ Terbuka' : b.progressLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 4. MEMBER CONTRIBUTIONS */}
          <section className="p-4 rounded-2xl bg-white border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] space-y-2.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wide text-[#073B4C] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#05966F]" />
              <span>Kontribusi Pencatatan Bulan Ini</span>
            </h3>
            {contributions.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500">Belum ada catatan bulan ini.</p>
            ) : (
              <div className="space-y-2">
                {contributions.map((c, idx) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-extrabold text-[#073B4C]">
                      <span>
                        {idx === 0 && c.txCount > 0 ? '👑 ' : '👤 '}
                        {c.name}
                      </span>
                      <span className="tabular-nums">
                        {c.txCount} catatan ({c.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 border border-[#073B4C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#06D6A0]"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
