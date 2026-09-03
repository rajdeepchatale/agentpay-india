"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { SareeThumb } from "@/components/ui/SareeThumb";
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

/* Real catalog rows, with the real photographs. Colours stay as the fallback
   for any file not yet generated — the same two-layer behaviour the chat uses,
   so the landing page never shows a hole where a saree should be. */
const PRODUCTS = [
  {
    id: "prod_001",
    name: "Handloom Cotton — Mango Motif",
    deva: "हातमाग कॉटन साडी",
    price: 599,
    colors: ["Green", "Yellow Border"],
    image_url: "/products/cotton-mango-saree.jpg",
  },
  {
    id: "prod_002",
    name: "Chanderi Cotton Silk",
    deva: "चंदेरी कॉटन सिल्क साडी",
    price: 799,
    colors: ["Maroon", "Gold Border"],
    image_url: "/products/chanderi-peacock-saree.jpg",
  },
  {
    id: "prod_005",
    name: "Paithani Print",
    deva: "पैठणी प्रिंट साडी",
    price: 899,
    colors: ["Purple", "Gold Print"],
    image_url: "/products/paithani-print-cotton.jpg",
  },
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
  /* Advances to the end and STOPS. It used to wrap with % and replay forever:
     motion that never resolves competes with the headline for attention, and
     the reader has to wait out a loop to see the beat that matters. Playing
     once and resting on the block leaves the guardrail — the whole thesis —
     on screen for as long as they look at it. */
  const [step, advance] = useReducer(
    (n: number) => Math.min(n + 1, SCRIPT.length),
    0,
  );
  const finished = step >= SCRIPT.length;
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /* Stop advancing once it has scrolled away. A conversation animating behind
     the reader is noise, and on a phone it is noise that costs battery. */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* The thread scrolls inside a fixed frame, so follow each new beat down. */
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step]);

  useEffect(() => {
    if (paused || !inView || finished) return;
    const beat = SCRIPT[step];
    if (!beat) return;
    const t = setTimeout(advance, reduced.current ? DWELL[beat.kind] * 2 : DWELL[beat.kind]);
    return () => clearTimeout(t);
  }, [step, paused, inView, finished]);

  const shown = SCRIPT.slice(0, step);

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.chrome}>
        <span className={styles.shop}>Sakhi Sarees</span>
        <span className={styles.replay}>replay of a real session</span>
      </div>

      <div className={styles.thread} ref={threadRef}>
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
                    <article key={p.id} className={styles.card}>
                      <span className={styles.figure}>
                        <SareeThumb product={p} className={styles.photo} />
                      </span>
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
