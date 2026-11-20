import type { AIConfig, Category, Wallet } from '../types';
import { normalizeAIEndpoint } from './aiScanner';

export interface ParsedMagicInput {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  categoryId?: string;
  categoryName?: string;
  sourceWalletId?: string;
  destinationWalletId?: string;
  label?: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

const EXPENSE_SYNONYMS: Array<{ keywords: string[]; categoryHints: string[] }> = [
  {
    keywords: ['kopi', 'ngopi', 'cafe', 'kafe', 'boba', 'jus', 'teh', 'minum', 'starbucks', 'fore', 'kenangan'],
    categoryHints: ['kopi', 'cafe', 'minum', 'makan', 'jajan', 'kuliner']
  },
  {
    keywords: ['makan', 'sarapan', 'siang', 'malam', 'bakso', 'mie', 'ayam', 'nasi', 'soto', 'sate', 'warteg', 'resto', 'gofood', 'grabfood', 'shopeefood', 'jajan', 'cemilan', 'roti', 'kue'],
    categoryHints: ['makan', 'resto', 'kuliner', 'jajan', 'konsumsi']
  },
  {
    keywords: ['sayur', 'pasar', 'belanja', 'beras', 'telur', 'buah', 'dapur', 'sembako', 'indomaret', 'alfamart', 'superindo', 'supermarket', 'galon', 'gas', 'sabun'],
    categoryHints: ['belanja', 'pasar', 'dapur', 'supermarket', 'rumah', 'kebutuhan']
  },
  {
    keywords: ['bensin', 'pertamax', 'pertalite', 'solar', 'spbu', 'shell', 'ojol', 'gojek', 'grab', 'maxim', 'parkir', 'tol', 'etoll', 'bus', 'kereta', 'krl', 'mrt', 'tiket', 'servis', 'oli'],
    categoryHints: ['transport', 'bensin', 'bbm', 'motor', 'mobil', 'perjalanan']
  },
  {
    keywords: ['listrik', 'pln', 'token', 'air', 'pdam', 'wifi', 'internet', 'indihome', 'biznet', 'pulsa', 'kuota', 'paket data', 'iuran', 'sampah', 'keamanan', 'sewa', 'kontrakan'],
    categoryHints: ['listrik', 'tagihan', 'utilitas', 'rumah', 'internet', 'air']
  },
  {
    keywords: ['anak', 'sekolah', 'spp', 'buku', 'les', 'kursus', 'kuliah', 'popok', 'pampers', 'susu', 'mainan', 'seragam'],
    categoryHints: ['anak', 'pendidikan', 'sekolah', 'bayi', 'keluarga']
  },
  {
    keywords: ['obat', 'apotek', 'dokter', 'rs', 'rumah sakit', 'klinik', 'vitamin', 'medis', 'gigi', 'bpjs'],
    categoryHints: ['kesehatan', 'medis', 'obat', 'dokter']
  },
  {
    keywords: ['nonton', 'bioskop', 'netflix', 'spotify', 'youtube', 'game', 'hiburan', 'liburan', 'hotel', 'wisata', 'piknik'],
    categoryHints: ['hiburan', 'rekreasi', 'liburan', 'hobi']
  },
  {
    keywords: ['sedekah', 'infaq', 'zakat', 'donasi', 'amal', 'kondangan', 'kado', 'hadiah'],
    categoryHints: ['donasi', 'sedekah', 'sosial', 'hadiah']
  }
];

const INCOME_SYNONYMS: Array<{ keywords: string[]; categoryHints: string[] }> = [
  {
    keywords: ['gaji', 'payroll', 'upah', 'slip'],
    categoryHints: ['gaji', 'pokok', 'pendapatan']
  },
  {
    keywords: ['bonus', 'thr', 'insentif', 'komisi', 'lembur', 'freelance', 'proyek', 'project', 'klien'],
    categoryHints: ['bonus', 'thr', 'freelance', 'sampingan', 'usaha']
  },
  {
    keywords: ['jualan', 'omzet', 'usaha', 'toko', 'warung', 'laba', 'profit', 'dividen', 'bunga', 'cuan'],
    categoryHints: ['usaha', 'bisnis', 'investasi', 'pemasukan']
  }
];

function extractIndonesianAmount(input: string): { amount: number; matchedToken: string } {
  // Remove hashtags temporarily so #2026 isn't read as Rp 2026
  const withoutTags = input.replace(/#[\w-]+/g, ' ');

  // 1. Match shorthand units: 1,5jt, 1.5 juta, 50rb, 50 ribu, 25k, 2.5m
  const unitRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(juta|jt|ribu|rb|k)\b/i;
  const unitMatch = withoutTags.match(unitRegex);
  if (unitMatch) {
    const rawNum = unitMatch[1]!.replace(',', '.');
    const unit = unitMatch[2]!.toLowerCase();
    const mult = unit === 'juta' || unit === 'jt' ? 1_000_000 : 1_000;
    const val = Math.round(parseFloat(rawNum) * mult);
    if (Number.isFinite(val) && val > 0) {
      return { amount: val, matchedToken: unitMatch[0] };
    }
  }

  // 2. Match formatted Rupiah with dots/commas or plain >= 3 digits: Rp 145.000, 50.000, 45000
  const plainRegex = /(?:rp\.?\s*)(\d{1,3}(?:[.,]\d{3})+|\d{3,12})\b|\b(\d{1,3}(?:\.\d{3})+|\d{4,12})\b/i;
  const plainMatch = withoutTags.match(plainRegex);
  if (plainMatch) {
    const digits = (plainMatch[1] || plainMatch[2] || '').replace(/[^0-9]/g, '');
    const val = parseInt(digits, 10);
    if (Number.isFinite(val) && val > 0) {
      return { amount: val, matchedToken: plainMatch[0] };
    }
  }

  return { amount: 0, matchedToken: '' };
}

export function parseNaturalTransactionText(
  rawText: string,
  wallets: Wallet[],
  categories: Category[]
): ParsedMagicInput {
  const clean = rawText.trim();
  if (!clean) {
    return {
      type: 'expense',
      amount: 0,
      description: '',
      confidence: 'low'
    };
  }

  const lower = clean.toLowerCase();

  // 1. Extract #label if present
  const tagMatch = clean.match(/#([\w-]+)/);
  const label = tagMatch ? tagMatch[1] : undefined;

  // 2. Detect transaction type
  let type: 'expense' | 'income' | 'transfer' = 'expense';
  if (/\b(transfer|pindah\s*dana|pindah\s*saldo|tarik\s*tunai|setor\s*tunai|top\s*up|topup)\b/i.test(lower)) {
    type = 'transfer';
  } else if (/\b(gaji|gajian|bonus|thr|dapat\s+uang|uang\s+masuk|terima\s+transfer|terima\s+bayaran|komisi|dividen|hasil\s+usaha|pemasukan)\b/i.test(lower)) {
    type = 'income';
  }

  // 3. Extract amount
  const { amount, matchedToken } = extractIndonesianAmount(clean);

  // 4. Match Wallets (source & destination)
  let sourceWalletId: string | undefined;
  let destinationWalletId: string | undefined;

  const sortedWallets = [...wallets].sort((a, b) => b.name.length - a.name.length);

  if (type === 'transfer') {
    for (const w of sortedWallets) {
      const wName = w.name.toLowerCase();
      const escaped = wName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b(dari|via|pakai)\\s+${escaped}`, 'i').test(lower)) {
        sourceWalletId = w.id;
      }
      if (new RegExp(`\\b(ke|menuju|masuk)\\s+${escaped}`, 'i').test(lower)) {
        destinationWalletId = w.id;
      }
    }
    if (!sourceWalletId || !destinationWalletId) {
      const mentioned = sortedWallets.filter(w => lower.includes(w.name.toLowerCase()));
      if (!sourceWalletId && mentioned[0]) sourceWalletId = mentioned[0].id;
      if (!destinationWalletId && mentioned[1]) destinationWalletId = mentioned[1].id;
    }
  } else {
    let matchedWallet = sortedWallets.find(w => lower.includes(w.name.toLowerCase()));
    if (!matchedWallet) {
      if (/\b(tunai|cash|dompet\s*tunai)\b/i.test(lower)) {
        matchedWallet = wallets.find(w => w.type === 'cash');
      } else if (/\b(ewallet|gopay|ovo|dana|shopeepay|qris)\b/i.test(lower)) {
        const token = lower.match(/\b(gopay|ovo|dana|shopeepay)\b/i)?.[1];
        matchedWallet =
          (token ? wallets.find(w => w.name.toLowerCase().includes(token)) : undefined) ||
          wallets.find(w => w.type === 'digital');
      } else if (/\b(bca|mandiri|bri|bni|bsi|jago|seabank|bank)\b/i.test(lower)) {
        const token = lower.match(/\b(bca|mandiri|bri|bni|bsi|jago|seabank)\b/i)?.[1];
        matchedWallet =
          (token ? wallets.find(w => w.name.toLowerCase().includes(token)) : undefined) ||
          wallets.find(w => w.type === 'checking');
      }
    }
    if (matchedWallet) {
      if (type === 'income') destinationWalletId = matchedWallet.id;
      else sourceWalletId = matchedWallet.id;
    } else if (wallets[0]) {
      if (type === 'income') destinationWalletId = wallets[0].id;
      else sourceWalletId = wallets[0].id;
    }
  }

  // 5. Match Category
  let matchedCat: Category | undefined;
  if (type !== 'transfer') {
    const typeCats = categories.filter(c => c.type === type && !c.isArchived);

    // Direct category name match first
    matchedCat = typeCats.find(c => lower.includes(c.name.toLowerCase()));

    // Synonym dictionary match
    if (!matchedCat) {
      const dict = type === 'income' ? INCOME_SYNONYMS : EXPENSE_SYNONYMS;
      for (const group of dict) {
        if (group.keywords.some(kw => lower.includes(kw))) {
          matchedCat = typeCats.find(c =>
            group.categoryHints.some(hint => c.name.toLowerCase().includes(hint))
          );
          if (matchedCat) break;
        }
      }
    }

    if (!matchedCat && typeCats[0]) {
      matchedCat = typeCats[0];
    }
  }

  // 6. Build clean human-readable description
  let desc = clean;
  if (matchedToken) {
    desc = desc.replace(matchedToken, ' ');
  }
  desc = desc.replace(/#[\w-]+/g, ' ');
  for (const w of sortedWallets) {
    const escaped = w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    desc = desc.replace(new RegExp(`\\b(pakai|dari|via|lewat|ke|masuk)\\s+${escaped}\\b`, 'gi'), ' ');
  }
  desc = desc
    .replace(/\b(pakai|via|lewat|dengan)\s+(tunai|cash|qris|gopay|ovo|dana|bca|mandiri|bri|bni|jago)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\-:\s]+|[,.\-:\s]+$/g, '')
    .trim();

  if (!desc) {
    desc = matchedCat?.name || (type === 'transfer' ? 'Transfer Antar Dompet' : 'Transaksi Harian');
  } else {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  const confidence: ParsedMagicInput['confidence'] =
    amount > 0 && (matchedCat || type === 'transfer') ? 'high' : amount > 0 ? 'medium' : 'low';

  return {
    type,
    amount,
    categoryId: matchedCat?.id,
    categoryName: type === 'transfer' ? 'Transfer Antar Dompet' : matchedCat?.name,
    sourceWalletId,
    destinationWalletId,
    label,
    description: desc,
    confidence
  };
}

export async function enhanceMagicInputWithAI(
  rawText: string,
  wallets: Wallet[],
  categories: Category[],
  aiConfig?: AIConfig
): Promise<ParsedMagicInput> {
  const localFallback = parseNaturalTransactionText(rawText, wallets, categories);
  const walletNames = wallets.map(w => w.name);
  const expenseCats = categories.filter(c => c.type === 'expense' && !c.isArchived).map(c => c.name);
  const incomeCats = categories.filter(c => c.type === 'income' && !c.isArchived).map(c => c.name);

  try {
    const serverRes = await fetch('/api/ai/parse-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: rawText,
        wallets: walletNames,
        expenseCategories: expenseCats,
        incomeCategories: incomeCats
      })
    });

    if (serverRes.ok) {
      const json = (await serverRes.json()) as {
        success?: boolean;
        data?: {
          type?: 'expense' | 'income' | 'transfer';
          amount?: number;
          categoryName?: string;
          sourceWalletName?: string;
          destinationWalletName?: string;
          label?: string;
          description?: string;
        };
      };
      if (json.success && json.data) {
        return mergeAIResultWithLocal(json.data, localFallback, wallets, categories);
      }
    }
  } catch {
    // Fallback to direct client AI if configured or local parser
  }

  if (aiConfig?.apiKey && aiConfig.apiUrl) {
    try {
      const endpoint = normalizeAIEndpoint(aiConfig.apiUrl, aiConfig.provider);
      const prompt = `Ekstrak kalimat transaksi keuangan ini ke JSON murni tanpa markdown:
Kalimat: "${rawText}"
Dompet tersedia: ${walletNames.join(', ')}
Kategori pengeluaran: ${expenseCats.join(', ')}
Kategori pemasukan: ${incomeCats.join(', ')}
Format JSON: {"type":"expense"|"income"|"transfer","amount":number,"categoryName":string,"sourceWalletName":string,"destinationWalletName":string,"label":string,"description":string}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 220
        })
      });
      if (res.ok) {
        const body = await res.json();
        const content: string = body?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return mergeAIResultWithLocal(parsed, localFallback, wallets, categories);
        }
      }
    } catch {
      // Return local fallback
    }
  }

  return localFallback;
}

