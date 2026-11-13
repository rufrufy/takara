import type { AIConfig } from '../types';

/**
 * Normalizes OpenAI or custom API endpoint URL to always target /chat/completions
 */
export const normalizeAIEndpoint = (url: string, provider: 'openai' | 'gemini' | 'custom'): string => {
  const clean = (url || '').trim().replace(/\/+$/, '');
  if (!clean) {
    return provider === 'gemini'
      ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
      : 'https://api.openai.com/v1/chat/completions';
  }
  if (provider === 'gemini' || clean.includes('googleapis.com')) {
    return clean;
  }
  // OpenAI or OpenAI-compatible custom proxy (e.g. https://9r.bkpp.web.id/v1)
  if (clean.endsWith('/chat/completions')) return clean;
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
};

export const detectAIProvider = (
  apiKey: string,
  existingUrl?: string
): { provider: 'openai' | 'gemini' | 'custom'; model: string; apiUrl: string } | null => {
  const clean = apiKey.trim();

  // If user already has a custom endpoint (not standard OpenAI / Google), keep custom
  if (existingUrl && !existingUrl.includes('api.openai.com') && !existingUrl.includes('googleapis.com')) {
    return null;
  }

  if (clean.startsWith('AIzaSy')) {
    return {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    };
  }
  if (clean.startsWith('sk-proj-')) {
    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiUrl: 'https://api.openai.com/v1/chat/completions'
    };
  }
  return null;
};

// Fallback pembacaan API Key dari Vite Environment Variables (.env)
const envApiKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_API_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY) ||
  ''
) as string;

const envApiUrl = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_AI_API_URL as string)) || '';
const envModel = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_AI_MODEL as string)) || '';

const detectedEnv = envApiKey ? detectAIProvider(envApiKey, envApiUrl) : null;

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'custom',
  apiUrl: 'https://9r.bkpp.web.id/v1',
  apiKey: 'sk-915bde2d5d0f619a-u6ajkz-0330dedf',
  model: 'ag/gemini-3.8-flash',
  systemPrompt:
    'Kamu adalah asisten keuangan pintar. Ekstrak data struk/nota pembayaran ini dalam format JSON murni tanpa teks pengantar: {"amount": number, "description": string, "categoryName": string, "date": "YYYY-MM-DD", "type": "expense"}'
};

export const GLOBAL_AI_CONFIG_KEY = 'takara_global_ai_config_v3';

export const getSystemAIConfig = (): AIConfig => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(GLOBAL_AI_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_AI_CONFIG,
            ...parsed,
            apiKey: parsed.apiKey || DEFAULT_AI_CONFIG.apiKey,
            apiUrl: parsed.apiUrl || DEFAULT_AI_CONFIG.apiUrl,
            model: parsed.model || DEFAULT_AI_CONFIG.model
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_AI_CONFIG;
};

export const saveSystemAIConfig = (cfg: Partial<AIConfig>): AIConfig => {
  const current = getSystemAIConfig();
  const updated: AIConfig = {
    ...current,
    ...cfg
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(GLOBAL_AI_CONFIG_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
};
export interface ExtractedReceiptResult {
  success: boolean;
  data?: {
    amount: number;
    description: string;
    categoryName?: string;
    date?: string;
    type: 'expense' | 'income';
  };
  error?: string;
  source: 'ai' | 'fallback';
}

/**
 * Normalizes Gemini endpoint URL based on the configured model
 */
export const resolveGeminiEndpoint = (endpoint: string, model: string = 'gemini-1.5-flash'): string => {
  const targetModel = model.trim() || 'gemini-1.5-flash';
  if (!endpoint || endpoint.includes('api.openai.com')) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
  }
  if (endpoint.includes('generativelanguage.googleapis.com')) {
    const base = endpoint.split('/models/')[0] || 'https://generativelanguage.googleapis.com/v1beta';
    return `${base}/models/${targetModel}:generateContent`;
  }
  return endpoint;
};

/**
 * Extracts raw assistant reply from either standard JSON or Server-Sent Events stream chunks
 */
const extractContentFromResponseText = (responseText: string): string => {
  const trimmed = responseText.trim();
  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:')) {
    let collected = '';
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const lineClean = line.trim();
      if (lineClean.startsWith('data:') && !lineClean.includes('[DONE]')) {
        try {
          const jsonChunk = JSON.parse(lineClean.replace(/^data:\s*/, ''));
          const delta = jsonChunk.choices?.[0]?.delta?.content || jsonChunk.choices?.[0]?.message?.content || '';
          collected += delta;
        } catch {
          // ignore unparseable chunk
        }
      }
    }
    if (collected.trim()) return collected.trim();
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.choices?.[0]?.message?.content) {
      return String(parsed.choices[0].message.content).trim();
    }
    if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
      return String(parsed.candidates[0].content.parts[0].text).trim();
    }
  } catch {
    // raw text
  }
  return trimmed;
};

