// ============================================================
// The chat state machine.
// ============================================================
// Pure, so the rules that matter — you cannot double-send, a failure keeps
// her words for retry, a retry does not echo her message twice — are provable
// without a browser and without spending a Gemini call.
//
// IDLE     → composer live
// SENDING  → composer locked, typing indicator up. This lock IS the
//            double-send guard; it lives here, not in a disabled attribute.
// ERROR    → composer live again, lastSent retained so retry can re-send
// ============================================================

import type { AgentResponse } from "@/types";

export type ChatStatus = "idle" | "sending" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  /** What she typed. Empty for agent turns, which carry a response instead. */
  text: string;
  /** The full agent payload, so the view can dispatch on `type`. */
  response?: AgentResponse;
}

export interface ChatState {
  status: ChatStatus;
  messages: ChatMessage[];
  /** Retained through a failure so "Try again" has something to send. */
  lastSent: string | null;
  error: string | null;
}

export type ChatEvent =
  | { kind: "send"; text: string }
  | { kind: "received"; response: AgentResponse }
  | { kind: "failed"; error: string }
  | { kind: "retry" };

export const initialChatState: ChatState = {
  status: "idle",
  messages: [],
  lastSent: null,
  error: null,
};

/* Monotonic, so two messages sent in the same millisecond cannot collide the
   way Date.now() keys would. */
let seq = 0;
const nextId = () => `m${++seq}`;

export function chatReducer(state: ChatState, event: ChatEvent): ChatState {
  switch (event.kind) {
    case "send": {
      const text = event.text.trim();
      /* Both guards matter: empty says nothing, and sending while the agent is
         still composing is the double-send this machine exists to prevent. */
      if (!text || state.status === "sending") return state;

      return {
        status: "sending",
        messages: [...state.messages, { id: nextId(), role: "user", text }],
        lastSent: text,
        error: null,
      };
    }

    case "received": {
      return {
        status: "idle",
        messages: [
          ...state.messages,
          { id: nextId(), role: "agent", text: "", response: event.response },
        ],
        lastSent: null,
        error: null,
      };
    }

    case "failed": {
      /* Her message stays in the transcript. Removing it would make the retry
         button appear to come from nowhere. */
      return { ...state, status: "error", error: event.error };
    }

    case "retry": {
      if (!state.lastSent) return state;
      /* The message is already in `messages` from the original send — this
         only re-arms the request. Appending again would echo her twice. */
      return { ...state, status: "sending", error: null };
    }
  }
}
