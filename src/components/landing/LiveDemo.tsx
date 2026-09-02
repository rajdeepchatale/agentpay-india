"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import styles from "./LiveDemo.module.css";

/**
 * A replay of a real session, on a loop.
 *
 * The brief is explicit that the first viewport must demonstrate the mechanism
 * rather than describe it — a static hero that only claims the agent works is
 * the weakest version of this page.
 *
 * Every line below is what the deployed agent actually returns, and the block
 * carries the real catalog prices. It is labelled a replay, not dressed as a
 * live socket: the live one is a click away, and pretending otherwise would
 * fail the same honesty test as claiming voice.
 */

type Beat =
  | { kind: "user"; text: string }
  | { kind: "thinking" }
  | { kind: "agent"; text: string }
  | { kind: "products" }
  | { kind: "block" };

const SCRIPT: Beat[] = [
  { kind: "user", text: "1000 ke under cotton saree dikhao" },
  { kind: "thinking" },
  {
    kind: "agent",
    text: "Aapke ₹1,000 ke budget mein yeh sundar cotton sarees hain:",
  },
  { kind: "products" },
  { kind: "user", text: "authentic Paithani silk saree" },
  { kind: "thinking" },
  { kind: "block" },
];

const PRODUCTS = [
  { name: "Handloom Cotton — Mango Motif", deva: "हातमाग कॉटन साडी", price: 599, body: "#3f7d4e", edge: "#d9a520" },
  { name: "Chanderi Cotton Silk", deva: "चंदेरी कॉटन सिल्क साडी", price: 799, body: "#31407a", edge: "#e6e3dc" },
  { name: "Paithani Print", deva: "पैठणी प्रिंट साडी", price: 899, body: "#553272", edge: "#c9a227" },
];

/** How long each beat holds before the next arrives. */
const DWELL: Record<Beat["kind"], number> = {
  user: 900,
  thinking: 1100,
  agent: 1000,
  products: 2400,
  block: 5200,
};

export function LiveDemo() {
  const [step, advance] = useReducer((n: number) => (n + 1) % (SCRIPT.length + 1), 0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused) return;
    const beat = SCRIPT[step];
    /* Past the last beat, hold on the block — it is the point of the replay —
       then start again. */
    const ms = beat ? DWELL[beat.kind] : 2600;
    const t = setTimeout(advance, reduced.current ? ms * 2 : ms);
    return () => clearTimeout(t);
  }, [step, paused]);

  const shown = SCRIPT.slice(0, step);

  return (
    <div
      className={styles.frame}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.chrome}>
        <span className={styles.shop}>Sakhi Sarees</span>
        <span className={styles.replay}>replay of a real session</span>
      </div>

      <div className={styles.thread}>
        {shown.map((beat, i) => {
          switch (beat.kind) {
            case "user":
              return (
                <p key={i} className={styles.user}>
                  {beat.text}
                </p>
              );

            case "thinking":
              return (
                <span key={i} className={styles.thinking} aria-hidden="true">
                  <i /> <i /> <i />
                </span>
              );

            case "agent":
              return (
                <p key={i} className={styles.agent} lang="mr">
                  {beat.text}
                </p>
              );

            case "products":
              return (
                <div key={i} className={styles.rail}>
                  {PRODUCTS.map((p) => (
                    <article
                      key={p.name}
                      className={styles.card}
                      style={
                        { "--body": p.body, "--edge": p.edge } as React.CSSProperties
                      }
                    >
                      <span className={styles.cloth} aria-hidden="true" />
                      <p className={styles.cardName}>{p.name}</p>
                      <p className={styles.cardDeva} lang="mr">
                        {p.deva}
                      </p>
                      <p className={styles.cardPrice}>₹{p.price}</p>
                    </article>
                  ))}
                </div>
              );

            case "block":
              return (
                <div key={i} className={styles.block}>
                  <span className={styles.blockEdge} aria-hidden="true" />
                  <p className={styles.blockHead}>Over your limit</p>
                  <p className={styles.blockSubject}>Pure Silk Paithani — Peacock Pallu</p>

                  <div className={styles.meter}>
                    <span className={styles.within} />
                    <span className={styles.over} />
                    <span className={styles.edgeMark} />
                  </div>
                  <div className={styles.scale}>
                    <span>
                      <b className={styles.money}>₹1,000</b> your limit
                    </span>
                    <span className={styles.attempted}>
                      <b className={styles.money}>₹8,999</b>
                      <em className={styles.ratio}>9× over</em>
                    </span>
                  </div>
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
