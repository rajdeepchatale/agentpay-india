import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

/**
 * Tones the chat surface needs later: `success` for a created order, `warning`
 * for a guardrail block, `handled` for a failure the agent recovered from,
 * `error` for one it did not, `info` for audit entries.
 */
export type CardTone =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "handled"
  | "info"
  | "accent";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  padding?: "none" | "sm" | "md" | "lg";
  /** Raises the card onto the elevated surface colour. */
  elevated?: boolean;
  /** Draws the woven selvedge band across the head of the panel. */
  band?: boolean;
  /**
   * Hover lift only — this renders a `<div>`, so it is NOT keyboard
   * reachable. The real action must live in a `<button>` inside the card
   * (e.g. ProductCard's "Select"). Never attach the only click handler here.
   */
  interactive?: boolean;
  children?: ReactNode;
}

const padMap = {
  none: styles.padNone,
  sm: styles.padSm,
  md: styles.padMd,
  lg: styles.padLg,
} as const;

export function Card({
  tone = "neutral",
  padding = "md",
  elevated = false,
  band = false,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[tone],
    padMap[padding],
    elevated ? styles.elevated : "",
    interactive ? styles.interactive : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {band && <span className={styles.band} aria-hidden="true" />}
      {children}
    </div>
  );
}
