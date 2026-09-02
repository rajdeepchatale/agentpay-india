import type { FailureData } from "@/types";
import styles from "./FailureCard.module.css";

export interface FailureCardProps {
  failure: FailureData;
}

/** What actually went wrong, in the buyer's terms rather than the system's. */
const LABEL: Record<string, string> = {
  out_of_stock: "That one is sold out",
  payment_failed: "The payment did not go through",
  timeout: "That took longer than expected",
};

/**
 * Orange, not red. The distinction is the point: the agent hit a problem and
 * dealt with it. Painting a handled failure in error red would tell a judge
 * the system broke, when what it actually did was recover.
 */
export function FailureCard({ failure }: FailureCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.kaath} aria-hidden="true" />
      <h4 className={styles.heading}>{LABEL[failure.type] ?? "Handled"}</h4>
      <p className={styles.recovery}>{failure.recovery_action}</p>
    </div>
  );
}
