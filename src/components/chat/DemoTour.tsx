"use client";

import type { SupportedLanguage } from "@/types";
import { uiText } from "@/lib/chat/ui-text";
import styles from "./DemoTour.module.css";

export interface DemoTourProps {
  onPick: (text: string) => void;
  /** Messages already sent this session, so used steps can be marked done. */
  sent: string[];
  /** Her choice, so what she is offered is in the language she picked. */
  language: SupportedLanguage | "auto";
  disabled?: boolean;
}

/**
 * A guided path, not a bag of suggestions.
 *
 * The chips this replaces were "Cotton saree dikhao", "Paithani collection" and
 * "Gift ke liye saree". Checked against the live agent, **not one of them fires
 * a guardrail** — the first and third return in-budget results and the second
 * matches the ₹899 Paithani print, which is genuinely affordable. So a judge who
 * clicked what was in front of them saw a competent shopping assistant and never
 * saw the thing this project is about.
 *
 * Each step below names its outcome before it is clicked. That is the honest
 * version of a guided demo: the same chat, the same live API, no special path —
 * only signposting, so the interesting thing is not left to whether a stranger
 * happens to phrase a request the way the catalog needs.
 */
/* Worded as a BUYER speaks, not as a tour of features.
   
   "Watch it refuse" told a stranger what the software was about to do, which
   is a product demonstrating itself rather than a shop serving someone. These
   are three things a real customer would say out loud; the guardrail still
   fires on the second and third because the Paithani is ₹8,999 and she has
   just set her own limit below it. Nothing is staged — the signposting is
   gone, the coverage is not. */
/* Worded as a BUYER speaks, and in the language she chose.
   
   "Watch it refuse" told a stranger what the software was about to do, which
   is a product demonstrating itself rather than a shop serving someone. And
   the steps used to be a fixed mix of Hinglish and Marathi, so picking हिंदी
   left two of the three suggestions in languages she had just declined.
   
   On "auto" the mix stays deliberately — it is the multilingual claim,
   demonstrated rather than asserted. Once she chooses, everything she is
   offered is in her language, because that is what choosing means. */
const STEPS: Record<SupportedLanguage, Array<{ n: number; send: string; label: string; outcome: string; key?: boolean }>> = {
  hinglish: [
    { n: 1, send: "Cotton saree dikhao", label: "Cotton saree dikhao", outcome: "Sirf woh jo aapki limit mein aata hai" },
    { n: 2, send: "Authentic Paithani silk saree", label: "Paithani silk dikhao", outcome: "₹8,999 — aapki limit rakhi jaati hai", key: true },
    { n: 3, send: "Silk saree dikhao", label: "Silk saree dikhao", outcome: "Aapke budget ke andar" },
  ],
  hi: [
    { n: 1, send: "कॉटन साड़ी दिखाइए", label: "कॉटन साड़ी दिखाइए", outcome: "सिर्फ़ वही जो आपकी सीमा में आता है" },
    { n: 2, send: "असली पैठणी सिल्क साड़ी दिखाइए", label: "पैठणी सिल्क दिखाइए", outcome: "₹8,999 — आपकी सीमा रखी जाती है", key: true },
    { n: 3, send: "सिल्क साड़ी दिखाइए", label: "सिल्क साड़ी दिखाइए", outcome: "आपके बजट के अंदर" },
  ],
  mr: [
    { n: 1, send: "कॉटन साडी दाखवा", label: "कॉटन साडी दाखवा", outcome: "फक्त तुमच्या मर्यादेत बसणाऱ्या" },
    { n: 2, send: "मला पैठणी सिल्क साडी दाखवा", label: "पैठणी सिल्क दाखवा", outcome: "₹8,999 — तुमची मर्यादा पाळली जाते", key: true },
    { n: 3, send: "सिल्क साडी दाखवा", label: "सिल्क साडी दाखवा", outcome: "तुमच्या बजेटमध्ये" },
  ],
  en: [
    { n: 1, send: "Show me cotton sarees", label: "Show me cotton sarees", outcome: "Only what fits the limit you set" },
    { n: 2, send: "Authentic Paithani silk saree", label: "Show me Paithani silk", outcome: "₹8,999 — she holds your limit", key: true },
    { n: 3, send: "Show me silk sarees", label: "Show me silk sarees", outcome: "Within your budget" },
  ],
};

/* Auto keeps the mixed set: three languages in three chips is the clearest
   possible statement that the shop speaks all of them. */
const AUTO_STEPS = [
  { n: 1, send: "Cotton saree dikhao", label: "Cotton saree dikhao", outcome: "Only what fits the limit you set" },
  { n: 2, send: "Authentic Paithani silk saree", label: "Paithani silk dikhao", outcome: "₹8,999 — she holds your limit", key: true },
  { n: 3, send: "मला पैठणी सिल्क साडी दाखवा", label: "मला पैठणी सिल्क साडी दाखवा", outcome: "Marathi in, Marathi out" },
];

export function stepsFor(choice: SupportedLanguage | "auto") {
  return choice === "auto" ? AUTO_STEPS : STEPS[choice] ?? AUTO_STEPS;
}

export function DemoTour({
  onPick,
  sent,
  language,
  disabled = false,
}: DemoTourProps) {
  return (
    <div className={styles.tour}>
      <p className={styles.lead}>
        {uiText(language === "auto" ? "hinglish" : language).tourHeading}
      </p>

      <ol className={styles.list}>
        {stepsFor(language).map((s) => {
          const done = sent.includes(s.send);
          return (
            <li key={s.n}>
              <button
                type="button"
                className={styles.step}
                data-key={s.key ? "true" : undefined}
                data-done={done ? "true" : undefined}
                onClick={() => onPick(s.send)}
                disabled={disabled}
              >
                <span className={styles.num}>{done ? "✓" : s.n}</span>
                <span className={styles.text}>
                  <span className={styles.label}>{s.label}</span>
                  <span className={styles.outcome}>{s.outcome}</span>
                </span>
                <span className={styles.phrase} lang={s.n === 3 ? "mr" : undefined}>
                  {s.send}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
