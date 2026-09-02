"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/types";
import { toneFor, labelFor, summarise, formatClock } from "@/lib/audit/present";
import { ShieldIcon, ChevronRightIcon } from "@/components/ui/Icon";
import styles from "./GuardrailRail.module.css";

export interface GuardrailRailProps {
  sessionId: string;
  spendLimit: number;
  /** Bumped when a turn settles, so the rail refetches at the right moment. */
  turn: number;
  /** Highest amount the buyer has reached for this session, in ₹. */
  attempted: number | null;
}

/**
 * The machinery, made visible while it runs.
 *
 * During a live demo the guardrail engine is invisible: a refusal just looks
 * like the model being tactful. The audit trail proves otherwise, but only
 * after navigating away from the conversation.
 *
 * This rail reads that same trail — `GET /api/audit` — rather than
 * reconstructing one from the responses the client already holds. The
 * distinction is the whole point: what is on screen is what was *logged*, so
 * someone watching is watching the evidence, not a client-side echo of it.
 */
export function GuardrailRail({
  sessionId,
  spendLimit,
  turn,
  attempted,
}: GuardrailRailProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/audit?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { entries?: AuditEntry[] };
        if (!cancelled) setEntries(data.entries ?? []);
      } catch {
        /* The rail is supporting evidence. It must never take down the chat. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, turn]);

  const blocked = entries.filter((e) => e.guardrail_status === "blocked").length;
  const over = attempted !== null && attempted > spendLimit;
  /* The cap always occupies the full track when nothing has exceeded it; once
     something has, the track becomes the attempt and the cap a fraction of it —
     the same geometry the block card uses. */
  const capPct = over ? Math.max((spendLimit / attempted) * 100, 2) : 100;

  return (
    <aside className={styles.rail} aria-label="Guardrail state">
      <span className={styles.selvedge} aria-hidden="true" />

      <header className={styles.head}>
        <ShieldIcon size={15} className={styles.shield} />
        <h2 className={styles.title}>Guardrails</h2>
        <span className={styles.live}>live</span>
      </header>

      <section className={styles.capBlock}>
        <p className={styles.capLabel}>Spending limit</p>
        <div className={styles.track} data-over={over}>
          <span
            className={styles.within}
            style={{ "--pct": capPct / 100 } as React.CSSProperties}
          />
          {over && <span className={styles.over} style={{ left: `${capPct}%` }} />}
          {over && <span className={styles.mark} style={{ left: `${capPct}%` }} />}
        </div>
        <div className={styles.capScale}>
          <span className={styles.money}>₹{spendLimit.toLocaleString("en-IN")}</span>
          {over && (
            <span className={styles.attempted}>
              asked for ₹{attempted.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </section>

      <section className={styles.counts}>
        <div>
          <p className={styles.countKey}>Decisions</p>
          <p className={styles.countValue}>{entries.length}</p>
        </div>
        <div data-blocked={blocked > 0}>
          <p className={styles.countKey}>Blocked</p>
          <p className={styles.countValue}>{blocked}</p>
        </div>
      </section>

      <div className={styles.feed}>
        {entries.length === 0 ? (
          <p className={styles.idle}>
            Nothing decided yet. Every search, guardrail check and order appears
            here as it is written to the audit trail.
          </p>
        ) : (
          <ul className={styles.list}>
            {/* Newest first: the thing that just happened is what is being
                watched, and it should not be at the bottom of a scroll. */}
            {[...entries].reverse().map((e) => (
              <li key={e.id} className={styles.entry} data-tone={toneFor(e)}>
                <p className={styles.entryHead}>
                  <time dateTime={e.timestamp}>{formatClock(e.timestamp)}</time>
                  <b>{labelFor(e.action)}</b>
                  {e.guardrail_status === "blocked" && (
                    <span className={styles.blockedTag}>blocked</span>
                  )}
                </p>
                <p className={styles.entrySummary}>{summarise(e)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <a
        className={styles.more}
        href={`/dashboard?session_id=${encodeURIComponent(sessionId)}`}
      >
        Full audit trail, with reasoning
        <ChevronRightIcon size={14} />
      </a>
    </aside>
  );
}