function mergeAIResultWithLocal(
  aiData: {
    type?: 'expense' | 'income' | 'transfer';
    amount?: number;
    categoryName?: string;
    sourceWalletName?: string;
    destinationWalletName?: string;
    label?: string;
    description?: string;
  },
  fallback: ParsedMagicInput,
  wallets: Wallet[],
  categories: Category[]
): ParsedMagicInput {
  const type =
    aiData.type === 'income' || aiData.type === 'transfer' || aiData.type === 'expense'
      ? aiData.type
      : fallback.type;
  const amount = Number(aiData.amount) > 0 ? Math.round(Number(aiData.amount)) : fallback.amount;

  const findWalletId = (name?: string) => {
    if (!name) return undefined;
    const n = name.toLowerCase().trim();
    return wallets.find(w => w.name.toLowerCase() === n || w.name.toLowerCase().includes(n))?.id;
  };

  const srcId = findWalletId(aiData.sourceWalletName) || fallback.sourceWalletId;
  const dstId = findWalletId(aiData.destinationWalletName) || fallback.destinationWalletId;

  let catId = fallback.categoryId;
  let catName = fallback.categoryName;
  if (type !== 'transfer' && aiData.categoryName) {
    const cSearch = aiData.categoryName.toLowerCase().trim();
    const matched = categories
      .filter(c => c.type === type && !c.isArchived)
      .find(c => c.name.toLowerCase() === cSearch || c.name.toLowerCase().includes(cSearch) || cSearch.includes(c.name.toLowerCase()));
    if (matched) {
      catId = matched.id;
      catName = matched.name;
    }
  }

  return {
    type,
    amount,
    categoryId: type === 'transfer' ? undefined : catId,
    categoryName: type === 'transfer' ? 'Transfer Antar Dompet' : catName,
    sourceWalletId: srcId,
    destinationWalletId: dstId,
    label: aiData.label?.replace(/^#/, '') || fallback.label,
    description: aiData.description?.trim() || fallback.description,
    confidence: amount > 0 ? 'high' : fallback.confidence
  };
}
