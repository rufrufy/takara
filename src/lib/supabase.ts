import type {
  SupabaseConfig,
  FinancialTransaction,
  Wallet,
  Category,
  DebtItem,
  Household,
  AppState
} from '../types';

interface RawSupabaseTx {
  id: string;
  household_id: string;
  no?: number;
  type: FinancialTransaction['type'];
  amount: number | string;
  fee?: number | string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
  category_id?: string;
  category_name?: string;
  category_type?: 'income' | 'expense';
  label?: string;
  description?: string;
  notes?: string;
  image_url?: string;
  effective_at: string;
  date_str?: string;
  day?: string;
  time?: string;
  source_asset?: string;
  source_asset_type?: string;
  destination_asset?: string;
  added_by: string;
  auto_income?: boolean;
  from_savings?: boolean;
  from_investment?: boolean;
  status: 'POSTED' | 'VOIDED';
  created_at: string;
  updated_at: string;
}

interface RawSupabaseWallet {
  id: string;
  household_id: string;
  name: string;
  type: Wallet['type'];
  institution_name?: string;
  currency?: 'IDR';
  balance?: number | string;
  color?: string;
  icon?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

interface RawSupabaseCategory {
  id: string;
  household_id: string;
  name: string;
  type: Category['type'];
  icon?: string;
  color?: string;
  is_archived?: boolean;
}

interface RawSupabaseDebt {
  id: string;
  household_id: string;
  type: 'debt' | 'receivable';
  person_or_entity: string;
  amount: number | string;
  remaining_amount: number | string;
  monthly_installment?: number | string;
  due_day?: number;
  due_date?: string;
  notes?: string;
  is_settled?: boolean;
  is_paid_this_month?: boolean;
  last_paid_month?: string;
  created_at: string;
}

interface RawSupabaseHousehold {
  id: string;
  name: string;
  base_currency?: 'IDR';
  created_by_id?: string;
  invite_code?: string;
  created_at: string;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) as string) || 'https://gnjrysgmiqapbjroishz.supabase.co',
  anonKey: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) as string) || 'sb_publishable_3vfImmTVWfPlk9YsPQ64Mg_dAWg0jqT',
  secretKey: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SECRET_KEY) as string) || '',
  bucket: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_BUCKET) as string) || 'receipts'
};

const getHeaders = (config: SupabaseConfig) => {
  const key = config.secretKey && config.secretKey.trim() ? config.secretKey : config.anonKey;
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates'
  };
};

/**
 * Test real connection to Supabase REST API
 */
