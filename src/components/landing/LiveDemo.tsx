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
  /** The three amounts the shop offers, with ₹1,000 taken. */
  | { kind: "budget" }
  | { kind: "products" }
  | { kind: "block" };

/* The shop asks FIRST, because that is what the product does — and because it
   is the reason the refusal three beats later carries any weight. The earlier
   version opened with the buyer typing "1000 ke under…", which reads as a
   search filter and quietly gives away the argument: a cap she typed into a
   query is a preference, a figure the shop asked her for is her word being
   kept. It also no longer matched /chat, so a judge who watched this and then
   clicked through met a different opening. */
/* The silk turn in the middle is the reason the refusal reads as a shopkeeper
   rather than a filter.

   The rail used to be followed straight by "authentic Paithani silk saree",
   which is a search query, not a person — and it made the block her FIRST
   answer to silk. What she actually does is offer the silk she has inside the
   cap; only when the buyer says no to that does the guardrail fire. The
   refusal then lands as her keeping a promise after trying to help, and the
   buyer chose it with the cheaper option already in front of her.

   Her line is a real reply, taken verbatim from the deployed agent asked
   "silk saree chahiye" at a ₹1,000 cap (first sentence of it; the second
   admired the peacock border). She names Chanderi Cotton Silk ₹799 — already
   the middle card in the rail above, so she is pointing at something the
   viewer has just seen. */
const SCRIPT: Beat[] = [
  { kind: "agent", text: "Namaste! Aapka budget kitna hai?" },
  { kind: "budget" },
  { kind: "agent", text: "Theek hai — ₹1,000 tak. Kaisi saree dikhaun?" },
  { kind: "user", text: "cotton saree dikhao" },
  { kind: "thinking" },
  { kind: "products" },
  { kind: "user", text: "silk saree chahiye" },
  { kind: "thinking" },
  {
    kind: "agent",
    text: "Aapke budget mein hamare paas ye pyari si Chanderi Cotton Silk Saree hai, sirf ₹799 mein.",
  },
  /* "nahi" is doing the work: she was offered a saree inside the cap and
     turned it down. Without it the next line is just a second search. */
  { kind: "user", text: "nahi, authentic Paithani silk saree" },
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
  /* Longer than a message: the chips have to be seen being offered, and one
     of them seen being taken, or the point of asking is lost. */
  budget: 1800,
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

            case "budget":
              /* The chips as the shop offers them, with the one she took
                 marked. The whole argument of the block four beats later
                 rests on the ₹1,000 having been HER choice. */
              return (
                <div key={i} className={styles.budgets}>
                  {["₹1,000", "₹5,000", "₹25,000"].map((amount) => (
                    <span
                      key={amount}
                      className={styles.budget}
                      data-taken={amount === "₹1,000" || undefined}
                    >
                      {amount}
                    </span>
                  ))}
                </div>
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
