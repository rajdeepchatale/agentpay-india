"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { AuditEntry } from "@/types";
import { readSessionId } from "@/lib/chat/session";
import { groupByTurn } from "@/lib/audit/present";
import { AuditEntryRow } from "./AuditEntryRow";
import { Button } from "@/components/ui/Button";
import { RetryIcon, ShieldIcon } from "@/components/ui/Icon";
import styles from "./AuditTrailViewer.module.css";

/* Session id, resolved once: the URL param if present, else whatever the chat
   stored in localStorage. Cached at module scope so the snapshot is stable. */
const subscribeNever = () => () => {};
let sessionSnapshot: string | undefined;
const getSessionId = () => {
  if (sessionSnapshot === undefined) {
    const fromUrl = new URLSearchParams(window.location.search).get("session_id");
    sessionSnapshot = fromUrl?.trim() || readSessionId(window.localStorage);
  }
  return sessionSnapshot;
};

type Load =
  | { state: "loading" }
  | { state: "ready"; entries: AuditEntry[] }
  | { state: "empty" }
  | { state: "error"; message: string };

export function AuditTrailViewer() {
  /* ?session_id= wins, then whatever the chat stored. Reading the URL first is
     what makes a trail shareable — a judge can be handed a link. Read through
     useSyncExternalStore rather than a setState in an effect, and cached at
     module scope so the value is stable across renders. */
  const sessionId = useSyncExternalStore(subscribeNever, getSessionId, () => "");
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [reloads, setReloads] = useState(0);

  /* Every setLoad below happens after an await, never synchronously in the
     effect body — synchronous state writes here cause a cascading render. */
  useEffect(() => {
    if (!sessionId) {
      void Promise.resolve().then(() => setLoad({ state: "empty" }));
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/audit?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoad({ state: "error", message: "Could not read the audit trail." });
          return;
        }
        const data = (await res.json()) as { entries?: AuditEntry[] };
        if (cancelled) return;
        const entries = data.entries ?? [];
        setLoad(entries.length ? { state: "ready", entries } : { state: "empty" });
      } catch {
        if (!cancelled) {
          setLoad({ state: "error", message: "Connection lost. Check your internet." });
        }
      }
    })();

    /* A refresh mid-flight must not have the stale response land after it. */
    return () => {
      cancelled = true;
    };
  }, [sessionId, reloads]);

  const refresh = useCallback(() => {
    setLoad({ state: "loading" });
    setReloads((n) => n + 1);
  }, []);

  const entries = load.state === "ready" ? load.entries : [];
  const turns = groupByTurn(entries);
  const blocked = entries.filter((e) => e.guardrail_status === "blocked").length;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.masthead}>
          <a className={styles.back} href="/chat">
            ← Back to chat
          </a>
          <h1 className={styles.title}>Audit trail</h1>
        </div>

        <div className={styles.tools}>
          {sessionId && (
            <code className={styles.session} title={sessionId}>
              {sessionId.slice(0, 8)}…
            </code>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={!sessionId || load.state === "loading"}
          >
            <RetryIcon size={15} />
            Refresh
          </Button>
        </div>
        <span className={styles.selvedge} aria-hidden="true" />
      </header>

      <div className={styles.scroll}>
        <div className={styles.body}>
          {load.state === "ready" && (
            <>
              <p className={styles.lead}>
                Every decision this session made, with the reasoning behind it —
                written as it happened, not reconstructed afterwards.
              </p>

              <dl className={styles.stats}>
                <div className={styles.stat}>
                  <dt className={styles.statKey}>Decisions</dt>
                  <dd className={styles.statValue}>{entries.length}</dd>
                </div>
                <div className={styles.stat}>
                  <dt className={styles.statKey}>Turns</dt>
                  <dd className={styles.statValue}>{turns.length}</dd>
                </div>
                <div className={styles.stat} data-blocked={blocked > 0}>
                  <dt className={styles.statKey}>Blocked</dt>
                  <dd className={styles.statValue}>{blocked}</dd>
                </div>
              </dl>

              {turns.map((turn, i) => (
                <section key={i} className={styles.turn}>
                  <h2 className={styles.turnHead}>
                    Turn {i + 1}
                    {turn.hasBlock && (
                      <span className={styles.turnBlocked}>
                        <ShieldIcon size={12} />
                        guardrail fired
                      </span>
                    )}
                  </h2>
                  <ul className={styles.list}>
                    {turn.entries.map((e) => (
                      <AuditEntryRow key={e.id} entry={e} />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}

          {load.state === "loading" && (
            <ul className={styles.list} aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className={styles.skeleton} />
              ))}
            </ul>
          )}

          {load.state === "empty" && (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>Nothing logged yet</h2>
              <p className={styles.emptyBody}>
                Start a conversation and every search, guardrail check and order
                will appear here with the reasoning behind it.
              </p>
              <a className={styles.emptyCta} href="/chat">
                Open the chat
              </a>
            </div>
          )}

          {load.state === "error" && (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>{load.message}</h2>
              <p className={styles.emptyBody}>The trail could not be loaded.</p>
              <button
                type="button"
                className={styles.emptyCta}
                onClick={refresh}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
