import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toneFor, labelFor, summarise, formatClock, groupByTurn } from "./present.ts";
import type { AuditEntry } from "@/types";

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: "a1",
  timestamp: "2026-09-02T13:45:07.000Z",
  action: "search_products",
  input: {},
  output: {},
  guardrail_status: "passed",
  reasoning: "Searched the catalog.",
  ...over,
});

describe("toneFor — colour carries meaning, so it must be exact", () => {
  test("a blocked decision is the warning tone, whatever the action", () => {
    assert.equal(toneFor(entry({ guardrail_status: "blocked" })), "warning");
    assert.equal(
      toneFor(entry({ action: "create_order", guardrail_status: "blocked" })),
      "warning",
    );
  });

  test("a created order is success", () => {
    assert.equal(toneFor(entry({ action: "create_order" })), "success");
  });

  test("a consent request is awaiting, not passed", () => {
    /* She has not agreed yet. Painting this green would claim consent that
       does not exist. */
    assert.equal(toneFor(entry({ action: "consent_request" })), "accent");
  });

  test("a search is informational", () => {
    assert.equal(toneFor(entry({ action: "search_products" })), "info");
  });

  test("a handled failure is `handled` — orange, never error red", () => {
    assert.equal(toneFor(entry({ action: "failure_recovery" })), "handled");
  });

  test("blocked beats the action — a blocked order is never green", () => {
    const v = toneFor(entry({ action: "create_order", guardrail_status: "blocked" }));
    assert.notEqual(v, "success");
  });
});

describe("labelFor — the buyer's terms, not the system's", () => {
  test("every action has a human label", () => {
    for (const a of [
      "search_products",
      "create_order",
      "guardrail_check",
      "consent_request",
      "failure_recovery",
    ] as const) {
      const l = labelFor(a);
      assert.ok(l.length > 0, a);
      assert.ok(!l.includes("_"), `${a} label still looks like a symbol: ${l}`);
    }
  });

  test("an unknown action degrades to something readable, never blank", () => {
    assert.ok(labelFor("something_new" as never).length > 0);
  });
});

describe("summarise — one line a judge can scan", () => {
  test("names the product when there is one", () => {
    const s = summarise(entry({ output: { product: "Handloom Cotton Saree", price: 599 } }));
    assert.match(s, /Handloom Cotton Saree/);
  });

  test("shows the rule and both amounts on a block", () => {
    const s = summarise(
      entry({
        action: "guardrail_check",
        guardrail_status: "blocked",
        output: { rule: "spending_cap", limit: 1000, attempted: 8999 },
      }),
    );
    assert.match(s, /8,?999/);
    assert.match(s, /1,?000/);
  });

  test("shows the order id when one was created", () => {
    const s = summarise(
      entry({ action: "create_order", output: { razorpay_order_id: "order_ABC123" } }),
    );
    assert.match(s, /order_ABC123/);
  });

  test("falls back to the query for a search", () => {
    const s = summarise(entry({ input: { query: "cotton saree" } }));
    assert.match(s, /cotton saree/);
  });

  test("never returns an empty string", () => {
    assert.ok(summarise(entry({ input: {}, output: {} })).length > 0);
  });
});

describe("formatClock", () => {
  test("renders a stable HH:MM:SS", () => {
    assert.match(formatClock("2026-09-02T13:45:07.000Z"), /^\d{2}:\d{2}:\d{2}$/);
  });

  test("a malformed timestamp does not throw", () => {
    assert.equal(typeof formatClock("not a date"), "string");
    assert.equal(typeof formatClock(""), "string");
  });
});

describe("groupByTurn — a conversation, not a flat log", () => {
  test("a search starts a new turn", () => {
    const turns = groupByTurn([
      entry({ id: "1", action: "search_products" }),
      entry({ id: "2", action: "consent_request" }),
      entry({ id: "3", action: "search_products" }),
    ]);
    assert.equal(turns.length, 2);
    assert.equal(turns[0].entries.length, 2);
  });

  test("entries before the first search still get a turn", () => {
    const turns = groupByTurn([entry({ id: "1", action: "consent_request" })]);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].entries.length, 1);
  });

  test("an empty trail produces no turns", () => {
    assert.deepEqual(groupByTurn([]), []);
  });

  test("a turn containing a block is marked, so the UI can flag it", () => {
    const turns = groupByTurn([
      entry({ id: "1", action: "search_products" }),
      entry({ id: "2", action: "guardrail_check", guardrail_status: "blocked" }),
    ]);
    assert.equal(turns[0].hasBlock, true);
  });

  test("a turn with no block is not marked", () => {
    const turns = groupByTurn([entry({ id: "1", action: "search_products" })]);
    assert.equal(turns[0].hasBlock, false);
  });
});
