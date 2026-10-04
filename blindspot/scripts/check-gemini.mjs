// Verifies your Gemini key and model directly, outside the app.
// Run: npm run check:gemini     (reads GEMINI_API_KEY / GEMINI_MODEL from .env.local)
import { GoogleGenAI } from '@google/genai';

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const redact = (t) => String(t).replace(/AIza[\w-]{20,}/g, '[redacted-key]').slice(0, 500);

console.log(`API key: ${key ? 'detected' : 'MISSING (add GEMINI_API_KEY to .env.local)'}`);
console.log(`Model:   ${model}`);
if (!key) process.exit(1);

const ai = new GoogleGenAI({ apiKey: key });

try {
  const names = [];
  for await (const m of await ai.models.list()) {
    if ((m.supportedActions ?? []).includes('generateContent')) names.push(m.name.replace('models/', ''));
  }
  const flash = names.filter((n) => /flash/.test(n) && !/image|tts|live|audio|robotics|omni/.test(n));
  console.log(`\nFlash text models your key can use:\n  ${flash.join('\n  ') || '(none found)'}`);
  console.log(`\nConfigured model listed for your key: ${names.includes(model) ? 'YES' : 'NO'}`);
} catch (e) {
  console.log(`\nModel listing failed -> HTTP ${e?.status ?? 'n/a'}: ${redact(e?.message)}`);
}

try {
  const r = await ai.models.generateContent({
    model,
    contents: 'Reply with JSON: {"ok": true}',
    config: { responseMimeType: 'application/json', maxOutputTokens: 256 },
  });
  console.log(`\nTest call: OK (finishReason=${r.candidates?.[0]?.finishReason}) -> ${redact(r.text)}`);
} catch (e) {
  console.log(`\nTest call FAILED -> HTTP ${e?.status ?? 'n/a'}: ${redact(e?.message)}`);
  process.exit(1);
}
