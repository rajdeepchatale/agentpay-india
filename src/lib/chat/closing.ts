import type { Product, SupportedLanguage } from "@/types";

/**
 * The last thing she says.
 *
 * A shopkeeper does not fall silent the moment the money arrives — that is
 * when she is warmest. The buyer used to come back from the payment page to a
 * static banner: no confirmation in her voice, no next step, no thanks, no
 * question. Everywhere else in this product she talks; at the close she was
 * mute.
 *
 * Templated rather than model-generated, deliberately. This is the closing
 * beat of a real purchase and of the demo. An LLM call here can be slow, can
 * drift, or can fail, and there is no recovering from the agent going quiet
 * immediately after money has left someone's account.
 *
 * Dispatched into the conversation as an ordinary agent message, which is what
 * makes it spoken: the existing "speak each agent reply" effect picks it up
 * with no new voice code at all.
 */

/** Rupees, grouped the Indian way — ₹1,25,000 rather than ₹125,000. */
const rupees = (n: number) => n.toLocaleString("en-IN");

type Closing = {
  /** Payment landed, naming what was bought. */
  withProduct: (name: string, price: string) => string;
  /** The same close when the product id cannot be resolved. */
  generic: string;
};

/* Every line follows the buyer-gender rule the rest of the copy follows:
   imperatives (आइए, पुन्हा या, aaiye) or verbs agreeing with a noun — never
   with the buyer. The feedback question is part of what she SAYS, so it is
   spoken rather than rendered as a silent survey widget. */
const CLOSINGS: Record<SupportedLanguage, Closing> = {
  hinglish: {
    withProduct: (name, price) =>
      `Payment mil gaya — dhanyavaad! Aapka ${name} ka order ₹${price} mein confirm ho gaya hai. Sakhi Sarees se delivery ka update jald hi milega. Phir aaiye — nayi sarees aati rehti hain! Aapka experience kaisa raha?`,
    generic:
      "Payment mil gaya — dhanyavaad! Aapka order confirm ho gaya hai. Sakhi Sarees se delivery ka update jald hi milega. Phir aaiye — nayi sarees aati rehti hain! Aapka experience kaisa raha?",
  },
  hi: {
    withProduct: (name, price) =>
      `पेमेंट मिल गया — धन्यवाद! आपका ${name} का ऑर्डर ₹${price} में कन्फर्म हो गया है। सखी साड़ीज़ से डिलीवरी का अपडेट जल्द ही मिलेगा। फिर आइए — नई साड़ियाँ आती रहती हैं! आपका अनुभव कैसा रहा?`,
    generic:
      "पेमेंट मिल गया — धन्यवाद! आपका ऑर्डर कन्फर्म हो गया है। सखी साड़ीज़ से डिलीवरी का अपडेट जल्द ही मिलेगा। फिर आइए — नई साड़ियाँ आती रहती हैं! आपका अनुभव कैसा रहा?",
  },
  mr: {
    withProduct: (name, price) =>
      `पेमेंट मिळालं — धन्यवाद! तुमची ${name} ऑर्डर ₹${price} मध्ये कन्फर्म झाली आहे. सखी साड्यांकडून डिलिव्हरीचा अपडेट लवकरच मिळेल. पुन्हा या — नवीन साड्या येत असतात! तुमचा अनुभव कसा होता?`,
    generic:
      "पेमेंट मिळालं — धन्यवाद! तुमची ऑर्डर कन्फर्म झाली आहे. सखी साड्यांकडून डिलिव्हरीचा अपडेट लवकरच मिळेल. पुन्हा या — नवीन साड्या येत असतात! तुमचा अनुभव कसा होता?",
  },
  en: {
    withProduct: (name, price) =>
      `Payment received — thank you! Your ${name} order is confirmed at ₹${price}. Sakhi Sarees will send a delivery update shortly. Do come again — new sarees arrive all the time. How was your experience?`,
    generic:
      "Payment received — thank you! Your order is confirmed. Sakhi Sarees will send a delivery update shortly. Do come again — new sarees arrive all the time. How was your experience?",
  },
};

export function closingMessage(
  product: Product | undefined,
  language: SupportedLanguage,
): string {
  const copy = CLOSINGS[language] ?? CLOSINGS.hinglish;
  /* A stale or edited link still gets a proper goodbye rather than a sentence
     with a hole in it. */
  if (!product) return copy.generic;

  const name = language === "hi" || language === "mr" ? product.name_hindi || product.name : product.name;
  return copy.withProduct(name, rupees(product.price));
}

/** Stable across languages — the dashboard groups on these, not on labels. */
export type FeedbackRating = "good" | "ok" | "poor";

export interface FeedbackChoice {
  rating: FeedbackRating;
  label: string;
}

/* Three taps, no keyboard. She has just paid; asking her to type is asking
   for one thing too many. */
export const FEEDBACK_CHOICES: Record<SupportedLanguage, FeedbackChoice[]> = {
  hinglish: [
    { rating: "good", label: "Bahut acchha" },
    { rating: "ok", label: "Theek" },
    { rating: "poor", label: "Behtar ho sakta hai" },
  ],
  hi: [
    { rating: "good", label: "बहुत अच्छा" },
    { rating: "ok", label: "ठीक" },
    { rating: "poor", label: "बेहतर हो सकता है" },
  ],
  mr: [
    { rating: "good", label: "खूप छान" },
    { rating: "ok", label: "ठीक" },
    { rating: "poor", label: "अजून चांगलं होऊ शकतं" },
  ],
  en: [
    { rating: "good", label: "Very good" },
    { rating: "ok", label: "Fine" },
    { rating: "poor", label: "Could be better" },
  ],
};

/** Her reply to a tap — acknowledged in her own words, not a toast. */
export const FEEDBACK_THANKS: Record<SupportedLanguage, string> = {
  hinglish: "Dhanyavaad! Aapki baat Sakhi Sarees tak pahunch gayi.",
  hi: "धन्यवाद! आपकी बात सखी साड़ीज़ तक पहुँच गई।",
  mr: "धन्यवाद! तुमचा अभिप्राय सखी साड्यांपर्यंत पोहोचला.",
  en: "Thank you — that's gone straight to Sakhi Sarees.",
};
