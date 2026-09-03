"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { AgentResponse, Product, SupportedLanguage } from "@/types";
import { chatReducer, initialChatState } from "@/lib/chat/machine";
import { readSessionId } from "@/lib/chat/session";
import { useAgentVoice } from "@/lib/chat/useAgentVoice";
import { turnLanguage } from "@/lib/chat/language";
import { uiText } from "@/lib/chat/ui-text";
import { closingMessage } from "@/lib/chat/closing";
import { budgetReply, isBudgetAnswer, welcomeMessage } from "@/lib/chat/opening";
import { BudgetPrompt } from "./BudgetPrompt";
import { getProductById } from "@/lib/catalog/search";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { LanguagePicker, type LanguageChoice } from "./LanguagePicker";
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
import { SpendLimitIcon, ShieldIcon, SpeakerIcon, MuteIcon } from "@/components/ui/Icon";
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

/* "Kya dikhaun?" — the verb agrees with HER, the shop, so it assumes nothing
   about who is shopping. Hindi has no gender-neutral way to ask "what are you
   looking for": the verb must agree with the listener, and a saree shop
   invites the wrong default. Anyone may be buying — for herself, for his wife,
   for a daughter. A shopkeeper offering to show you something sidesteps it
   entirely, and is warmer than asking a buyer to declare herself. The
   languages line drops its verb for the same reason.

   The literal forms this replaced are deliberately not quoted here: the guard
   in copy.test.mts scans comments too, and keeping it strict is worth more
   than an inline example. */
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

/* Her language choice, read once at module scope like the two above. Read in
   an effect instead and the first render would answer "auto", which is a
   visible flip of the picker on every load. */
