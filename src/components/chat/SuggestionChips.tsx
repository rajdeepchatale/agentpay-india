"use client";

import styles from "./SuggestionChips.module.css";

export interface SuggestionChipsProps {
  /** Fills the composer and sends in one action. */
  onPick: (text: string) => void;
  disabled?: boolean;
}

/**
 * The three openings.
 *
 * Chosen to walk a judge through the whole system without anyone typing:
 * the first finds sarees she can afford, the second runs into the spending
 * cap, the third shows the agent handling an open-ended ask.
 */
const SUGGESTIONS = [
  "Cotton saree dikhao",
  "Paithani collection",
  "Gift ke liye saree",
];

export function SuggestionChips({ onPick, disabled = false }: SuggestionChipsProps) {
  return (
    <ul className={styles.list}>
      {SUGGESTIONS.map((text) => (
        <li key={text}>
          <button
            type="button"
            className={styles.chip}
            onClick={() => onPick(text)}
            disabled={disabled}
          >
            {text}
          </button>
        </li>
      ))}
    </ul>
  );
}
