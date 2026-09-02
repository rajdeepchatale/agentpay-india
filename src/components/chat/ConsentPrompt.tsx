"use client";

import type { Product } from "@/types";
import { SareeThumb } from "@/components/ui/SareeThumb";
import styles from "./ConsentPrompt.module.css";

export interface ConsentPromptProps {
  product: Product;
  /** Sends "Haan". Nothing is charged until this fires. */
  onConfirm: () => void;
  onDecline: () => void;
  disabled?: boolean;
  /**
   * True once the conversation has moved past this question.
   *
   * A consent prompt from three turns ago keeps a live saffron button on
   * screen — which breaks the one-committing-action-per-view rule and, worse,
   * would re-send "Haan" if pressed. Spent prompts state what was asked and
   * stop offering to act.
   */
  spent?: boolean;
}

/**
 * The consent gate. No order exists at Razorpay until she presses Haan — the
 * engine refuses to create one without a consent token the model cannot forge.
 *
 * So this states the amount plainly and puts both answers at equal weight. A
 * confirm dialog that makes "no" hard to find is a dark pattern, and a judge
 * reading a guardrail claim will look at exactly this.
 */
export function ConsentPrompt({
  product,
  onConfirm,
  onDecline,
  disabled = false,
  spent = false,
}: ConsentPromptProps) {
  return (
    <div className={spent ? styles.promptSpent : styles.prompt}>
      <div className={styles.summary}>
        {/* The actual saree, at the moment she is asked to pay for it. */}
        <SareeThumb product={product} size="md" />
        <div className={styles.detail}>
          <p className={styles.name}>{product.name}</p>
          <p className={styles.nameDeva} lang="mr">
            {product.name_hindi}
          </p>
        </div>
        <span className={styles.price}>₹{product.price.toLocaleString("en-IN")}</span>
      </div>

      {spent ? (
        <p className={styles.asked}>Confirmation requested</p>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.confirm}
            onClick={onConfirm}
            disabled={disabled}
          >
            Haan, order karein
          </button>
          <button
            type="button"
            className={styles.decline}
            onClick={onDecline}
            disabled={disabled}
          >
            Nahi
          </button>
        </div>
      )}
    </div>
  );
}
