"use client";

import { useCallback, useState } from "react";
import type { SupportedLanguage } from "@/types";
import {
  FEEDBACK_CHOICES,
  FEEDBACK_THANKS,
  type FeedbackRating,
} from "@/lib/chat/closing";
import styles from "./FeedbackPrompt.module.css";

export interface FeedbackPromptProps {
  sessionId: string;
  language: SupportedLanguage;
  /** What she bought, so the rating can be read against the actual purchase. */
  productId?: string;
  /** Fired with her thank-you so the agent can SAY it, not just print it. */
  onChosen?: (thanks: string, language: SupportedLanguage) => void;
}

/**
 * How was it?
 *
 * She has already ASKED, out loud, as the last line of her closing message —
 * these are just the ways to answer. That ordering matters: a survey widget
 * that appears unbidden is a form, while a question she asked and buttons to
 * answer it is a conversation.
 *
 * Three taps and no keyboard. The buyer has just paid; asking her to type is
 * asking for one thing too many.
 */
export function FeedbackPrompt({
  sessionId,
  language,
  productId,
  onChosen,
}: FeedbackPromptProps) {
  const [chosen, setChosen] = useState<FeedbackRating | null>(null);
  const choices = FEEDBACK_CHOICES[language] ?? FEEDBACK_CHOICES.hinglish;

  const send = useCallback(
    (rating: FeedbackRating) => {
      /* Acknowledged immediately, before the network. She tapped; the answer
         is hers whether or not our write succeeds, and a spinner here would
         make a one-tap courtesy feel like a transaction. */
      setChosen(rating);
      /* Before the network, like the visible acknowledgement: her answer is
         hers whether or not our write succeeds. */
      onChosen?.(FEEDBACK_THANKS[language] ?? FEEDBACK_THANKS.hinglish, language);
      void fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          rating,
          ...(productId ? { product_id: productId } : {}),
        }),
      }).catch(() => {
        /* Swallowed on purpose — see above. */
      });
    },
    [sessionId, productId, language, onChosen],
  );

  return (
    <div>
      <div className={styles.row} role="group" aria-label="How was your experience?">
        {choices.map((c) => (
          <button
            key={c.rating}
            type="button"
            className={styles.choice}
            data-chosen={chosen === c.rating || undefined}
            onClick={() => send(c.rating)}
            disabled={chosen !== null}
            lang={language === "hi" || language === "mr" ? language : undefined}
          >
            {c.label}
          </button>
        ))}
      </div>

      {chosen && (
        <p className={styles.thanks} role="status">
          {FEEDBACK_THANKS[language] ?? FEEDBACK_THANKS.hinglish}
        </p>
      )}
    </div>
  );
}