export const testSupabaseConnection = async (
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; latencyMs: number; error?: string; message?: string }> => {
  if (!config.url || !config.anonKey) {
    return { success: false, latencyMs: 0, error: 'URL dan Anon Key Supabase wajib diisi.' };
  }

  const startTime = performance.now();
  const cleanUrl = config.url.replace(/\/+$/, '');

  try {
    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`
      }
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok || res.status === 200 || res.status === 404) {
      return {
        success: true,
        latencyMs,
        message: `Terhubung langsung ke Supabase REST API (${latencyMs}ms)`
      };
    }

    const errBody = await res.text().catch(() => '');
    return {
      success: false,
      latencyMs,
      error: `Status HTTP ${res.status}: ${errBody.slice(0, 150) || res.statusText}`
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : 'Koneksi gagal';
    return {
      success: false,
      latencyMs,
      error: `Tidak dapat menjangkau server Supabase: ${msg}`
    };
  }
};

/**
 * Uploads a receipt photo to Supabase Storage with resilient local Base64 fallback.
 */
export const uploadReceiptPhoto = async (
  fileOrBase64: File | string,
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ url: string; isRemote: boolean; error?: string }> => {
  let base64Url = '';
  let fileBlob: Blob | null = null;
  let fileExt = 'jpg';

  if (typeof fileOrBase64 === 'string') {
    base64Url = fileOrBase64;
  } else {
    fileBlob = fileOrBase64;
    fileExt = fileOrBase64.name.split('.').pop() || 'jpg';
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBase64);
    base64Url = await promise;
  }

  if (config.url && config.anonKey) {
    try {
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const bucket = config.bucket || 'receipts';
      const cleanUrl = config.url.replace(/\/+$/, '');
      const uploadEndpoint = `${cleanUrl}/storage/v1/object/${bucket}/${fileName}`;

      let bodyData: Blob;
      if (fileBlob) {
        bodyData = fileBlob;
      } else {
        const res = await fetch(base64Url);
        bodyData = await res.blob();
      }

      const uploadRes = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': bodyData.type || 'image/jpeg',
          'x-upsert': 'true'
        },
        body: bodyData
      });

      if (uploadRes.ok) {
        const publicUrl = `${cleanUrl}/storage/v1/object/public/${bucket}/${fileName}`;
        return { url: publicUrl, isRemote: true };
      }
    } catch (err: unknown) {
      console.warn('Supabase storage upload error, using local resilient storage:', err);
    }
  }

  return { url: base64Url, isRemote: false };
};

/**
 * Sync transaction record to Supabase database table via PostgREST API
 */
export const syncTransactionToSupabase = async (
  tx: FinancialTransaction,
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; error?: string }> => {
  if (!config.url || !config.anonKey) {
    return { success: false, error: 'Supabase URL atau Anon Key belum dikonfigurasi' };
  }

  try {
    const cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/transactions`, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        id: tx.id,
        household_id: tx.householdId,
        no: tx.no || null,
        type: tx.type,
        amount: Math.round(tx.amount),
        fee: tx.fee ? Math.round(tx.fee) : 0,
        source_wallet_id: tx.sourceWalletId || null,
        destination_wallet_id: tx.destinationWalletId || null,
        category_id: tx.categoryId || null,
        category_name: tx.categoryName || null,
        category_type: tx.categoryType || null,
        label: tx.label || null,
        description: tx.description || null,
        notes: tx.notes || null,
        image_url: tx.imageUrl || null,
        effective_at: tx.effectiveAt,
        date_str: tx.dateStr || null,
        day: tx.day || null,
        time: tx.time || null,
        source_asset: tx.sourceAsset || null,
        source_asset_type: tx.sourceAssetType || null,
        destination_asset: tx.destinationAsset || null,
        added_by: tx.addedBy,
        auto_income: tx.autoIncome || false,
        from_savings: tx.fromSavings || false,
        from_investment: tx.fromInvestment || false,
        status: tx.status || 'POSTED',
        created_at: tx.createdAt,
        updated_at: tx.updatedAt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Supabase status ${res.status}: ${errText.slice(0, 100)}` };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    return { success: false, error: msg };
  }
};

/**
 * Delete transaction from Supabase
 */
export const deleteTransactionFromSupabase = async (
  txId: string,
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; error?: string }> => {
  if (!config.url || !config.anonKey) return { success: false, error: 'Config missing' };
  try {
    const cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/transactions?id=eq.${encodeURIComponent(txId)}`, {
      method: 'DELETE',
      headers: getHeaders(config)
    });
    return { success: res.ok };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete error' };
  }
};

/**
 * Sync Debt item to Supabase
 */
export const syncDebtToSupabase = async (
  debt: DebtItem,
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; error?: string }> => {
  if (!config.url || !config.anonKey) return { success: false, error: 'Config missing' };
  try {
    const cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/debts`, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify({
        id: debt.id,
        household_id: debt.householdId,
        type: debt.type,
        person_or_entity: debt.personOrEntity,
        amount: Math.round(debt.amount),
        remaining_amount: Math.round(debt.remainingAmount),
        monthly_installment: debt.monthlyInstallment ? Math.round(debt.monthlyInstallment) : 0,
        due_day: debt.dueDay || null,
        due_date: debt.dueDate || null,
        notes: debt.notes || null,
        is_settled: debt.isSettled,
        is_paid_this_month: debt.isPaidThisMonth || false,
        last_paid_month: debt.lastPaidMonth || null,
        created_at: debt.createdAt
      })
    });
    return { success: res.ok };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Debt sync error' };
  }
};

/**
 * Delete debt item from Supabase
 */
export const deleteDebtFromSupabase = async (
  debtId: string,
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; error?: string }> => {
  if (!config.url || !config.anonKey) return { success: false, error: 'Config missing' };
  try {
    const cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/debts?id=eq.${encodeURIComponent(debtId)}`, {
      method: 'DELETE',
      headers: getHeaders(config)
    });
    return { success: res.ok };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete error' };
  }
};

/**
 * Push entire state (Households, Members, Wallets, Categories, Transactions, Ledgers, Debts) to Supabase
 */
