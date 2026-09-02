import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  markConsentRequested,
  grantPendingConsent,
  clearPendingConsent,
  consumeConsent,
  hasConsent,
  isAffirmative,
  resetSession,
} from "./conversation.ts";

const S = "consent_tests";
beforeEach(() => resetSession(S));

describe("consent is granted by the buyer, never by the model", () => {
  test("asking does not grant", () => {
    markConsentRequested(S, "prod_001");
    assert.equal(hasConsent(S, "prod_001"), false);
  });

  test("an affirmative reply grants it", () => {
    markConsentRequested(S, "prod_001");
    grantPendingConsent(S);
    assert.equal(hasConsent(S, "prod_001"), true);
  });

  test("consent never leaks to a different product", () => {
    markConsentRequested(S, "prod_001");
    grantPendingConsent(S);
    assert.equal(hasConsent(S, "prod_002"), false);
  });
});

describe("one yes authorises one saree", () => {
  test('"haan" grants only the saree most recently asked about', () => {
    /* The agent asked about prod_001, then she changed her mind and it asked
       about prod_002. "haan" means yes to the SECOND one. Granting both would
       authorise a purchase she never agreed to. */
    markConsentRequested(S, "prod_001");
    markConsentRequested(S, "prod_002");
    const granted = grantPendingConsent(S);

    assert.deepEqual(granted, ["prod_002"]);
    assert.equal(hasConsent(S, "prod_002"), true);
    assert.equal(hasConsent(S, "prod_001"), false, "must not authorise the earlier saree");
  });
});

describe("consent is single-use — no double-spend", () => {
  test("a second order for the same saree needs a fresh yes", () => {
    markConsentRequested(S, "prod_001");
    grantPendingConsent(S);
    assert.equal(hasConsent(S, "prod_001"), true);

    consumeConsent(S, "prod_001"); // the order was created
    assert.equal(
      hasConsent(S, "prod_001"),
      false,
      'saying "haan" twice must not create two orders',
    );
  });
});

describe("declining clears the pending request", () => {
  test("after a no, a later yes grants nothing", () => {
    markConsentRequested(S, "prod_001");
    clearPendingConsent(S);
    assert.deepEqual(grantPendingConsent(S), []);
    assert.equal(hasConsent(S, "prod_001"), false);
  });
});

describe("isAffirmative", () => {
  for (const yes of ["haan", "Haan", "ho", "yes", "ok", "confirm", "हो", "हाँ", "करा"]) {
    test(`"${yes}" is agreement`, () => assert.equal(isAffirmative(yes), true));
  }
  for (const no of ["nahi", "nako", "no", "cancel", "show me more", "kitne ka hai"]) {
    test(`"${no}" is not agreement`, () => assert.equal(isAffirmative(no), false));
  }
});
