// ============================================================
// POST /api/voice/tts
// ============================================================
// The agent's reply, spoken in the buyer's own language.
//
// Sarvam returns base64 inside JSON rather than an audio stream, so the
// decoding happens here and the browser receives real `audio/wav` bytes it can
// hand straight to an <audio> element.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import type { SupportedLanguage } from "@/types";
import { textToSpeech } from "@/lib/voice/sarvam";

export const runtime = "nodejs";
/* Region is set project-wide in vercel.json (bom1), not here: a per-route
   preferredRegion is ignored on this plan — verified, the function still
   reported iad1 after setting it. See vercel.json for why Mumbai. */
export const dynamic = "force-dynamic";

const LANGUAGES = ["hi", "mr", "en", "hinglish"] as const;
/* Long enough for any reply the agent writes; a guard against a caller pasting
   a novel and burning the quota. */
const MAX_CHARS = 2000;

export async function POST(request: NextRequest) {
  let body: { text?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "missing_text", message: "text is required." },
      { status: 400 },
    );
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: "text_too_long", message: `text must be under ${MAX_CHARS} characters.` },
      { status: 400 },
    );
  }

  const language = (
    LANGUAGES.includes(body.language as (typeof LANGUAGES)[number])
      ? body.language
      : "hi"
  ) as SupportedLanguage;

  try {
    const wav = await textToSpeech(text, language);

    if (!wav) {
      /* No audio is not an error the buyer needs to see — the reply is already
         on screen in front of her. The speaker button just goes quiet. */
      return NextResponse.json(
        { error: "unavailable", message: "Speech isn't available right now." },
        { status: 503 },
      );
    }

    return new NextResponse(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        /* Same text and language always produce the same audio, so let the
           browser keep it — replaying a message should not cost a request. */
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[/api/voice/tts]", e);
    return NextResponse.json(
      { error: "internal_error", message: "Speech isn't available right now." },
      { status: 503 },
    );
  }
}
