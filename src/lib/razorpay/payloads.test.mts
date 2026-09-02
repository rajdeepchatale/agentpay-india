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