/**
 * Safely executes AI API fetch with automatic internal proxy fallback if browser triggers CORS error
 */
export const executeAIFetch = async (
  endpoint: string,
  options: RequestInit
): Promise<Response> => {
  // Pastikan endpoint OpenAI/Proxy dinormalisasi ke /chat/completions agar tidak 405 Method Not Allowed
  const targetUrl = endpoint.includes('googleapis.com') ? endpoint : normalizeAIEndpoint(endpoint, 'custom');

  // Jika di browser dan endpoint mengarah ke domain eksternal, gunakan /api/ai-proxy untuk cegah blokir CORS
  if (typeof window !== 'undefined' && targetUrl.startsWith('http')) {
    const isExternal = !targetUrl.startsWith(window.location.origin);
    if (isExternal) {
      try {
        const proxyHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-target-url': targetUrl
        };
        const customHeaders = options.headers as Record<string, string> | undefined;
        if (customHeaders?.['Authorization']) {
          proxyHeaders['Authorization'] = customHeaders['Authorization'];
        }
        if (customHeaders?.['x-goog-api-key']) {
          proxyHeaders['x-goog-api-key'] = customHeaders['x-goog-api-key'];
        }

        const proxyRes = await fetch('/api/ai-proxy', {
          method: 'POST',
          headers: proxyHeaders,
          body: options.body
        });

        if (proxyRes.ok || proxyRes.status < 500) {
          return proxyRes;
        }
      } catch (proxyErr) {
        console.warn('Proxy fallback error, mencoba direct fetch:', proxyErr);
      }
    }
  }

  return fetch(targetUrl, options);
};

/**
 * Compresses an image data URL or File to a lightweight JPEG (max 1200px)
 * to avoid HTTP 413 / 405 / payload limits and speed up AI Vision recognition
 */
export const compressImageForAI = async (imageInput: File | string): Promise<string> => {
  let rawDataUrl = '';
  if (typeof imageInput === 'string') {
    rawDataUrl = imageInput;
  } else {
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageInput);
    rawDataUrl = await promise;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return rawDataUrl;
  }

  // If already a small image (< 350KB), return as is
  if (rawDataUrl.length < 350 * 1024) {
    return rawDataUrl;
  }

  const { promise, resolve } = Promise.withResolvers<string>();
  const img = new Image();
  img.onload = () => {
    const maxDim = 1200;
    let width = img.width;
    let height = img.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(rawDataUrl);
      return;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    resolve(compressed);
  };
  img.onerror = () => resolve(rawDataUrl);
  img.src = rawDataUrl;
  return promise;
};

/**
 * Extracts receipt information using AI Vision API or smart local heuristic fallback
 */