export const pushAllDataToSupabase = async (
  state: AppState,
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG
): Promise<{ success: boolean; count: number; error?: string; message: string }> => {
  if (!config.url || !config.anonKey) {
    return { success: false, count: 0, error: 'URL dan Anon Key Supabase belum dikonfigurasi.', message: 'Konfigurasi belum lengkap.' };
  }

  const cleanUrl = config.url.replace(/\/+$/, '');
  const headers = getHeaders(config);

  try {
    // 1. Households
    if (state.households?.length) {
      await fetch(`${cleanUrl}/rest/v1/households`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.households.map(h => ({
            id: h.id,
            name: h.name,
            base_currency: h.baseCurrency || 'IDR',
            created_by_id: h.createdById || null,
            invite_code: h.inviteCode || null,
            created_at: h.createdAt || new Date().toISOString()
          }))
        )
      });
    }

    // 2. Members
    if (state.members?.length) {
      await fetch(`${cleanUrl}/rest/v1/household_members`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.members.map(m => ({
            id: m.id,
            household_id: m.householdId,
            user_id: m.userId,
            display_name: m.displayName,
            role: m.role || 'MEMBER',
            joined_at: m.joinedAt || new Date().toISOString()
          }))
        )
      });
    }

    // 3. Wallets
    if (state.wallets?.length) {
      await fetch(`${cleanUrl}/rest/v1/wallets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.wallets.map(w => ({
            id: w.id,
            household_id: w.householdId,
            name: w.name,
            type: w.type,
            institution_name: w.institutionName || null,
            currency: w.currency || 'IDR',
            balance: Math.round(w.balance || 0),
            color: w.color || null,
            icon: w.icon || null,
            is_archived: w.isArchived || false,
            created_at: w.createdAt || new Date().toISOString(),
            updated_at: w.updatedAt || new Date().toISOString()
          }))
        )
      });
    }

    // 4. Categories
    if (state.categories?.length) {
      await fetch(`${cleanUrl}/rest/v1/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.categories.map(c => ({
            id: c.id,
            household_id: c.householdId,
            name: c.name,
            type: c.type,
            icon: c.icon || null,
            color: c.color || null,
            is_archived: c.isArchived || false
          }))
        )
      });
    }

    // 5. Transactions
    if (state.transactions?.length) {
      await fetch(`${cleanUrl}/rest/v1/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.transactions.map(tx => ({
            id: tx.id,
            household_id: tx.householdId,
            no: tx.no || null,
            type: tx.type,
            amount: Math.round(tx.amount),
            fee: tx.fee ? Math.round(tx.fee) : 0,
            source_wallet_id: tx.sourceWalletId || null,
            destination_wallet_id: tx.destinationWalletId || null,
            category_id: tx.categoryId || null,
            category_name: tx.categoryName || null,
            category_type: tx.categoryType || null,
            label: tx.label || null,
            description: tx.description || null,
            notes: tx.notes || null,
            image_url: tx.imageUrl || null,
            effective_at: tx.effectiveAt,
            date_str: tx.dateStr || null,
            day: tx.day || null,
            time: tx.time || null,
            source_asset: tx.sourceAsset || null,
            source_asset_type: tx.sourceAssetType || null,
            destination_asset: tx.destinationAsset || null,
            added_by: tx.addedBy,
            auto_income: tx.autoIncome || false,
            from_savings: tx.fromSavings || false,
            from_investment: tx.fromInvestment || false,
            status: tx.status || 'POSTED',
            created_at: tx.createdAt,
            updated_at: tx.updatedAt
          }))
        )
      });
    }

    // 6. Ledger entries
    if (state.ledgerEntries?.length) {
      await fetch(`${cleanUrl}/rest/v1/ledger_entries`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.ledgerEntries.map(le => ({
            id: le.id,
            household_id: le.householdId,
            transaction_id: le.transactionId,
            wallet_id: le.walletId,
            signed_amount: Math.round(le.signedAmount),
            entry_type: le.entryType,
            posted_at: le.postedAt,
            created_at: le.createdAt
          }))
        )
      });
    }

    // 7. Debts
    if (state.debts?.length) {
      await fetch(`${cleanUrl}/rest/v1/debts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          state.debts.map(d => ({
            id: d.id,
            household_id: d.householdId,
            type: d.type,
            person_or_entity: d.personOrEntity,
            amount: Math.round(d.amount),
            remaining_amount: Math.round(d.remainingAmount),
            monthly_installment: d.monthlyInstallment ? Math.round(d.monthlyInstallment) : 0,
            due_day: d.dueDay || null,
            due_date: d.dueDate || null,
            notes: d.notes || null,
            is_settled: d.isSettled,
            is_paid_this_month: d.isPaidThisMonth || false,
            last_paid_month: d.lastPaidMonth || null,
            created_at: d.createdAt
          }))
        )
      });
    }

    const totalCount =
      (state.transactions?.length || 0) +
      (state.wallets?.length || 0) +
      (state.debts?.length || 0);

    return {
      success: true,
      count: totalCount,
      message: `Berhasil migrasi ${totalCount} data ke Supabase Cloud!`
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Push failed';
    return {
      success: false,
      count: 0,
      error: msg,
      message: `Gagal migrasi ke Supabase: ${msg}`
    };
  }
};

