"use client";

import type { GuardrailData, Product } from "@/types";
import { swatchFor } from "@/lib/chat/swatch";
import { ShieldIcon } from "@/components/ui/Icon";
import styles from "./GuardrailAlert.module.css";

export interface GuardrailAlertProps {
  guardrail: GuardrailData;
  /** Affordable, in-stock alternatives the engine already found. */
  alternatives?: Product[];
  onSelect: (product: Product) => void;
  disabled?: boolean;
}

/**
 * What each rule is called in the buyer's own terms.
 *
 * These name a situation, never a denial. "Over your limit" is a fact about
 * the saree; "ACCESS DENIED" is a verdict about her.
 */
const HEADING: Record<string, string> = {
  spending_cap: "Over your limit",
  category_not_allowed: "Outside this session's categories",
  rate_limit: "Order limit reached for this hour",
  consent_required: "Needs your confirmation first",
  unknown_product: "Not in this catalog",
  out_of_stock: "Not available right now",
};

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function GuardrailAlert({
  guardrail,
  alternatives = [],
  onSelect,
  disabled = false,
}: GuardrailAlertProps) {
  const { rule, limit, attempted, suggestion, asked_for } = guardrail;

  /* The bar is only honest for a money rule. A category or rate-limit block
     has no ratio to draw, so it gets the statement without the graphic. */
  const showBar = rule === "spending_cap" && attempted > limit && limit > 0;
  const limitPct = showBar ? Math.max((limit / attempted) * 100, 2) : 0;
  const ratio = showBar ? attempted / limit : 0;

  return (
    <div className={styles.alert} role="group" aria-label="Spending guardrail">
      {/* The kaath — the woven selvedge that stops a saree unravelling at its
          edge. Here it is the edge the spend cannot pass. */}
      <span className={styles.kaath} aria-hidden="true" />

      <div className={styles.head}>
        <ShieldIcon size={16} className={styles.shield} />
        <h4 className={styles.heading}>{HEADING[rule] ?? "Held for review"}</h4>
      </div>

      {asked_for && <p className={styles.subject}>{asked_for}</p>}

      {showBar && (
        <div className={styles.meter}>
          <div
            className={styles.track}
            style={{ "--limit-pct": `${limitPct}%` } as React.CSSProperties}
            role="img"
            aria-label={`${rupees(attempted)} against a ${rupees(limit)} limit`}
          >
            <span className={styles.within} />
            <span className={styles.over} />
            <span className={styles.selvedge} />
          </div>

          <div className={styles.scale}>
            <span className={styles.limitLabel}>
              <span className={styles.money}>{rupees(limit)}</span> your limit
            </span>
            <span className={styles.attemptedLabel}>
              <span className={styles.money}>{rupees(attempted)}</span>
              <span className={styles.ratio}>
                {ratio >= 2 ? `${Math.round(ratio)}× over` : "over"}
              </span>
            </span>
          </div>
        </div>
      )}

      {alternatives.length > 0 ? (
        <div className={styles.alts}>
          <p className={styles.altsLead}>Within {rupees(limit)}</p>
          <ul className={styles.altList}>
            {alternatives.slice(0, 3).map((p) => {
              const s = swatchFor(p);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={styles.alt}
                    onClick={() => onSelect(p)}
                    disabled={disabled}
                  >
                    <span
                      className={styles.altSwatch}
                      style={
                        {
                          "--swatch-body": s.body,
                          "--swatch-selvedge": s.selvedge,
                        } as React.CSSProperties
                      }
                      aria-hidden="true"
                    />
                    <span className={styles.altName}>{p.name.split("—")[0].trim()}</span>
                    <span className={styles.altPrice}>{rupees(p.price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        /* No structured alternatives — fall back to what the engine wrote.
           A block with no way forward is a dead end. */
        suggestion && <p className={styles.suggestion}>{suggestion}</p>
      )}
    </div>
  );
}