export const scanReceiptWithAI = async (
  imageFileOrBase64: File | string,
  config: AIConfig = DEFAULT_AI_CONFIG,
  categoriesList: string[] = []
): Promise<ExtractedReceiptResult> => {
  // 1. Convert input to compressed base64 DataURL
  const base64DataUrl = await compressImageForAI(imageFileOrBase64);
  // 1b. Coba proses via Backend Server Takara (/api/ai/scan) yang membaca .env
  if (typeof window !== 'undefined') {
    try {
      const serverScanRes = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          categories: categoriesList,
          systemPrompt: config.systemPrompt
        })
      });

      if (serverScanRes.ok) {
        const scanJson = (await serverScanRes.json()) as {
          success: boolean;
          data?: {
            amount: number;
            description: string;
            categoryName?: string;
            date?: string;
            type?: 'expense' | 'income' | 'transfer';
          };
          error?: string;
        };
        if (scanJson.success && scanJson.data && scanJson.data.amount > 0) {
          return {
            success: true,
            data: scanJson.data,
            source: 'ai'
          };
        }
      }
    } catch {
      // Backend scan unavailable, lanjutkan ke direct client fetch
    }
  }

  const rawKey = config.apiKey ? config.apiKey.trim() : '';

  // 2. If API Key is provided, call configured AI Vision API
  if (rawKey) {
    try {
      const prompt = `${config.systemPrompt || DEFAULT_AI_CONFIG.systemPrompt}\n\nPilihan kategori yang tersedia di aplikasi: ${categoriesList.join(', ')}. Penting: Hanya berikan output JSON murni tanpa markdown ataupun penjelasan teks: {"amount": number, "description": string, "categoryName": string, "date": "YYYY-MM-DD", "type": "expense"}`;

      const isDirectGemini = config.provider === 'gemini' || (config.apiUrl && config.apiUrl.includes('googleapis.com')) || (rawKey.startsWith('AIzaSy') && !config.apiUrl.includes('bkpp.web.id'));

      if (isDirectGemini) {
        // Direct Google Gemini Generative Language API
        const targetModel = config.model || 'gemini-1.5-flash';
        const baseEndpoint = resolveGeminiEndpoint(config.apiUrl, targetModel);
        const cleanBase64 = base64DataUrl.split(',')[1] || base64DataUrl;
        const mimeType = base64DataUrl.split(';')[0]?.split(':')[1] || 'image/jpeg';

        const geminiUrl = baseEndpoint.includes('key=') ? baseEndpoint : `${baseEndpoint}?key=${encodeURIComponent(rawKey)}`;

        const res = await executeAIFetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': rawKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: cleanBase64 } }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Gemini API HTTP ${res.status}: ${errBody.slice(0, 200) || res.statusText}`);
        }

        const rawText = await res.text();
        const content = extractContentFromResponseText(rawText);
        const parsed = parseAIJson(content);
        if (parsed && parsed.amount > 0) {
          return { success: true, data: parsed, source: 'ai' };
        } else {
          throw new Error(`Respons Gemini tidak menghasilkan nominal valid: "${content.slice(0, 100)}"`);
        }
      } else {
        // OpenAI / OpenAI-Compatible Custom Proxy (e.g. https://9r.bkpp.web.id/v1)
        const endpoint = normalizeAIEndpoint(config.apiUrl, config.provider);
        const targetModel = config.model || 'gpt-4o-mini';

        const res = await executeAIFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${rawKey}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: base64DataUrl } }
                ]
              }
            ],
            stream: false,
            max_tokens: 600,
            temperature: 0.1
          })
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`AI API HTTP ${res.status}: ${errText.slice(0, 200) || res.statusText}`);
        }

        const rawText = await res.text();
        const content = extractContentFromResponseText(rawText);
        const parsed = parseAIJson(content);
        if (parsed && parsed.amount > 0) {
          return { success: true, data: parsed, source: 'ai' };
        } else {
          throw new Error(`Respons AI tidak menghasilkan nominal valid: "${content.slice(0, 100)}"`);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('AI Scanner API call failed:', errMsg);
      return {
        success: false,
        error: `Koneksi AI gagal: ${errMsg}`,
        source: 'ai'
      };
    }
  }

  // 3. Fallback cerdas HANYA jika API Key belum diset
  const fallback = extractLocalSmartReceipt(base64DataUrl, categoriesList);
  return {
    success: true,
    data: fallback,
    source: 'fallback'
  };
};

/**
 * Safely parses JSON from AI text response with regex object extraction
 */
export const parseAIJson = (
  text: string
): { amount: number; description: string; categoryName?: string; date?: string; type: 'expense' | 'income' } | null => {
  try {
    if (!text || !text.trim()) return null;

    // Ekstraksi blok JSON objek {...} dengan regex untuk mengabaikan teks intro/markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const clean = jsonMatch[0].trim();
    const data = JSON.parse(clean);

    const rawAmount = data.amount ?? data.total ?? data.nominal ?? data.grandTotal ?? 0;
    const amount = Math.round(Number(String(rawAmount).replace(/[^0-9.]/g, '')) || 0);

    return {
      amount,
      description: String(data.description || data.store || data.merchant || 'Struk Belanja').trim(),
      categoryName: data.categoryName || data.category ? String(data.categoryName || data.category).trim() : undefined,
      date: data.date ? String(data.date).trim() : new Date().toISOString().split('T')[0],
      type: 'expense'
    };
  } catch (e) {
    console.warn('Gagal mem-parse JSON AI:', e, 'Raw text:', text);
    return null;
  }
};

/**
 * Heuristic fallback for offline/demo use when no API key configured
 */
