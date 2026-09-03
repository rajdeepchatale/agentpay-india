// ============================================================
// Sarvam AI — speech in and out, in Indian languages.
// ============================================================
// Two things about this API that cost time if you assume the usual shapes:
//
//   1. The header is `api-subscription-key`, NOT `Authorization: Bearer`.
//   2. TTS returns base64 inside JSON — `{ audios: ["..."] }` — not an audio
//      stream. It has to be decoded server-side before the browser sees it.
//
// And one product decision that the plan originally got wrong:
//
//   STT uses **saarika**, not saaras.
//
// Sarvam has two speech-to-text endpoints. `saaras` translates to English:
// speaking "मला पैठणी सिल्क साडी दाखवा" returns "Show me a Paithani silk
// saree." That would hand the agent English, so it would answer in English —
// destroying the one thing this product is for. `saarika` transcribes in the
// language she actually spoke and reports which one it was. Verified against
// the live API before either was built.
// ============================================================

import "server-only";
import type { SupportedLanguage } from "@/types";

const BASE = "https://api.sarvam.ai";

/** Transcribes in the spoken language. `saaras` would translate it away. */
const STT_MODEL = "saarika:v2.5";
const TTS_MODEL = "bulbul:v3";

/** Sarvam rejects a single input longer than this. */
export const TTS_CHAR_LIMIT = 480;

/* ---------------------------------------------------------------
   Language codes — pure, so the mapping is provable without network.
   --------------------------------------------------------------- */

export type Bcp47 = "hi-IN" | "mr-IN" | "en-IN";

/**
 * The app's language tags in Sarvam's terms.
 *
 * Hinglish speaks as Hindi. There is no `hi-Latn` voice, and romanised Hindi
 * is Hindi — the Latin script is how she types it, not how she says it.
 */
export function toBcp47(lang: SupportedLanguage): Bcp47 {
  switch (lang) {
    case "mr":
      return "mr-IN";
    case "en":
      return "en-IN";
    case "hi":
    case "hinglish":
    default:
      return "hi-IN";
  }
}

/** Sarvam's code back to ours. Anything unfamiliar reads as English. */
export function fromBcp47(code: string | undefined | null): SupportedLanguage {
  switch ((code ?? "").slice(0, 2)) {
    case "mr":
      return "mr";
    case "hi":
      return "hi";
    default:
      return "en";
  }
}

/* ---------------------------------------------------------------
   Response shapes — every parser returns null rather than throwing,
   so a surprising payload becomes a handled failure in the route
   instead of a 500.
   --------------------------------------------------------------- */

/** Pull the wav out of `{ audios: [base64] }`. */
export function decodeAudios(payload: unknown): Buffer | null {
  const p = payload as { audios?: unknown };
  if (!p || typeof p !== "object") return null;
  const first = Array.isArray(p.audios) ? p.audios[0] : undefined;
  if (typeof first !== "string" || first.length === 0) return null;
  try {
    return Buffer.from(first, "base64");
  } catch {
    return null;
  }
}

export interface Transcript {
  text: string;
  language: SupportedLanguage;
  confidence: number;
}

export function parseTranscript(payload: unknown): Transcript | null {
  const p = payload as {
    transcript?: unknown;
    language_code?: unknown;
    language_probability?: unknown;
  };
  if (!p || typeof p !== "object") return null;
  if (typeof p.transcript !== "string") return null;

  const text = p.transcript.trim();
  /* Silence is not a message. Returning an empty string here would send the
     agent a blank turn and make it apologise for nothing. */
  if (!text) return null;

  return {
    text,
    language: fromBcp47(typeof p.language_code === "string" ? p.language_code : null),
    /* Saarika does not report a probability; Saaras does. Default high rather
       than zero — a missing number is not low confidence. */
    confidence:
      typeof p.language_probability === "number" ? p.language_probability : 0.9,
  };
}

/**
 * Split a reply into pieces Sarvam will accept.
 *
 * The agent answers in whole sentences and often several of them, which is
 * past the per-input limit. Splitting on sentence ends — including the
 * Devanagari danda — keeps each clip a natural unit, so the joins land where a
 * speaker would pause anyway.
 */
export function chunkForSpeech(text: string, limit = TTS_CHAR_LIMIT): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences = trimmed
    .split(/(?<=[।.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    /* A single sentence over the limit is hard-split rather than dropped. */
    if (sentence.length > limit) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += limit) {
        chunks.push(sentence.slice(i, i + limit));
      }
      continue;
    }
    const joined = current ? `${current} ${sentence}` : sentence;
    if (joined.length > limit) {
      chunks.push(current);
      current = sentence;
    } else {
      current = joined;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

/* ---------------------------------------------------------------
   Network.
   --------------------------------------------------------------- */

function key(): string {
  const k = process.env.SARVAM_API_KEY;
  if (!k) throw new Error("SARVAM_API_KEY is not set — voice is unavailable.");
  return k;
}

/** How long we will wait before giving her a typed fallback instead. */
const TIMEOUT_MS = 20_000;

async function call(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(BASE + path, {
      ...init,
      headers: { "api-subscription-key": key(), ...(init.headers ?? {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Audio in → what she said, in the language she said it. */
export async function speechToText(
  audio: Blob,
  language?: SupportedLanguage,
): Promise<Transcript | null> {
  const form = new FormData();
  form.append("file", audio, "speech.webm");
  form.append("model", STT_MODEL);
  /* Given a language, say so — it improves accuracy. Otherwise let Sarvam
     detect, which is what a buyer switching mid-conversation needs. */
  form.append("language_code", language ? toBcp47(language) : "unknown");

  const res = await call("/speech-to-text", { method: "POST", body: form });
  if (!res.ok) {
    console.warn("[sarvam:stt]", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  return parseTranscript(await res.json());
}

/** Text out → one wav of her language being spoken. */
export async function textToSpeech(
  text: string,
  language: SupportedLanguage,
): Promise<Buffer | null> {
  const chunks = chunkForSpeech(text);
  if (!chunks.length) return null;

  /* One request, first chunk only. Concatenating wavs means rewriting RIFF
     headers, and a clipped reply that plays is better than a stitched one that
     crackles — she can read the rest, which is on screen already. */
  const res = await call("/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: [chunks[0]],
      target_language_code: toBcp47(language),
      model: TTS_MODEL,
    }),
  });

  if (!res.ok) {
    console.warn("[sarvam:tts]", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  return decodeAudios(await res.json());
}
