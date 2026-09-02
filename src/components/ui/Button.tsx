"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SpinnerIcon } from "./Icon";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary` is saffron and means this action commits — it spends money or
   * confirms an order. Keep one per view; a screen with three primaries has
   * told the buyer nothing.
   */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button with no label. Pass an accessible name via `aria-label`. */
  iconOnly?: boolean;
  /** Fully round. Used for the composer's send control. */
  round?: boolean;
  /** Swaps the label for a spinner and disables the button. */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  round = false,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    iconOnly ? styles.iconOnly : "",
    round ? styles.round : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={loading ? styles.labelHidden : undefined}>{children}</span>
      {loading && (
        <span className={styles.spinnerSlot}>
          <SpinnerIcon
            size={size === "lg" ? 22 : size === "sm" ? 16 : 18}
            className={styles.spinner}
          />
        </span>
      )}
    </button>
  );
}
