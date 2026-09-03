import type { ReactNode } from "react";
import styles from "./MessageBubble.module.css";

export interface MessageBubbleProps {
  role: "user" | "agent";
  children: ReactNode;
  /** Devanagari, Latin, or mixed — set so the right face is chosen per run. */
  lang?: string;
  /** Rendered beside the bubble — the speaker on an agent reply. */
  action?: ReactNode;
}

/**
 * The buyer sits right and darker; the agent sits left and lighter.
 *
 * The agent is the one doing the work, so it gets the more present surface —
 * and its bubble is the container the product cards and verdict panels hang
 * off, which only reads correctly if it is the one with weight.
 */
export function MessageBubble({ role, children, lang, action }: MessageBubbleProps) {
  return (
    <div className={role === "user" ? styles.rowUser : styles.rowAgent}>
      <div className={role === "user" ? styles.user : styles.agent} lang={lang}>
        {children}
      </div>
      {action}
    </div>
  );
}
