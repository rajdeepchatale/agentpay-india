"use client";

import { AlertIcon, RetryIcon } from "@/components/ui/Icon";
import styles from "./ErrorCard.module.css";

export interface ErrorCardProps {
  /** What went wrong, named plainly. */
  message: string;
  onRetry?: () => void;
  disabled?: boolean;
}

/**
 * The one genuinely red surface. Errors name the problem and the recovery;
 * they do not apologise, and they never blame the buyer.
 */
export function ErrorCard({ message, onRetry, disabled = false }: ErrorCardProps) {
  return (
    <div className={styles.card} role="alert">
      <AlertIcon size={18} className={styles.icon} />
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button
          type="button"
          className={styles.retry}
          onClick={onRetry}
          disabled={disabled}
        >
          <RetryIcon size={15} />
          Try again
        </button>
      )}
    </div>
  );
}