/**
 * Pull data from Supabase for active household
 */
export const pullAllDataFromSupabase = async (
  config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG,
  householdId?: string
): Promise<{ success: boolean; data?: Partial<AppState>; error?: string }> => {
  if (!config.url || !config.anonKey) {
    return { success: false, error: 'Config missing' };
  }

  const cleanUrl = config.url.replace(/\/+$/, '');
  const headers = getHeaders(config);

  try {
    const filterQuery = householdId ? `?household_id=eq.${encodeURIComponent(householdId)}` : '';

    const [txRes, walletsRes, catRes, debtsRes, houseRes] = await Promise.all([
      fetch(`${cleanUrl}/rest/v1/transactions${filterQuery}&order=effective_at.desc`, { headers }),
      fetch(`${cleanUrl}/rest/v1/wallets${filterQuery}`, { headers }),
      fetch(`${cleanUrl}/rest/v1/categories${filterQuery}`, { headers }),
      fetch(`${cleanUrl}/rest/v1/debts${filterQuery}`, { headers }),
      fetch(`${cleanUrl}/rest/v1/households`, { headers })
    ]);

    if (!txRes.ok && !walletsRes.ok) {
      return { success: false, error: 'Gagal mengambil data dari Supabase' };
    }

    const rawTxs = txRes.ok ? (await txRes.json() as RawSupabaseTx[]) : [];
    const rawWallets = walletsRes.ok ? (await walletsRes.json() as RawSupabaseWallet[]) : [];
    const rawCats = catRes.ok ? (await catRes.json() as RawSupabaseCategory[]) : [];
    const rawDebts = debtsRes.ok ? (await debtsRes.json() as RawSupabaseDebt[]) : [];
    const rawHouses = houseRes.ok ? (await houseRes.json() as RawSupabaseHousehold[]) : [];

    const transactions: FinancialTransaction[] = rawTxs.map((t: RawSupabaseTx) => ({
      id: t.id,
      householdId: t.household_id,
      no: t.no,
      type: t.type,
      amount: Number(t.amount),
      fee: Number(t.fee || 0),
      sourceWalletId: t.source_wallet_id,
      destinationWalletId: t.destination_wallet_id,
      categoryId: t.category_id,
      categoryName: t.category_name,
      categoryType: t.category_type,
      label: t.label,
      description: t.description,
      notes: t.notes,
      imageUrl: t.image_url,
      effectiveAt: t.effective_at,
      dateStr: t.date_str,
      day: t.day,
      time: t.time,
      sourceAsset: t.source_asset,
      sourceAssetType: t.source_asset_type,
      destinationAsset: t.destination_asset,
      addedBy: t.added_by,
      autoIncome: t.auto_income,
      fromSavings: t.from_savings,
      fromInvestment: t.from_investment,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    const wallets: Wallet[] = rawWallets.map((w: RawSupabaseWallet) => ({
      id: w.id,
      householdId: w.household_id,
      name: w.name,
      type: w.type,
      institutionName: w.institution_name,
      currency: w.currency || 'IDR',
      balance: Number(w.balance || 0),
      color: w.color,
      icon: w.icon,
      isArchived: Boolean(w.is_archived),
      createdAt: w.created_at,
      updatedAt: w.updated_at
    }));

    const categories: Category[] = rawCats.map((c: RawSupabaseCategory) => ({
      id: c.id,
      householdId: c.household_id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isArchived: Boolean(c.is_archived)
    }));

    const debts: DebtItem[] = rawDebts.map((d: RawSupabaseDebt) => ({
      id: d.id,
      householdId: d.household_id,
      type: d.type,
      personOrEntity: d.person_or_entity,
      amount: Number(d.amount),
      remainingAmount: Number(d.remaining_amount),
      monthlyInstallment: Number(d.monthly_installment || 0),
      dueDay: d.due_day,
      dueDate: d.due_date,
      notes: d.notes,
      isSettled: Boolean(d.is_settled),
      isPaidThisMonth: Boolean(d.is_paid_this_month),
      lastPaidMonth: d.last_paid_month,
      createdAt: d.created_at
    }));

    const households: Household[] = rawHouses.map((h: RawSupabaseHousehold) => ({
      id: h.id,
      name: h.name,
      baseCurrency: h.base_currency || 'IDR',
      createdById: h.created_by_id || '',
      inviteCode: h.invite_code,
      createdAt: h.created_at
    }));

    return {
      success: true,
      data: {
        transactions,
        wallets,
        categories,
        debts,
        ...(households.length > 0 ? { households } : {})
      }
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Pull failed'
    };
  }
};
