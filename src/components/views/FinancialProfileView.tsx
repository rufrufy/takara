import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import { WalletType, DebtItem, TransactionType } from '../../types';
import {
  Wallet as WalletIcon,
  Plus,
  Building2,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  Check,
  X,
  CreditCard,
  TrendingUp,
  HandCoins,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Trash2,
  Briefcase,
  Layers,
  ArrowUpRight,
  Home,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Percent,
  CheckCheck,
  Clock,
  Coins,
  Edit2
} from 'lucide-react';

interface FinancialProfileViewProps {
  onOpenQuickAdd?: (type?: TransactionType) => void;
}

export const FinancialProfileView: React.FC<FinancialProfileViewProps> = ({ onOpenQuickAdd }) => {
  const {
    wallets,
    transactions,
    totalBalance,
    periodIncome,
    addWallet,
    debts,
    addDebt,
    toggleDebtSettled,
    toggleDebtPaidThisMonth,
    payDebtInstallment,
    updateDebt,
    deleteDebt,
    addTransaction,
    members
  } = useApp();

  // Sub-kategori tabs: 'dompet' | 'utang' | 'pemasukan' (Default dibuka ke Aset dan Dompet)
  const [subTab, setSubTab] = useState<'dompet' | 'utang' | 'pemasukan'>('dompet');

  // Wallet detail & add modal
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('checking');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');

  // 3-Step Debt Wizard State: Jenis -> Nominal & Tempo -> Detail & Dompet
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtStep, setDebtStep] = useState<1 | 2 | 3>(1);
  const [debtType, setDebtType] = useState<'debt' | 'receivable'>('debt');
  const [debtKind, setDebtKind] = useState('Pinjaman pribadi');
  const [debtKindDesc, setDebtKindDesc] = useState('Bank, koperasi, atau orang');
  const [debtTitle, setDebtTitle] = useState('');
  const [debtAmountStr, setDebtAmountStr] = useState('');
  const [debtRemainingStr, setDebtRemainingStr] = useState('');
  const [debtMonthlyPaymentStr, setDebtMonthlyPaymentStr] = useState('');
  const [debtDueDay, setDebtDueDay] = useState('13');
  const [debtRecipientWalletId, setDebtRecipientWalletId] = useState('none');
  const [debtInterestRate, setDebtInterestRate] = useState('0');
  const [debtNotes, setDebtNotes] = useState('');
  const [wizardError, setWizardError] = useState('');

  // Quick Pay Installment Modal State
  const [paymentModalDebt, setPaymentModalDebt] = useState<DebtItem | null>(null);
  const [paymentSourceWalletId, setPaymentSourceWalletId] = useState<string>('');
  const [paymentNotice, setPaymentNotice] = useState<string>('');

  // Edit Debt Modal State
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [editPersonOrEntity, setEditPersonOrEntity] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editRemainingStr, setEditRemainingStr] = useState('');
  const [editMonthlyStr, setEditMonthlyStr] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editType, setEditType] = useState<'debt' | 'receivable'>('debt');
  const [editIsSettled, setEditIsSettled] = useState(false);
  const [editError, setEditError] = useState('');

  const handleOpenEditDebt = (d: DebtItem) => {
    setEditingDebt(d);
    setEditPersonOrEntity(d.personOrEntity);
    setEditAmountStr(String(d.amount));
    setEditRemainingStr(String(d.remainingAmount));
    setEditMonthlyStr(d.monthlyInstallment ? String(d.monthlyInstallment) : '');
    setEditDueDay(d.dueDay ? String(d.dueDay) : '');
    setEditDueDate(d.dueDate || '');
    setEditNotes(d.notes || '');
    setEditType(d.type);
    setEditIsSettled(d.isSettled);
    setEditError('');
  };

  const handleSaveEditDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    const cleanTitle = editPersonOrEntity.trim();
    if (!cleanTitle) {
      setEditError('Nama pihak atau judul utang/piutang wajib diisi.');
      return;
    }
    const amount = parseInt(editAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (amount <= 0) {
      setEditError('Total nominal harus lebih dari 0.');
      return;
    }
    const remaining = editRemainingStr !== ''
      ? parseInt(editRemainingStr.replace(/[^0-9]/g, ''), 10) || 0
      : amount;
    const monthly = editMonthlyStr ? parseInt(editMonthlyStr.replace(/[^0-9]/g, ''), 10) || 0 : 0;
    const dueDay = editDueDay ? parseInt(editDueDay, 10) || undefined : undefined;

    updateDebt(editingDebt.id, {
      personOrEntity: cleanTitle,
      amount,
      remainingAmount: remaining,
      monthlyInstallment: monthly > 0 ? monthly : undefined,
      dueDay,
      dueDate: editDueDate.trim() || undefined,
      notes: editNotes.trim() || undefined,
      type: editType,
      isSettled: editIsSettled || remaining <= 0
    });

    setEditingDebt(null);
  };

  // Kategori utang & pinjaman
  const DEBT_TYPES = [
    {
      name: 'Pinjaman pribadi',
      desc: 'Bank, koperasi, atau orang',
      Icon: Building2,
    },
    {
      name: 'KPR',
      desc: 'Cicilan rumah',
      Icon: Home,
    },
    {
      name: 'Cicilan pendidikan',
      desc: 'Kuliah atau kursus',
      Icon: GraduationCap,
    },
    {
      name: 'Pinjol',
      desc: 'Aplikasi pinjaman online',
      Icon: Smartphone,
    },
    {
      name: 'Lainnya',
      desc: 'Utang yang tidak masuk daftar',
      Icon: Sparkles,
    },
  ];

  // Compute totals for Utang & Piutang
  const totalUtang = debts
    .filter(d => d.type === 'debt' && !d.isSettled)
    .reduce((acc, d) => acc + d.remainingAmount, 0);

  const totalPiutang = debts
    .filter(d => d.type === 'receivable' && !d.isSettled)
    .reduce((acc, d) => acc + d.remainingAmount, 0);

  // Active debts with monthly installments
  const activeDebts = debts.filter(d => d.type === 'debt' && !d.isSettled);

  // Tagihan cicilan bulan berjalan yang belum dibayar
  const unpaidDebtsThisMonth = activeDebts.filter(d => !d.isPaidThisMonth);
  const totalUnpaidInstallmentThisMonth = unpaidDebtsThisMonth.reduce((acc, d) => {
    const installment = d.monthlyInstallment && d.monthlyInstallment > 0 ? d.monthlyInstallment : d.remainingAmount;
    return acc + Math.min(installment, d.remainingAmount);
  }, 0);

  // Cicilan bulan berjalan yang sudah dibayar
  const paidDebtsThisMonth = activeDebts.filter(d => d.isPaidThisMonth);
  const totalPaidInstallmentThisMonth = paidDebtsThisMonth.reduce((acc, d) => {
    const installment = d.monthlyInstallment && d.monthlyInstallment > 0 ? d.monthlyInstallment : d.remainingAmount;
    return acc + Math.min(installment, d.remainingAmount);
  }, 0);

  // Filter income transactions
  const incomeTransactions = transactions.filter(t => t.type === 'income');

  // Open New Debt Wizard
  const openNewDebtWizard = (type: 'debt' | 'receivable' = 'debt') => {
    setDebtType(type);
    setDebtStep(1);
    setDebtKind(type === 'debt' ? 'Pinjaman pribadi' : 'Piutang pribadi');
    setDebtKindDesc(type === 'debt' ? 'Bank, koperasi, atau orang' : 'Dipinjam teman atau keluarga');
    setDebtTitle('');
    setDebtAmountStr('');
    setDebtRemainingStr('');
    setDebtMonthlyPaymentStr('');
    setDebtDueDay('13');
    setDebtRecipientWalletId('none');
    setDebtInterestRate('0');
    setDebtNotes('');
    setWizardError('');
    setIsDebtModalOpen(true);
  };

  // Handle Add Wallet Submit
  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    const openingBalance = openingBalanceStr
      ? parseInt(openingBalanceStr.replace(/[^0-9]/g, ''), 10) || 0
      : 0;

    addWallet(walletName.trim(), walletType, openingBalance);
    setWalletName('');
    setOpeningBalanceStr('');
    setIsWalletModalOpen(false);
  };

  // Step 1 -> Step 2 validation
  const handleProceedToStep2 = () => {
    setWizardError('');
    setDebtStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleProceedToStep3 = () => {
    setWizardError('');
    const amt = parseInt(debtAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (amt <= 0) {
      setWizardError('Masukkan total nominal utang yang valid.');
      return;
    }
    if (!debtRemainingStr) {
      setDebtRemainingStr(debtAmountStr);
    }
    setDebtStep(3);
  };

  // Final Step 3 submission
  const handleSubmitDebtWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError('');

    const totalAmt = parseInt(debtAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    const remainingAmt = parseInt((debtRemainingStr || debtAmountStr).replace(/[^0-9]/g, ''), 10) || totalAmt;
    const monthlyPayment = debtMonthlyPaymentStr ? parseInt(debtMonthlyPaymentStr.replace(/[^0-9]/g, ''), 10) || 0 : undefined;
    const dueDayNum = parseInt(debtDueDay, 10) || 13;

    if (totalAmt <= 0) {
      setWizardError('Total utang harus lebih dari 0.');
      return;
    }

    const finalTitle = debtTitle.trim() || debtKind;
    const dueDateFormatted = `Tgl ${dueDayNum} tiap bulan`;

    // If money was newly received in a wallet, record the disbursement into that wallet
    if (debtRecipientWalletId !== 'none') {
      addTransaction({
        type: 'income',
        amount: totalAmt,
        destinationWalletId: debtRecipientWalletId,
        categoryName: 'Pencairan Pinjaman',
        description: `Pencairan ${finalTitle}`,
        effectiveAt: new Date().toISOString()
      });
    }

    addDebt({
      type: debtType,
      personOrEntity: finalTitle,
      amount: totalAmt,
      remainingAmount: remainingAmt,
      monthlyInstallment: monthlyPayment && monthlyPayment > 0 ? monthlyPayment : undefined,
      dueDay: dueDayNum,
      dueDate: dueDateFormatted,
      notes: debtNotes.trim() ? `${debtNotes.trim()} (Bunga: ${debtInterestRate}%/thn)` : `${debtKindDesc} (Bunga: ${debtInterestRate}%/thn)`,
      isSettled: false,
      isPaidThisMonth: false
    });

    setIsDebtModalOpen(false);
  };

  // Execute quick monthly installment payment
  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalDebt) return;

    const res = payDebtInstallment(
      paymentModalDebt.id,
      paymentSourceWalletId !== 'none' ? paymentSourceWalletId : undefined
    );

    if (res.success) {
      const debtName = paymentModalDebt.personOrEntity;
      setPaymentModalDebt(null);
      setPaymentSourceWalletId('');
      setPaymentNotice(`Cicilan untuk "${debtName}" berhasil dibayar!`);
      setTimeout(() => setPaymentNotice(''), 4000);
    }
  };

  const getWalletIcon = (type: WalletType) => {
    if (type === 'cash') return <Banknote className="w-5 h-5 text-emerald-600" />;
    if (type === 'digital') return <Smartphone className="w-5 h-5 text-amber-600" />;
    return <Building2 className="w-5 h-5 text-teal-700" />;
  };

  const getWalletBadge = (name: string, type: WalletType) => {
    if (type === 'cash') return 'CA';
    if (name.toLowerCase().includes('jago')) return 'JG';
    if (name.toLowerCase().includes('jateng')) return 'BJ';
    if (name.toLowerCase().includes('bca')) return 'BCA';
    if (name.toLowerCase().includes('mandiri')) return 'MDR';
    return name.slice(0, 2).toUpperCase();
  };

  const selectedWalletTransactions = selectedWalletId
    ? transactions.filter(t => t.sourceWalletId === selectedWalletId || t.destinationWalletId === selectedWalletId)
    : [];

  return (
    <div className="space-y-4 pb-24 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Profil Finansial</h1>
          <p className="text-xs text-slate-500">
            Total aset & portofolio, utang piutang, cicilan bulanan, dan arus pemasukan keluarga
          </p>
        </div>
      </div>

      {/* Payment Success Toast */}
      {paymentNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{paymentNotice}</span>
        </div>
      )}

      {/* Sub-Kategori Navigation Tabs (Dompet, Utang, Pemasukan) */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          onClick={() => setSubTab('dompet')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'dompet'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <WalletIcon className="w-4 h-4" />
          <span>Aset & Dompet ({wallets.length})</span>
        </button>

        <button
          onClick={() => setSubTab('utang')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'utang'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Utang & Piutang ({debts.length})</span>
        </button>

        <button
          onClick={() => setSubTab('pemasukan')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'pemasukan'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Pemasukan ({incomeTransactions.length})</span>
        </button>
      </div>

      {/* SUB-KATEGORI 1: DOMPET & ASET */}
      {subTab === 'dompet' && (
        <div className="space-y-4">
          {/* Total Assets Banner */}
          <div className="bg-gradient-to-br from-teal-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-teal-200 uppercase tracking-wider">
              Total Kekayaan Bersih (Aset Dompet)
            </span>
            <div className="text-3xl font-extrabold tabular-nums">
              {formatIDR(totalBalance)}
            </div>
            <p className="text-xs text-teal-200/80">
              Saldo riil yang tersebar di {wallets.length} rekening bank, e-wallet, dan uang tunai
            </p>
          </div>

          {/* Wallets Grid */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Daftar Akun & Rekening</h2>
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Dompet</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wallets.map(w => {
              const isSelected = selectedWalletId === w.id;
              const wTxs = transactions.filter(t => t.sourceWalletId === w.id || t.destinationWalletId === w.id);

              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWalletId(isSelected ? null : w.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-600 shadow-sm ring-1 ring-teal-600/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        {getWalletIcon(w.type)}
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900 text-sm leading-tight">{w.name}</h2>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {w.type === 'cash' ? 'Uang Tunai' : w.type === 'digital' ? 'E-Wallet / Digital' : 'Rekening Bank'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {wTxs.length} mutasi
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between mt-3">
                    <span className="text-xs text-slate-500">Saldo Tersedia</span>
                    <span
                      className={`text-lg font-extrabold tabular-nums ${
                        w.balance < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {formatIDR(w.balance)}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-2 text-right">
                      <span className="text-[11px] text-teal-700 font-semibold">
                        Melihat mutasi dompet ini ▼
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Wallet Mutations */}
          {selectedWalletId && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Mutasi Dompet: {wallets.find(w => w.id === selectedWalletId)?.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedWalletTransactions.length} transaksi tercatat
                  </span>
                </div>
                <button
                  onClick={() => setSelectedWalletId(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
                >
                  Tutup Rincian
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {selectedWalletTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Belum ada transaksi di dompet ini.
                  </p>
                ) : (
                  selectedWalletTransactions.map(t => {
                    const isIncoming = t.destinationWalletId === selectedWalletId;
                    return (
                      <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{t.description || t.categoryName}</div>
                          <div className="text-[11px] text-slate-400">
                            {t.dateStr || new Date(t.effectiveAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            {t.addedBy ? ` • Oleh ${t.addedBy.split(' ')[0]}` : ''}
                          </div>
                        </div>

                        <div
                          className={`text-xs font-bold tabular-nums ${
                            isIncoming ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {isIncoming ? `+${formatIDR(t.amount)}` : `-${formatIDR(t.amount)}`}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-KATEGORI 2: UTANG & PIUTANG (Alur 3-Step Wizard + Cicilan Bulanan) */}
      {subTab === 'utang' && (
        <div className="space-y-4">
          {/* Summary Row (Keluarga Berutang vs Piutang Orang Lain) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-red-700">Keluarga Berutang</div>
              <div className="text-lg sm:text-xl font-extrabold text-red-600 mt-1 tabular-nums">
                {formatIDR(totalUtang)}
              </div>
              <div className="text-[11px] text-red-500 mt-0.5">Total sisa kewajiban aktif yang harus dibayar</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4">
              <div className="text-xs font-bold text-emerald-800">Piutang (Orang Lain)</div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1 tabular-nums">
                {formatIDR(totalPiutang)}
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Uang keluarga yang ada di pihak luar</div>
            </div>
          </div>

          {/* Banner: Tagihan Cicilan Bulan Berjalan Yang Belum Terbayar */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-950">
                      Cicilan Bulan Ini (November 2026)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                      {unpaidDebtsThisMonth.length} Belum Dibayar
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Kewajiban angsuran bulanan yang harus disiapkan bulan ini
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                <div className="text-[11px] text-amber-700 font-semibold">Total Tagihan Belum Bayar:</div>
                <div className="text-lg sm:text-xl font-extrabold text-amber-900 tabular-nums">
                  {formatIDR(totalUnpaidInstallmentThisMonth)}
                </div>
                {totalPaidInstallmentThisMonth > 0 && (
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    ✓ {formatIDR(totalPaidInstallmentThisMonth)} sudah terbayar bulan ini
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button: Opens 3-step wizard */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-700">Daftar Utang & Piutang ({debts.length})</span>
            <div className="flex gap-2">
              <button
                onClick={() => openNewDebtWizard('debt')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Utang Baru</span>
              </button>
              <button
                onClick={() => openNewDebtWizard('receivable')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Piutang</span>
              </button>
            </div>
          </div>

          {/* Debts List with Monthly Installments & Remaining Months */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {debts.map(d => {
              const isDebt = d.type === 'debt';
              const monthly = d.monthlyInstallment && d.monthlyInstallment > 0 ? d.monthlyInstallment : d.remainingAmount;
              const remainingMonths = Math.max(1, Math.ceil(d.remainingAmount / (monthly || 1)));

              return (
                <div key={d.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Settle full debt button */}
                      <button
                        onClick={() => toggleDebtSettled(d.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-colors border shrink-0 ${
                          d.isSettled
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-300 hover:border-emerald-500 bg-white'
                        }`}
                        title={d.isSettled ? 'Tandai Belum Lunas Total' : 'Tandai Lunas Total'}
                      >
                        {d.isSettled && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs sm:text-sm font-bold ${d.isSettled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {d.personOrEntity}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDebt ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isDebt ? 'Utang' : 'Piutang'}
                          </span>

                          {d.isSettled ? (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                              Lunas Total
                            </span>
                          ) : isDebt ? (
                            d.isPaidThisMonth ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Cicilan Bulan Ini Lunas</span>
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Belum Bayar Bulan Ini</span>
                              </span>
                            )
                          ) : null}
                        </div>

                        {/* Cicilan per bulan & Sisa Tenor */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {/* Cicilan per Bulan */}
                          {d.monthlyInstallment ? (
                            <div className="font-semibold text-slate-700 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-slate-400" />
                              <span>Cicilan: </span>
                              <span className="font-bold text-slate-900 tabular-nums">
                                {formatIDR(d.monthlyInstallment)} / bln
                              </span>
                            </div>
                          ) : null}

                          {/* Sisa Tenor Berapa Bulan Lagi */}
                          {!d.isSettled && (
                            <div className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-teal-600" />
                              <span>Sisa {remainingMonths} bulan lagi</span>
                            </div>
                          )}

                          {d.dueDate && (
                            <span className="text-[11px] text-slate-400">
                              Tempo: {d.dueDate}
                            </span>
                          )}
                        </div>

                        {d.notes && (
                          <div className="text-[11px] text-slate-500 mt-1 italic">
                            • {d.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Sisa Utang:</span>
                        <span
                          className={`text-sm sm:text-base font-extrabold tabular-nums ${
                            d.isSettled ? 'line-through text-slate-300' : isDebt ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatIDR(d.remainingAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Quick Pay Monthly Installment Button */}
                        {!d.isSettled && isDebt && !d.isPaidThisMonth && (
                          <button
                            onClick={() => {
                              setPaymentModalDebt(d);
                              setPaymentSourceWalletId(wallets[0]?.id || 'none');
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 transition-colors"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Bayar Cicilan</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditDebt(d)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit Catatan Utang / Piutang"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDebt(d.id)}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-KATEGORI 3: PEMASUKAN & GAJI */}
      {subTab === 'pemasukan' && (
        <div className="space-y-4">
          {/* Total Monthly Income Banner */}
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-3xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              Total Pemasukan Bulan Berjalan
            </span>
            <div className="text-3xl font-extrabold tabular-nums">
              {formatIDR(periodIncome)}
            </div>
            <p className="text-xs text-emerald-100/80">
              {incomeTransactions.length} transaksi pemasukan terdata dari gaji keluarga
            </p>
          </div>

          {/* Income Stream Cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm">Rincian Arus Pendapatan Keluarga</h2>
              {onOpenQuickAdd && (
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd('income')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Catat Pemasukan</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map((m, idx) => {
                const memberName = m.displayName;
                const firstWord = memberName.toLowerCase().split(' ')[0] || '';
                const memberIncome = firstWord
                  ? incomeTransactions
                      .filter(t => t.addedBy?.toLowerCase().includes(firstWord))
                      .reduce((sum, t) => sum + t.amount, 0)
                  : 0;

                const colors = ['bg-teal-100 text-teal-800', 'bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800'];
                const avatarColor = colors[idx % colors.length];

                return (
                  <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${avatarColor} font-bold flex items-center justify-center text-xs`}>
                          {memberName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Pemasukan {memberName}</div>
                          <div className="text-[11px] text-slate-400">Anggota ({m.role})</div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600 tabular-nums">
                        {formatIDR(memberIncome)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QUICK PAY INSTALLMENT MODAL */}
      {paymentModalDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Bayar Cicilan Bulan Ini</h3>
                  <p className="text-[11px] text-slate-400">{paymentModalDebt.personOrEntity}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalDebt(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Installment Info */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
              <div className="text-[11px] font-semibold text-amber-800">Nominal Cicilan yang Dibayar:</div>
              <div className="text-xl font-extrabold text-amber-950 tabular-nums">
                {formatIDR(
                  Math.min(
                    paymentModalDebt.monthlyInstallment || paymentModalDebt.remainingAmount,
                    paymentModalDebt.remainingAmount
                  )
                )}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 flex justify-between">
                <span>Sisa saat ini: {formatIDR(paymentModalDebt.remainingAmount)}</span>
                <span>
                  Sisa setelah bayar:{' '}
                  {formatIDR(
                    Math.max(
                      0,
                      paymentModalDebt.remainingAmount -
                        (paymentModalDebt.monthlyInstallment || paymentModalDebt.remainingAmount)
                    )
                  )}
                </span>
              </div>
            </div>

            {/* Choose Source Wallet */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Potong Dari Dompet Sumber:
              </label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setPaymentSourceWalletId('none')}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-colors ${
                    paymentSourceWalletId === 'none'
                      ? 'bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Tanpa Potong Saldo (Hanya catat cicilan)</span>
                  {paymentSourceWalletId === 'none' && <Check className="w-4 h-4 text-teal-700" />}
                </button>

                {wallets.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setPaymentSourceWalletId(w.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-colors ${
                      paymentSourceWalletId === w.id
                        ? 'bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {getWalletBadge(w.name, w.type)}
                      </span>
                      <span>{w.name}</span>
                    </div>
                    <span className="text-slate-500 tabular-nums">{formatIDR(w.balance)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalDebt(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Konfirmasi Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-STEP DEBT WIZARD MODAL */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header: Utang Baru & Step Indicator */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-slate-900 text-base">
                    {debtType === 'debt' ? 'Utang baru' : 'Piutang baru'}
                  </h2>
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    Langkah {debtStep}/3
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {debtTitle || debtKind}
                </p>
              </div>

              <button
                onClick={() => setIsDebtModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {wizardError && (
              <div className="mx-4 mt-3 p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{wizardError}</span>
              </div>
            )}

            {/* STEP 1/3: JENIS (Utang apa ini?) */}
            {debtStep === 1 && (
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                    1/3 · Jenis
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Utang apa ini?
                  </h3>
                </div>

                {/* List of Debt Types */}
                <div className="space-y-2">
                  {DEBT_TYPES.map(item => {
                    const isSelected = debtKind === item.name;
                    const IconComp = item.Icon;

                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setDebtKind(item.name);
                          setDebtKindDesc(item.desc);
                          if (!debtTitle) setDebtTitle(item.name);
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-600/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isSelected
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Step 1 Actions */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Lanjut ke Nominal (2/3)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2/3: NOMINAL, CICILAN BULANAN & JATUH TEMPO */}
            {debtStep === 2 && (
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                    2/3 · Nominal & Jatuh Tempo
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Berapa total utang & cicilan per bulan?
                  </h3>
                </div>

                {/* Total Utang Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Total Pokok Pinjaman / Utang (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={debtAmountStr ? parseInt(debtAmountStr, 10).toLocaleString('id-ID') : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setDebtAmountStr(val);
                        if (!debtRemainingStr || debtRemainingStr === debtAmountStr) {
                          setDebtRemainingStr(val);
                        }
                      }}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Sisa Utang Saat Ini Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Sisa Utang Saat Ini (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={debtRemainingStr ? parseInt(debtRemainingStr, 10).toLocaleString('id-ID') : ''}
                      onChange={e => setDebtRemainingStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    * Boleh sama dengan total pokok pinjaman jika belum dicicil.
                  </p>
                </div>

                {/* Cicilan Per Bulan Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cicilan per Bulan (Rp / bulan)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={debtMonthlyPaymentStr ? parseInt(debtMonthlyPaymentStr, 10).toLocaleString('id-ID') : ''}
                      onChange={e => setDebtMonthlyPaymentStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                    />
                  </div>

                  {/* Dynamic remaining months calculator */}
                  {(() => {
                    const rem = parseInt(debtRemainingStr || debtAmountStr, 10) || 0;
                    const monthly = parseInt(debtMonthlyPaymentStr, 10) || 0;
                    if (rem > 0 && monthly > 0) {
                      const months = Math.ceil(rem / monthly);
                      return (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200/80">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Perkiraan sisa tenor: {months} bulan lagi</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Tanggal Jatuh Tempo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tanggal Jatuh Tempo Tiap Bulan
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">Tanggal:</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={debtDueDay}
                      onChange={e => setDebtDueDay(e.target.value)}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                    <span className="text-xs text-slate-400">tiap bulan (contoh: 13)</span>
                  </div>
                </div>

                {/* Optional Title / Entity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Pihak / Kreditor (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder={`Default: ${debtKind}`}
                    value={debtTitle}
                    onChange={e => setDebtTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                {/* Step 2 Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDebtStep(1)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1 hover:bg-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep3}
                    className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1 transition-colors shadow-xs"
                  >
                    <span>Lanjut ke Detail (3/3)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3/3: DETAIL (Uang pinjamannya baru masuk ke dompet?) */}
            {debtStep === 3 && (
              <form onSubmit={handleSubmitDebtWizard} className="p-5 overflow-y-auto space-y-4">
                {/* Summary Pill */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    3/3 · Detail
                  </div>
                  <div className="text-xs font-extrabold text-slate-800">
                    {debtTitle || debtKind} · jatuh tempo tgl {debtDueDay || '13'}
                  </div>
                  <div className="text-sm font-extrabold text-red-600 tabular-nums">
                    Sisa Rp {parseInt(debtRemainingStr || debtAmountStr || '0', 10).toLocaleString('id-ID')}
                  </div>
                  {debtMonthlyPaymentStr && (
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <span>Cicilan: Rp {parseInt(debtMonthlyPaymentStr, 10).toLocaleString('id-ID')} / bln</span>
                      {(() => {
                        const rem = parseInt(debtRemainingStr || debtAmountStr, 10) || 0;
                        const m = parseInt(debtMonthlyPaymentStr, 10) || 0;
                        if (rem > 0 && m > 0) {
                          return <span className="text-teal-700 font-bold">• Sisa {Math.ceil(rem / m)} bulan lagi</span>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Question: Uang pinjamannya baru masuk ke dompet? */}
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Uang pinjamannya baru masuk ke dompet?
                  </h3>
                  <div className="text-xs font-semibold text-slate-500 mt-1">
                    Dompet penerima
                  </div>
                </div>

                {/* Wallet Options Grid */}
                <div className="space-y-2">
                  {/* Option: Tidak dicatat */}
                  <button
                    type="button"
                    onClick={() => setDebtRecipientWalletId('none')}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      debtRecipientWalletId === 'none'
                        ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">Tidak dicatat</div>
                      <div className="text-[11px] text-slate-500">tidak dicatat</div>
                    </div>
                    {debtRecipientWalletId === 'none' && (
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                    )}
                  </button>

                  {/* List of active wallets */}
                  <div className="grid grid-cols-2 gap-2">
                    {wallets.map(w => {
                      const isSelected = debtRecipientWalletId === w.id;
                      const badge = getWalletBadge(w.name, w.type);

                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setDebtRecipientWalletId(w.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/20'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {badge}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-900 truncate">{w.name}</div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {w.balance < 0 ? `-${formatIDR(Math.abs(w.balance))}` : formatIDR(w.balance)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Petunjuk Penggunaan */}
                <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl leading-relaxed">
                  💡 Pilih dompet hanya kalau uang pinjamannya baru saja kamu terima di dompet itu. Utang lama atau cicilan barang (emas, motor, HP)? Pilih <strong>Tidak dicatat</strong>.
                </p>

                {/* Tambahan: Bunga, Auto-debit, Catatan */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700">Tambahan</div>

                  {/* Bunga Input */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Bunga</div>
                      <div className="text-[10px] text-slate-400">opsional</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={debtInterestRate}
                        onChange={e => setDebtInterestRate(e.target.value)}
                        className="w-16 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center"
                      />
                      <span className="text-xs text-slate-500">% / thn</span>
                    </div>
                  </div>

                  {/* Auto-debit Cicilan PRO */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Auto-debit cicilan</span>
                        <span className="text-[9px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                          PRO
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Biar cicilan minimal tercatat sendiri tiap bulan.
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-700 font-bold hover:underline cursor-pointer">
                      Lihat Pro
                    </span>
                  </div>

                  {/* Catatan Opsional */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Catatan <span className="text-slate-400 font-normal">(opsional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tulis keterangan atau perjanjian cicilan..."
                      value={debtNotes}
                      onChange={e => setDebtNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-600 resize-none"
                    />
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDebtStep(2)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1 hover:bg-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1 transition-colors shadow-xs"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Simpan Utang</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD WALLET MODAL */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">Tambah Dompet / Rekening</h2>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Dompet</label>
                <input
                  type="text"
                  placeholder="Misal: BCA Utama, Gopay, Dompet Tunai"
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Akun</label>
                <select
                  value={walletType}
                  onChange={e => setWalletType(e.target.value as WalletType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="checking">Rekening Bank (Checking)</option>
                  <option value="digital">Dompet Digital (E-Wallet)</option>
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="savings">Tabungan Khusus (Savings)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Saldo Awal (Opsional)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={openingBalanceStr ? parseInt(openingBalanceStr, 10).toLocaleString('id-ID') : ''}
                  onChange={e => setOpeningBalanceStr(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 rounded-xl shadow-xs"
                >
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT DEBT / RECEIVABLE MODAL */}
      {editingDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">
                  Edit {editType === 'debt' ? 'Utang Keluarga' : 'Piutang Orang Lain'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbarui rincian, nominal sisa pokok, dan tempo cicilan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditDebt} className="p-5 overflow-y-auto space-y-4">
              {/* Tipe Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Catatan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('debt')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editType === 'debt'
                        ? 'bg-red-50 border-red-300 text-red-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🔴 Utang (Saya Berutang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('receivable')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editType === 'receivable'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🟢 Piutang (Orang Berutang)
                  </button>
                </div>
              </div>

              {/* Nama Pihak */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Pihak / Judul {editType === 'debt' ? 'Pemberi Pinjaman' : 'Peminjam'}
                </label>
                <input
                  type="text"
                  value={editPersonOrEntity}
                  onChange={e => setEditPersonOrEntity(e.target.value)}
                  placeholder="Misal: Cicilan Bank, Teman Kantor, Katering Bu Rina"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              {/* Grid Nominal Total & Sisa */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Total Pinjaman (Rp)</label>
                  <input
                    type="text"
                    value={editAmountStr ? parseInt(editAmountStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sisa Pokok (Rp)</label>
                  <input
                    type="text"
                    value={editRemainingStr ? parseInt(editRemainingStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditRemainingStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                    required
                  />
                </div>
              </div>

              {/* Cicilan Bulanan & Tanggal Jatuh Tempo */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cicilan Bulanan (Rp)</label>
                  <input
                    type="text"
                    value={editMonthlyStr ? parseInt(editMonthlyStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditMonthlyStr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Opsional (0 jika pelunasan langsung)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jatuh Tempo (Tgl 1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editDueDay}
                    onChange={e => setEditDueDay(e.target.value)}
                    placeholder="Misal: 15 atau 30"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 tabular-nums"
                  />
                </div>
              </div>

              {/* Keterangan Tempo Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teks Jatuh Tempo (Opsional)</label>
                <input
                  type="text"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  placeholder="Misal: 25 Nov 2026 atau Akhir Bulan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Misal: Nomor rekening tujuan, sisa 2x cicilan, kontak peminjam"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
                />
              </div>

              {/* Status Lunas Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Tandai Sudah Lunas</div>
                  <div className="text-[11px] text-slate-500">Utang/piutang ini sudah tidak memiliki sisa tanggungan</div>
                </div>
                <input
                  type="checkbox"
                  checked={editIsSettled}
                  onChange={e => setEditIsSettled(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
