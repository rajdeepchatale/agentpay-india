import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature, parsePaymentEvent } from "./webhook.ts";

/* A webhook endpoint is a public, unauthenticated URL that changes payment
   state. Anyone can POST to it. The signature is the only thing standing
   between "Razorpay told us this was paid" and "someone on the internet did." */

const SECRET = "whsec_test_abc123";
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

const paidEvent = (orderId = "order_ABC123") =>
  JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_XYZ789",
          order_id: orderId,
          status: "captured",
          amount: 59900,
        },
      },
    },
  });

describe("verifyWebhookSignature", () => {
  test("accepts a correctly signed body", () => {
    const body = paidEvent();
    assert.equal(verifyWebhookSignature(body, sign(body), SECRET), true);
  });

  test("rejects a body signed with the wrong secret", () => {
    const body = paidEvent();
    assert.equal(verifyWebhookSignature(body, sign(body, "wrong"), SECRET), false);
  });

  test("rejects a tampered body — this is the whole point", () => {
    /* Signed as ₹599, delivered claiming a different order. */
    const signed = paidEvent("order_ABC123");
    const tampered = paidEvent("order_SOMEONE_ELSES");
    assert.equal(verifyWebhookSignature(tampered, sign(signed), SECRET), false);
  });

  test("rejects a missing signature", () => {
    const body = paidEvent();
    assert.equal(verifyWebhookSignature(body, "", SECRET), false);
    assert.equal(verifyWebhookSignature(body, undefined, SECRET), false);
  });

  test("fails CLOSED when no secret is configured", () => {
    /* An unset secret must never mean "accept everything". */
    const body = paidEvent();
    assert.equal(verifyWebhookSignature(body, sign(body), ""), false);
    assert.equal(verifyWebhookSignature(body, sign(body), undefined), false);
  });

  test("a signature of the wrong length is rejected, not thrown", () => {
    /* timingSafeEqual throws on length mismatch — that must not 500 the route. */
    const body = paidEvent();
    assert.equal(verifyWebhookSignature(body, "abc", SECRET), false);
    assert.equal(verifyWebhookSignature(body, "z".repeat(64), SECRET), false);
  });

  test("verifies the RAW body, not a re-serialized object", () => {
    /* JSON.parse then JSON.stringify reorders keys and drops whitespace, which
       changes the bytes and breaks the HMAC. The route must pass raw text. */
    const raw = '{"event":"payment.captured",  "payload":{}}';
    const reserialized = JSON.stringify(JSON.parse(raw));
    assert.equal(verifyWebhookSignature(raw, sign(raw), SECRET), true);
    assert.equal(verifyWebhookSignature(reserialized, sign(raw), SECRET), false);
  });
});

describe("parsePaymentEvent", () => {
  test("reads a captured payment as paid", () => {
    const e = parsePaymentEvent(paidEvent("order_ABC123"));
    assert.equal(e?.razorpayOrderId, "order_ABC123");
    assert.equal(e?.status, "paid");
    assert.equal(e?.paymentId, "pay_XYZ789");
  });

  test("reads a failed payment as failed", () => {
    const body = JSON.stringify({
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1", status: "failed" } } },
    });
    const e = parsePaymentEvent(body);
    assert.equal(e?.status, "failed");
  });

  test("ignores an event we do not act on", () => {
    const body = JSON.stringify({
      event: "refund.created",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
    });
    assert.equal(parsePaymentEvent(body), null);
  });

  test("returns null on an event with no order id — nothing to update", () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1" } } },
    });
    assert.equal(parsePaymentEvent(body), null);
  });

  test("returns null on malformed JSON rather than throwing", () => {
    assert.equal(parsePaymentEvent("{not json"), null);
    assert.equal(parsePaymentEvent(""), null);
  });

  test("survives a payload shaped nothing like the contract", () => {
    assert.equal(parsePaymentEvent('{"event":"payment.captured"}'), null);
    assert.equal(parsePaymentEvent('{"payload":{"payment":null}}'), null);
  });
});
