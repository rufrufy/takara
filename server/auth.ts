import { createClient } from '@supabase/supabase-js';

type Env = Record<string, string | undefined>;
const profiles = 'id,username,display_name,role,avatar_url,created_at,auth_user_id';
const householdCols = 'id,name,base_currency,created_by_id,invite_code,created_at';
const memberCols = 'id,household_id,user_id,display_name,role,joined_at';
const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;

const DEFAULT_HOUSEHOLD_CATEGORIES = [
  { slug: 'makan-minum', name: 'Makanan & Minuman', type: 'expense', icon: 'Utensils', color: '#FFD166' },
  { slug: 'belanja-harian', name: 'Belanja Harian', type: 'expense', icon: 'ShoppingCart', color: '#FF6B6B' },
  { slug: 'transportasi', name: 'Transportasi', type: 'expense', icon: 'Car', color: '#38BDF8' },
  { slug: 'tagihan-utilitas', name: 'Tagihan & Utilitas', type: 'expense', icon: 'Zap', color: '#FDBA74' },
  { slug: 'kesehatan', name: 'Kesehatan & Medis', type: 'expense', icon: 'HeartPulse', color: '#FECDD6' },
  { slug: 'hiburan', name: 'Hiburan & Liburan', type: 'expense', icon: 'Tv', color: '#C4B5FD' },
  { slug: 'pendidikan', name: 'Pendidikan', type: 'expense', icon: 'GraduationCap', color: '#A5F3FC' },
  { slug: 'sosial-sedekah', name: 'Amal & Sedekah', type: 'expense', icon: 'Gift', color: '#06D6A0' },
  { slug: 'rumah-tangga', name: 'Keperluan Rumah Tangga', type: 'expense', icon: 'Home', color: '#BEF264' },
  { slug: 'pengeluaran-lain', name: 'Pengeluaran Lainnya', type: 'expense', icon: 'Tag', color: '#E2E8F0' },
  { slug: 'gaji-utama', name: 'Gaji Pokok', type: 'income', icon: 'Briefcase', color: '#06D6A0' },
  { slug: 'bonus-thr', name: 'Bonus & THR', type: 'income', icon: 'Award', color: '#FFD166' },
  { slug: 'usaha-bisnis', name: 'Usaha & Bisnis', type: 'income', icon: 'TrendingUp', color: '#38BDF8' },
  { slug: 'investasi-dividen', name: 'Investasi & Dividen', type: 'income', icon: 'Coins', color: '#C4B5FD' },
  { slug: 'pemasukan-lain', name: 'Pemasukan Lainnya', type: 'income', icon: 'Wallet', color: '#BEF264' },
  { slug: 'transfer-antar-akun', name: 'Transfer Antar Dompet', type: 'transfer', icon: 'ArrowLeftRight', color: '#BAE6FD' }
] as const;

async function seedDefaultCategoriesForHousehold(admin: any, householdId: string) {
  if (!householdId) return;
  const existingRes = await admin
    .from('categories')
    .select('name,type')
    .eq('household_id', householdId);
  if (existingRes.error) throw existingRes.error;

  const existingKeys = new Set(
    (existingRes.data || []).map(
      (c: { type?: string; name?: string }) =>
        `${String(c.type || '').trim().toLowerCase()}:${String(c.name || '').trim().toLowerCase()}`
    )
  );

  const missingRows = DEFAULT_HOUSEHOLD_CATEGORIES.filter(
    (item) => !existingKeys.has(`${item.type}:${item.name.toLowerCase()}`)
  ).map((item) => ({
    id: `cat-${item.slug}-${householdId}`,
    household_id: householdId,
    name: item.name,
    type: item.type,
    icon: item.icon,
    color: item.color,
    is_archived: false
  }));

  if (missingRows.length > 0) {
    const inserted = await admin.from('categories').upsert(missingRows, {
      onConflict: 'id',
      ignoreDuplicates: true
    });
    if (inserted.error) throw inserted.error;
  }
}

const safe = (r: any) => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  pinHash: '',
  role: r.role,
  avatarUrl: r.avatar_url || undefined,
  createdAt: r.created_at
});

const safeHousehold = (h: any) => ({
  id: h.id,
  name: h.name,
  baseCurrency: h.base_currency || 'IDR',
  createdById: h.created_by_id || '',
  inviteCode: h.invite_code || undefined,
  createdAt: h.created_at
});

