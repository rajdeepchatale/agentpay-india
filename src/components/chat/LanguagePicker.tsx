"use client";

import type { SupportedLanguage } from "@/types";
import { LanguageIcon, ChevronDownIcon } from "@/components/ui/Icon";
import styles from "./LanguagePicker.module.css";

/** Her choice, or "auto" to let the agent read it from what she writes. */
export type LanguageChoice = SupportedLanguage | "auto";

export interface LanguagePickerProps {
  value: LanguageChoice;
  onChange: (value: LanguageChoice) => void;
}

/**
 * Choose the language the shop answers in.
 *
 * Detection is good and stays the default — she can just type and be
 * understood. But detection reads the message in front of it, and "ok" or
 * "haan" carries no marker at all, so a Marathi conversation can slip into
 * Hindi on the one turn that confirms a purchase. Choosing pins it.
 *
 * Every option is written in its own language. A picker that lists "Marathi"
 * in English is asking her to read English to escape English.
 */
const OPTIONS: ReadonlyArray<{ value: LanguageChoice; label: string; lang?: string }> = [
  { value: "auto", label: "Auto" },
  { value: "hi", label: "हिंदी", lang: "hi" },
  { value: "mr", label: "मराठी", lang: "mr" },
  { value: "hinglish", label: "Hinglish" },
  { value: "en", label: "English" },
];

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <div className={styles.wrap} data-pinned={value !== "auto" || undefined}>
      <LanguageIcon size={16} className={styles.icon} />
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageChoice)}
        aria-label="Language the shop replies in"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} lang={o.lang}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={14} className={styles.chevron} />
    </div>
  );
}
