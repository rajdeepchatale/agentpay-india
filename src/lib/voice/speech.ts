// ============================================================
// What she says out loud — which is not what she writes.
// ============================================================
// Sarvam's TTS latency scales with the length of the input. Measured against
// the live API:
//
//     48 chars → 1.0s        133 chars → 2.8s        267 chars → 4.8s
//
// Reading a full reply aloud therefore lands the voice three to five seconds
// after the text is already on screen, which reads as a broken agent rather
// than a slow one.
//
// A shopkeeper does not narrate her own paragraph. She says "these are the
// ones, have a look" and lets you read the labels. So the spoken line is a
// short announcement of what just happened, and the detail stays on screen
// where the buyer can take it at her own pace.
// ============================================================

import type { AgentResponse, SupportedLanguage } from "@/types";

/** Past this, speaking costs more time than the reply is worth. */
export const SPOKEN_LIMIT = 120;

type Phrases = Record<SupportedLanguage, string>;

/* One saree is not "1 साड़ियाँ". Hinglish stays in roman script — dropping
   Devanagari into it is the exact confusion the system prompt spends a whole
   section preventing, and it sounds wrong read aloud too. */
const ONE_SAREE: Phrases = {
  hi: "ये रही एक साड़ी। देखिए।",
  mr: "ही पाहा एक साडी.",
  hinglish: "Ye rahi ek saree. Dekhiye.",
  en: "Here's one saree. Take a look.",
};

const MANY_SAREES: Phrases = {
  hi: "ये रहीं {n} साड़ियाँ। देखिए, कौन सी पसंद आई?",
  mr: "या पाहा {n} साड्या. कोणती आवडली सांगा.",
  hinglish: "Ye rahin {n} sarees. Dekhiye, kaun si pasand aayi?",
  en: "Here are {n} sarees. Have a look and tell me which you like.",
};

/* Framed as the limit holding, never as a refusal — the same framing the
   system prompt asks of the model, kept when we say it ourselves. */
const BLOCKED_WITH_ALTERNATIVES: Phrases = {
  hi: "यह आपकी सीमा से ऊपर है। ये देखिए, आपके बजट में।",
  mr: "हे तुमच्या मर्यादेपेक्षा जास्त आहे. या पाहा, तुमच्या बजेटमध्ये.",
  hinglish: "Ye aapki limit se upar hai. Ye dekhiye, aapke budget mein.",
  en: "That's above your limit. Here's what fits your budget.",
};

const BLOCKED_ALONE: Phrases = {
  hi: "यह आपकी सीमा से ऊपर है।",
  mr: "हे तुमच्या मर्यादेपेक्षा जास्त आहे.",
  hinglish: "Ye aapki limit se upar hai.",
  en: "That's above your limit.",
};

const ORDER_READY: Phrases = {
  hi: "ऑर्डर तैयार है। पेमेंट लिंक नीचे है।",
  mr: "ऑर्डर तयार आहे. पेमेंट लिंक खाली आहे.",
  hinglish: "Order ready hai. Payment link neeche hai.",
  en: "Your order is ready. The payment link is below.",
};

/**
 * Trim to whole sentences within the limit, so a clip never ends mid-word.
 *
 * Splits on the Devanagari danda as well as the Latin stops — a Hindi or
 * Marathi reply ends its sentences with "।", and treating only "." as an
 * ending would hand back the entire paragraph.
 */
function firstSentences(text: string, limit: number): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= limit) return trimmed;

  const sentences = trimmed.split(/(?<=[।.!?])\s+/u);
  let out = "";
  for (const s of sentences) {
    const joined = out ? `${out} ${s}` : s;
    if (joined.length > limit) break;
    out = joined;
  }

  /* A single sentence longer than the limit still has to be said. Cut at the
     last word boundary rather than mid-word. */
  if (!out) {
    const cut = trimmed.slice(0, limit);
    const lastSpace = cut.lastIndexOf(" ");
    out = lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut;
  }
  return out.trim();
}

/**
 * The one line she speaks for this reply.
 *
 * Returns "" when there is nothing worth saying — an empty string must not
 * become a TTS request for silence.
 */
export function spokenLine(response: AgentResponse): string {
  const lang = response.language;
  const products = response.data?.products ?? [];

  switch (response.type) {
    case "products":
      if (products.length === 0) break;
      return products.length === 1
        ? ONE_SAREE[lang]
        : MANY_SAREES[lang].replace("{n}", String(products.length));

    case "guardrail_blocked":
      /* Only promise alternatives when alternatives were actually returned.
         Saying "here's what fits" over an empty screen is a lie the buyer
         catches instantly, and it is the guardrail moment — the one the whole
         product is judged on. */
      return products.length > 0
        ? BLOCKED_WITH_ALTERNATIVES[lang]
        : BLOCKED_ALONE[lang];

    case "order_created":
      return ORDER_READY[lang];

    default:
      break;
  }

  /* Everything else — a consent question above all — is the model's own
     wording, and it matters that she hears it verbatim. Just shorter. */
  return firstSentences(response.content, SPOKEN_LIMIT);
}
