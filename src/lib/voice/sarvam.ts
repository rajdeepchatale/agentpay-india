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

/**
 * The speakers bulbul:v3 accepts, read off the live API.
 *
 * Worth stating precisely, because the obvious way to find this out is wrong:
 * sending an unrecognised name returns a 44-name list spanning every Sarvam
 * model, and four of the most prominent — anushka, vidya, manisha, arya — are
 * rejected by v3. Sending a *recognised but incompatible* name is what returns
 * v3's actual roster.
 */
export const BULBUL_V3_SPEAKERS = [
  "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja", "rohan",
  "simran", "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun",
  "manan", "sumit", "roopa", "kabir", "aayan", "shubh", "advait", "anand",
  "tanya", "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani",
  "mohit", "kavitha", "rehan", "soham", "rupali", "niharika",
] as const;

/**
 * Sakhi's voice.
 *
 * Pinned rather than left to Sarvam, which is how she came out male: with no
 * speaker set, the API picks its own default and a model update is free to
 * change which one — including the night before a demo is recorded.
 *
 * Female because the rest of her already is. "Sakhi" (सखी) means *female
 * friend*; the merchant persona is a woman; and her own fallback copy says
 * "मैं समझ नहीं पाई", a feminine self-reference. The voice was the only part
 * disagreeing.
 */
export const TTS_SPEAKER: (typeof BULBUL_V3_SPEAKERS)[number] = "shreya";

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

/**
 * The Content-Type to put on the uploaded audio part.
 *
 * Sarvam string-matches this against an allowlist, and the string a browser
 * produces is not on it. Chrome's MediaRecorder stamps its blobs
 * `audio/webm;codecs=opus`, which Sarvam answers with:
 *
 *     400 Invalid file type: audio/webm;codecs=opus
 *
 * The identical bytes under an allowed type transcribe perfectly — so the
 * codecs parameter alone was breaking every recording the browser made. This
 * cost a working microphone in production, and it was invisible because a 400
 * here becomes an empty transcript rather than an error.
 *
 * `application/octet-stream` is explicitly on the allowlist and Sarvam sniffs
 * the real bytes, so one constant covers Chrome and Firefox (webm/opus) and
 * Safari (mp4) alike. That beats a per-container map, which would silently
 * break again the next time a browser changed its default encoder.
 */
export const STT_UPLOAD_TYPE = "application/octet-stream";

/**
 * The browser's recorded type, replaced with one Sarvam accepts.
 *
 * Deliberately ignores what it is given: there is no browser value worth
 * forwarding, and a per-container map is the version of this that breaks
 * again the next time an encoder default changes.
 */
export function uploadType(recorded?: string): string {
  void recorded;
  return STT_UPLOAD_TYPE;
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
export function chunkForSpeech(
  text: string,
  limit = TTS_CHAR_LIMIT,
  firstLimit = limit,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences = trimmed
    .split(/(?<=[।.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  /* The first clip is the one the buyer waits on in silence, so it gets a
     tighter budget. Every later clip is generated while the previous one is
     playing, which is where its cost disappears. */
  const capFor = () => (chunks.length === 0 ? firstLimit : limit);

  for (const sentence of sentences) {
    /* A single sentence over the limit is hard-split rather than dropped. */
    if (sentence.length > capFor()) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      let i = 0;
      while (i < sentence.length) {
        const cap = capFor();
        chunks.push(sentence.slice(i, i + cap));
        i += cap;
      }
      continue;
    }
    const joined = current ? `${current} ${sentence}` : sentence;
    if (joined.length > capFor()) {
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
  /* Re-wrap rather than forwarding the browser's blob: its `type` becomes the
     part's Content-Type, and the browser's own value is the one Sarvam
     rejects. See uploadType. */
  const bytes = await audio.arrayBuffer();
  form.append(
    "file",
    new Blob([bytes], { type: uploadType(audio.type) }),
    "speech.webm",
  );
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

/** How much she says before the first sound — kept short deliberately. */
export const FIRST_CHUNK_LIMIT = 90;

export interface Speech {
  audio: Buffer;
  /** How many clips this reply is in total, so the caller can play them all. */
  total: number;
}

/**
 * One clip of a reply, spoken.
 *
 * Replies are split and fetched clip by clip rather than stitched server-side:
 * concatenating wavs means rewriting RIFF headers, and the split has a better
 * property anyway — the caller can start playing clip 0 while clip 1 is still
 * being generated, so only the first clip's latency is ever heard.
 *
 * This used to synthesise `chunks[0]` and stop, which meant she said one line
 * of a four-line reply and fell silent. That read as a broken agent, and it
 * was: a shopkeeper finishes her sentence.
 */
export async function textToSpeech(
  text: string,
  language: SupportedLanguage,
  index = 0,
): Promise<Speech | null> {
  const chunks = chunkForSpeech(text, TTS_CHAR_LIMIT, FIRST_CHUNK_LIMIT);
  if (!chunks.length || index < 0 || index >= chunks.length) return null;

  const res = await call("/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: [chunks[index]],
      target_language_code: toBcp47(language),
      model: TTS_MODEL,
      speaker: TTS_SPEAKER,
    }),
  });

  if (!res.ok) {
    console.warn("[sarvam:tts]", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const audio = decodeAudios(await res.json());
  return audio ? { audio, total: chunks.length } : null;
}
