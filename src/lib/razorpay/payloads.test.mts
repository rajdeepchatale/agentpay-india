import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildOrderPayload, buildPaymentLinkPayload } from "./payloads.ts";

const saree = {
  productId: "prod_001",
  productName: "Handloom Cotton Saree — Mango Motif",
  amountInr: 599,
  sessionId: "sess_abc123",
};

describe("buildOrderPayload", () => {
  test("sends the amount in paise, not rupees", () => {
    assert.equal(buildOrderPayload(saree).amount, 59900);
  });

  test("always declares INR", () => {
    assert.equal(buildOrderPayload(saree).currency, "INR");
  });

  test("carries a prefixed receipt within Razorpay's 40-char limit", () => {
    const { receipt } = buildOrderPayload(saree);
    assert.match(receipt, /^saree_order_\d+$/);
    assert.ok(receipt.length <= 40);
  });

  test("puts the product and session in notes so an order is traceable", () => {
    const { notes } = buildOrderPayload(saree);
    assert.equal(notes.product_id, "prod_001");
    assert.equal(notes.session_id, "sess_abc123");
    assert.equal(notes.product_name, "Handloom Cotton Saree — Mango Motif");
  });

  test("records the rupee amount in notes for human reading", () => {
    assert.equal(buildOrderPayload(saree).notes.amount_inr, "599");
  });

  test("refuses an invalid amount rather than building a broken order", () => {
    assert.throws(() => buildOrderPayload({ ...saree, amountInr: 0 }), /positive/i);
    assert.throws(() => buildOrderPayload({ ...saree, amountInr: -5 }), /positive/i);
    assert.throws(
      () => buildOrderPayload({ ...saree, amountInr: 9_900_000 }),
      /exceeds/i,
    );
  });
});

describe("buildPaymentLinkPayload", () => {
  test("sends the amount in paise, not rupees", () => {
    assert.equal(buildPaymentLinkPayload(saree).amount, 59900);
  });

  test("names the saree in the description the buyer sees", () => {
    const { description } = buildPaymentLinkPayload(saree);
    assert.ok(
      description.includes("Handloom Cotton Saree"),
      `description should name the product, got: ${description}`,
    );
  });

  test("keeps the description within Razorpay's 2048-char limit", () => {
    const longName = "अ".repeat(3000);
    const { description } = buildPaymentLinkPayload({
      ...saree,
      productName: longName,
    });
    assert.ok(description.length <= 2048);
  });

  test("does not ask Razorpay to notify, so the demo sends nothing to anyone", () => {
    const { notify } = buildPaymentLinkPayload(saree);
    assert.deepEqual(notify, { sms: false, email: false });
  });

  test("carries the session in notes", () => {
    assert.equal(buildPaymentLinkPayload(saree).notes.session_id, "sess_abc123");
  });
});

describe("callback_url — the buyer's return trip", () => {
  const input = {
    productId: "prod_001",
    productName: "Handloom Cotton Saree",
    amountInr: 599,
    sessionId: "s1",
  };

  test("omits callback_url when no public origin exists", () => {
    /* Locally there is nowhere for Razorpay to send her. A callback_url
       pointing at localhost would strand the buyer on a dead page. */
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    const p = buildPaymentLinkPayload(input);
    assert.equal(p.callback_url, undefined);
  });

  test("uses VERCEL_PROJECT_PRODUCTION_URL when deployed", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "agentpay-india.vercel.app";
    const p = buildPaymentLinkPayload(input);
    assert.equal(p.callback_url, "https://agentpay-india.vercel.app/chat?paid=prod_001");
    assert.equal(p.callback_method, "get");
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  test("an explicit NEXT_PUBLIC_SITE_URL wins, trailing slash trimmed", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "ignored.vercel.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://agentpay.example.com/";
    const p = buildPaymentLinkPayload(input);
    assert.equal(p.callback_url, "https://agentpay.example.com/chat?paid=prod_001");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  test("the product id is url-encoded, never interpolated raw", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://x.com";
    const p = buildPaymentLinkPayload({ ...input, productId: "a b&c=d" });
    assert.ok(p.callback_url?.endsWith("paid=a%20b%26c%3Dd"), p.callback_url);
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
});