const safeMember = (m: any) => ({
  id: m.id,
  householdId: m.household_id,
  userId: m.user_id,
  displayName: m.display_name,
  role: m.role,
  joinedAt: m.joined_at
});

const attempts = new Map<string, { count: number; until: number }>();
const isSuperAdminUsername = (u: string) => u.trim().toLowerCase() === 'adminmaruf99';
const getRequiredPinLength = (u: string) => (isSuperAdminUsername(u) ? 8 : 5);
const isValidPinForUser = (u: string, pin: string) =>
  isSuperAdminUsername(u) ? /^\d{8}$/.test(String(pin || '')) : /^\d{5}$/.test(String(pin || ''));

function extractProxyProto(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto === 'http' || forwardedProto === 'https') return forwardedProto;
  const cfVisitor = request.headers.get('cf-visitor');
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor) as { scheme?: string };
      const scheme = parsed?.scheme?.trim().toLowerCase();
      if (scheme === 'http' || scheme === 'https') return scheme;
    } catch {}
  }
  return '';
}

function isAllowedOrigin(request: Request, url: URL, env: Env): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  if (originUrl.origin === url.origin) return true;

  const originHost = originUrl.host.toLowerCase();
  const originHostname = originUrl.hostname.toLowerCase();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase() || '';
  const hostHeader = request.headers.get('host')?.split(',')[0]?.trim().toLowerCase() || '';
  const candidateHosts = new Set([forwardedHost, hostHeader, url.host.toLowerCase()].filter(Boolean));
  const proxyProto = extractProxyProto(request);

  if (proxyProto) {
    for (const h of candidateHosts) {
      if (originUrl.origin === `${proxyProto}://${h}`) return true;
    }
  }

  // Handle TLS-terminating reverse proxies (e.g. Cloudflare / Nginx -> http upstream)
  if ((originUrl.protocol === 'http:' || originUrl.protocol === 'https:') && candidateHosts.has(originHost)) {
    return true;
  }

  // Allow bkpp.dev and all *.bkpp.dev subdomains over HTTPS
  if (originUrl.protocol === 'https:' && (originHostname === 'bkpp.dev' || originHostname.endsWith('.bkpp.dev'))) {
    return true;
  }

  const configured = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const entry of configured) {
    if (originUrl.origin.toLowerCase() === entry || originHostname === entry || originHost === entry) {
      return true;
    }
  }

  return false;
}

