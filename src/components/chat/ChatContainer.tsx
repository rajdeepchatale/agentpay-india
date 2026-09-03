"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { AgentResponse, Product } from "@/types";
import { chatReducer, initialChatState } from "@/lib/chat/machine";
import { readSessionId } from "@/lib/chat/session";
import { useAgentVoice } from "@/lib/chat/useAgentVoice";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { SpeakButton } from "./SpeakButton";
import { TypingIndicator } from "./TypingIndicator";
import { ProductCard } from "./ProductCard";
import { GuardrailAlert } from "./GuardrailAlert";
import { ConsentPrompt } from "./ConsentPrompt";
import { OrderConfirmation } from "./OrderConfirmation";
import { FailureCard } from "./FailureCard";
import { ErrorCard } from "./ErrorCard";
import { DemoTour } from "./DemoTour";
import { SettingsModal } from "./SettingsModal";
import { GuardrailRail } from "./GuardrailRail";
import { SettingsIcon, CheckIcon, ShieldIcon, SpeakerIcon, MuteIcon } from "@/components/ui/Icon";
import styles from "./ChatContainer.module.css";

const TIMEOUT_MS = 30_000;
const DEFAULT_SPEND = 1000;

/* Kept beside the tour so the two cannot drift: if a step's wording changes,
   the "all done" check changes with it. */
const TOUR_SENDS = [
  "1000 ke under cotton saree dikhao",
  "Authentic Paithani silk saree",
  "मला पैठणी सिल्क साडी दाखवा",
];

const WELCOME =
  "Namaste! Main Sakhi Sarees ki AI shopping assistant hoon. Hamare paas authentic Paithani, handloom cotton, aur silk sarees hain. Aap Hindi, Marathi, Hinglish ya English mein baat kar sakti hain! Kya dhundh rahi hain?";

/* ---------------------------------------------------------------
   The post-payment return, read once.

   Cached at module scope on purpose: the effect below strips `?paid=` from
   the URL, so a snapshot that re-read `window.location` would return null on
   the next render and the confirmation would flash and disappear.
   --------------------------------------------------------------- */
const subscribeNever = () => () => {};

let paidSnapshot: string | null | undefined;
const getPaid = () => {
  if (paidSnapshot === undefined) {
    paidSnapshot = new URLSearchParams(window.location.search).get("paid");
  }
  return paidSnapshot;
};
const getPaidServer = () => null;

/* The session id, read the same way. It has to be reactive rather than a ref
   because the audit-trail link in the header is built from it — a ref would
   leave that href stale on first paint. */
let sessionSnapshot: string | undefined;
const getSession = () => {
  if (sessionSnapshot === undefined) sessionSnapshot = readSessionId(window.localStorage);
  return sessionSnapshot;
};
const getSessionServer = () => "";

