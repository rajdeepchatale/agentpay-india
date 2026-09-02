// ============================================================
// Session identity.
// ============================================================
// One id per browser, persisted, sent with every request. It is what ties a
// conversation to its audit trail and its spending history.
//
// localStorage is not guaranteed: it throws outright in some private-browsing
// modes and when a browser is set to block site data. A shopping assistant
// that white-screens because storage was unavailable is worse than one that
// forgets — so every access is guarded and an in-memory id is the floor.
// ============================================================

export const SESSION_KEY = "agentpay_session_id";

/** Minimal shape we need. Real Storage satisfies this. */
export interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function generate(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  /* Older Safari and any non-secure context. Uniqueness per browser is all
     this needs to carry. */
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readSessionId(store: SessionStore): string {
  let existing: string | null = null;
  try {
    existing = store.getItem(SESSION_KEY);
  } catch {
    /* Storage blocked. Fall through to a fresh in-memory id. */
  }

  if (existing && existing.trim().length > 10) return existing;

  const id = generate();
  try {
    store.setItem(SESSION_KEY, id);
  } catch {
    /* Not persisted. The session still works; it just will not survive a
       reload, which is a far better failure than a blank screen. */
  }
  return id;
}
