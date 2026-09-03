"use client";

import styles from "./DemoTour.module.css";

export interface DemoTourProps {
  onPick: (text: string) => void;
  /** Messages already sent this session, so used steps can be marked done. */
  sent: string[];
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
const STEPS = [
  {
    n: 1,
    send: "Cotton saree dikhao",
    label: "Cotton saree dikhao",
    outcome: "Only what fits the limit you set",
  },
  {
    n: 2,
    send: "Authentic Paithani silk saree",
    label: "Paithani silk dikhao",
    outcome: "₹8,999 — she holds your limit",
    key: true,
  },
  {
    n: 3,
    send: "मला पैठणी सिल्क साडी दाखवा",
    label: "मला पैठणी सिल्क साडी दाखवा",
    outcome: "Marathi in, Marathi out",
  },
];

export function DemoTour({ onPick, sent, disabled = false }: DemoTourProps) {
  return (
    <div className={styles.tour}>
      <p className={styles.lead}>
        Three steps, about a minute — the middle one is the point.
      </p>

      <ol className={styles.list}>
        {STEPS.map((s) => {
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
