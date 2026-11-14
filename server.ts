import { serve } from "bun";
import { resolve } from "path";
import { mkdirSync, existsSync } from "fs";

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = resolve(import.meta.dir, "dist");
const DATA_DIR = resolve(import.meta.dir, "data");
const USERS_DIR = resolve(DATA_DIR, "users");
const REG_USERS_FILE = resolve(DATA_DIR, "registered_users.json");

if (!existsSync(USERS_DIR)) {
  mkdirSync(USERS_DIR, { recursive: true });
}
// Kredensial AI dari .env (Server-side)
const SERVER_AI_URL = (process.env.AI_API_URL || process.env.VITE_AI_API_URL || "https://9r.bkpp.web.id/v1").trim().replace(/\/+$/, '');
const SERVER_AI_KEY = (process.env.AI_API_KEY || process.env.VITE_AI_API_KEY || "sk-915bde2d5d0f619a-u6ajkz-0330dedf").trim();
const SERVER_AI_MODEL = (process.env.AI_MODEL || process.env.VITE_AI_MODEL || "ag/gemini-3.8-flash-low").trim();

const normalizeEndpoint = (url: string): string => {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) return clean;
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`;
  if (clean.includes('googleapis.com')) return clean;
  return `${clean}/v1/chat/completions`;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-target-url"
};

interface AIChatChoice {
  message?: { content?: string };
}

interface AICandidate {
  content?: { parts?: Array<{ text?: string }> };
}

interface AIChatResponseBody {
  choices?: AIChatChoice[];
  candidates?: AICandidate[];
}

interface AIScanRequestBody {
  imageBase64?: string;
  categories?: string[];
  systemPrompt?: string;
}

const extractJsonFromText = (text: string): Record<string, unknown> | null => {
  try {
    const direct = JSON.parse(text);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }
  return null;
};

serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    // Handle Preflight CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 1. API: Uji Koneksi AI Asli Langsung dari Server (.env)
    if (pathname === "/api/ai/test") {
      const startTime = performance.now();
      const targetEndpoint = normalizeEndpoint(SERVER_AI_URL);

      try {
        const payload = {
          model: SERVER_AI_MODEL,
          messages: [{ role: "user", content: "Uji koneksi Takara. Jawab persis satu kata: OK" }],
          stream: false,
          max_tokens: 15
        };

        const res = await fetch(targetEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVER_AI_KEY}`
          },
          body: JSON.stringify(payload)
        });

        const latencyMs = Math.round(performance.now() - startTime);

        if (!res.ok) {
          const errBody = await res.text();
          return new Response(
            JSON.stringify({
              success: false,
              error: `HTTP ${res.status}: ${errBody.slice(0, 300)}`,
              latencyMs,
              model: SERVER_AI_MODEL,
              endpoint: targetEndpoint
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = (await res.json()) as AIChatResponseBody;
        const reply = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || "OK";

        return new Response(
          JSON.stringify({
            success: true,
            provider: "Custom Proxy (.env)",
            model: SERVER_AI_MODEL,
            latencyMs,
            reply: String(reply).trim()
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error";
        return new Response(
          JSON.stringify({
            success: false,
            error: msg,
            latencyMs: Math.round(performance.now() - startTime)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. API: Scan Foto Struk dengan AI Vision Menggunakan Kredensial .env
    if (pathname === "/api/ai/scan" && req.method === "POST") {
      try {
        const reqData = (await req.json()) as AIScanRequestBody;

        const imageBase64 = reqData.imageBase64 || "";
        if (!imageBase64) {
          return new Response(
            JSON.stringify({ success: false, error: "Data gambar struk wajib disertakan." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const targetEndpoint = normalizeEndpoint(SERVER_AI_URL);
        const categoriesList = reqData.categories && reqData.categories.length > 0
          ? reqData.categories.join(", ")
          : "Makanan & Minuman, Belanja Harian, Transportasi, Tagihan";

        const promptText = `Analisa foto struk belanja ini. Berikan jawaban HANYA format JSON murni:
{
  "amount": <angka total akhir yang dibayar, contoh 45000>,
  "description": "<nama toko / barang utama, contoh: Indomaret>",
  "categoryName": "<pilih paling cocok dari: ${categoriesList}>",
  "date": "<tanggal transaksi YYYY-MM-DD>",
  "type": "expense"
}`;

        const payload = {
          model: SERVER_AI_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: imageBase64 } }
              ]
            }
          ],
          stream: false,
          max_tokens: 400,
          temperature: 0.1
        };

        const res = await fetch(targetEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVER_AI_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          return new Response(
            JSON.stringify({ success: false, error: `Upstream AI error HTTP ${res.status}: ${errText.slice(0, 300)}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const rawText = await res.text();
        let textContent = "";
        try {
          const resData = JSON.parse(rawText) as AIChatResponseBody;
          textContent = resData.choices?.[0]?.message?.content || resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch {
          // Tangani format Server-Sent Events (SSE) data chunks
          if (rawText.includes("data:")) {
            for (const line of rawText.split("\n")) {
              const cleanLine = line.trim();
              if (cleanLine.startsWith("data:") && !cleanLine.includes("[DONE]")) {
                try {
                  const chunk = JSON.parse(cleanLine.replace(/^data:\s*/, ""));
                  textContent += chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || "";
                } catch {
                  // ignore
                }
              }
            }
          } else {
            textContent = rawText;
          }
        }

        const parsed = extractJsonFromText(textContent);
        if (!parsed) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `AI tidak menghasilkan format JSON valid. Respon: ${textContent.slice(0, 200)}`
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const rawAmount = typeof parsed.amount === "number"
          ? parsed.amount
          : parseInt(String(parsed.amount || "").replace(/[^0-9]/g, ""), 10) || 0;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              amount: rawAmount,
              description: String(parsed.description || "Belanja").trim(),
              categoryName: parsed.categoryName ? String(parsed.categoryName).trim() : undefined,
              date: parsed.date ? String(parsed.date).trim() : new Date().toISOString().split("T")[0],
              type: "expense"
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal memproses struk";
        return new Response(
          JSON.stringify({ success: false, error: msg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2b. Endpoint Analisis AI Pengeluaran Lengkap (/api/ai/analyze-expenses)
    if (pathname === "/api/ai/analyze-expenses" && req.method === "POST") {
      try {
        const reqData = (await req.json()) as {
          householdName?: string;
          income: number;
          expense: number;
          net: number;
          categories: Array<{ name: string; amount: number; percentage: number }>;
          topExpenses?: Array<{ description: string; amount: number; category: string }>;
        };

        const targetEndpoint = normalizeEndpoint(SERVER_AI_URL);
        const catSummary = (reqData.categories || [])
          .slice(0, 5)
          .map(c => `- ${c.name}: Rp ${c.amount.toLocaleString("id-ID")} (${c.percentage}%)`)
          .join("\n");

        const promptText = `Bertindaklah sebagai Perencana Keuangan Keluarga Independen (CFP) profesional. Berikan analisis mendalam dan rekomendasi finansial untuk rumah tangga "${reqData.householdName || 'Keluarga'}".
Data keuangan bulan berjalan:
- Total Pemasukan: Rp ${reqData.income.toLocaleString("id-ID")}
- Total Pengeluaran: Rp ${reqData.expense.toLocaleString("id-ID")}
- Arus Kas Bersih (Surplus/Defisit): Rp ${reqData.net.toLocaleString("id-ID")}
- Pos Pengeluaran Terbesar:
${catSummary || '- Belum ada pos dominan'}

Format jawaban HANYA JSON murni tanpa markdown, tanpa teks pembuka:
{
  "financialScore": <angka 1-100 skor kesehatan keuangan>,
  "healthStatus": "<Sangat Sehat | Cukup Sehat | Waspada Defisit | Bahaya Keuangan>",
  "savingsRate": "<persentase rasio tabungan, contoh: 25%>",
  "cashFlowEvaluation": "<paragraf ringkas evaluasi arus kas>",
  "spendingLeaks": ["<indikasi kebocoran pos 1>", "<indikasi kebocoran pos 2>"],
  "actionPlan": ["<langkah konkret 1>", "<langkah konkret 2>", "<langkah konkret 3>"],
  "monthlyBudgetTip": "<saran persentase alokasi 50/30/20 atau strategi praktis bulan depan>"
}`;

        const payload = {
          model: SERVER_AI_MODEL,
          messages: [{ role: "user", content: promptText }],
          stream: false,
          max_tokens: 600,
          temperature: 0.2
        };

        const res = await fetch(targetEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVER_AI_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          return new Response(
            JSON.stringify({ success: false, error: `Upstream error HTTP ${res.status}: ${errText.slice(0, 150)}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const rawText = await res.text();
        let textContent = "";
        try {
          const resData = JSON.parse(rawText) as AIChatResponseBody;
          textContent = resData.choices?.[0]?.message?.content || resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch {
          if (rawText.includes("data:")) {
            for (const line of rawText.split("\n")) {
              const cleanLine = line.trim();
              if (cleanLine.startsWith("data:") && !cleanLine.includes("[DONE]")) {
                try {
                  const chunk = JSON.parse(cleanLine.replace(/^data:\s*/, ""));
                  textContent += chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || "";
                } catch {
                  // ignore
                }
              }
            }
          } else {
            textContent = rawText;
          }
        }

        const parsed = extractJsonFromText(textContent);
        if (!parsed) {
          return new Response(
            JSON.stringify({ success: false, error: "Gagal memproses analisa AI.", raw: textContent.slice(0, 200) }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, analysis: parsed }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal analisa AI";
        return new Response(
          JSON.stringify({ success: false, error: msg }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Reverse Proxy Umum (/api/ai-proxy)
    if (pathname.startsWith("/api/ai-proxy")) {
      try {
        const targetHeader = req.headers.get("x-target-url");
        const targetUrl = targetHeader ? normalizeEndpoint(targetHeader) : normalizeEndpoint(SERVER_AI_URL);
        const authHeader = req.headers.get("Authorization") || `Bearer ${SERVER_AI_KEY}`;
        const rawBody = await req.text();

        // Pastikan stream: false jika body adalah JSON
        let modifiedBody = rawBody;
        try {
          const parsed = JSON.parse(rawBody);
          if (parsed && typeof parsed === "object") {
            (parsed as Record<string, unknown>).stream = false;
            modifiedBody = JSON.stringify(parsed);
          }
        } catch {}

        const upstreamRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader
          },
          body: modifiedBody
        });

        const resText = await upstreamRes.text();
        return new Response(resText, {
          status: upstreamRes.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Proxy error";
        return new Response(JSON.stringify({ error: msg }), {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
    }

    // 4. API: Sinkronisasi Pengguna Terdaftar (/api/users)
    if (pathname === "/api/users") {
      if (req.method === "GET") {
        try {
          const file = Bun.file(REG_USERS_FILE);
          if (await file.exists()) {
            const content = await file.text();
            return new Response(content, {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
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
          await Bun.write(REG_USERS_FILE, JSON.stringify(defaultUsers, null, 2));
          return new Response(JSON.stringify(defaultUsers), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      if (req.method === "POST") {
        try {
          const body = await req.text();
          await Bun.write(REG_USERS_FILE, body);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Gagal menyimpan daftar user";
          return new Response(JSON.stringify({ success: false, error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    // 5. API: Sinkronisasi Data Keuangan Pengguna (/api/user-data/:username)
    if (pathname.startsWith("/api/user-data/")) {
      const username = pathname.replace("/api/user-data/", "").trim().toLowerCase();
      const userFilePath = resolve(USERS_DIR, `${username}.json`);

      if (req.method === "GET") {
        const file = Bun.file(userFilePath);
        if (await file.exists()) {
          try {
            const content = await file.text();
            const parsedData: unknown = JSON.parse(content);
            return new Response(JSON.stringify({ success: true, data: parsedData }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } catch {
            return new Response(JSON.stringify({ success: false, notFound: true }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
        return new Response(JSON.stringify({ success: false, notFound: true }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (req.method === "POST") {
        try {
          const body = await req.text();
          // Validasi sintaks JSON
          JSON.parse(body);
          await Bun.write(userFilePath, body);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Gagal menyimpan data user";
          return new Response(JSON.stringify({ success: false, error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    // 4. Guard against path traversal
    const safePath = resolve(DIST_DIR, "." + pathname);
    if (!safePath.startsWith(DIST_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    // 5. Serve static asset if found
    if (pathname !== "/") {
      const file = Bun.file(safePath);
      if (await file.exists()) {
        return new Response(file);
      }
      if (pathname.startsWith("/assets/")) {
        return new Response("Asset not found", { status: 404 });
      }
    }

    // 6. SPA fallback: return index.html for client-side routing
    return new Response(Bun.file(resolve(DIST_DIR, "index.html")));
  },
});

console.log(`Takara web server listening on http://0.0.0.0:${PORT} (AI Backend Ready: ${SERVER_AI_MODEL})`);
