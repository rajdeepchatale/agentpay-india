// ============================================================
// Guardrail defaults.
// ============================================================

export const DEFAULTS = {
  /** Spending cap in ₹ when the client sends none. Sarees cost more than tees. */
  maxSpend: 1000,
  /** Orders per session per hour. Stops a runaway autonomous loop. */
  maxOrdersPerHour: 3,
  /** Hard ceiling a client-supplied cap is clamped to. */
  maxAllowedSpend: 100_000,
} as const;

export const RATE_WINDOW_MS = 60 * 60 * 1000;