export function ChatContainer() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [spendLimit, setSpendLimit] = useState(DEFAULT_SPEND);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useAgentVoice();
  const { speak, silence: silenceVoice } = voice;

  /* Both read through useSyncExternalStore — the same pattern Modal uses for
     client-only state. It reports server-vs-client without a setState in an
     effect, so there is no cascading render, and the snapshots are cached at
     module scope so a later URL rewrite cannot make them change underneath. */
  const sessionId = useSyncExternalStore(subscribeNever, getSession, getSessionServer);
  const paidFor = useSyncExternalStore(subscribeNever, getPaid, getPaidServer);

  /* Remove the query param once seen. A refresh or a shared link should not
     replay a payment confirmation. This is a write to an external system —
     the URL — which is what effects are actually for. */
  useEffect(() => {
    if (paidFor) window.history.replaceState({}, "", window.location.pathname);
  }, [paidFor]);

  /* She greets on the first gesture, wherever it lands — not only on a tour
     step. A shopkeeper looks up when you walk in; she does not wait to be
     addressed through one particular door.

     This is as early as it can honestly be. Browsers refuse audio until a
     gesture, so a greeting on page load plays to nobody in Chrome and Safari
     alike.

     If the first gesture happens to start a conversation — a tour step, a
     sent message, an opened microphone — that path silences her, which
     cancels this greeting before it is audible. That is the right outcome: a
     buyer who walks in already asking gets an answer, not a formality. */
  const { unlock } = voice;
  useEffect(() => {
    const greet = () => unlock(WELCOME, "hinglish");
    window.addEventListener("pointerdown", greet, { once: true });
    window.addEventListener("keydown", greet, { once: true });
    return () => {
      window.removeEventListener("pointerdown", greet);
      window.removeEventListener("keydown", greet);
    };
  }, [unlock]);

  /* Speak each agent reply as it lands — once. Keyed on the message id rather
     than a count, so a re-render never replays a line she already heard. */
  const spokenRef = useRef<string | null>(null);
  const lastAgent = state.messages[state.messages.length - 1];
  const lastAgentId =
    lastAgent?.role === "agent" && lastAgent.response?.content ? lastAgent.id : null;

  useEffect(() => {
    if (!lastAgentId || spokenRef.current === lastAgentId) return;
    const msg = state.messages.find((m) => m.id === lastAgentId);
    if (!msg?.response?.content) return;
    spokenRef.current = lastAgentId;
    speak(msg.response.content, msg.response.language);
    /* Keyed on the message id, not the array: a re-render must never replay a
       line she has already heard. */
  }, [lastAgentId, speak, state.messages]);

  /* Follow the conversation as it grows. */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages.length, state.status]);

  const request = useCallback(
    async (message: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            guardrails: { max_spend: spendLimit },
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          dispatch({ kind: "failed", error: "Something went wrong. Try again?" });
          return;
        }

        const response: AgentResponse = await res.json();
        dispatch({ kind: "received", response });
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        dispatch({
          kind: "failed",
          error: aborted
            ? "The agent is taking longer than usual. Please wait or try again."
            : "Connection lost. Check your internet and try again.",
        });
      } finally {
        clearTimeout(timer);
      }
    },
    [spendLimit, sessionId],
  );

  const send = useCallback(
    (text: string) => {
      /* She is talking, so the agent stops. Talking over a customer is the
         one thing a shopkeeper never does. */
      silenceVoice();
      const message = text.trim();
      /* The reducer is the single authority on whether a send is allowed —
         checking status here as well would let the two disagree. */
      if (!message || state.status === "sending") return;
      dispatch({ kind: "send", text: message });
      void request(message);
    },
    [request, state.status, silenceVoice],
  );

  const retry = useCallback(() => {
    if (!state.lastSent) return;
    dispatch({ kind: "retry" });
    void request(state.lastSent);
  }, [request, state.lastSent]);

  const isBusy = state.status === "sending";

  /* Both derived from the transcript rather than tracked separately — one
     source of truth, and they cannot drift out of step with what is on screen.
     `turn` bumps whenever a reply lands, which is when the rail refetches. */
  const turn = state.messages.filter((m) => m.role === "agent").length;
  const sentTexts = state.messages.filter((m) => m.role === "user").map((m) => m.text);
  const allStepsDone = TOUR_SENDS.every((t) => sentTexts.includes(t));
  const attempted = state.messages.reduce<number | null>((max, m) => {
    const asked = m.response?.data?.guardrail?.attempted;
    return typeof asked === "number" && asked > (max ?? 0) ? asked : max;
  }, null);

  /**
   * Render one agent turn according to its response type.
   *
   * `isLast` matters for consent: only the newest prompt may still commit
   * money. Product "Select" buttons stay live in older turns, because going
   * back to something she saw earlier is a normal thing to want.
   */
  const renderAgent = (response: AgentResponse, isLast: boolean) => {
    const { type, content, data } = response;

    const bubble = content ? (
      <MessageBubble
        role="agent"
        lang={response.language === "en" ? "en" : "mr"}
        action={<SpeakButton text={content} language={response.language} />}
      >
        {content}
      </MessageBubble>
    ) : null;

    switch (type) {
      case "products":
        return (
          <>
            {bubble}
            {data?.products?.length ? (
              <div className={styles.rail}>
                {data.products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onSelect={selectProduct}
                    disabled={isBusy}
                  />
                ))}
              </div>
            ) : null}
          </>
        );

      case "consent_required":
        return (
          <>
            {bubble}
            {data?.products?.[0] && (
              <div className={styles.panel}>
                <ConsentPrompt
                  product={data.products[0]}
                  onConfirm={() => send("Haan")}
                  onDecline={() => send("Nahi")}
                  disabled={isBusy}
                  spent={!isLast}
                />
              </div>
            )}
          </>
        );

      case "guardrail_blocked":
        return (
          <>
            {bubble}
            {data?.guardrail && (
              <div className={styles.panel}>
                <GuardrailAlert
                  guardrail={data.guardrail}
                  alternatives={data.products}
                  onSelect={selectProduct}
                  disabled={isBusy}
                />
              </div>
            )}
          </>
        );

      case "order_created":
        return (
          <>
            {bubble}
            {data?.order && (
              <div className={styles.panel}>
                <OrderConfirmation order={data.order} />
              </div>
            )}
          </>
        );

      case "failure_handled":
        return (
          <>
            {bubble}
            {data?.failure && (
              <div className={styles.panel}>
                <FailureCard failure={data.failure} />
              </div>
            )}
            {data?.products?.length ? (
              <div className={styles.rail}>
                {data.products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onSelect={selectProduct}
                    disabled={isBusy}
                  />
                ))}
              </div>
            ) : null}
          </>
        );

      case "error":
        return (
          <div className={styles.panel}>
            <ErrorCard message={content} onRetry={retry} disabled={isBusy} />
          </div>
        );

      default:
        return bubble;
    }
  };

  function selectProduct(product: Product) {
    send(`Mujhe ${product.name} chahiye`);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.masthead}>
          <span className={styles.wordmark}>AgentPay</span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.merchant}>
            {/* The page's one <h1>. Without it a screen reader lands on a
                document with no heading at all. */}
            <h1 className={styles.shopName}>Sakhi Sarees</h1>
            <span className={styles.shopDeva} lang="mr">
              सखी साड्या
            </span>
          </span>
        </div>

        {/* Without this the audit trail is unreachable in a live demo, and the
            guardrail evidence never gets seen. */}
        <button
          type="button"
          className={styles.voiceToggle}
          data-on={voice.enabled || undefined}
          data-speaking={voice.speaking || undefined}
          onClick={voice.toggle}
          aria-label={voice.enabled ? "Turn off the agent's voice" : "Turn on the agent's voice"}
          aria-pressed={voice.enabled}
        >
          {voice.enabled ? <SpeakerIcon size={16} /> : <MuteIcon size={16} />}
          <span className={styles.voiceLabel}>
            {voice.speaking ? "Speaking" : voice.enabled ? "Voice on" : "Voice off"}
          </span>
        </button>

        <a
          className={styles.auditLink}
          href={sessionId ? `/dashboard?session_id=${encodeURIComponent(sessionId)}` : "/dashboard"}
        >
          <ShieldIcon size={15} />
          <span className={styles.auditLabel}>Audit trail</span>
        </a>

        <button
          type="button"
          className={styles.gear}
          onClick={() => setSettingsOpen(true)}
          aria-label="Spending limit settings"
        >
          <SettingsIcon size={18} />
        </button>
        <span className={styles.selvedge} aria-hidden="true" />
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.thread}>
          <MessageBubble
            role="agent"
            lang="mr"
            action={<SpeakButton text={WELCOME} language="hinglish" />}
          >
            {WELCOME}
          </MessageBubble>

          {/* Stays until every step has been walked, rather than vanishing
              after the first message — the guardrail is step two, and a tour
              that disappears before it is reached is not a tour. */}
          {!allStepsDone && (
            <div className={styles.chips}>
              <DemoTour
                /* No unlock here any more: pointerdown fires before click, so
                   the first-gesture listener above has already run. */
                onPick={send}
                sent={sentTexts}
                disabled={isBusy}
              />
            </div>
          )}

          {state.messages.map((m, i) =>
            m.role === "user" ? (
              <MessageBubble key={m.id} role="user">
                {m.text}
              </MessageBubble>
            ) : (
              <div key={m.id} className={styles.turn}>
                {m.response &&
                  renderAgent(m.response, i === state.messages.length - 1)}
              </div>
            ),
          )}

          {paidFor && (
            <div className={styles.panel}>
              <div className={styles.paid}>
                <span className={styles.paidKaath} aria-hidden="true" />
                <span className={styles.paidTick}>
                  <CheckIcon size={14} />
                </span>
                <div>
                  <p className={styles.paidTitle}>Payment received</p>
                  <p className={styles.paidBody}>
                    Dhanyavaad! Aapka order confirm ho gaya hai. Sakhi Sarees se
                    jald hi update milega.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isBusy && <TypingIndicator />}

          {state.status === "error" && state.error && (
            <div className={styles.panel}>
              <ErrorCard message={state.error} onRetry={retry} />
            </div>
          )}
        </div>
      </div>

      <div className={styles.composer}>
        <ChatInput
          onSend={send}
          isLoading={isBusy}
          spendLimit={spendLimit}
          onEditLimit={() => setSettingsOpen(true)}
          /* Spoken words go straight out as a message — asking her to speak
             and then press send would make voice slower than typing. */
          onVoiceInput={send}
          onVoiceStart={silenceVoice}
        />
      </div>

      <GuardrailRail
        sessionId={sessionId}
        spendLimit={spendLimit}
        turn={turn}
        attempted={attempted}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        spendLimit={spendLimit}
        onSave={setSpendLimit}
      />
    </div>
  );
}
