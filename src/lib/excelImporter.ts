import * as XLSX from 'xlsx';
import type { FinancialTransaction, LedgerEntry, Wallet, Category, ExcelImportSummary, Household, HouseholdMember } from '../types';

export interface ParseExcelResult {
  success: boolean;
  error?: string;
  summary: ExcelImportSummary;
  household: Household;
  members: HouseholdMember[];
  wallets: Wallet[];
  categories: Category[];
  labels: string[];
  transactions: FinancialTransaction[];
  ledgerEntries: LedgerEntry[];
}

export function parseFinancialExcel(
  data: ArrayBuffer | Uint8Array,
  targetHouseholdId: string = 'household-default',
  targetHouseholdName?: string
): ParseExcelResult {
  try {
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    // 1. Parse Summary Sheet jika ada
    const summarySheetName = workbook.SheetNames.find(n => n.toLowerCase().trim() === 'summary');
    const summarySheet = summarySheetName ? workbook.Sheets[summarySheetName] : undefined;
    let householdName = 'Keuangan Keluarga';
    let exportedOn = new Date().toLocaleString('id-ID');
    let totalIncome = 0;
    let totalExpenses = 0;
    let netBalance = 0;
    let totalTransactions = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let transferCount = 0;
    const topCategories: { name: string; amountStr: string }[] = [];

    if (summarySheet) {
      const rows = XLSX.utils.sheet_to_json<string[]>(summarySheet, { header: 1 });
      for (const row of rows) {
        if (!row || row.length < 2) continue;
        const key = String(row[0] || '').trim();
        const val = String(row[1] || '').trim();

        if (key === 'Household') householdName = val;
        else if (key === 'Exported On') exportedOn = val;
        else if (key === 'Total Transactions') totalTransactions = parseInt(val, 10) || 0;
        else if (key === 'Income Transactions') incomeCount = parseInt(val, 10) || 0;
        else if (key === 'Expense Transactions') expenseCount = parseInt(val, 10) || 0;
        else if (key === 'Transfer Transactions') transferCount = parseInt(val, 10) || 0;
        else if (key === 'Total Income') {
          totalIncome = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
        } else if (key === 'Total Expenses') {
          totalExpenses = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
        } else if (key === 'Net Balance') {
          netBalance = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
        } else if (['ART', 'Makan', 'Gift', 'Langganan', 'Belanja'].includes(key)) {
          topCategories.push({ name: key, amountStr: val });
        }
      }
    }

    // 2. Temukan Lembar Kerja Transaksi secara fleksibel
    let txSheet: XLSX.WorkSheet | undefined;
    const preferredNames = ['transactions', 'transaksi', 'mutasi', 'data', 'sheet1', 'sheet 1'];
    for (const name of workbook.SheetNames) {
      const clean = name.toLowerCase().trim();
      if (preferredNames.includes(clean) || clean.includes('trans')) {
        txSheet = workbook.Sheets[name];
        break;
      }
    }

    if (!txSheet) {
      const nonSummary = workbook.SheetNames.filter(n => !n.toLowerCase().includes('summary'));
      if (nonSummary.length > 0 && workbook.Sheets[nonSummary[0]!]) {
        txSheet = workbook.Sheets[nonSummary[0]!];
      } else if (workbook.SheetNames.length > 0) {
        txSheet = workbook.Sheets[workbook.SheetNames[0]!];
      }
    }

    if (!txSheet) {
      return {
        success: false,
        error: 'Lembar kerja transaksi tidak ditemukan di dalam berkas Excel.',
        summary: {} as ExcelImportSummary,
        household: {} as Household,
        members: [],
        wallets: [],
        categories: [],
        labels: [],
        transactions: [],
        ledgerEntries: []
      };
    }

    const rawTxs = XLSX.utils.sheet_to_json<Record<string, unknown>>(txSheet);
    if (!rawTxs || rawTxs.length === 0) {
      return {
        success: false,
        error: 'Lembar transaksi kosong atau tidak memuat baris data.',
        summary: {} as ExcelImportSummary,
        household: {} as Household,
        members: [],
        wallets: [],
        categories: [],
        labels: [],
        transactions: [],
        ledgerEntries: []
      };
    }

    const householdId = targetHouseholdId;
    const household: Household = {
      id: householdId,
      name: targetHouseholdName || householdName || 'Keuangan Keluarga',
      baseCurrency: 'IDR',
      createdById: 'user-default',
      createdAt: '2026-11-01T00:00:00.000Z'
    };
    // Extract Assets/Wallets
    const walletMap = new Map<string, Wallet>();
    const getWalletId = (name: string) => `w-${householdId}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const ensureWallet = (name: string, rawType?: string) => {
      const cleanName = name.trim();
      if (!cleanName || walletMap.has(cleanName)) return;

      let type: Wallet['type'] = 'checking';
      let color = '#0F766E';
      let icon = 'Building2';

      const lower = cleanName.toLowerCase();
      if (lower.includes('cash') || rawType === 'cash') {
        type = 'cash';
        color = '#059669';
        icon = 'Banknote';
      } else if (lower.includes('jago') || rawType === 'digital') {
        type = 'digital';
        color = '#F59E0B';
        icon = 'Smartphone';
      } else if (lower.includes('ulfa')) {
        type = 'checking';
        color = '#0D9488';
        icon = 'Building2';
      }

      walletMap.set(cleanName, {
        id: getWalletId(cleanName),
        householdId,
        name: cleanName,
        type,
        institutionName: cleanName,
        currency: 'IDR',
        balance: 0,
        color,
        icon,
        isArchived: false,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-10T12:00:00.000Z'
      });
    };

    // Extract Categories
    const categoryMap = new Map<string, Category>();
    const getCategoryId = (name: string) => `cat-${householdId}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const ensureCategory = (name: string, type: 'income' | 'expense' | 'transfer') => {
      const cleanName = name.trim();
      if (!cleanName || categoryMap.has(cleanName)) return;

      let icon = 'Tag';
      let color = '#64748B';

      const lower = cleanName.toLowerCase();
      if (lower.includes('gaji')) {
        icon = 'Briefcase';
        color = '#059669';
      } else if (lower.includes('makan') || lower.includes('sarapan')) {
        icon = 'Utensils';
        color = '#EA580C';
      } else if (lower.includes('jajan')) {
        icon = 'Coffee';
        color = '#F59E0B';
      } else if (lower.includes('belanja')) {
        icon = 'ShoppingCart';
        color = '#0284C7';
      } else if (lower.includes('listrik') || lower.includes('tagihan')) {
        icon = 'Zap';
        color = '#DC2626';
      } else if (lower.includes('langganan')) {
        icon = 'Repeat';
        color = '#8B5CF6';
      } else if (lower.includes('art')) {
        icon = 'Home';
        color = '#4F46E5';
      } else if (lower.includes('gift')) {
        icon = 'Gift';
        color = '#EC4899';
      } else if (lower.includes('parkir') || lower.includes('transportasi')) {
        icon = 'Car';
        color = '#64748B';
      }

      categoryMap.set(cleanName, {
        id: getCategoryId(cleanName),
        householdId,
        name: cleanName,
        type,
        icon,
        color,
        isArchived: false
      });
    };

    // Extract Members
    // Members dari Excel tidak harus di-link ke akun/user ID resmi (pencatat murni teks)
    const membersMap = new Map<string, HouseholdMember>();
    const ensureMember = (name: string) => {
      const cleanName = name.trim();
      if (!cleanName || membersMap.has(cleanName)) return;
      membersMap.set(cleanName, {
        id: `mem-${householdId}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        householdId,
        userId: `user-excel-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        displayName: cleanName,
        role: 'MEMBER',
        joinedAt: '2026-11-01T00:00:00.000Z'
      });
    };

    // Extract unique labels
    const labelsSet = new Set<string>();

    const transactions: FinancialTransaction[] = [];
    const ledgerEntries: LedgerEntry[] = [];

    let calculatedIncome = 0;
    let calculatedExpense = 0;

    // Helper fleksibel untuk membaca kolom dari berbagai alias (Indonesia / Inggris)
    const getRowVal = (row: Record<string, unknown>, ...aliases: string[]): unknown => {
      const keys = Object.keys(row);
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const key of keys) {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanKey === cleanAlias) {
            return row[key];
          }
        }
      }
      return undefined;
    };

    const parseAmount = (val: unknown): number => {
      if (typeof val === 'number') {
        return isNaN(val) ? 0 : Math.round(Math.abs(val));
      }
      if (!val) return 0;
      const str = String(val).trim();
      const digits = str.replace(/[^0-9]/g, '');
      return digits ? parseInt(digits, 10) || 0 : 0;
    };

    const parseTxType = (typeVal: unknown, catVal: unknown): 'income' | 'expense' | 'transfer' => {
      const str = String(typeVal || '').toLowerCase().trim();
      if (str.includes('income') || str.includes('masuk') || str.includes('pemasukan') || str.includes('kredit')) return 'income';
      if (str.includes('transfer') || str.includes('pindah') || str.includes('mutasi')) return 'transfer';
      const catStr = String(catVal || '').toLowerCase().trim();
      if (catStr.includes('gaji') || catStr.includes('bonus') || catStr.includes('pemasukan') || catStr.includes('income')) return 'income';
      return 'expense';
    };

    const parseDateAndEffectiveAt = (dateVal: unknown, timeVal: unknown): { dateStr: string; timeStr: string; effectiveAt: string } => {
      const now = new Date();
      let d: Date | null = null;
      let dateStr = '';

      if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        d = dateVal;
        dateStr = d.toISOString().split('T')[0]!;
      } else if (typeof dateVal === 'number' && dateVal > 25000 && dateVal < 70000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        d = new Date(excelEpoch.getTime() + dateVal * 86400000);
        dateStr = d.toISOString().split('T')[0]!;
      } else if (dateVal) {
        const s = String(dateVal).trim();
        const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dmy) {
          const year = dmy[3]!.length === 2 ? `20${dmy[3]}` : dmy[3]!;
          const month = dmy[2]!.padStart(2, '0');
          const day = dmy[1]!.padStart(2, '0');
          d = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
          dateStr = `${year}-${month}-${day}`;
        } else {
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) {
            d = parsed;
            dateStr = parsed.toISOString().split('T')[0]!;
          }
        }
      }

      if (!d || isNaN(d.getTime())) {
        d = now;
        dateStr = now.toISOString().split('T')[0]!;
      }

      let timeStr = '';
      if (timeVal) {
        if (typeof timeVal === 'number' && timeVal >= 0 && timeVal < 1) {
          const totalSec = Math.round(timeVal * 86400);
          const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
          const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
          timeStr = `${h}:${m}`;
        } else {
          timeStr = String(timeVal).trim();
        }
      }

      return {
        dateStr,
        timeStr,
        effectiveAt: d.toISOString()
      };
    };

    const importTimestamp = Date.now();

    for (let i = 0; i < rawTxs.length; i++) {
      const row = rawTxs[i]!;
      const rawNo = getRowVal(row, 'No', 'No.', 'Nomor', 'Index');
      const no = typeof rawNo === 'number' ? rawNo : parseInt(String(rawNo), 10) || i + 1;

      const rawAmountVal = getRowVal(row, 'Amount', 'Nominal', 'Jumlah', 'Total', 'Nilai', 'Besaran', 'Kredit', 'Debit', 'Harga');
      const amount = parseAmount(rawAmountVal);

      const catName = String(getRowVal(row, 'Category', 'Kategori', 'Pos') || '').trim();
      const rawTypeVal = getRowVal(row, 'Type', 'Tipe', 'Jenis', 'Kategori Tipe');
      const txType = parseTxType(rawTypeVal, catName);

      const label = String(getRowVal(row, 'Label', 'Tag', 'Sub', 'Sub Kategori') || '').trim();
      const sourceAsset = String(getRowVal(row, 'Source Asset', 'Dompet', 'Rekening', 'Dari Dompet', 'Sumber', 'Asset', 'Wallet', 'Dari', 'Akun') || '').trim();
      const sourceAssetType = String(getRowVal(row, 'Source Asset Type', 'Tipe Dompet', 'Jenis Rekening') || '').trim();
      const destAsset = String(getRowVal(row, 'Destination Asset', 'Tujuan', 'Dompet Tujuan', 'Rekening Tujuan', 'Ke Dompet', 'Ke') || '').trim();
      const addedBy = String(getRowVal(row, 'Added By', 'Dicatat Oleh', 'Pencatat', 'Oleh', 'User', 'Anggota', 'Member') || 'Import Excel').trim() || 'Import Excel';
      const description = String(getRowVal(row, 'Description', 'Deskripsi', 'Keterangan', 'Rincian', 'Catatan', 'Nama', 'Item', 'Keperluan') || '').trim();
      const notes = String(getRowVal(row, 'Notes', 'Catatan Tambahan', 'Keterangan Tambahan') || '').trim();

      const rawDateVal = getRowVal(row, 'Date', 'Tanggal', 'Tgl', 'Waktu');
      const rawTimeVal = getRowVal(row, 'Time', 'Jam', 'Waktu');
      const { dateStr, timeStr, effectiveAt } = parseDateAndEffectiveAt(rawDateVal, rawTimeVal);

      const rawFeeVal = getRowVal(row, 'Transfer Fee', 'Biaya Admin', 'Admin Fee', 'Fee', 'Biaya');
      const fee = parseAmount(rawFeeVal);

      const autoIncome = String(getRowVal(row, 'Auto Income') || '').toLowerCase() === 'yes';
      const fromSavings = String(getRowVal(row, 'From Savings') || '').toLowerCase() === 'yes';
      const fromInvestment = String(getRowVal(row, 'From Investment') || '').toLowerCase() === 'yes';

      // Pastikan dompet pemasukan tercatat sebagai destinationAsset
      const incomeAsset = destAsset || sourceAsset;
      const expenseAsset = sourceAsset || destAsset;

      if (txType === 'income') {
        if (incomeAsset) ensureWallet(incomeAsset, sourceAssetType);
      } else if (txType === 'transfer') {
        if (sourceAsset) ensureWallet(sourceAsset, sourceAssetType);
        if (destAsset) ensureWallet(destAsset);
      } else {
        if (expenseAsset) ensureWallet(expenseAsset, sourceAssetType);
      }

      if (addedBy) ensureMember(addedBy);
      if (label) labelsSet.add(label);
      if (catName) ensureCategory(catName, txType);

      // Gunakan ID unik yang stabil
      const txId = `tx-${householdId}-${importTimestamp}-${no}`;

      const tx: FinancialTransaction = {
        id: txId,
        no,
        householdId,
        type: txType,
        amount,
        fee: fee > 0 ? fee : undefined,
        sourceWalletId: txType === 'income' ? undefined : (expenseAsset ? getWalletId(expenseAsset) : undefined),
        destinationWalletId: txType === 'income'
          ? (incomeAsset ? getWalletId(incomeAsset) : undefined)
          : (txType === 'transfer' && destAsset ? getWalletId(destAsset) : undefined),
        categoryId: catName ? getCategoryId(catName) : undefined,
        categoryName: catName || (txType === 'transfer' ? 'Transfer Antar Dompet' : (txType === 'income' ? 'Pemasukan' : 'Lainnya')),
        categoryType: txType === 'income' ? 'income' : 'expense',
        label: label || undefined,
        description: description || label || catName || (txType === 'transfer' ? 'Transfer Antar Dompet' : 'Transaksi'),
        notes: notes || undefined,
        effectiveAt,
        dateStr: dateStr || undefined,
        time: timeStr || undefined,
        sourceAsset: txType === 'income' ? undefined : (expenseAsset || undefined),
        sourceAssetType: sourceAssetType || undefined,
        destinationAsset: txType === 'income' ? (incomeAsset || undefined) : (destAsset || undefined),
        addedBy,
        autoIncome,
        fromSavings,
        fromInvestment,
        status: 'POSTED',
        createdAt: String(getRowVal(row, 'Created At') || effectiveAt),
        updatedAt: String(getRowVal(row, 'Last Updated') || effectiveAt)
      };

      transactions.push(tx);

      // Ledger entries generation (Invariants)
      if (txType === 'income') {
        calculatedIncome += amount;
        const wId = tx.destinationWalletId || (sourceAsset ? getWalletId(sourceAsset) : '');
        if (wId) {
          ledgerEntries.push({
            id: `led-${txId}-inc`,
            householdId,
            transactionId: txId,
            walletId: wId,
            signedAmount: amount,
            entryType: 'INCOME',
            postedAt: effectiveAt,
            createdAt: effectiveAt
          });
        }
      } else if (txType === 'expense') {
        calculatedExpense += amount;
        const wId = tx.sourceWalletId;
        if (wId) {
          ledgerEntries.push({
            id: `led-${txId}-exp`,
            householdId,
            transactionId: txId,
            walletId: wId,
            signedAmount: -amount,
            entryType: 'EXPENSE',
            postedAt: effectiveAt,
            createdAt: effectiveAt
          });
        }
      } else if (txType === 'transfer') {
        const srcWId = tx.sourceWalletId;
        const dstWId = tx.destinationWalletId;

        if (srcWId && dstWId) {
          ledgerEntries.push({
            id: `led-${txId}-tout`,
            householdId,
            transactionId: txId,
            walletId: srcWId,
            signedAmount: -amount,
            entryType: 'TRANSFER_OUT',
            postedAt: effectiveAt,
            createdAt: effectiveAt
          });

          ledgerEntries.push({
            id: `led-${txId}-tin`,
            householdId,
            transactionId: txId,
            walletId: dstWId,
            signedAmount: amount,
            entryType: 'TRANSFER_IN',
            postedAt: effectiveAt,
            createdAt: effectiveAt
          });

          if (fee > 0) {
            calculatedExpense += fee;
            ledgerEntries.push({
              id: `led-${txId}-fee`,
              householdId,
              transactionId: txId,
              walletId: srcWId,
              signedAmount: -fee,
              entryType: 'FEE',
              postedAt: effectiveAt,
              createdAt: effectiveAt
            });
          }
        }
      }
    }

    // Calculate balances for each wallet
    const wallets = Array.from(walletMap.values()).map(w => {
      const balance = ledgerEntries
        .filter(le => le.walletId === w.id)
        .reduce((sum, le) => sum + le.signedAmount, 0);
      return { ...w, balance };
    });

    const categories = Array.from(categoryMap.values());
    const members = Array.from(membersMap.values());
    const labels = Array.from(labelsSet);

    const summary: ExcelImportSummary = {
      householdName,
      exportedOn,
      currency: 'IDR',
      totalTransactions: transactions.length,
      incomeCount: transactions.filter(t => t.type === 'income').length,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
      transferCount: transactions.filter(t => t.type === 'transfer').length,
      totalIncome: calculatedIncome || totalIncome,
      totalExpenses: calculatedExpense || totalExpenses,
      netBalance: (calculatedIncome || totalIncome) - (calculatedExpense || totalExpenses),
      topCategories,
      labelsList: labels,
      walletsList: wallets.map(w => w.name)
    };

    return {
      success: true,
      summary,
      household,
      members,
      wallets,
      categories,
      labels,
      transactions,
      ledgerEntries
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Gagal memproses berkas Excel.';
    return {
      success: false,
      error: errorMessage,
      summary: {} as ExcelImportSummary,
      household: {} as Household,
      members: [],
      wallets: [],
      categories: [],
      labels: [],
      transactions: [],
      ledgerEntries: []
    };
  }
}
