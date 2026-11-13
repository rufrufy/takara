import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { ViteDevServer } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const AI_URL = (env.AI_API_URL || env.VITE_AI_API_URL || 'https://9r.bkpp.web.id/v1').trim().replace(/\/+$/, '');
  const AI_KEY = (env.AI_API_KEY || env.VITE_AI_API_KEY || 'sk-915bde2d5d0f619a-u6ajkz-0330dedf').trim();
  const AI_MODEL = (env.AI_MODEL || env.VITE_AI_MODEL || 'ag/gemini-3.8-flash').trim();

  const normalizeEndpoint = (url: string): string => {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean.endsWith('/chat/completions')) return clean;
    if (clean.endsWith('/v1')) return `${clean}/chat/completions`;
    if (clean.includes('googleapis.com')) return clean;
    return `${clean}/v1/chat/completions`;
  };

  const aiDevServerPlugin = () => ({
    name: 'ai-dev-server-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-url');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // 1. Endpoint /api/ai/test
        if (url.startsWith('/api/ai/test')) {
          const startTime = Date.now();
          const target = normalizeEndpoint(AI_URL);

          try {
            const upstream = await fetch(target, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_KEY}`
              },
              body: JSON.stringify({
                model: AI_MODEL,
                messages: [{ role: 'user', content: 'Uji koneksi Takara. Jawab persis satu kata: OK' }],
                stream: false,
                max_tokens: 15
              })
            });

            const latencyMs = Date.now() - startTime;
            if (!upstream.ok) {
              const errBody = await upstream.text();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: `HTTP ${upstream.status}: ${errBody.slice(0, 300)}`,
                latencyMs,
                model: AI_MODEL
              }));
              return;
            }

            const data = await upstream.json() as any;
            const reply = data?.choices?.[0]?.message?.content || 'OK';

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              provider: 'Custom Proxy (.env)',
              model: AI_MODEL,
              latencyMs,
              reply: String(reply).trim()
            }));
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Network error';
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: msg, latencyMs: Date.now() - startTime }));
          }
          return;
        }

        // 2. Endpoint /api/ai/scan
        if (url.startsWith('/api/ai/scan') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(bodyStr || '{}');
              const imageBase64 = parsed.imageBase64 || '';
              if (!imageBase64) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Gambar struk wajib disertakan' }));
                return;
              }

              const target = normalizeEndpoint(AI_URL);
              const categories = parsed.categories?.join(', ') || 'Makanan & Minuman, Belanja Harian';
              const promptText = `Analisa foto struk belanja ini. Berikan jawaban HANYA format JSON murni:
{
  "amount": <angka total akhir yang dibayar, contoh 45000>,
  "description": "<nama toko / barang utama, contoh: Indomaret>",
  "categoryName": "<pilih paling cocok dari: ${categories}>",
  "date": "<tanggal transaksi YYYY-MM-DD>",
  "type": "expense"
}`;

              const upstream = await fetch(target, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${AI_KEY}`
                },
                body: JSON.stringify({
                  model: AI_MODEL,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        { type: 'text', text: promptText },
                        { type: 'image_url', image_url: { url: imageBase64 } }
                      ]
                    }
                  ],
                  stream: false,
                  max_tokens: 400,
                  temperature: 0.1
                })
              });

              if (!upstream.ok) {
                const errText = await upstream.text();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: `Upstream error HTTP ${upstream.status}: ${errText.slice(0, 300)}` }));
                return;
              }

              const resData = await upstream.json() as any;
              const textContent = resData?.choices?.[0]?.message?.content || '';
              const jsonMatch = textContent.match(/\{[\s\S]*\}/);
              if (!jsonMatch) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'AI tidak menghasilkan JSON valid' }));
                return;
              }

              const jsonRes = JSON.parse(jsonMatch[0]);
              const rawAmount = typeof jsonRes.amount === 'number'
                ? jsonRes.amount
                : parseInt(String(jsonRes.amount || '').replace(/[^0-9]/g, ''), 10) || 0;

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                data: {
                  amount: rawAmount,
                  description: String(jsonRes.description || 'Belanja').trim(),
                  categoryName: jsonRes.categoryName ? String(jsonRes.categoryName).trim() : undefined,
                  date: jsonRes.date ? String(jsonRes.date).trim() : new Date().toISOString().split('T')[0],
                  type: 'expense'
                }
              }));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Scan error';
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: msg }));
            }
          });
          return;
        }

        // 3. Endpoint /api/ai-proxy
        if (url.startsWith('/api/ai-proxy')) {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const targetHeader = req.headers['x-target-url'] as string | undefined;
              const target = targetHeader ? normalizeEndpoint(targetHeader) : normalizeEndpoint(AI_URL);
              const authHeader = (req.headers['authorization'] as string) || `Bearer ${AI_KEY}`;

              let modifiedBody = bodyStr;
              try {
                const parsed = JSON.parse(bodyStr);
                if (parsed && typeof parsed === 'object') {
                  parsed.stream = false;
                  modifiedBody = JSON.stringify(parsed);
                }
              } catch {}

              const upstream = await fetch(target, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': authHeader
                },
                body: modifiedBody
              });

              const resText = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(resText);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Proxy error';
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: msg }));
            }
          });
          return;
        }

        // 4. Endpoint /api/users
        if (url.startsWith('/api/users')) {
          const dataDir = resolve(process.cwd(), 'data');
          const regFile = resolve(dataDir, 'registered_users.json');
          if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

          if (req.method === 'GET') {
            if (existsSync(regFile)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(readFileSync(regFile, 'utf-8'));
              return;
            }
            const defaultUsers = [
              {
                id: 'user-maruf',
                username: 'maruf',
                displayName: 'Maruf H',
                pinHash: '12345',
                role: 'OWNER',
                createdAt: '2026-11-13T00:00:00.000Z'
              }
            ];
            writeFileSync(regFile, JSON.stringify(defaultUsers, null, 2), 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(defaultUsers));
            return;
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', () => {
              try {
                writeFileSync(regFile, bodyStr, 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Write error';
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: msg }));
              }
            });
            return;
          }
        }

        // 5. Endpoint /api/user-data/:username
        if (url.startsWith('/api/user-data/')) {
          const username = url.replace('/api/user-data/', '').split('?')[0]?.trim().toLowerCase();
          const usersDir = resolve(process.cwd(), 'data', 'users');
          if (!existsSync(usersDir)) mkdirSync(usersDir, { recursive: true });
          const userFile = resolve(usersDir, `${username}.json`);

          if (req.method === 'GET') {
            if (existsSync(userFile)) {
              try {
                const raw = readFileSync(userFile, 'utf-8');
                const parsed: unknown = JSON.parse(raw);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: parsed }));
                return;
              } catch {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, notFound: true }));
                return;
              }
            }
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, notFound: true }));
            return;
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', () => {
              try {
                JSON.parse(bodyStr);
                writeFileSync(userFile, bodyStr, 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Write error';
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: msg }));
              }
            });
            return;
          }
        }

        next();
      });
    }
  });

  return {
    plugins: [
      react(),
      tailwindcss(),
      aiDevServerPlugin(),
    ],
    server: {
      port: 3001,
      host: true,
    },
    preview: {
      port: 3001,
      host: true,
    },
  };
});
