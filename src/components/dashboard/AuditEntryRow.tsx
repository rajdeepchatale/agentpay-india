"use client";

import { useState } from "react";
import type { AuditEntry } from "@/types";
import { toneFor, labelFor, summarise, formatClock } from "@/lib/audit/present";
import { ChevronRightIcon } from "@/components/ui/Icon";
import styles from "./AuditEntryRow.module.css";

export interface AuditEntryRowProps {
  entry: AuditEntry;
}

/**
 * One decision.
 *
 * Collapsed it reads as a line a judge can scan; expanded it shows the exact
 * input and output JSON. Both matter — the summary is what makes forty entries
 * readable, and the JSON is what makes the claim checkable rather than
 * decorative.
 */
export function AuditEntryRow({ entry }: AuditEntryRowProps) {
  const [open, setOpen] = useState(false);
  const tone = toneFor(entry);
  const blocked = entry.guardrail_status === "blocked";

  return (
    <li className={styles.row} data-tone={tone}>
      {/* Tone lives in the woven band, never a thick bar down one side. */}
      <span className={styles.band} aria-hidden="true" />

      <button
        type="button"
        className={styles.head}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronRightIcon
          size={14}
          className={open ? styles.caretOpen : styles.caret}
        />
        <time className={styles.clock} dateTime={entry.timestamp}>
          {formatClock(entry.timestamp)}
        </time>
        <span className={styles.label}>{labelFor(entry.action)}</span>
        {blocked && <span className={styles.blocked}>blocked</span>}
        <span className={styles.summary}>{summarise(entry)}</span>
      </button>

      <p className={styles.reasoning}>{entry.reasoning}</p>

      {open && (
        <div className={styles.detail}>
          <div className={styles.pane}>
            <p className={styles.paneLabel}>Input</p>
            <pre className={styles.json}>{JSON.stringify(entry.input, null, 2)}</pre>
          </div>
          <div className={styles.pane}>
            <p className={styles.paneLabel}>Output</p>
            <pre className={styles.json}>{JSON.stringify(entry.output, null, 2)}</pre>
          </div>
        </div>
      )}
    </li>
  );
}
