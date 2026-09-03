// ============================================================
// POST /api/voice/stt
// ============================================================
// Audio from her microphone → what she said, in the language she said it.
//
// Voice matters here for a reason that is easy to miss from a laptop: typing
// Devanagari on a phone is genuinely slow, which is why most Indian buyers
// type romanised Hinglish instead. Speaking removes that tax entirely.
//
// Always returns 200 with a usable body on a service failure — the mic falls
// back to typing rather than the chat showing an error. Only a malformed
// REQUEST earns a 4xx.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import type { SupportedLanguage } from "@/types";
import { speechToText } from "@/lib/voice/sarvam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Twenty seconds of speech is far more than a saree request needs. */
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Send the audio as multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json(
      { error: "missing_audio", message: "An audio file is required." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "audio_too_large", message: "That recording is too long." },
      { status: 413 },
    );
  }

  const hinted = form.get("language");
  const language =
    typeof hinted === "string" && ["hi", "mr", "en", "hinglish"].includes(hinted)
      ? (hinted as SupportedLanguage)
      : undefined;

  try {
    const transcript = await speechToText(file, language);

    if (!transcript) {
      /* Sarvam heard nothing usable, or was unavailable. Either way she should
         get a sentence she can act on, not a stack trace. */
      return NextResponse.json({
        text: "",
        language: "en",
        confidence: 0,
        message: "I couldn't catch that. Try again, or type it instead.",
      });
    }

    return NextResponse.json(transcript);
  } catch (e) {
    console.error("[/api/voice/stt]", e);
    return NextResponse.json({
      text: "",
      language: "en",
      confidence: 0,
      message: "Voice isn't available right now. You can type instead.",
    });
  }
}