const LANGUAGE_KEY = "agentpay_language";
const CHOICES: readonly LanguageChoice[] = ["auto", "hi", "mr", "hinglish", "en"];
let storedLanguage: LanguageChoice | undefined;
const getLanguage = (): LanguageChoice => {
  if (storedLanguage === undefined) {
    try {
      const raw = window.localStorage.getItem(LANGUAGE_KEY) as LanguageChoice | null;
      storedLanguage = raw && CHOICES.includes(raw) ? raw : "auto";
    } catch {
      storedLanguage = "auto";
    }
  }
  return storedLanguage;
};
const getLanguageServer = (): LanguageChoice => "auto";

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

  /* Null until she touches the picker; then this session's choice wins — the
     same shape useAgentVoice uses for its toggle. */
  const persistedLanguage = useSyncExternalStore(
    subscribeNever,
    getLanguage,
    getLanguageServer,
  );
  const [languageChoice, setLanguageChoice] = useState<LanguageChoice | null>(null);
  const language = languageChoice ?? persistedLanguage;

  /* Null until she names a figure. Everything the shop shows is gated behind
     it, because a limit she did not set is not a limit she agreed to. */
  const [budget, setBudget] = useState<number | null>(null);

  /* The language everything she SAYS resolves through. "auto" means she has
     not chosen, and Hinglish is the safest opener for an Indian buyer who has
     not told us otherwise. Derived once so the welcome, the greeting and the
     speak button cannot drift apart the way they did when each hardcoded
     "hinglish" separately. */
  const spokenLanguage: SupportedLanguage =
    language === "auto" ? "hinglish" : language;
  /* Every fixed string the interface shows, in that same language — one table
     so the chrome can never disagree with the conversation inside it. */
  const t = uiText(spokenLanguage);

  const chooseLanguage = useCallback((next: LanguageChoice) => {
    setLanguageChoice(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
      storedLanguage = next;
    } catch {
      /* Not persisted; the session still honours the choice. */
    }
  }, []);

  const acceptBudget = useCallback(
    (amount: number) => {
      setBudget(amount);
      setSpendLimit(amount);
      const lang = spokenLanguage;
      /* Dispatched as her reply rather than printed as a confirmation, so she
         says the number back — the same path every other line she speaks
         travels. */
      dispatch({
        kind: "received",
        response: {
          type: "text",
          content: budgetReply(amount, lang),
          language: lang,
          audit_id: "",
        },
      });
    },
    [spokenLanguage],
  );

  /* Remove the query param once seen. A refresh or a shared link should not
     replay a payment confirmation. This is a write to an external system —
     the URL — which is what effects are actually for. */
  useEffect(() => {
    if (paidFor) window.history.replaceState({}, "", window.location.pathname);
  }, [paidFor]);

  /* Coming back from payment is a TURN, not a banner.
     
     Dispatching it as an ordinary agent message is what makes her speak it:
     the effect below speaks each agent reply as it lands, so the close needs
     no voice code of its own. It also means the confirmation sits in the
     conversation where she said everything else, rather than in a box beneath
     it.
     
     The callback carries a product id, so the catalog — not the database —
     supplies the saree and the price. */
  const closedRef = useRef(false);
  useEffect(() => {
    if (!paidFor || closedRef.current) return;
    closedRef.current = true;
    const spoken = spokenLanguage;
    dispatch({
      kind: "received",
      response: {
        type: "text",
        content: closingMessage(getProductById(paidFor), spoken),
        language: spoken,
        audit_id: "",
      },
    });
  }, [paidFor, spokenLanguage]);

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
  /* Ask Sarvam for the greeting NOW, not when she taps. Playback needs a
     gesture; the fetch does not, and waiting for the tap to start the round
     trip was 1.54s of a 1.62s delay before she heard anything. It also warms
     the function, so the first real reply is quicker too. */
  const { prime } = voice;
  useEffect(() => {
    /* getPaid(), not the rendered value. useSyncExternalStore hands back the
       SERVER snapshot during hydration — null here — and effects run on that
       pass, so a guard on the rendered value fetched the greeting on a paid
       return before the client snapshot arrived. getPaid reads the URL and
       caches it, so it is right on the first call. */
    if (getPaid()) return;
    prime(welcomeMessage(spokenLanguage), spokenLanguage);
  }, [prime, paidFor, spokenLanguage]);

  const { unlock } = voice;
  useEffect(() => {
    /* Not when she has just paid. Walking back in from the payment page and
       being greeted as a new visitor undoes the purchase she just made.
       
       getPaid() rather than the rendered value, for the hydration reason
       above: on the pass where effects first run, the rendered value is still
       the server snapshot. */
    if (getPaid()) return;

    const greet = () => unlock(welcomeMessage(spokenLanguage), spokenLanguage);

    /* If the visitor arrived by CLICKING "Try the demo", the browser already
       has user activation and audio is allowed right now — waiting for
       another gesture on this page means waiting for one that never comes,
       which is why the chat opened in silence. Client-side navigation keeps
       the document, so the activation from that click survives the trip.

       A direct load of /chat has no activation and still has to wait; that is
       the browser's rule, not a choice. */
    const active =
      typeof navigator !== "undefined" &&
      navigator.userActivation?.hasBeenActive === true;

    if (active) {
      greet();
      return;
    }

    window.addEventListener("pointerdown", greet, { once: true });
    window.addEventListener("keydown", greet, { once: true });
    return () => {
      window.removeEventListener("pointerdown", greet);
      window.removeEventListener("keydown", greet);
    };
  }, [unlock, paidFor, spokenLanguage]);

  /* Speak each agent reply as it lands — once. Keyed on the message id rather
     than a count, so a re-render never replays a line she already heard. */
  /* Mirrors the conversation for the request body. A ref rather than state:
     it is read at send time and never rendered, so it must not add a render
     of its own. */
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  useEffect(() => {
    historyRef.current = state.messages
      .map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.text }
          : { role: "assistant" as const, content: m.response?.content ?? "" },
      )
      .filter((m) => m.content.trim().length > 0)
      .slice(-20);
  }, [state.messages]);

  const spokenRef = useRef<string | null>(null);
  const lastAgent = state.messages[state.messages.length - 1];
  const lastAgentId =
    lastAgent?.role === "agent" && lastAgent.response?.content ? lastAgent.id : null;

  useEffect(() => {
    if (!lastAgentId || spokenRef.current === lastAgentId) return;
    const msg = state.messages.find((m) => m.id === lastAgentId);
    if (!msg?.response?.content) return;
    spokenRef.current = lastAgentId;
    /* The whole reply, not a summary of it. This used to speak a one-line
       announcement, which cut her off mid-thought and read as the agent
       breaking. The reply is now spoken clip by clip — the first clip is kept
       short so she starts quickly, and each later clip is generated while the
       previous one plays, so finishing the sentence costs no extra silence. */
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
    async (message: string, turnLang?: SupportedLanguage) => {
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
            /* Omitted when there is nothing better than the server's own text
               detection. Sent, it outranks that detection for this turn. */
            ...(turnLang ? { language: turnLang } : {}),
            /* The thread as rendered. The server keeps its own copy but that
               lives in one instance's memory, and a later turn is routinely
               served by a different one — which is how the agent came to ask
               what she wanted after she had already told it. */
            history: historyRef.current,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          dispatch({ kind: "failed", error: t.errorGeneric });
          return;
        }

        const response: AgentResponse = await res.json();
        dispatch({ kind: "received", response });
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        dispatch({
          kind: "failed",
          error: aborted
            ? t.errorTimeout
            : t.errorOffline,
        });
      } finally {
        clearTimeout(timer);
      }
    },
    /* `t` belongs here: an error raised in the old language after she has
       switched would contradict the rest of the interface. */
    [spendLimit, sessionId, t],
  );

  const send = useCallback(
    (
      text: string,
      heard?: { language: SupportedLanguage; confidence: number },
    ) => {
      /* She is talking, so the agent stops. Talking over a customer is the
         one thing a shopkeeper never does. */
      silenceVoice();
      const message = text.trim();
      /* The reducer is the single authority on whether a send is allowed —
         checking status here as well would let the two disagree. */
      if (!message || state.status === "sending") return;

      /* She may answer the budget question in words instead of tapping. Only
         when it is genuinely an answer — "1000 ke under cotton saree dikhao"
         is a request for sarees that happens to contain a figure, and reading
         it as a budget would swallow what she actually asked for. */
      if (budget === null) {
        const answered = isBudgetAnswer(message);
        if (answered !== null) {
          dispatch({ kind: "send", text: message });
          acceptBudget(answered);
          return;
        }
      }

      dispatch({ kind: "send", text: message });

      /* Her pinned choice, else what Sarvam heard, else let the server guess
         from the text. Resolved in one place so the three signals cannot
         disagree depending on which path called this. */
      void request(
        message,
        turnLanguage({
          ...(language !== "auto" ? { pinned: language } : {}),
          ...(heard ? { spoken: heard.language, confidence: heard.confidence } : {}),
        }),
      );
    },
    [request, state.status, silenceVoice, language, budget, acceptBudget],
  );

  const retry = useCallback(() => {
    if (!state.lastSent) return;
    dispatch({ kind: "retry" });
    void request(
      state.lastSent,
      turnLanguage(language !== "auto" ? { pinned: language } : {}),
    );
  }, [request, state.lastSent, language]);

  const isBusy = state.status === "sending";

  /* Both derived from the transcript rather than tracked separately — one
     source of truth, and they cannot drift out of step with what is on screen.
     `turn` bumps whenever a reply lands, which is when the rail refetches. */
  const turn = state.messages.filter((m) => m.role === "agent").length;
  const sentTexts = state.messages.filter((m) => m.role === "user").map((m) => m.text);
  const allStepsDone = TOUR_SENDS.every((t) => sentTexts.includes(t));
  /* Whether the buyer has said anything yet. The budget reply is the agent's,
     so it does not count — the openers are for someone who has not started. */
  const hasSpoken = state.messages.some((m) => m.role === "user");
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

        <LanguagePicker value={language} onChange={chooseLanguage} />

        {/* Without this the audit trail is unreachable in a live demo, and the
            guardrail evidence never gets seen. */}
        <button
          type="button"
          className={styles.voiceToggle}
          data-on={voice.enabled || undefined}
          data-speaking={voice.speaking || undefined}
          onClick={voice.toggle}
          aria-label={voice.enabled ? t.voiceToggleOn : t.voiceToggleOff}
          aria-pressed={voice.enabled}
        >
          {voice.enabled ? <SpeakerIcon size={16} /> : <MuteIcon size={16} />}
          <span className={styles.voiceLabel}>
            {voice.speaking ? t.speaking : voice.enabled ? t.voiceOn : t.voiceOff}
          </span>
        </button>

        <a
          className={styles.auditLink}
          href={sessionId ? `/dashboard?session_id=${encodeURIComponent(sessionId)}` : "/dashboard"}
        >
          <ShieldIcon size={15} />
          <span className={styles.auditLabel}>{t.auditTrail}</span>
        </a>

        <button
          type="button"
          className={styles.gear}
          onClick={() => setSettingsOpen(true)}
          aria-label={`${t.change} — ${t.limitLabel}`}
        >
          <SpendLimitIcon size={16} />
          {/* Labelled like every other control in this header. A bare glyph
              beside three labelled ones is what left it open to being read as
              a theme switch — the label closes that for good, and the amount
              is the most useful thing it could say. */}
          <span className={styles.auditLabel}>
            ₹{spendLimit.toLocaleString("en-IN")}
          </span>
        </button>
        <span className={styles.selvedge} aria-hidden="true" />
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.thread}>
          {/* Arrival copy. Coming back from the payment page is not an
              arrival — she has just bought something, and greeting her as a
              new visitor there undoes the purchase she just made. */}
          {!paidFor && (
            <MessageBubble
              role="agent"
              lang={spokenLanguage === "mr" ? "mr" : "hi"}
              action={
                <SpeakButton
                  text={welcomeMessage(spokenLanguage)}
                  language={spokenLanguage}
                />
              }
            >
              {welcomeMessage(spokenLanguage)}
            </MessageBubble>
          )}

          {/* Stays until every step has been walked, rather than vanishing
              after the first message — the guardrail is step two, and a tour
              that disappears before it is reached is not a tour. */}
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

          {/* She asked "how was it?" as the last line of her closing message,
              so these are the ways to answer rather than a survey appearing
              unbidden. */}
          {paidFor && (
            <div className={styles.panel}>
              <FeedbackPrompt
                sessionId={sessionId}
                language={spokenLanguage}
                productId={paidFor}
                /* She replies out loud. Silent text after a tap reads as no
                   response at all in a shop where she says everything else. */
                onChosen={(thanks, lang) => speak(thanks, lang)}
              />
            </div>
          )}

          {/* Her question needs answering before the shop shows anything. */}
          {budget === null && !paidFor && (
            <div className={styles.chips}>
              <BudgetPrompt onChoose={acceptBudget} disabled={isBusy} />
            </div>
          )}

          {/* Openers, not a permanent menu.
              
              Once she is talking to the agent the three-step box is clutter
              sitting under a real conversation — she has already started, and
              the thing to look at is what the shop just showed her. It stays
              only until her first message. */}
          {budget !== null && !allStepsDone && !paidFor && !hasSpoken && (
            <div className={styles.chips}>
              <DemoTour
                language={language}
                /* No unlock here any more: pointerdown fires before click, so
                   the first-gesture listener above has already run. */
                onPick={send}
                sent={sentTexts}
                disabled={isBusy}
              />
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
          voiceLanguage={language === "auto" ? undefined : language}
          uiLanguage={spokenLanguage}
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
