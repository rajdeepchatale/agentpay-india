import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readSessionId, SESSION_KEY } from "./session.ts";

/* A fake Storage. The real one throws in private browsing and when a browser
   is set to block site data — the chat must still work. */
function fakeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    read: () => Object.fromEntries(map),
  };
}

describe("session id", () => {
  test("reuses the id already in storage", () => {
    const store = fakeStorage({ [SESSION_KEY]: "existing-id" });
    assert.equal(readSessionId(store), "existing-id");
  });

  test("generates and persists one when storage is empty", () => {
    const store = fakeStorage();
    const id = readSessionId(store);
    assert.ok(id.length > 10);
    assert.equal(store.read()[SESSION_KEY], id, "must persist so a reload keeps the thread");
  });

  test("a second read returns the same id", () => {
    const store = fakeStorage();
    assert.equal(readSessionId(store), readSessionId(store));
  });

  test("survives storage that throws on read — private browsing must not break chat", () => {
    const hostile = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
    };
    const id = readSessionId(hostile);
    assert.ok(id.length > 10, "must fall back to an in-memory id, not crash");
  });

  test("survives storage that throws on write", () => {
    const hostile = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    assert.ok(readSessionId(hostile).length > 10);
  });

  test("ignores a junk value rather than sending it to the API", () => {
    const store = fakeStorage({ [SESSION_KEY]: "   " });
    const id = readSessionId(store);
    assert.ok(id.trim().length > 10);
  });
});
