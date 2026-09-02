import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chatReducer, initialChatState } from "./machine.ts";
import type { AgentResponse } from "@/types";

const reply = (over: Partial<AgentResponse> = {}): AgentResponse => ({
  type: "text",
  content: "Namaste!",
  language: "hinglish",
  audit_id: "a1",
  ...over,
});

describe("the chat state machine", () => {
  test("starts idle with nothing said", () => {
    assert.equal(initialChatState.status, "idle");
    assert.equal(initialChatState.messages.length, 0);
  });

  test("sending appends the buyer's message and locks the composer", () => {
    const s = chatReducer(initialChatState, { kind: "send", text: "cotton saree dikhao" });
    assert.equal(s.status, "sending");
    assert.equal(s.messages.length, 1);
    assert.equal(s.messages[0].role, "user");
    assert.equal(s.messages[0].text, "cotton saree dikhao");
  });

  test("a second send while already sending is ignored — this is the double-send guard", () => {
    const one = chatReducer(initialChatState, { kind: "send", text: "first" });
    const two = chatReducer(one, { kind: "send", text: "second" });
    assert.equal(two.messages.length, 1, "the second message must not be queued");
    assert.equal(two.messages[0].text, "first");
  });

  test("an empty or whitespace-only send does nothing", () => {
    for (const text of ["", "   ", "\n"]) {
      assert.equal(chatReducer(initialChatState, { kind: "send", text }).messages.length, 0);
    }
  });

  test("receiving appends the agent's reply and unlocks the composer", () => {
    const sent = chatReducer(initialChatState, { kind: "send", text: "hi" });
    const got = chatReducer(sent, { kind: "received", response: reply() });
    assert.equal(got.status, "idle");
    assert.equal(got.messages.length, 2);
    assert.equal(got.messages[1].role, "agent");
    assert.equal(got.messages[1].response?.content, "Namaste!");
  });

  test("the agent's response type is carried through so the UI can dispatch on it", () => {
    const sent = chatReducer(initialChatState, { kind: "send", text: "paithani" });
    const got = chatReducer(sent, {
      kind: "received",
      response: reply({ type: "guardrail_blocked" }),
    });
    assert.equal(got.messages[1].response?.type, "guardrail_blocked");
  });

  test("a failure keeps the buyer's words so retry can re-send them", () => {
    const sent = chatReducer(initialChatState, { kind: "send", text: "cotton saree" });
    const failed = chatReducer(sent, { kind: "failed", error: "network" });
    assert.equal(failed.status, "error");
    assert.equal(failed.lastSent, "cotton saree");
    assert.equal(failed.error, "network");
  });

  test("retry re-arms the same message without duplicating it in the transcript", () => {
    const sent = chatReducer(initialChatState, { kind: "send", text: "cotton saree" });
    const failed = chatReducer(sent, { kind: "failed", error: "network" });
    const retried = chatReducer(failed, { kind: "retry" });
    assert.equal(retried.status, "sending");
    assert.equal(
      retried.messages.filter((m) => m.role === "user").length,
      1,
      "retrying must not echo her message twice",
    );
  });

  test("retry with nothing to retry is a no-op", () => {
    assert.equal(chatReducer(initialChatState, { kind: "retry" }).status, "idle");
  });

  test("a successful reply clears a previous error", () => {
    let s = chatReducer(initialChatState, { kind: "send", text: "hi" });
    s = chatReducer(s, { kind: "failed", error: "network" });
    s = chatReducer(s, { kind: "retry" });
    s = chatReducer(s, { kind: "received", response: reply() });
    assert.equal(s.error, null);
    assert.equal(s.status, "idle");
  });

  test("every message carries a stable unique id for React keys", () => {
    let s = chatReducer(initialChatState, { kind: "send", text: "one" });
    s = chatReducer(s, { kind: "received", response: reply() });
    s = chatReducer(s, { kind: "send", text: "two" });
    const ids = s.messages.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate keys would scramble the transcript");
  });

  test("state is never mutated in place", () => {
    const before = chatReducer(initialChatState, { kind: "send", text: "hi" });
    const snapshot = before.messages.length;
    chatReducer(before, { kind: "received", response: reply() });
    assert.equal(before.messages.length, snapshot);
  });
});
