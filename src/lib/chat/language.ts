import type { SupportedLanguage } from "@/types";

/**
 * Which language to ask the agent to answer a turn in.
 *
 * Three signals, in decreasing order of how much they can be trusted:
 *
 *   1. What she PINNED in the header. Not an inference at all — she said so.
 *   2. What Sarvam HEARD. saarika reports a language code and a probability
 *      from the audio itself, which is a far better signal than reading the
 *      transcript back.
 *   3. What the server GUESSES from the text. A word-list regex, and the last
 *      resort it always was.
 *
 * Returning undefined means "send nothing" — the server then detects from the
 * text exactly as before, which is the correct behaviour for a typed turn and
 * for audio Sarvam was unsure about.
 */

/**
 * Below this, Sarvam's guess is not worth preferring over the server's.
 *
 * Deliberately under 0.9: parseTranscript defaults confidence to 0.9 when
 * saarika omits the field, so a floor at or above that would silently reject
 * every real transcript and this whole path would be dead code.
 */
export const SPOKEN_CONFIDENCE_FLOOR = 0.7;

export interface TurnLanguageInput {
  /** Her explicit choice from the header picker, if she made one. */
  pinned?: SupportedLanguage;
  /** The language Sarvam reported hearing, for a spoken turn. */
  spoken?: SupportedLanguage;
  /** Sarvam's confidence in that reading. */
  confidence?: number;
}

export function turnLanguage({
  pinned,
  spoken,
  confidence,
}: TurnLanguageInput): SupportedLanguage | undefined {
  if (pinned) return pinned;
  if (spoken && typeof confidence === "number" && confidence >= SPOKEN_CONFIDENCE_FLOOR) {
    return spoken;
  }
  return undefined;
}