export async function handleAuthRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/auth/')) return null;

  const origin = request.headers.get('origin');
  const originAllowed = isAllowedOrigin(request, url, env);
  const corsHeaders: Record<string, string> =
    origin && originAllowed
      ? {
          Vary: 'Origin',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      : { Vary: 'Origin' };

  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders }
    });

  if (request.method === 'OPTIONS') {
    if (!originAllowed) return json({ success: false, error: 'Origin tidak diizinkan.' }, 403);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') return json({ success: false, error: 'Metode tidak diizinkan.' }, 405);
  if (!originAllowed) return json({ success: false, error: 'Origin tidak diizinkan.' }, 403);

  const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key || !pub) return json({ success: false, error: 'Konfigurasi akun server belum lengkap.' }, 503);

  const admin = createClient(base, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = createClient(base, pub, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    if (Number(request.headers.get('content-length') || 0) > 8192) {
      return json({ success: false, error: 'Permintaan terlalu besar.' }, 413);
    }

    const body = (await request.json().catch(() => ({}))) as any;
    const action = url.pathname.slice('/api/auth/'.length);
    const bearer = request.headers.get('authorization')?.replace(/^Bearer /, '');
    let actor: any = null;

    if (bearer) {
      const verified = await admin.auth.getUser(bearer);
      if (verified.error) return json({ success: false, error: 'Sesi berakhir. Silakan masuk kembali.' }, 401);
      const p = await admin.from('app_users').select(profiles).eq('auth_user_id', verified.data.user.id).single();
      actor = p.data;
    }

    const isAdmin = actor?.role === 'ADMIN';
    if (action !== 'register' && !actor) return json({ success: false, error: 'Silakan masuk terlebih dahulu.' }, 401);
    if (action.startsWith('admin-') && !isAdmin) return json({ success: false, error: 'Akses admin diperlukan.' }, 403);

    if (action === 'change-pin') {
      const reqLen = getRequiredPinLength(actor.username || '');
      if (!isValidPinForUser(actor.username || '', body.newPin) || !isValidPinForUser(actor.username || '', body.currentPin)) {
        return json({ success: false, error: `PIN harus ${reqLen} digit.` }, 400);
      }
      const verified = await auth.auth.signInWithPassword({
        email: actor.username + '@takara.invalid',
        password: 'Takara::' + body.currentPin
      });
      if (verified.error) return json({ success: false, error: 'PIN lama tidak sesuai.' }, 400);
      const changed = await admin.auth.admin.updateUserById(actor.auth_user_id, { password: 'Takara::' + body.newPin });
      if (changed.error) throw changed.error;
      const next = await auth.auth.signInWithPassword({
        email: actor.username + '@takara.invalid',
        password: 'Takara::' + body.newPin
      });
      if (next.error) throw next.error;
      return json({ success: true, session: next.data.session });
    }

    if (action === 'admin-list') {
      const [uRes, hRes, mRes] = await Promise.all([
        admin.from('app_users').select(profiles).order('created_at', { ascending: false }),
        admin.from('households').select(householdCols).order('created_at', { ascending: false }),
        admin.from('household_members').select(memberCols).order('joined_at', { ascending: false })
      ]);
      if (uRes.error) throw uRes.error;
      if (hRes.error) throw hRes.error;
      if (mRes.error) throw mRes.error;
      return json({
        success: true,
        users: (uRes.data || []).map(safe),
        households: (hRes.data || []).map(safeHousehold),
        members: (mRes.data || []).map(safeMember)
      });
    }

    if (action === 'register' || action === 'admin-create' || action === 'invite') {
      const username = String(body.username || '').trim().toLowerCase();
      const displayName = String(body.displayName || '').trim();
      const pinValid = action === 'admin-create' ? isValidPinForUser(username, body.pin) : /^\d{5}$/.test(String(body.pin || ''));
      if (!/^[a-z0-9_-]{3,40}$/.test(username) || !pinValid || !displayName || displayName.length > 100) {
        return json({ success: false, error: 'Nama, username, atau PIN tidak valid.' }, 400);
      }
      if (action === 'register' && isSuperAdminUsername(username)) {
        return json({ success: false, error: 'Username tersebut tidak tersedia.' }, 400);
      }

      if (action === 'register') {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
        const now = Date.now();
        const entry = attempts.get(ip);
        if (entry && entry.until > now && entry.count >= 10) {
          return json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, 429);
        }
        attempts.set(ip, { count: entry && entry.until > now ? entry.count + 1 : 1, until: now + 3600000 });
      }

      const role =
        action === 'admin-create' && (validRoles as readonly string[]).includes(body.role)
          ? body.role
          : body.householdCode
          ? 'MEMBER'
          : 'OWNER';

      let household: any = null;
      if (action === 'invite') {
        const owner = await admin.from('households').select('id,created_by_id').eq('id', body.householdId).single();
        if (owner.error || (!isAdmin && owner.data.created_by_id !== actor.id)) {
          return json({ success: false, error: 'Hanya pemilik household dapat mengundang akun.' }, 403);
        }
        if (!['MEMBER', 'VIEWER'].includes(body.role || 'MEMBER')) {
          return json({ success: false, error: 'Peran anggota tidak valid.' }, 400);
        }
        household = owner.data;
      }

      if (body.householdCode) {
        const h = await admin
          .from('households')
          .select('id')
          .eq('invite_code', String(body.householdCode).trim().toUpperCase())
          .maybeSingle();
        household = h.data;
        if (!household) return json({ success: false, error: 'Kode household tidak ditemukan.' }, 400);
      }

      if (action === 'admin-create' && !household && body.householdId) {
        const hh = await admin
          .from('households')
          .select('id')
          .eq('id', String(body.householdId).trim())
          .maybeSingle();
        if (hh.error || !hh.data) {
          return json({ success: false, error: 'Household tujuan tidak ditemukan.' }, 400);
        }
        household = hh.data;
      }

      const id = 'user-' + crypto.randomUUID();
      const created = await admin.auth.admin.createUser({
        email: username + '@takara.invalid',
        password: 'Takara::' + body.pin,
        email_confirm: true,
        app_metadata: { legacy_user_id: id }
      });
      if (created.error) {
        return json({ success: false, error: 'Username sudah digunakan atau akun tidak dapat dibuat.' }, 400);
      }

      const profileRole = action === 'invite' ? body.role || 'MEMBER' : role;
      const saved = await admin.rpc('provision_auth_account', {
        p_auth_id: created.data.user.id,
        p_id: id,
        p_username: username,
        p_display: displayName,
        p_role: profileRole,
        p_household: household?.id || null
      });
      if (saved.error) {
        await admin.auth.admin.deleteUser(created.data.user.id);
        throw saved.error;
      }

      const row = saved.data;
      if (!household?.id && profileRole !== 'ADMIN') {
        const createdH = await admin
          .from('households')
          .select('id')
          .eq('created_by_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (createdH.data?.id) {
          await seedDefaultCategoriesForHousehold(admin, createdH.data.id);
        }
      }
      if (action === 'register') {
        const login = await auth.auth.signInWithPassword({
          email: username + '@takara.invalid',
          password: 'Takara::' + body.pin
        });
        if (login.error) throw login.error;
        return json({ success: true, user: safe(row), session: login.data.session });
      }
      return json({ success: true, user: safe(row) });
    }

    if (action === 'join-household') {
      const h = await admin
        .from('households')
        .select('*')
        .eq('invite_code', String(body.code || '').trim().toUpperCase())
        .maybeSingle();
      if (h.error || !h.data) return json({ success: false, error: 'Kode household tidak ditemukan.' }, 400);

      const existing = await admin
        .from('household_members')
        .select('id,role')
        .eq('household_id', h.data.id)
        .eq('user_id', actor.id)
        .maybeSingle();
      if (existing.error) throw existing.error;

      if (!existing.data) {
        const saved = await admin.from('household_members').upsert(
          {
            id: 'mem-' + actor.id + '-' + h.data.id,
            household_id: h.data.id,
            user_id: actor.id,
            display_name: actor.display_name,
            role: 'MEMBER',
            joined_at: new Date().toISOString()
          },
          { onConflict: 'household_id,user_id', ignoreDuplicates: true }
        );
        if (saved.error) throw saved.error;
      }
      return json({
        success: true,
        household: safeHousehold(h.data)
      });
    }

    if (action === 'admin-update') {
      const target = await admin.from('app_users').select(profiles).eq('id', body.userId).maybeSingle();
      if (target.error) throw target.error;
      if (!target.data) return json({ success: false, error: 'Pengguna tidak ditemukan.' }, 404);

      const changes: any = {};
      if (body.displayName !== undefined) {
        const dn = String(body.displayName || '').trim();
        if (!dn || dn.length > 100) return json({ success: false, error: 'Nama pengguna tidak valid.' }, 400);
        changes.display_name = dn;
      }
      if (body.username !== undefined) {
        const u = String(body.username || '').trim().toLowerCase();
        if (!/^[a-z0-9_-]{3,40}$/.test(u)) return json({ success: false, error: 'Username tidak valid.' }, 400);
        changes.username = u;
      }
      if (body.role !== undefined) {
        if (!(validRoles as readonly string[]).includes(body.role)) {
          return json({ success: false, error: 'Peran tidak valid.' }, 400);
        }
        changes.role = body.role;
      }

      const authChanges: any = {};
      const effectiveUsername = changes.username || target.data.username;
      if (body.pin5Digit) {
        const reqLen = getRequiredPinLength(effectiveUsername);
        if (!isValidPinForUser(effectiveUsername, body.pin5Digit)) {
          return json({ success: false, error: `PIN harus ${reqLen} digit.` }, 400);
        }
        authChanges.password = 'Takara::' + body.pin5Digit;
      }
      if (changes.username && changes.username !== target.data.username) {
        authChanges.email = changes.username + '@takara.invalid';
      }

      if (Object.keys(authChanges).length && target.data.auth_user_id) {
        const changed = await admin.auth.admin.updateUserById(target.data.auth_user_id, authChanges);
        if (changed.error) {
          const msg = changed.error.message || '';
          const status = (changed.error as any).status;
          if (status === 400 || status === 422 || /already|exists|email|duplicate/i.test(msg)) {
            return json({ success: false, error: 'Username sudah digunakan atau data auth tidak valid.' }, 400);
          }
          throw changed.error;
        }
      }

      let updatedRow = target.data;
      if (Object.keys(changes).length) {
        const saved = await admin.from('app_users').update(changes).eq('id', body.userId).select(profiles).single();
        if (saved.error) {
          if ((saved.error as any).code === '23505') {
            return json({ success: false, error: 'Username sudah digunakan.' }, 400);
          }
          throw saved.error;
        }
        updatedRow = saved.data;

        if (changes.display_name) {
          const memUp = await admin
            .from('household_members')
            .update({ display_name: changes.display_name })
            .eq('user_id', body.userId);
          if (memUp.error) throw memUp.error;
        }
      }

      return json({ success: true, user: safe(updatedRow) });
    }

    if (action === 'admin-delete') {
      if (actor.id === body.userId) return json({ success: false, error: 'Akun aktif tidak dapat dihapus.' }, 400);
      const p = await admin.from('app_users').select(profiles).eq('id', body.userId).maybeSingle();
      if (p.error) throw p.error;
      if (!p.data) return json({ success: false, error: 'Pengguna tidak ditemukan.' }, 404);

      const memDel = await admin.from('household_members').delete().eq('user_id', body.userId);
      if (memDel.error) throw memDel.error;

      if (p.data.auth_user_id) {
        const deleted = await admin.auth.admin.deleteUser(p.data.auth_user_id);
        if (deleted.error) {
          const status = (deleted.error as any).status;
          const msg = deleted.error.message || '';
          if (status !== 404 && !/not found/i.test(msg)) throw deleted.error;
        }
      }

      const removed = await admin.from('app_users').delete().eq('id', body.userId);
      if (removed.error) throw removed.error;
      return json({ success: true });
    }

    if (action === 'admin-household-create') {
      const name = String(body.name || '').trim();
      if (!name || name.length > 100) {
        return json({ success: false, error: 'Nama household wajib diisi (maksimal 100 karakter).' }, 400);
      }
      const baseCurrency = String(body.baseCurrency || 'IDR').trim().toUpperCase().slice(0, 10) || 'IDR';

      let owner = actor;
      const explicitOwnerId = String(body.ownerUserId || '').trim();
      if (explicitOwnerId) {
        const o = await admin.from('app_users').select(profiles).eq('id', explicitOwnerId).maybeSingle();
        if (o.error) throw o.error;
        if (!o.data) return json({ success: false, error: 'Pemilik household tidak ditemukan.' }, 400);
        owner = o.data;
      }

      const householdId = 'hh-' + crypto.randomUUID();
      const inviteCode = 'TK-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
      const now = new Date().toISOString();

      const hSaved = await admin
        .from('households')
        .insert({
          id: householdId,
          name,
          base_currency: baseCurrency,
          created_by_id: owner.id,
          invite_code: inviteCode,
          created_at: now
        })
        .select(householdCols)
        .single();
      if (hSaved.error) throw hSaved.error;

      const wSaved = await admin.from('wallets').insert({
        id: 'wallet-' + householdId,
        household_id: householdId,
        name: 'Tunai',
        type: 'cash',
        currency: baseCurrency,
        balance: 0,
        created_at: now,
        updated_at: now
      });
      if (wSaved.error) throw wSaved.error;

      await seedDefaultCategoriesForHousehold(admin, householdId);

      if (explicitOwnerId || owner.role !== 'ADMIN') {
        const mSaved = await admin
          .from('household_members')
          .insert({
            id: 'mem-' + owner.id + '-' + householdId,
            household_id: householdId,
            user_id: owner.id,
            display_name: owner.display_name,
            role: 'OWNER',
            joined_at: now
          })
          .select(memberCols)
          .single();
        if (mSaved.error) throw mSaved.error;
        return json({
          success: true,
          household: safeHousehold(hSaved.data),
          member: safeMember(mSaved.data)
        });
      }

      return json({ success: true, household: safeHousehold(hSaved.data) });
    }

    if (action === 'admin-household-update') {
      const householdId = String(body.householdId || '').trim();
      if (!householdId) return json({ success: false, error: 'ID household wajib diisi.' }, 400);

      const changes: any = {};
      if (body.name !== undefined) {
        const n = String(body.name || '').trim();
        if (!n || n.length > 100) return json({ success: false, error: 'Nama household tidak valid.' }, 400);
        changes.name = n;
      }
      if (body.baseCurrency !== undefined) {
        const bc = String(body.baseCurrency || '').trim().toUpperCase().slice(0, 10);
        if (bc) changes.base_currency = bc;
      }
      if (body.regenerateInviteCode === true) {
        changes.invite_code = 'TK-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
      }

      if (!Object.keys(changes).length) {
        return json({ success: false, error: 'Tidak ada perubahan yang dikirim.' }, 400);
      }

      const saved = await admin
        .from('households')
        .update(changes)
        .eq('id', householdId)
        .select(householdCols)
        .maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data) return json({ success: false, error: 'Household tidak ditemukan.' }, 404);

      return json({ success: true, household: safeHousehold(saved.data) });
    }

    if (action === 'admin-household-delete') {
      const householdId = String(body.householdId || '').trim();
      if (!householdId) return json({ success: false, error: 'ID household wajib diisi.' }, 400);

      const removed = await admin.from('households').delete().eq('id', householdId).select('id');
      if (removed.error) throw removed.error;
      if (!removed.data?.length) return json({ success: false, error: 'Household tidak ditemukan.' }, 404);

      return json({ success: true });
    }

    if (action === 'admin-member-add') {
      const householdId = String(body.householdId || '').trim();
      if (!householdId) return json({ success: false, error: 'Household wajib dipilih.' }, 400);

      const role = String(body.role || 'MEMBER').trim();
      if (!(validRoles as readonly string[]).includes(role)) {
        return json({ success: false, error: 'Peran anggota tidak valid.' }, 400);
      }

      const targetUserId = String(body.userId || '').trim();
      const targetUsername = String(body.username || '').trim().toLowerCase();
      let uRes;
      if (targetUserId) {
        uRes = await admin.from('app_users').select(profiles).eq('id', targetUserId).maybeSingle();
      } else if (targetUsername) {
        uRes = await admin.from('app_users').select(profiles).eq('username', targetUsername).maybeSingle();
      } else {
        return json({ success: false, error: 'Pilih pengguna terdaftar terlebih dahulu.' }, 400);
      }
      if (uRes.error) throw uRes.error;
      if (!uRes.data) return json({ success: false, error: 'Pengguna belum terdaftar.' }, 400);

      const hh = await admin.from('households').select('id').eq('id', householdId).maybeSingle();
      if (hh.error) throw hh.error;
      if (!hh.data) return json({ success: false, error: 'Household tidak ditemukan.' }, 404);

      const existing = await admin
        .from('household_members')
        .select('id')
        .eq('household_id', householdId)
        .eq('user_id', uRes.data.id)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        return json({ success: false, error: 'Pengguna ini sudah terdaftar sebagai anggota di household tersebut.' }, 400);
      }

      const now = new Date().toISOString();
      const displayName = String(body.displayName || '').trim() || uRes.data.display_name;
      const inserted = await admin
        .from('household_members')
        .insert({
          id: 'mem-' + uRes.data.id + '-' + householdId,
          household_id: householdId,
          user_id: uRes.data.id,
          display_name: displayName,
          role,
          joined_at: now
        })
        .select(memberCols)
        .single();
      if (inserted.error) throw inserted.error;

      return json({ success: true, member: safeMember(inserted.data) });
    }

    if (action === 'admin-member-update') {
      const memberId = String(body.memberId || '').trim();
      if (!memberId) return json({ success: false, error: 'ID anggota wajib diisi.' }, 400);

      const changes: any = {};
      if (body.displayName !== undefined) {
        const dn = String(body.displayName || '').trim();
        if (!dn) return json({ success: false, error: 'Nama anggota tidak boleh kosong.' }, 400);
        changes.display_name = dn;
      }
      if (body.role !== undefined) {
        if (!(validRoles as readonly string[]).includes(body.role)) {
          return json({ success: false, error: 'Peran anggota tidak valid.' }, 400);
        }
        changes.role = body.role;
      }

      if (!Object.keys(changes).length) {
        return json({ success: false, error: 'Tidak ada perubahan anggota.' }, 400);
      }

      const updated = await admin
        .from('household_members')
        .update(changes)
        .eq('id', memberId)
        .select(memberCols)
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) return json({ success: false, error: 'Anggota tidak ditemukan.' }, 404);

      return json({ success: true, member: safeMember(updated.data) });
    }

    if (action === 'admin-member-remove') {
      const memberId = String(body.memberId || '').trim();
      if (!memberId) return json({ success: false, error: 'ID anggota wajib diisi.' }, 400);

      const removed = await admin.from('household_members').delete().eq('id', memberId).select('id');
      if (removed.error) throw removed.error;
      if (!removed.data?.length) return json({ success: false, error: 'Anggota tidak ditemukan.' }, 404);

      return json({ success: true });
    }

    return json({ success: false, error: 'Endpoint tidak ditemukan.' }, 404);
  } catch (error) {
    console.error('Account operation failed:', error instanceof Error ? error.message : 'Supabase error');
    return json({ success: false, error: 'Perubahan akun belum tersimpan. Silakan coba lagi.' }, 500);
  }
}
