import type {
  CategoryBudget,
  FamilyChallenge,
  FinancialTransaction,
  HouseholdMember,
  SavingsGoal
} from '../types';
import { jakartaDateTime } from './dateTime';
import { isBalanceReset } from './monthlyBalance';

export interface DayActivityDot {
  date: string;
  dayShort: string;
  hasLog: boolean;
  isToday: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  loggedToday: boolean;
  activeDaysThisMonth: number;
  last7Days: DayActivityDot[];
}

export interface FamilyBadge {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  unlocked: boolean;
  progressLabel: string;
}

export interface MemberContribution {
  name: string;
  txCount: number;
  percentage: number;
}

export interface ChallengeEvaluation {
  progressPercent: number;
  statusLabel: string;
  detailLabel: string;
  computedStatus: 'ACTIVE' | 'COMPLETED' | 'FAILED';
  spentAmount: number;
  daysLeft: number;
}

const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function shiftJakartaDate(baseYmd: string, deltaDays: number): string {
  const d = new Date(`${baseYmd}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return jakartaDateTime(d.toISOString()).date;
}

export function calculateHouseholdStreak(transactions: FinancialTransaction[]): StreakSummary {
  const today = jakartaDateTime(new Date().toISOString()).date;
  const currentYearMonth = today.slice(0, 7);

  const validDates = new Set<string>();
  for (const t of transactions) {
    if (t.status === 'VOIDED' || isBalanceReset(t) || t.type === 'opening_balance') continue;
    try {
      const d = jakartaDateTime(t.effectiveAt).date;
      if (d) validDates.add(d);
    } catch {
      // ignore malformed date
    }
  }

  const loggedToday = validDates.has(today);
  const yesterday = shiftJakartaDate(today, -1);

  // Current streak: count backwards from today (or yesterday if today isn't logged yet)
  let currentStreak = 0;
  let cursor = loggedToday ? today : validDates.has(yesterday) ? yesterday : '';
  while (cursor && validDates.has(cursor)) {
    currentStreak++;
    cursor = shiftJakartaDate(cursor, -1);
  }

  // Best streak across sorted dates
  const sortedDates = Array.from(validDates).sort();
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const expectedNext = shiftJakartaDate(sortedDates[i - 1]!, 1);
      run = sortedDates[i] === expectedNext ? run + 1 : 1;
    }
    if (run > bestStreak) bestStreak = run;
  }
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  // Active days in current month
  let activeDaysThisMonth = 0;
  for (const d of validDates) {
    if (d.startsWith(currentYearMonth)) activeDaysThisMonth++;
  }

  // Last 7 days strip
  const last7Days: DayActivityDot[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const d = shiftJakartaDate(today, offset);
    const jsDay = new Date(`${d}T12:00:00+07:00`).getDay();
    last7Days.push({
      date: d,
      dayShort: DAY_NAMES_SHORT[jsDay] || 'Hr',
      hasLog: validDates.has(d),
      isToday: d === today
    });
  }

  return {
    currentStreak,
    bestStreak,
    loggedToday,
    activeDaysThisMonth,
    last7Days
  };
}

export function calculateMemberContributions(
  transactions: FinancialTransaction[],
  members: HouseholdMember[]
): MemberContribution[] {
  const todayMonth = jakartaDateTime(new Date().toISOString()).date.slice(0, 7);
  const monthTxs = transactions.filter(t => {
    if (t.status === 'VOIDED' || isBalanceReset(t) || t.type === 'opening_balance') return false;
    try {
      return jakartaDateTime(t.effectiveAt).date.startsWith(todayMonth);
    } catch {
      return false;
    }
  });

  const counts = new Map<string, number>();
  for (const m of members) {
    if (m.displayName) counts.set(m.displayName, 0);
  }
  for (const t of monthTxs) {
    const author = (t.addedBy || 'Anggota').trim();
    counts.set(author, (counts.get(author) || 0) + 1);
  }

  const total = monthTxs.length || 1;
  return Array.from(counts.entries())
    .map(([name, txCount]) => ({
      name,
      txCount,
      percentage: monthTxs.length > 0 ? Math.round((txCount / total) * 100) : 0
    }))
    .sort((a, b) => b.txCount - a.txCount);
}

export function evaluateFamilyBadges(params: {
  streak: StreakSummary;
  periodIncome: number;
  periodExpense: number;
  budgets: CategoryBudget[];
  transactions: FinancialTransaction[];
  goals: SavingsGoal[];
  contributions: MemberContribution[];
}): FamilyBadge[] {
  const { streak, periodIncome, periodExpense, budgets, transactions, goals, contributions } = params;
  const todayMonth = jakartaDateTime(new Date().toISOString()).date.slice(0, 7);

  // Check budget discipline
  const monthExpenses = transactions.filter(t => {
    if (t.status === 'VOIDED' || t.type !== 'expense' || isBalanceReset(t)) return false;
    return jakartaDateTime(t.effectiveAt).date.startsWith(todayMonth);
  });

  const anyOverBudget =
    budgets.length > 0 &&
    budgets.some(b => {
      const spent = monthExpenses
        .filter(
          t =>
            (b.categoryId && t.categoryId === b.categoryId) ||
            t.categoryName?.toLowerCase() === b.categoryName.toLowerCase()
        )
        .reduce((s, t) => s + t.amount, 0);
      return spent > b.monthlyLimit;
    });

  const activeContributors = contributions.filter(c => c.txCount > 0).length;
  const savedGoalsCount = goals.filter(g => g.currentAmount > 0).length;
  const completedGoalsCount = goals.filter(g => g.isCompleted || g.currentAmount >= g.targetAmount).length;

  return [
    {
      id: 'streak-3',
      icon: '🔥',
      title: 'Api Semangat',
      description: 'Mencatat keuangan 3 hari berturut-turut',
      color: '#FFD166',
      unlocked: streak.bestStreak >= 3,
      progressLabel: `${Math.min(streak.bestStreak, 3)}/3 hari`
    },
    {
      id: 'streak-7',
      icon: '🌴',
      title: 'Sultan Disiplin',
      description: 'Streak rajin mencatat 7 hari tanpa putus',
      color: '#06D6A0',
      unlocked: streak.bestStreak >= 7,
      progressLabel: `${Math.min(streak.bestStreak, 7)}/7 hari`
    },
    {
      id: 'budget-shield',
      icon: '🛡️',
      title: 'Perisai Anggaran',
      description: 'Punya pagu kategori & semua pos aman bulan ini',
      color: '#38BDF8',
      unlocked: budgets.length > 0 && !anyOverBudget,
      progressLabel: budgets.length === 0 ? 'Belum set pagu' : anyOverBudget ? 'Ada pos lewat' : '100% Aman!'
    },
    {
      id: 'dream-saver',
      icon: '🎯',
      title: 'Pemburu Impian',
      description: 'Mulai menabung di Kantong Impian keluarga',
      color: '#C4B5FD',
      unlocked: savedGoalsCount > 0,
      progressLabel: completedGoalsCount > 0 ? `${completedGoalsCount} tercapai!` : `${savedGoalsCount} aktif`
    },
    {
      id: 'tropical-surplus',
      icon: '🍍',
      title: 'Surplus Tropis',
      description: 'Arus kas bulan berjalan positif (hemat!)',
      color: '#BEF264',
      unlocked: periodIncome > 0 && periodIncome > periodExpense,
      progressLabel: periodIncome > periodExpense ? 'Surplus ✓' : 'Pantau arus kas'
    },
    {
      id: 'teamwork',
      icon: '🤝',
      title: 'Keluarga Kompak',
      description: 'Minimal 2 anggota aktif mencatat bulan ini',
      color: '#F472B6',
      unlocked: activeContributors >= 2,
      progressLabel: `${activeContributors}/2 anggota`
    }
  ];
}

export function evaluateChallengeProgress(
  challenge: FamilyChallenge,
  transactions: FinancialTransaction[],
  streak: StreakSummary
): ChallengeEvaluation {
  const today = jakartaDateTime(new Date().toISOString()).date;
  const startMs = Date.parse(`${challenge.startDate}T00:00:00+07:00`);
  const endMs = Date.parse(`${challenge.endDate}T23:59:59+07:00`);
  const nowMs = Date.parse(`${today}T12:00:00+07:00`);
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  const daysLeft = Math.max(0, Math.ceil((endMs - nowMs) / 86400000));
  const isPastEnd = today > challenge.endDate;

  const rangeExpenses = transactions.filter(t => {
    if (t.status === 'VOIDED' || t.type !== 'expense' || isBalanceReset(t)) return false;
    const d = jakartaDateTime(t.effectiveAt).date;
    if (d < challenge.startDate || d > challenge.endDate) return false;
    if (challenge.categoryName && challenge.categoryName !== 'Semua') {
      const cLower = challenge.categoryName.toLowerCase();
      return (
        (t.categoryName || '').toLowerCase().includes(cLower) ||
        (t.description || '').toLowerCase().includes(cLower)
      );
    }
    return true;
  });

  const spentAmount = rangeExpenses.reduce((s, t) => s + t.amount, 0);

  if (challenge.targetType === 'streak_days') {
    const target = Math.max(1, challenge.targetDays || 7);
    const pct = Math.min(100, Math.round((streak.currentStreak / target) * 100));
    const done = streak.currentStreak >= target;
    return {
      progressPercent: pct,
      statusLabel: done ? 'Berhasil! 🎉' : `${streak.currentStreak}/${target} hari`,
      detailLabel: done ? 'Target streak tercapai!' : `Kurang ${Math.max(0, target - streak.currentStreak)} hari berturut-turut`,
      computedStatus: done ? 'COMPLETED' : isPastEnd ? 'FAILED' : 'ACTIVE',
      spentAmount: 0,
      daysLeft
    };
  }

  if (challenge.targetType === 'no_spend_category') {
    const violationCount = rangeExpenses.length;
    const elapsedDays = Math.min(totalDays, Math.max(1, Math.round((Math.min(nowMs, endMs) - startMs) / 86400000) + 1));
    const failed = violationCount > 0;
    const completed = !failed && isPastEnd;
    const pct = failed ? 100 : Math.min(100, Math.round((elapsedDays / totalDays) * 100));
    return {
      progressPercent: pct,
      statusLabel: failed ? 'Bocor 😅' : completed ? 'Lulus! 🏆' : `Hari ke-${elapsedDays}/${totalDays}`,
      detailLabel: failed
        ? `Tercatat ${violationCount}x belanja di pos "${challenge.categoryName || 'ini'}"`
        : `0 belanja pada "${challenge.categoryName || 'pos ini'}" · ${daysLeft} hari lagi`,
      computedStatus: failed ? 'FAILED' : completed ? 'COMPLETED' : 'ACTIVE',
      spentAmount,
      daysLeft
    };
  }

  // Default: spending_cap
  const cap = Math.max(1, challenge.maxAmount || 500000);
  const pct = Math.min(100, Math.round((spentAmount / cap) * 100));
  const over = spentAmount > cap;
  const completed = !over && isPastEnd;
  return {
    progressPercent: pct,
    statusLabel: over ? 'Lewat Batas ⚠️' : completed ? 'Hemat Sukses! 🏆' : `${pct}% terpakai`,
    detailLabel: over
      ? `Melebihi batas Rp ${(spentAmount - cap).toLocaleString('id-ID')}`
      : `Sisa kuota Rp ${Math.max(0, cap - spentAmount).toLocaleString('id-ID')} · ${daysLeft} hari lagi`,
    computedStatus: over ? 'FAILED' : completed ? 'COMPLETED' : 'ACTIVE',
    spentAmount,
    daysLeft
  };
}

export interface ChallengeTemplate {
  title: string;
  targetType: FamilyChallenge['targetType'];
  categoryName?: string;
  maxAmount?: number;
  targetDays: number;
  rewardBadge: string;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    title: '7 Hari Puasa Kopi & Jajan Manis',
    targetType: 'no_spend_category',
    categoryName: 'Kopi',
    targetDays: 7,
    rewardBadge: '🧋'
  },
  {
    title: 'Batas Makan Luar Minggu Ini',
    targetType: 'spending_cap',
    categoryName: 'Makan',
    maxAmount: 350000,
    targetDays: 7,
    rewardBadge: '🍱'
  },
  {
    title: 'Rajin Catat 7 Hari Nonstop',
    targetType: 'streak_days',
    targetDays: 7,
    rewardBadge: '🔥'
  },
  {
    title: 'Rem Belanja Online 14 Hari',
    targetType: 'spending_cap',
    categoryName: 'Belanja',
    maxAmount: 300000,
    targetDays: 14,
    rewardBadge: '🛒'
  }
];
