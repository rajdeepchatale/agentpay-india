import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toPaise, orderReceipt } from "./amounts.ts";

/* The paise trap is the documented money bug for this project:
   Razorpay takes subunits, so ₹599 must reach the API as 59900.
   Passing 599 charges ₹5.99 — a 100x underpayment that looks like success. */

describe("toPaise", () => {
  test("converts ₹599 to 59900 paise", () => {
    assert.equal(toPaise(599), 59900);
  });

  test("converts the ₹8,999 Paithani that triggers the guardrail", () => {
    assert.equal(toPaise(8999), 899900);
  });

  test("converts the ₹78,000 bridal Paithani", () => {
    assert.equal(toPaise(78000), 7800000);
  });

  test("rounds fractional rupees to the nearest paisa", () => {
    assert.equal(toPaise(599.994), 59999);
    assert.equal(toPaise(0.015), 2);
  });

  test("does not lose a paisa to floating point", () => {
    // 19.99 * 100 === 1998.9999999999998 in IEEE-754
    assert.equal(toPaise(19.99), 1999);
    assert.equal(toPaise(1.1), 110);
  });

  test("rejects zero and negative amounts", () => {
    assert.throws(() => toPaise(0), /positive/i);
    assert.throws(() => toPaise(-599), /positive/i);
  });

  test("rejects values that are not finite numbers", () => {
    assert.throws(() => toPaise(NaN), /finite/i);
    assert.throws(() => toPaise(Infinity), /finite/i);
    assert.throws(() => toPaise("599" as unknown as number), /finite/i);
  });

  test("rejects an implausible amount, so a hallucinated price cannot charge", () => {
    // No saree in the catalog exceeds ₹78,000. A model that invents ₹99,00,000
    // must hit a wall in code, not in a prompt.
    assert.throws(() => toPaise(9_900_000), /exceeds/i);
  });
});

describe("orderReceipt", () => {
  test("is prefixed so orders are identifiable in the Razorpay dashboard", () => {
    assert.match(orderReceipt(), /^saree_order_\d+$/);
  });

  test("stays within Razorpay's 40-character receipt limit", () => {
    assert.ok(orderReceipt().length <= 40);
  });

  test("is unique across consecutive calls", () => {
    const seen = new Set(Array.from({ length: 50 }, () => orderReceipt()));
    assert.equal(seen.size, 50);
  });
});