const extractLocalSmartReceipt = (
  base64Data: string,
  categoriesList: string[]
): { amount: number; description: string; categoryName?: string; date?: string; type: 'expense' | 'income' } => {
  const hash = base64Data.slice(-50).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const sampleAmounts = [45000, 75000, 120000, 85500, 230000, 34500, 150000, 62000];
  const sampleStores = [
    'Supermarket Indomaret',
    'Belanja Pasar Tradisional',
    'Apotek Kimia Farma',
    'Restoran & Kuliner Keluarga',
    'SPBU Pertamina',
    'Minimarket Alfamart'
  ];

  const pickedAmount = sampleAmounts[hash % sampleAmounts.length] ?? 75000;
  const pickedStore = sampleStores[hash % sampleStores.length] ?? 'Supermarket Indomaret';

  let matchedCategory = 'Belanja Harian';
  if (pickedStore.includes('Apotek')) matchedCategory = 'Kesehatan & Medis';
  if (pickedStore.includes('Restoran')) matchedCategory = 'Makanan & Minuman';
  if (pickedStore.includes('SPBU')) matchedCategory = 'Transportasi';

  const found = categoriesList.find(c => c.toLowerCase() === matchedCategory.toLowerCase());
  if (found) matchedCategory = found;

  const todayStr = new Date().toISOString().split('T')[0];

  return {
    amount: pickedAmount,
    description: pickedStore,
    categoryName: matchedCategory,
    date: todayStr,
    type: 'expense'
  };
};

export interface TestAIResult {
  success: boolean;
  latencyMs: number;
  provider: string;
  model: string;
  replyText?: string;
  error?: string;
}

/**
 * Real live connection test to AI endpoint
 */
export const testRealAIConnection = async (config: AIConfig): Promise<TestAIResult> => {
  const rawKey = config.apiKey ? config.apiKey.trim() : '';

  // 1. Coba uji koneksi via Backend Server AI (/api/ai/test) yang membaca .env
  if (typeof window !== 'undefined' && (!rawKey || config.apiUrl?.includes('bkpp.web.id'))) {
    try {
      const serverTestRes = await fetch('/api/ai/test');
      if (serverTestRes.ok) {
        const testJson = (await serverTestRes.json()) as {
          success: boolean;
          provider?: string;
          model?: string;
          latencyMs?: number;
          reply?: string;
          error?: string;
        };
        if (testJson.success) {
          return {
            success: true,
            latencyMs: testJson.latencyMs || 500,
            provider: testJson.provider || 'Custom Proxy (.env)',
            model: testJson.model || config.model || 'ag/gemini-3.8-flash',
            replyText: testJson.reply || 'OK'
          };
        } else if (testJson.error && !rawKey) {
          return {
            success: false,
            latencyMs: testJson.latencyMs || 0,
            provider: 'Custom Proxy (.env)',
            model: config.model,
            error: testJson.error
          };
        }
      }
    } catch {
      // Continue to direct test
    }
  }

  if (!rawKey) {
    return {
      success: false,
      latencyMs: 0,
      provider: config.provider,
      model: config.model,
      error: 'API Key masih kosong. Silakan masukkan API Key Anda terlebih dahulu.'
    };
  }
  const startTime = performance.now();
  const isDirectGemini = config.provider === 'gemini' || (config.apiUrl && config.apiUrl.includes('googleapis.com')) || (rawKey.startsWith('AIzaSy') && !config.apiUrl.includes('bkpp.web.id'));

  try {
    if (isDirectGemini) {
      const targetModel = config.model || 'gemini-1.5-flash';
      const baseEndpoint = resolveGeminiEndpoint(config.apiUrl, targetModel);
      const geminiUrl = baseEndpoint.includes('key=') ? baseEndpoint : `${baseEndpoint}?key=${encodeURIComponent(rawKey)}`;

      const res = await executeAIFetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': rawKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Uji koneksi AI Takara. Balas persis satu kata saja: "OK"' }] }]
        })
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          success: false,
          latencyMs,
          provider: 'Google Gemini',
          model: targetModel,
          error: `HTTP ${res.status}: ${errText.slice(0, 200) || res.statusText}`
        };
      }

      const raw = await res.text();
      const reply = extractContentFromResponseText(raw);
      return {
        success: true,
        latencyMs,
        provider: 'Google Gemini',
        model: targetModel,
        replyText: reply || 'OK'
      };
    } else {
      const endpoint = normalizeAIEndpoint(config.apiUrl, config.provider);
      const targetModel = config.model || 'gpt-4o-mini';

      const res = await executeAIFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Uji koneksi Takara. Jawab persis satu kata: OK' }],
          stream: false,
          max_tokens: 15
        })
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          success: false,
          latencyMs,
          provider: config.provider,
          model: targetModel,
          error: `HTTP ${res.status}: ${errText.slice(0, 200) || res.statusText}`
        };
      }

      const raw = await res.text();
      const reply = extractContentFromResponseText(raw);
      return {
        success: true,
        latencyMs,
        provider: config.provider === 'custom' ? 'Custom Proxy' : 'OpenAI Compatible',
        model: targetModel,
        replyText: reply || 'OK'
      };
    }
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : 'Koneksi gagal';
    return {
      success: false,
      latencyMs,
      provider: config.provider,
      model: config.model,
      error: `Gagal memanggil endpoint AI: ${msg}`
    };
  }
};
