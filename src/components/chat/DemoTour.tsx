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
const STEPS = [
  {
    n: 1,
    send: "1000 ke under cotton saree dikhao",
    label: "Find sarees in budget",
    outcome: "Returns only what fits ₹1,000",
  },
  {
    n: 2,
    send: "Authentic Paithani silk saree",
    label: "Watch it refuse",
    outcome: "₹8,999 — blocked, with alternatives",
    key: true,
  },
  {
    n: 3,
    send: "मला पैठणी सिल्क साडी दाखवा",
    label: "The same refusal, in Marathi",
    outcome: "Understands and answers in her language",
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
