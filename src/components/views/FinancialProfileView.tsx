import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatIDR } from '../../lib/money';
import {isBalanceReset} from '../../lib/monthlyBalance';
import { WALLET_HEADER_COLORS, defaultWalletHeaderColor, resolveWalletHeaderColor, getReadableHeaderText } from '../../lib/walletColors';
import { SavingsGoalsSection } from '../SavingsGoalsSection';
import { WalletStack } from '../WalletStack';
import { Wallet, WalletType, DebtItem, TransactionType } from '../../types';
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
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Percent,
  CheckCheck,
  Clock,
  Coins,
  Edit2,
  Camera,
  Target,
  MoreHorizontal
} from 'lucide-react';

interface FinancialProfileViewProps {
  onOpenQuickAdd?: (type?: TransactionType) => void;
  initialSubTab?: 'dompet' | 'impian' | 'utang' | 'pemasukan';
  initialSubTabKey?: number;
}

export const FinancialProfileView: React.FC<FinancialProfileViewProps> = ({
  onOpenQuickAdd,
  initialSubTab,
  initialSubTabKey
}) => {
  const [writeBusy,setWriteBusy]=useState(false);
  const {
    wallets,
    transactions,
    totalBalance,
    periodIncome,
    addWallet,
    updateWallet,
    deleteWallet,
    debts,
    addDebt,
    toggleDebtSettled,
    toggleDebtPaidThisMonth,
    payDebtInstallment,
    updateDebt,
    deleteDebt,
    addTransaction,
    savingsGoals,
    members,
    activeHousehold
  } = useApp();

  // Sub-kategori tabs: 'dompet' | 'impian' | 'utang' | 'pemasukan'
  const [subTab, setSubTab] = useState<'dompet' | 'impian' | 'utang' | 'pemasukan'>(
    initialSubTab || 'dompet'
  );

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab, initialSubTabKey]);

  // Wallet detail & add modal
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('checking');
  const [walletColor, setWalletColor] = useState<string>('#FFD166');
  const [walletColorTouched, setWalletColorTouched] = useState(false);
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');

  // Wallet edit state
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editWalletName, setEditWalletName] = useState('');
  const [editWalletType, setEditWalletType] = useState<WalletType>('checking');
  const [editWalletColor, setEditWalletColor] = useState<string>('#FFD166');
  const [editWalletTargetBalanceStr, setEditWalletTargetBalanceStr] = useState('');
  const [editWalletError, setEditWalletError] = useState('');
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
  const [paymentReceiptImage, setPaymentReceiptImage] = useState<string>('');
  const [paymentNotice, setPaymentNotice] = useState<string>('');
  const paymentReceiptInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleSaveEditDebt = async (e: React.FormEvent) => {
    e.preventDefault();if(writeBusy)return;setWriteBusy(true);try{
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

    const savedDebt=await updateDebt(editingDebt.id, {
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

    if(!savedDebt.success){setEditError(savedDebt.error||'Gagal menyimpan utang.');return;}
    setEditingDebt(null);
    }catch(error){setEditWalletError(error instanceof Error?error.message:'Gagal menyimpan perubahan.');}finally{setWriteBusy(false);}
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
      Icon: MoreHorizontal,
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
  const incomeTransactions = transactions.filter(t => t.type === 'income' && !isBalanceReset(t));

  const unattributedIncomeList = React.useMemo(() => {
    const memberFullNames = new Set(members.map(m => (m.displayName || '').toLowerCase().trim()));
    const memberFirstWords = new Set(members.map(m => (m.displayName || '').toLowerCase().trim().split(' ')[0] || ''));

    const otherMap = new Map<string, number>();
    for (const t of incomeTransactions) {
      const cleanAb = (t.addedBy || '').trim();
      const lower = cleanAb.toLowerCase();
      const first = lower.split(' ')[0] || '';
      if (!memberFullNames.has(lower) && !memberFirstWords.has(first)) {
        const name = cleanAb || 'Lainnya';
        otherMap.set(name, (otherMap.get(name) || 0) + t.amount);
      }
    }
    return Array.from(otherMap.entries()).map(([name, amount]) => ({ name, amount }));
  }, [members, incomeTransactions]);
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
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();if(writeBusy)return;setWriteBusy(true);try{
    if (!walletName.trim()) return;

    const openingBalance = openingBalanceStr
      ? parseInt(openingBalanceStr.replace(/[^0-9]/g, ''), 10) || 0
      : 0;

    const saved=await addWallet(walletName.trim(), walletType, openingBalance, walletColor);if(!saved.success){setEditWalletError(saved.error||'Gagal menyimpan dompet.');return;}
    setWalletName('');
    setOpeningBalanceStr('');
    setWalletColor('#FFD166');
    setWalletColorTouched(false);
    setIsWalletModalOpen(false);
    }catch(error){setEditWalletError(error instanceof Error?error.message:'Gagal menyimpan perubahan.');}finally{setWriteBusy(false);}
  };
  const handleOpenEditWallet = (w: Wallet) => {
    setEditingWallet(w);
    setEditWalletName(w.name);
    setEditWalletType(w.type);
    setEditWalletColor(resolveWalletHeaderColor(w));
    setEditWalletTargetBalanceStr(String(w.balance || 0));
    setEditWalletError('');
  };

  const handleSaveEditWallet = async (e: React.FormEvent) => {
    e.preventDefault();if(writeBusy)return;setWriteBusy(true);try{
    if (!editingWallet) return;
    const clean = editWalletName.trim();
    if (!clean) {
      setEditWalletError('Nama dompet wajib diisi.');
      return;
    }

    const targetBal = editWalletTargetBalanceStr !== ''
      ? parseInt(editWalletTargetBalanceStr.replace(/[^0-9-]/g, ''), 10)
      : undefined;

    const res = await updateWallet(editingWallet.id, {
      name: clean,
      type: editWalletType,
      color: editWalletColor,
      targetBalance: isNaN(targetBal as number) ? undefined : targetBal
    });

    if (!res.success) {
      setEditWalletError(res.error || 'Gagal mengubah dompet.');
      return;
    }

    setEditingWallet(null);
    }catch(error){setEditWalletError(error instanceof Error?error.message:'Gagal menyimpan perubahan.');}finally{setWriteBusy(false);}
  };

  const handleDeleteWallet = async (walletId: string) => {
    if(writeBusy)return;setWriteBusy(true);try{
    if (!window.confirm('Yakin ingin menghapus atau mengarsipkan dompet ini?')) return;
    const res = await deleteWallet(walletId);
    if (!res.success) {
      setEditWalletError(res.error || 'Gagal menghapus dompet.');
      return;
    }
    setEditingWallet(null);
    if (selectedWalletId === walletId) {
      setSelectedWalletId(null);
    }
    }catch(error){setEditWalletError(error instanceof Error?error.message:'Gagal menyimpan perubahan.');}finally{setWriteBusy(false);}
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

  const debtSaving = useRef(false);
  // Final Step 3 submission
  const handleSubmitDebtWizard = async (e: React.FormEvent) => {
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

    if (debtSaving.current) return;
    debtSaving.current = true;
    const saved = await addDebt({
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
    debtSaving.current = false;
    if (!saved.success) { setWizardError(saved.error || 'Gagal menyimpan utang ke Supabase.'); return; }

    setIsDebtModalOpen(false);
  };

  // Execute quick monthly installment payment
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalDebt) return;

    if (debtSaving.current) return;
    debtSaving.current = true;
    const res = await payDebtInstallment(
      paymentModalDebt.id,
      paymentSourceWalletId !== 'none' ? paymentSourceWalletId : undefined,
      paymentReceiptImage || undefined
    );

    debtSaving.current = false;
    if (res.success) {
      const debtName = paymentModalDebt.personOrEntity;
      setPaymentModalDebt(null);
      setPaymentSourceWalletId('');
      setPaymentReceiptImage('');
      setPaymentNotice(`Cicilan untuk "${debtName}" berhasil dibayar!`);
      setTimeout(() => setPaymentNotice(''), 4000);
    } else { setPaymentNotice(res.error || 'Pembayaran belum tersimpan.'); }
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

  const currentMonthLabel = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric'
  });

  const selectedWalletTransactions = selectedWalletId
    ? transactions.filter(t => t.sourceWalletId === selectedWalletId || t.destinationWalletId === selectedWalletId)
    : [];

  return (
    <div className="financial-profile-view screen-view space-y-6 pb-24 pt-2 max-w-4xl mx-auto px-4 sm:px-6">
      {writeBusy&&<p role="status" className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] rounded-full bg-teal-700 px-5 py-3 text-sm text-white shadow-lg">Menyimpan ke Supabase…</p>}
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Dompet & keuangan</h1>
          <p className="text-xs text-slate-500">
            Total aset & portofolio, utang piutang, cicilan bulanan, dan arus pemasukan keluarga
          </p>
        </div>
      </div>

      {/* Payment Success Toast */}
      {paymentNotice && (
        <div className="p-3 bg-[#D1FAE5] border-[2.5px] border-[#073B4C] shadow-[3px_3px_0_#073B4C] text-[#064E3B] rounded-2xl text-xs font-extrabold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#073B4C] shrink-0" />
          <span>{paymentNotice}</span>
        </div>
      )}

      {/* Sub-Kategori Navigation Tabs (Dompet, Utang, Pemasukan) */}
      <div className="wallet-tabs rounded-2xl" role="tablist" aria-label="Bagian keuangan">
        <button
          role="tab" aria-selected={subTab === 'dompet'} data-wallet-tab="dompet" onClick={() => setSubTab('dompet')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'dompet'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <WalletIcon className="w-4 h-4" />
          <span className="wallet-tab-label">Aset<small className="wallet-tab-count">({wallets.length})</small></span>
        </button>

        <button
          role="tab" aria-selected={subTab === 'impian'} data-wallet-tab="impian" onClick={() => setSubTab('impian')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'impian'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4" />
          <span className="wallet-tab-label">Impian<small className="wallet-tab-count">({savingsGoals.length})</small></span>
        </button>

        <button
          role="tab" aria-selected={subTab === 'utang'} data-wallet-tab="utang" onClick={() => setSubTab('utang')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'utang'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span className="wallet-tab-label">Utang<small className="wallet-tab-count">({debts.length})</small></span>
        </button>

        <button
          role="tab" aria-selected={subTab === 'pemasukan'} data-wallet-tab="pemasukan" onClick={() => setSubTab('pemasukan')}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'pemasukan'
              ? 'bg-white text-teal-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="wallet-tab-label">Pemasukan<small className="wallet-tab-count">({incomeTransactions.length})</small></span>
        </button>
      </div>

      {/* SUB-KATEGORI 1: DOMPET & ASET */}
      <div key={subTab} className="view-stage-enter">
      {subTab === 'dompet' && (
        <div className="space-y-4">
          {/* Total Assets Banner */}
          <div className="saldo-hero saldo-hero--lagoon rounded-3xl p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="nb-chip bg-white px-3 py-0.5 text-xs uppercase tracking-wide text-[#073B4C]">
                Total Kekayaan Bersih
              </span>
              <span className="nb-chip bg-[#FFD166] px-2.5 py-0.5 text-xs text-[#073B4C]">
                {wallets.length} Dompet Aktif
              </span>
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-[#073B4C]">
              {formatIDR(totalBalance)}
            </div>
            <p className="text-xs font-bold text-[#073B4C]/85">
              Saldo riil yang tersebar di {wallets.length} rekening bank, e-wallet, dan uang tunai
            </p>
          </div>

          {/* Wallets Grid */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Daftar Akun & Rekening</h2>
            <button
              onClick={() => {
                setWalletColor('#FFD166');
                setWalletColorTouched(false);
                setIsWalletModalOpen(true);
              }}
              className="nb-btn flex items-center gap-1.5 text-xs bg-[#06D6A0] text-[#073B4C] px-3.5 py-2"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
              <span>Tambah Dompet</span>
            </button>
          </div>

          <WalletStack
            variant="profile"
            wallets={wallets}
            transactions={transactions}
            selectedWalletId={selectedWalletId}
            onSelectWallet={setSelectedWalletId}
            onEditWallet={handleOpenEditWallet}
            onAddWallet={() => {
              setWalletColor('#FFD166');
              setWalletColorTouched(false);
              setIsWalletModalOpen(true);
            }}
          />

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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = wallets.find(w => w.id === selectedWalletId);
                      if (cur) handleOpenEditWallet(cur);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg font-semibold transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Dompet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWalletId(null)}
                    className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
                  >
                    Tutup Rincian
                  </button>
                </div>
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

      {/* SUB-KATEGORI 1B: KANTONG IMPIAN / TARGET TABUNGAN */}
      {subTab === 'impian' && <SavingsGoalsSection />}

      {/* SUB-KATEGORI 2: UTANG & PIUTANG (Tropical Neo-Brutalism) */}
      {subTab === 'utang' && (
        <div className="space-y-4">
          {/* Summary Row (Keluarga Berutang vs Piutang Orang Lain) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="saldo-mini-hero saldo-hero--coral rounded-3xl p-3.5 sm:p-4 space-y-1.5">
              <span className="nb-chip inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 text-[11px] text-[#073B4C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B] border border-[#073B4C] inline-block" />
                <span>Berutang</span>
              </span>
              <div className="text-lg sm:text-2xl font-extrabold text-[#073B4C] tabular-nums break-words">
                {formatIDR(totalUtang)}
              </div>
              <p className="text-[11px] font-bold text-[#073B4C]/80 leading-snug">
                Sisa kewajiban aktif
              </p>
            </div>

            <div className="saldo-mini-hero saldo-hero--mint-soft rounded-3xl p-3.5 sm:p-4 space-y-1.5">
              <span className="nb-chip inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 text-[11px] text-[#073B4C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06D6A0] border border-[#073B4C] inline-block" />
                <span>Piutang</span>
              </span>
              <div className="text-lg sm:text-2xl font-extrabold text-[#073B4C] tabular-nums break-words">
                {formatIDR(totalPiutang)}
              </div>
              <p className="text-[11px] font-bold text-[#073B4C]/80 leading-snug">
                Dana di pihak luar
              </p>
            </div>
          </div>

          {/* Banner: Tagihan Cicilan Bulan Berjalan */}
          <div className="saldo-hero saldo-hero--mango rounded-3xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white border-2 border-[#073B4C] shadow-[2.5px_2.5px_0_#073B4C] flex items-center justify-center shrink-0 text-[#073B4C]">
                  <Calendar className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-extrabold text-[#073B4C]">
                      Cicilan Bulan Ini
                    </span>
                    <span className="nb-chip bg-white px-2.5 py-0.5 text-[11px] text-[#073B4C] capitalize">
                      {currentMonthLabel}
                    </span>
                    <span
                      className={`nb-chip px-2.5 py-0.5 text-[10px] ${
                        unpaidDebtsThisMonth.length > 0
                          ? 'bg-[#FF6B6B] text-white'
                          : 'bg-[#06D6A0] text-[#073B4C]'
                      }`}
                    >
                      {unpaidDebtsThisMonth.length > 0
                        ? `${unpaidDebtsThisMonth.length} Belum Bayar`
                        : 'Semua Lunas'}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#073B4C]/80">
                    Kewajiban angsuran bulanan yang harus disiapkan bulan ini
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] rounded-2xl px-4 py-2.5 w-full sm:w-auto text-left sm:text-right shrink-0">
                <div className="text-[11px] font-extrabold text-[#365664]">
                  Tagihan Belum Bayar:
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-[#073B4C] tabular-nums">
                  {formatIDR(totalUnpaidInstallmentThisMonth)}
                </div>
                {totalPaidInstallmentThisMonth > 0 && (
                  <div className="text-[10px] text-[#065F46] font-extrabold mt-0.5">
                    ✓ {formatIDR(totalPaidInstallmentThisMonth)} sudah terbayar bulan ini
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Header: Opens 3-step wizard */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <h2 className="font-extrabold text-[#073B4C] text-sm">
              Daftar Utang & Piutang ({debts.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openNewDebtWizard('debt')}
                className="nb-btn bg-[#FF6B6B] hover:bg-[#FF8585] text-white px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                <span>Utang Baru</span>
              </button>
              <button
                type="button"
                onClick={() => openNewDebtWizard('receivable')}
                className="nb-btn bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                <span>Piutang</span>
              </button>
            </div>
          </div>

          {/* Debts Card List */}
          {debts.length === 0 ? (
            <div className="bg-white rounded-3xl border-[2.5px] border-dashed border-[#073B4C] p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FECDD6] border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] grid place-items-center mx-auto text-[#073B4C]">
                <HandCoins className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#073B4C]">Belum Ada Catatan Utang / Piutang</h3>
                <p className="text-xs font-semibold text-[#365664] max-w-xs mx-auto mt-1">
                  Catat cicilan rumah, pinjaman keluarga, atau piutang agar jatuh tempo bulanan selalu terpantau rapi.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => openNewDebtWizard('debt')}
                  className="nb-btn bg-[#FF6B6B] text-white px-4 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                  <span>Catat Utang</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNewDebtWizard('receivable')}
                  className="nb-btn bg-[#06D6A0] text-[#073B4C] px-4 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                  <span>Catat Piutang</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {debts.map(d => {
                const isDebt = d.type === 'debt';
                const monthly = d.monthlyInstallment && d.monthlyInstallment > 0 ? d.monthlyInstallment : d.remainingAmount;
                const remainingMonths = Math.max(1, Math.ceil(d.remainingAmount / (monthly || 1)));
                const paidPct = d.isSettled
                  ? 100
                  : d.amount > 0
                  ? Math.min(100, Math.max(0, Math.round(((d.amount - d.remainingAmount) / d.amount) * 100)))
                  : 0;
                const headerBg = d.isSettled ? '#E2E8F0' : isDebt ? '#FECDD6' : '#06D6A0';

                return (
                  <div
                    key={d.id}
                    className="rounded-3xl border-[2.5px] border-[#073B4C] shadow-[4px_4px_0_#073B4C] overflow-hidden bg-white"
                  >
                    {/* Colored Card Header */}
                    <div
                      style={{ backgroundColor: headerBg }}
                      className="px-4 py-3.5 border-b-[2.5px] border-[#073B4C] flex items-start justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await toggleDebtSettled(d.id);
                            if (!result.success) setEditWalletError(result.error || 'Gagal memperbarui utang.');
                          }}
                          className={`w-8 h-8 rounded-full border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0 transition-transform active:translate-y-0.5 ${
                            d.isSettled ? 'bg-[#06D6A0] text-[#073B4C]' : 'bg-white text-[#073B4C] hover:bg-[#FEF3C7]'
                          }`}
                          title={d.isSettled ? 'Tandai Belum Lunas Total' : 'Tandai Lunas Total'}
                          aria-label={d.isSettled ? 'Tandai Belum Lunas Total' : 'Tandai Lunas Total'}
                        >
                          {d.isSettled && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-sm sm:text-base font-extrabold text-[#073B4C] leading-tight break-words ${
                              d.isSettled ? 'line-through opacity-60' : ''
                            }`}
                          >
                            {d.personOrEntity}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] ${
                                isDebt ? 'bg-[#FF6B6B] text-white' : 'bg-[#FFFDF5] text-[#073B4C]'
                              }`}
                            >
                              {isDebt ? 'Utang' : 'Piutang'}
                            </span>

                            {d.isSettled ? (
                              <span className="text-[10px] bg-white text-[#073B4C] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C]">
                                ✓ Lunas Total
                              </span>
                            ) : isDebt ? (
                              d.isPaidThisMonth ? (
                                <span className="text-[10px] bg-[#D1FAE5] text-[#073B4C] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Bulan Ini Lunas</span>
                                </span>
                              ) : (
                                <span className="text-[10px] bg-[#FFD166] text-[#073B4C] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 stroke-[2.5]" />
                                  <span>Belum Bayar Bulan Ini</span>
                                </span>
                              )
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Header Action Icons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditDebt(d)}
                          className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#073B4C] hover:bg-[#FFFBEB] flex items-center justify-center transition-transform active:translate-y-0.5"
                          title="Edit Catatan Utang / Piutang"
                          aria-label={`Edit ${d.personOrEntity}`}
                        >
                          <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await deleteDebt(d.id);
                            if (!result.success) setEditWalletError(result.error || 'Gagal menghapus utang.');
                          }}
                          className="w-8 h-8 rounded-full bg-[#FFE0E5] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#911D35] hover:bg-[#FF6B6B] hover:text-white flex items-center justify-center transition-colors"
                          title="Hapus Catatan"
                          aria-label={`Hapus ${d.personOrEntity}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 bg-white space-y-3">
                      {/* Remaining Amount & Progress */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-[#365664] block">
                              {isDebt ? 'Sisa Utang:' : 'Sisa Piutang:'}
                            </span>
                            <span
                              className={`text-lg sm:text-xl font-extrabold tabular-nums ${
                                d.isSettled
                                  ? 'line-through text-slate-400'
                                  : isDebt
                                  ? 'text-[#BE123C]'
                                  : 'text-[#065F46]'
                              }`}
                            >
                              {formatIDR(d.remainingAmount)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-[#365664] block tabular-nums">
                              dari {formatIDR(d.amount)}
                            </span>
                            <span className="text-[10px] font-extrabold text-[#073B4C] bg-[#FEF3C7] border border-[#073B4C] px-2 py-0.5 rounded-full inline-block mt-0.5">
                              {paidPct}% terbayar
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-3.5 bg-slate-100 border-2 border-[#073B4C] rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${paidPct}%`,
                              backgroundColor: isDebt ? '#06D6A0' : '#38BDF8'
                            }}
                          />
                        </div>
                      </div>

                      {/* Metadata Chips */}
                      {(d.monthlyInstallment || !d.isSettled || d.dueDate) && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {d.monthlyInstallment ? (
                            <span className="inline-flex items-center gap-1 bg-[#FFFBEB] text-[#073B4C] font-extrabold px-2.5 py-1 rounded-full border-[1.5px] border-[#073B4C] text-[11px] tabular-nums">
                              <Coins className="w-3.5 h-3.5 shrink-0" />
                              <span>Cicilan {formatIDR(d.monthlyInstallment)}/bln</span>
                            </span>
                          ) : null}

                          {!d.isSettled && (
                            <span className="inline-flex items-center gap-1 bg-[#A5F3FC] text-[#073B4C] font-extrabold px-2.5 py-1 rounded-full border-[1.5px] border-[#073B4C] text-[11px]">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>Sisa {remainingMonths} bln lagi</span>
                            </span>
                          )}

                          {d.dueDate && (
                            <span className="inline-flex items-center bg-white text-[#365664] font-bold px-2.5 py-1 rounded-full border-[1.5px] border-[#073B4C] text-[11px]">
                              Tempo: {d.dueDate}
                            </span>
                          )}
                        </div>
                      )}

                      {d.notes && (
                        <div className="text-[11px] font-semibold text-[#365664] bg-[#FFFDF5] border-[1.5px] border-dashed border-[#073B4C]/35 rounded-2xl px-3 py-2">
                          📝 {d.notes}
                        </div>
                      )}

                      {!d.isSettled && isDebt && !d.isPaidThisMonth && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalDebt(d);
                              setPaymentSourceWalletId(wallets[0]?.id || 'none');
                              setPaymentReceiptImage('');
                            }}
                            className="nb-btn bg-[#FFD166] hover:bg-[#FFE08A] text-[#073B4C] px-4 py-2 text-xs inline-flex items-center gap-1.5 w-full sm:w-auto justify-center"
                          >
                            <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Bayar Cicilan Bulan Ini</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-KATEGORI 3: PEMASUKAN & GAJI */}
      {subTab === 'pemasukan' && (
        <div className="space-y-4">
          {/* Total Monthly Income Banner */}
          <div className="saldo-hero saldo-hero--mint rounded-3xl p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="nb-chip bg-white px-3 py-0.5 text-xs uppercase tracking-wide text-[#073B4C]">
                Total Pemasukan Bulan Berjalan
              </span>
              <span className="nb-chip bg-[#FFD166] px-2.5 py-0.5 text-xs text-[#073B4C]">
                {incomeTransactions.length} Transaksi
              </span>
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-[#073B4C]">
              {formatIDR(periodIncome)}
            </div>
            <p className="text-xs font-bold text-[#073B4C]/85">
              {incomeTransactions.length} transaksi pemasukan terdata dari arus pendapatan keluarga
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
                const memberClean = memberName.toLowerCase().trim();
                const firstWord = memberClean.split(' ')[0] || '';
                const memberIncome = incomeTransactions
                  .filter(t => {
                    const ab = (t.addedBy || '').toLowerCase().trim();
                    return ab === memberClean || (firstWord && ab.includes(firstWord));
                  })
                  .reduce((sum, t) => sum + t.amount, 0);

                const colors = ['bg-teal-100 text-teal-800', 'bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-amber-100 text-amber-800'];
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

              {unattributedIncomeList.map((entry) => (
                <div key={entry.name} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {entry.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Pemasukan {entry.name}</div>
                        <div className="text-[11px] text-slate-400">Kontributor Tambahan</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 tabular-nums">
                      {formatIDR(entry.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Daftar Riwayat Pemasukan Household */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Riwayat Pemasukan Household ({incomeTransactions.length})</h3>
                  <p className="text-[11px] text-slate-400">Seluruh aliran dana masuk yang tercatat di {activeHousehold?.name || 'Household'}</p>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 tabular-nums">
                  {formatIDR(periodIncome)}
                </span>
              </div>

              {incomeTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada transaksi pemasukan yang tercatat di household ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {incomeTransactions.map(t => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {t.description || t.categoryName || 'Pemasukan'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                            <span className="text-emerald-700 font-semibold">{t.categoryName || 'Gaji'}</span>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                              Oleh: {t.addedBy || 'Anggota'}
                            </span>
                            <span>•</span>
                            <span>Masuk ke: {wallets.find(w => w.id === (t.destinationWalletId || t.sourceWalletId))?.name || t.destinationAsset || t.sourceAsset || 'Dompet'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-extrabold text-emerald-600 tabular-nums">
                          +{formatIDR(t.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.dateStr || new Date(t.effectiveAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* QUICK PAY INSTALLMENT MODAL */}
      {paymentModalDebt && (
        <div className="fixed inset-0 bg-[#073B4C]/45 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C]">
            <div className="px-5 py-4 bg-[#FFD166] border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#073B4C] flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#073B4C] text-sm truncate">Bayar Cicilan Bulan Ini</h3>
                  <p className="text-[11px] font-bold text-[#073B4C]/80 truncate">{paymentModalDebt.personOrEntity}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentModalDebt(null);
                  setPaymentReceiptImage('');
                }}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] text-[#073B4C] hover:bg-[#FFE0E5] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* Installment Info */}
              <div className="p-3.5 bg-[#FFFBEB] border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] rounded-2xl space-y-1">
                <div className="text-[11px] font-extrabold text-[#073B4C]">Nominal Cicilan yang Dibayar:</div>
                <div className="text-xl font-extrabold text-[#073B4C] tabular-nums">
                  {formatIDR(
                    Math.min(
                      paymentModalDebt.monthlyInstallment || paymentModalDebt.remainingAmount,
                      paymentModalDebt.remainingAmount
                    )
                  )}
                </div>
                <div className="text-[11px] font-bold text-[#365664] pt-1 flex justify-between gap-2 flex-wrap">
                  <span>Sisa saat ini: {formatIDR(paymentModalDebt.remainingAmount)}</span>
                  <span>
                    Setelah bayar:{' '}
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
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1.5">
                  Potong Dari Dompet Sumber:
                </label>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                  <button
                    type="button"
                    onClick={() => setPaymentSourceWalletId('none')}
                    className={`w-full p-2.5 rounded-2xl border-2 border-[#073B4C] text-left text-xs font-extrabold flex items-center justify-between transition-all ${
                      paymentSourceWalletId === 'none'
                        ? 'bg-[#D1FAE5] text-[#073B4C] shadow-[2.5px_2.5px_0_#073B4C]'
                        : 'bg-white text-[#073B4C] hover:bg-[#FEF3C7]'
                    }`}
                  >
                    <span>Tanpa Potong Saldo (Hanya catat cicilan)</span>
                    {paymentSourceWalletId === 'none' && <Check className="w-4 h-4 text-[#073B4C] stroke-[3] shrink-0" />}
                  </button>

                  {wallets.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setPaymentSourceWalletId(w.id)}
                      className={`w-full p-2.5 rounded-2xl border-2 border-[#073B4C] text-left text-xs font-extrabold flex items-center justify-between transition-all ${
                        paymentSourceWalletId === w.id
                          ? 'bg-[#D1FAE5] text-[#073B4C] shadow-[2.5px_2.5px_0_#073B4C]'
                          : 'bg-white text-[#073B4C] hover:bg-[#FEF3C7]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] bg-[#FFD166] text-[#073B4C] border border-[#073B4C] px-1.5 py-0.5 rounded-full font-extrabold shrink-0">
                          {getWalletBadge(w.name, w.type)}
                        </span>
                        <span className="truncate">{w.name}</span>
                      </div>
                      <span className="text-[#073B4C] tabular-nums shrink-0 ml-2">{formatIDR(w.balance)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lampiran Foto Struk / Bukti Transfer Cicilan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-[#073B4C]">
                  Bukti Transfer / Foto Struk (Opsional):
                </label>

                <input
                  ref={paymentReceiptInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPaymentReceiptImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {paymentReceiptImage ? (
                  <div className="rounded-2xl border-2 border-[#073B4C] bg-[#FFFDF5] p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={paymentReceiptImage}
                        alt="Struk Pembayaran"
                        className="w-11 h-11 object-cover rounded-xl border-2 border-[#073B4C]"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-[#073B4C]">Foto Struk Terlampir</div>
                        <div className="text-[10px] text-[#065F46] font-extrabold flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Tersimpan ke riwayat transaksi</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentReceiptImage('');
                        if (paymentReceiptInputRef.current) paymentReceiptInputRef.current.value = '';
                      }}
                      className="w-8 h-8 rounded-full bg-[#FFE0E5] border-2 border-[#073B4C] text-[#911D35] hover:bg-[#FF6B6B] hover:text-white flex items-center justify-center transition-colors"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => paymentReceiptInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border-2 border-dashed border-[#073B4C] bg-[#FFFDF5] hover:bg-[#FEF3C7] rounded-2xl text-xs font-extrabold text-[#073B4C] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Foto Struk / Upload Bukti Transfer</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalDebt(null);
                    setPaymentReceiptImage('');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#073B4C] font-extrabold border-2 border-[#073B4C] rounded-full text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  className="nb-btn flex-1 py-2.5 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] text-xs"
                >
                  Konfirmasi Bayar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-STEP DEBT WIZARD MODAL */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 bg-[#073B4C]/45 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header: Utang Baru & Step Indicator */}
            <div
              className={`px-5 py-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2 ${
                debtType === 'debt' ? 'bg-[#FECDD6]' : 'bg-[#06D6A0]'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-[#073B4C] text-base">
                    {debtType === 'debt' ? 'Utang baru' : 'Piutang baru'}
                  </h2>
                  <span className="text-[11px] font-extrabold text-[#073B4C] bg-white px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] shadow-[1.5px_1.5px_0_#073B4C]">
                    Langkah {debtStep}/3
                  </span>
                </div>
                <p className="text-xs font-bold text-[#073B4C]/80 mt-0.5 truncate">
                  {debtTitle || debtKind}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDebtModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] text-[#073B4C] hover:bg-[#FFE0E5] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {wizardError && (
              <div className="mx-5 mt-3.5 p-2.5 bg-[#FFE0E5] text-[#911D35] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{wizardError}</span>
              </div>
            )}

            {/* STEP 1/3: JENIS (Utang apa ini?) */}
            {debtStep === 1 && (
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <div className="text-[11px] font-extrabold text-[#365664] uppercase tracking-wider">
                    1/3 · Jenis
                  </div>
                  <h3 className="text-base font-extrabold text-[#073B4C] mt-0.5">
                    {debtType === 'debt' ? 'Utang apa ini?' : 'Piutang apa ini?'}
                  </h3>
                </div>

                {/* List of Debt Types */}
                <div className="space-y-2.5">
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
                        className={`w-full p-3.5 rounded-2xl border-2 border-[#073B4C] text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#FFD166] shadow-[3px_3px_0_#073B4C] -translate-y-0.5'
                            : 'bg-white hover:bg-[#FEF3C7]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#073B4C] flex items-center justify-center shrink-0">
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-[#073B4C]">
                              {item.name}
                            </div>
                            <div className="text-xs font-semibold text-[#365664]">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#073B4C] shrink-0" />
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
                    className="nb-btn w-full py-3 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] text-xs sm:text-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Lanjut ke Nominal (2/3)</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.8]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2/3: NOMINAL, CICILAN BULANAN & JATUH TEMPO */}
            {debtStep === 2 && (
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <div className="text-[11px] font-extrabold text-[#365664] uppercase tracking-wider">
                    2/3 · Nominal & Jatuh Tempo
                  </div>
                  <h3 className="text-base font-extrabold text-[#073B4C] mt-0.5">
                    Berapa total nominal & cicilan per bulan?
                  </h3>
                </div>

                {/* Total Utang Input */}
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                    Total Pokok Pinjaman / Utang (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#365664] font-extrabold text-sm">
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
                      className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-lg font-extrabold text-[#073B4C] tabular-nums"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Sisa Utang Saat Ini Input */}
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                    Sisa Pokok Saat Ini (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#365664] font-extrabold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={debtRemainingStr ? parseInt(debtRemainingStr, 10).toLocaleString('id-ID') : ''}
                      onChange={e => setDebtRemainingStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-base font-extrabold text-[#073B4C] tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-[#365664] mt-1">
                    * Boleh sama dengan total pokok pinjaman jika belum dicicil.
                  </p>
                </div>

                {/* Cicilan Per Bulan Input */}
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                    Cicilan per Bulan (Rp / bulan)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#365664] font-extrabold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={debtMonthlyPaymentStr ? parseInt(debtMonthlyPaymentStr, 10).toLocaleString('id-ID') : ''}
                      onChange={e => setDebtMonthlyPaymentStr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-base font-extrabold text-[#073B4C] tabular-nums"
                    />
                  </div>

                  {/* Dynamic remaining months calculator */}
                  {(() => {
                    const rem = parseInt(debtRemainingStr || debtAmountStr, 10) || 0;
                    const monthly = parseInt(debtMonthlyPaymentStr, 10) || 0;
                    if (rem > 0 && monthly > 0) {
                      const months = Math.ceil(rem / monthly);
                      return (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-[#073B4C] bg-[#A5F3FC] px-3 py-1.5 rounded-2xl border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C]">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>Perkiraan sisa tenor: {months} bulan lagi</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Tanggal Jatuh Tempo */}
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                    Tanggal Jatuh Tempo Tiap Bulan
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#073B4C] font-extrabold">Tanggal:</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={debtDueDay}
                      onChange={e => setDebtDueDay(e.target.value)}
                      className="w-20 px-3 py-2 bg-white border-2 border-[#073B4C] rounded-xl text-sm font-extrabold text-[#073B4C] text-center tabular-nums"
                    />
                    <span className="text-xs font-semibold text-[#365664]">tiap bulan (contoh: 13)</span>
                  </div>
                </div>

                {/* Optional Title / Entity */}
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                    Nama Pihak / Kreditor (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder={`Default: ${debtKind}`}
                    value={debtTitle}
                    onChange={e => setDebtTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs sm:text-sm font-bold text-[#073B4C]"
                  />
                </div>

                {/* Step 2 Actions */}
                <div className="flex gap-2 pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                  <button
                    type="button"
                    onClick={() => setDebtStep(1)}
                    className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-[#073B4C] text-[#073B4C] font-extrabold text-xs inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep3}
                    className="nb-btn flex-1 py-2.5 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] text-xs sm:text-sm flex items-center justify-center gap-1"
                  >
                    <span>Lanjut ke Detail (3/3)</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.8]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3/3: DETAIL */}
            {debtStep === 3 && (
              <form onSubmit={handleSubmitDebtWizard} className="p-5 overflow-y-auto space-y-4">
                {/* Summary Pill */}
                <div className="p-3.5 bg-[#FFFDF5] border-2 border-[#073B4C] shadow-[3px_3px_0_#073B4C] rounded-2xl space-y-1">
                  <div className="text-[11px] font-extrabold text-[#365664] uppercase">
                    3/3 · Ringkasan
                  </div>
                  <div className="text-xs font-extrabold text-[#073B4C]">
                    {debtTitle || debtKind} · jatuh tempo tgl {debtDueDay || '13'}
                  </div>
                  <div className="text-base font-extrabold text-[#BE123C] tabular-nums">
                    Sisa Rp {parseInt(debtRemainingStr || debtAmountStr || '0', 10).toLocaleString('id-ID')}
                  </div>
                  {debtMonthlyPaymentStr && (
                    <div className="text-xs font-bold text-[#365664] flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span>Cicilan: Rp {parseInt(debtMonthlyPaymentStr, 10).toLocaleString('id-ID')} / bln</span>
                      {(() => {
                        const rem = parseInt(debtRemainingStr || debtAmountStr, 10) || 0;
                        const m = parseInt(debtMonthlyPaymentStr, 10) || 0;
                        if (rem > 0 && m > 0) {
                          return <span className="text-[#073B4C] font-extrabold">• Sisa {Math.ceil(rem / m)} bulan lagi</span>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                <p className="rounded-2xl border-2 border-[#073B4C] bg-[#D1FAE5] p-3 text-xs font-bold leading-relaxed text-[#073B4C]">
                  Utang awal hanya disimpan pada daftar Utang/Piutang. Transaksi dan mutasi saldo dompet akan dicatat saat pembayaran cicilan.
                </p>

                {/* Tambahan: Bunga, Auto-debit, Catatan */}
                <div className="space-y-3 pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                  <div className="text-xs font-extrabold text-[#073B4C]">Tambahan</div>

                  {/* Bunga Input */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-[#073B4C]">Bunga</div>
                      <div className="text-[10px] font-semibold text-[#365664]">opsional</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={debtInterestRate}
                        onChange={e => setDebtInterestRate(e.target.value)}
                        className="w-16 px-2.5 py-1 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-extrabold text-[#073B4C] text-center tabular-nums"
                      />
                      <span className="text-xs font-bold text-[#365664]">% / thn</span>
                    </div>
                  </div>

                  {/* Auto-debit Cicilan PRO */}
                  <div className="p-3 bg-[#FFFBEB] rounded-2xl border-2 border-[#073B4C] flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-[#073B4C]">Auto-debit cicilan</span>
                        <span className="text-[9px] font-extrabold bg-[#FFD166] text-[#073B4C] border border-[#073B4C] px-1.5 py-0.2 rounded-full">
                          PRO
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-[#365664]">
                        Biar cicilan minimal tercatat sendiri tiap bulan.
                      </div>
                    </div>
                    <span className="text-[11px] text-[#073B4C] font-extrabold underline shrink-0 cursor-pointer">
                      Lihat Pro
                    </span>
                  </div>

                  {/* Catatan Opsional */}
                  <div>
                    <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                      Catatan <span className="text-[#365664] font-semibold">(opsional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tulis keterangan atau perjanjian cicilan..."
                      value={debtNotes}
                      onChange={e => setDebtNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] resize-none"
                    />
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="flex gap-2 pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                  <button
                    type="button"
                    onClick={() => setDebtStep(2)}
                    className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-[#073B4C] text-[#073B4C] font-extrabold text-xs inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="submit"
                    className="nb-btn flex-1 py-2.5 bg-[#06D6A0] hover:bg-[#34E4B4] text-[#073B4C] text-xs sm:text-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4 stroke-[2.6]" />
                    <span>{debtType === 'debt' ? 'Simpan Utang' : 'Simpan Piutang'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD WALLET MODAL */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-[#073B4C]/45 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-xl border-[3px] border-[#073B4C]">
            {/* Live Colored Card Header Preview */}
            <div
              style={{ backgroundColor: walletColor, color: getReadableHeaderText(walletColor) }}
              className="px-5 py-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0">
                  {getWalletIcon(walletType)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-base leading-tight truncate" style={{ color: getReadableHeaderText(walletColor) }}>
                    {walletName.trim() || 'Tambah Dompet Baru'}
                  </h2>
                  <p className="text-[11px] font-bold opacity-90" style={{ color: getReadableHeaderText(walletColor) }}>
                    Pratinjau warna header kartu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] flex items-center justify-center text-[#073B4C] hover:bg-[#FFE0E5] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWallet} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Nama Dompet</label>
                <input
                  type="text"
                  placeholder="Misal: BCA Utama, Gopay, Dompet Tunai"
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Tipe Akun</label>
                <select
                  value={walletType}
                  onChange={e => {
                    const nextType = e.target.value as WalletType;
                    setWalletType(nextType);
                    if (!walletColorTouched) {
                      setWalletColor(defaultWalletHeaderColor(nextType));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="checking">Rekening Bank (Checking)</option>
                  <option value="digital">Dompet Digital (E-Wallet)</option>
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="custom">Tabungan Khusus (Savings)</option>
                </select>
              </div>

              {/* Color Swatch Picker for Card Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-[#073B4C]">Warna Header Kartu</label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#073B4C] bg-[#FFFBEB] border-[1.5px] border-[#073B4C] px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-[#FEF3C7]">
                    <span>🎨 Bebas</span>
                    <input
                      type="color"
                      value={walletColor}
                      onChange={e => {
                        setWalletColor(e.target.value);
                        setWalletColorTouched(true);
                      }}
                      className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {WALLET_HEADER_COLORS.map(preset => {
                    const active = walletColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => {
                          setWalletColor(preset.hex);
                          setWalletColorTouched(true);
                        }}
                        style={{ backgroundColor: preset.hex, color: getReadableHeaderText(preset.hex) }}
                        className={`py-2 px-2 rounded-xl border-2 border-[#073B4C] text-[11px] font-extrabold flex items-center justify-center gap-1 transition-transform ${
                          active ? 'shadow-[3px_3px_0_#073B4C] -translate-y-0.5 ring-2 ring-[#073B4C]' : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Saldo Awal (Opsional)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={openingBalanceStr ? parseInt(openingBalanceStr, 10).toLocaleString('id-ID') : ''}
                  onChange={e => setOpeningBalanceStr(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold focus:outline-none tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
                  className="px-4 py-2 text-xs font-extrabold text-[#073B4C] bg-slate-100 hover:bg-slate-200 border-2 border-[#073B4C] rounded-full"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="nb-btn px-5 py-2 text-xs bg-[#06D6A0] text-[#073B4C]"
                >
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT WALLET MODAL */}
      {editingWallet && (
        <div className="fixed inset-0 bg-[#073B4C]/45 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-xl border-[3px] border-[#073B4C]">
            <div
              style={{ backgroundColor: editWalletColor, color: getReadableHeaderText(editWalletColor) }}
              className="px-5 py-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4 text-[#073B4C]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm leading-tight truncate" style={{ color: getReadableHeaderText(editWalletColor) }}>
                    {editWalletName.trim() || editingWallet.name}
                  </h3>
                  <p className="text-[11px] font-bold opacity-90" style={{ color: getReadableHeaderText(editWalletColor) }}>
                    Edit Dompet & Warna Header
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWallet(null)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] text-[#073B4C] hover:bg-[#FFE0E5] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWallet} className="p-5 space-y-3.5 max-h-[78vh] overflow-y-auto">
              {editWalletError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#073B4C] text-red-800 rounded-xl text-xs font-bold">
                  {editWalletError}
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Nama Dompet</label>
                <input
                  type="text"
                  placeholder="Misal: BCA Utama, Gopay, Dompet Tunai"
                  value={editWalletName}
                  onChange={e => setEditWalletName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Tipe Akun</label>
                <select
                  value={editWalletType}
                  onChange={e => setEditWalletType(e.target.value as WalletType)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C]"
                >
                  <option value="checking">Rekening Bank (Checking)</option>
                  <option value="digital">Dompet Digital (E-Wallet)</option>
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="custom">Tabungan Khusus (Savings)</option>
                </select>
              </div>

              {/* Color Swatch Picker for Edit Modal */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-[#073B4C]">Warna Header Kartu</label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#073B4C] bg-[#FFFBEB] border-[1.5px] border-[#073B4C] px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-[#FEF3C7]">
                    <span>🎨 Bebas</span>
                    <input
                      type="color"
                      value={editWalletColor}
                      onChange={e => setEditWalletColor(e.target.value)}
                      className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {WALLET_HEADER_COLORS.map(preset => {
                    const active = editWalletColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setEditWalletColor(preset.hex)}
                        style={{ backgroundColor: preset.hex, color: getReadableHeaderText(preset.hex) }}
                        className={`py-2 px-2 rounded-xl border-2 border-[#073B4C] text-[11px] font-extrabold flex items-center justify-center gap-1 transition-transform ${
                          active ? 'shadow-[3px_3px_0_#073B4C] -translate-y-0.5 ring-2 ring-[#073B4C]' : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold text-[#073B4C]">
                    Penyesuaian Saldo Akhir
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">
                    Saat ini: {formatIDR(editingWallet.balance)}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="0"
                  value={editWalletTargetBalanceStr ? parseInt(editWalletTargetBalanceStr.replace(/[^0-9-]/g, ''), 10).toLocaleString('id-ID') : ''}
                  onChange={e => setEditWalletTargetBalanceStr(e.target.value.replace(/[^0-9-]/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs tabular-nums font-extrabold text-[#073B4C]"
                />
                <p className="text-[10px] font-semibold text-slate-500 mt-1">
                  💡 Jika saldo disesuaikan, sistem otomatis membuat mutasi penyesuaian.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                <button
                  type="button"
                  onClick={() => handleDeleteWallet(editingWallet.id)}
                  className="px-3 py-2 text-xs font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border-2 border-[#073B4C] rounded-full flex items-center gap-1 transition-colors"
                  title="Hapus atau Arsipkan Dompet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingWallet(null)}
                    className="px-3.5 py-2 text-xs font-extrabold text-[#073B4C] bg-slate-100 hover:bg-slate-200 border-2 border-[#073B4C] rounded-full"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
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
      {/* EDIT DEBT / RECEIVABLE MODAL */}
      {editingDebt && (
        <div className="fixed inset-0 bg-[#073B4C]/45 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border-[3px] border-[#073B4C] shadow-[7px_7px_0_#073B4C] overflow-hidden flex flex-col max-h-[92vh]">
            <div
              className={`px-5 py-4 border-b-[2.5px] border-[#073B4C] flex items-center justify-between gap-2 ${
                editType === 'debt' ? 'bg-[#FECDD6]' : 'bg-[#06D6A0]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#073B4C] flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-[#073B4C] text-sm sm:text-base truncate">
                    Edit {editType === 'debt' ? 'Utang Keluarga' : 'Piutang Orang Lain'}
                  </h2>
                  <p className="text-[11px] font-bold text-[#073B4C]/80 mt-0.5 truncate">
                    Perbarui rincian, sisa pokok, dan tempo cicilan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#073B4C] text-[#073B4C] hover:bg-[#FFE0E5] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mx-5 mt-4 p-3 bg-[#FFE0E5] border-2 border-[#073B4C] shadow-[2px_2px_0_#073B4C] text-[#911D35] rounded-xl text-xs font-extrabold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditDebt} className="p-5 overflow-y-auto space-y-4">
              {/* Tipe Toggle */}
              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1.5">Jenis Catatan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('debt')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border-2 border-[#073B4C] inline-flex items-center justify-center gap-1.5 transition-all ${
                      editType === 'debt'
                        ? 'bg-[#FECDD6] text-[#073B4C] shadow-[2.5px_2.5px_0_#073B4C]'
                        : 'bg-white text-[#365664] hover:bg-[#FEF3C7]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B] border border-[#073B4C] inline-block shrink-0" />
                    <span>Utang (Berutang)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('receivable')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border-2 border-[#073B4C] inline-flex items-center justify-center gap-1.5 transition-all ${
                      editType === 'receivable'
                        ? 'bg-[#06D6A0] text-[#073B4C] shadow-[2.5px_2.5px_0_#073B4C]'
                        : 'bg-white text-[#365664] hover:bg-[#FEF3C7]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06D6A0] border border-[#073B4C] inline-block shrink-0" />
                    <span>Piutang (Orang Lain)</span>
                  </button>
                </div>
              </div>

              {/* Nama Pihak */}
              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">
                  Nama Pihak / Judul {editType === 'debt' ? 'Pemberi Pinjaman' : 'Peminjam'}
                </label>
                <input
                  type="text"
                  value={editPersonOrEntity}
                  onChange={e => setEditPersonOrEntity(e.target.value)}
                  placeholder="Misal: Cicilan Bank, Teman Kantor, Katering Bu Rina"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C]"
                  required
                />
              </div>

              {/* Grid Nominal Total & Sisa */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Total Pinjaman (Rp)</label>
                  <input
                    type="text"
                    value={editAmountStr ? parseInt(editAmountStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-extrabold text-[#073B4C] tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Sisa Pokok (Rp)</label>
                  <input
                    type="text"
                    value={editRemainingStr ? parseInt(editRemainingStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditRemainingStr(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-extrabold text-[#073B4C] tabular-nums"
                    required
                  />
                </div>
              </div>

              {/* Cicilan Bulanan & Tanggal Jatuh Tempo */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Cicilan Bulanan (Rp)</label>
                  <input
                    type="text"
                    value={editMonthlyStr ? parseInt(editMonthlyStr, 10).toLocaleString('id-ID') : ''}
                    onChange={e => setEditMonthlyStr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Opsional (0 jika langsung)"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Jatuh Tempo (Tgl 1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editDueDay}
                    onChange={e => setEditDueDay(e.target.value)}
                    placeholder="Misal: 15"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] tabular-nums"
                  />
                </div>
              </div>

              {/* Keterangan Tempo Text */}
              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Teks Jatuh Tempo (Opsional)</label>
                <input
                  type="text"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  placeholder="Misal: 25 Nov 2026 atau Akhir Bulan"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C]"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-extrabold text-[#073B4C] mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Misal: Nomor rekening tujuan, sisa 2x cicilan, kontak peminjam"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#073B4C] rounded-xl text-xs font-bold text-[#073B4C] resize-none"
                />
              </div>

              {/* Status Lunas Toggle */}
              <div className="p-3 bg-[#FFFDF5] border-2 border-[#073B4C] rounded-2xl flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-[#073B4C]">Tandai Sudah Lunas</div>
                  <div className="text-[11px] font-semibold text-[#365664]">Utang/piutang ini sudah tidak memiliki sisa tanggungan</div>
                </div>
                <input
                  type="checkbox"
                  checked={editIsSettled}
                  onChange={e => setEditIsSettled(e.target.checked)}
                  className="w-5 h-5 accent-[#06D6A0] rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t-2 border-dashed border-[#073B4C]/20">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="px-4 py-2 text-xs font-extrabold text-[#073B4C] bg-slate-100 hover:bg-slate-200 border-2 border-[#073B4C] rounded-full"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="nb-btn px-5 py-2 text-xs bg-[#06D6A0] text-[#073B4C]"
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
