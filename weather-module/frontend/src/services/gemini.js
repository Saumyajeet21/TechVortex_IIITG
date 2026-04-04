/**
 * gemini.js — Credit-efficient Gemini AI weather analysis
 *
 * Savings vs previous version:
 *   - Model: gemini-2.0-flash-lite  (cheapest tier)
 *   - Cache: sessionStorage (survives re-renders, not just JS memory)
 *   - Cache window: 6-hour blocks (4x fewer calls per city per day)
 *   - Prompt: ~40% shorter input tokens
 *   - Output: 300 max tokens (was 600)
 */

const GEMINI_KEY   = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const STORAGE_KEY  = 'gemini_weather_cache';

// ── 6-hour block cache key ─────────────────────────────────────────────────
function cacheKey(city) {
  const block = Math.floor(Date.now() / (6 * 60 * 60 * 1000)); // changes every 6h
  return `${city}_${block}`;
}

// ── Read / write sessionStorage cache ──────────────────────────────────────
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}
function writeCache(key, value) {
  try {
    const cache = readCache();
    cache[key] = value;
    // Keep only last 20 entries to avoid bloat
    const keys = Object.keys(cache);
    if (keys.length > 20) delete cache[keys[0]];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded — skip */ }
}

// ── Friendly errors ────────────────────────────────────────────────────────
function friendlyError(raw) {
  if (raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED'))
    return '🚦 Gemini quota reached. Try again later or check aistudio.google.com.';
  if (raw.includes('API_KEY') || raw.includes('403'))
    return '🔑 Invalid Gemini API key. Check VITE_GEMINI_API_KEY in frontend/.env';
  if (raw.includes('model') || raw.includes('404'))
    return '🤖 Model unavailable. Check your API project permissions.';
  return `Gemini error: ${raw.slice(0, 120)}`;
}

/**
 * Analyse LSTM forecast with Gemini (credit-efficient).
 * Returns: narrative, confidence, validation, events, gemini24h (4 pts), actions
 */
export async function getGeminiWeatherAnalysis({ city, lstmForecast, currentWeather }) {
  if (!GEMINI_KEY || GEMINI_KEY === 'your_actual_gemini_api_key_here') {
    throw new Error('VITE_GEMINI_API_KEY not set in frontend/.env');
  }

  // ── Cache hit ──────────────────────────────────────────────────────────
  const key   = cacheKey(city);
  const cache = readCache();
  if (cache[key]) return cache[key];

  // ── Compact LSTM summary (4 points every 18h) ──────────────────────────
  const samples = lstmForecast
    .filter((_, i) => i % 18 === 0)
    .slice(0, 4)
    .map(h => `${h.time.slice(11, 16)}:${h.temperature}°C`)
    .join(', ');

  const first24 = lstmForecast.slice(0, 24);
  const peak = first24.reduce((a, b) => a.temperature > b.temperature ? a : b);
  const low  = first24.reduce((a, b) => a.temperature < b.temperature ? a : b);

  // ── Lean prompt ────────────────────────────────────────────────────────
  const prompt = `Weather AI for ${city}. LSTM 72h forecast:
Now: ${currentWeather.temperature ?? '?'}°C, humidity ${currentWeather.humidity ?? '?'}%, wind ${currentWeather.windspeed ?? '?'}km/h
Samples: ${samples}
24h: peak ${peak.temperature}°C at ${peak.time.slice(11, 16)}, low ${low.temperature}°C

Reply ONLY with this JSON (no markdown):
{"narrative":"2-sentence forecast","confidence":80,"validation":"1 sentence comparing LSTM vs your estimate","events":["tip1","tip2"],"gemini24h":[{"label":"+6h","temp":25},{"label":"+12h","temp":28},{"label":"+18h","temp":26},{"label":"+24h","temp":24}],"actions":{"morning":"...","afternoon":"...","evening":"..."}}`;

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:      0.2,
        maxOutputTokens:  300,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(friendlyError(err?.error?.message ?? `HTTP ${res.status}`));
  }

  const data = await res.json();
  const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    result = match ? JSON.parse(match[0]) : {};
  }

  writeCache(key, result);
  return result;
}
