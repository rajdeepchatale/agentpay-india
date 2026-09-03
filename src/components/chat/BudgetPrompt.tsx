"use client";

import type { Budget } from "@/lib/chat/opening";
import { BUDGETS } from "@/lib/chat/opening";
import styles from "./BudgetPrompt.module.css";

export interface BudgetPromptProps {
  onChoose: (amount: number) => void;
  disabled?: boolean;
}

/**
 * How much would you like to spend?
 *
 * The first thing she asks, before showing anything — which is what turns
 * this from a demo into an agent. The limit used to be a number we chose and
 * displayed beside the composer, so the refusal later was OUR rule applied to
 * a stranger. Chosen here, the identical refusal is the agent keeping the
 * buyer's own word.
 *
 * Chips because typing an amount on a phone is a small tax for the commonest
 * answer in the conversation — but the field stays open, and a typed "mera
 * budget 2000 hai" is read too.
 */
export function BudgetPrompt({ onChoose, disabled = false }: BudgetPromptProps) {
  return (
    <div>
      <div className={styles.row} role="group" aria-label="Choose a spending limit">
        {BUDGETS.map((b: Budget) => (
          <button
            key={b.amount}
            type="button"
            className={styles.amount}
            onClick={() => onChoose(b.amount)}
            disabled={disabled}
          >
            {b.label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>Or type an amount — she reads that too.</p>
    </div>
  );
}
