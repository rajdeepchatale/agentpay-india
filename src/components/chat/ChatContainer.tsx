"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { AgentResponse, Product } from "@/types";
import { chatReducer, initialChatState } from "@/lib/chat/machine";
import { readSessionId } from "@/lib/chat/session";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ProductCard } from "./ProductCard";
import { GuardrailAlert } from "./GuardrailAlert";
import { ConsentPrompt } from "./ConsentPrompt";
import { OrderConfirmation } from "./OrderConfirmation";
import { FailureCard } from "./FailureCard";
import { ErrorCard } from "./ErrorCard";
import { SuggestionChips } from "./SuggestionChips";
import { SettingsModal } from "./SettingsModal";
import { SettingsIcon } from "@/components/ui/Icon";
import styles from "./ChatContainer.module.css";

const TIMEOUT_MS = 30_000;
const DEFAULT_SPEND = 1000;

const WELCOME =
  "Namaste! Main Sakhi Sarees ki AI shopping assistant hoon. Hamare paas authentic Paithani, handloom cotton, aur silk sarees hain. Aap Hindi, Marathi, Hinglish ya English mein baat kar sakti hain! Kya dhundh rahi hain?";

export function ChatContainer() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [spendLimit, setSpendLimit] = useState(DEFAULT_SPEND);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sessionRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Read once on the client. localStorage does not exist during SSR, and
     reading it during render would desync the first paint. */
  useEffect(() => {
    sessionRef.current = readSessionId(window.localStorage);
  }, []);

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
            session_id: sessionRef.current || readSessionId(window.localStorage),
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
    [spendLimit],
  );

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      /* The reducer is the single authority on whether a send is allowed —
         checking status here as well would let the two disagree. */
      if (!message || state.status === "sending") return;
      dispatch({ kind: "send", text: message });
      void request(message);
    },
    [request, state.status],
  );

  const retry = useCallback(() => {
    if (!state.lastSent) return;
    dispatch({ kind: "retry" });
    void request(state.lastSent);
  }, [request, state.lastSent]);

  const isBusy = state.status === "sending";
  const isEmpty = state.messages.length === 0;

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
      <MessageBubble role="agent" lang={response.language === "en" ? "en" : "mr"}>
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
            <span className={styles.shopName}>Sakhi Sarees</span>
            <span className={styles.shopDeva} lang="mr">
              सखी साड्या
            </span>
          </span>
        </div>

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
          <MessageBubble role="agent" lang="mr">
            {WELCOME}
          </MessageBubble>

          {isEmpty && (
            <div className={styles.chips}>
              <SuggestionChips onPick={send} disabled={isBusy} />
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
        />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        spendLimit={spendLimit}
        onSave={setSpendLimit}
      />
    </div>
  );
}
