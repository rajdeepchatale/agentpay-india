import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "handled"
  | "info"
  | "accent"
  | "zari";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Monospace with tabular figures — for order IDs and amounts. */
  mono?: boolean;
  /** Leading glyph. Pass an icon component, never an emoji. */
  icon?: ReactNode;
  children?: ReactNode;
}

export function Badge({
  tone = "neutral",
  mono = false,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[tone],
    mono ? styles.mono : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {icon}
      {children}
    </span>
  );
}
