"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./SettingsModal.module.css";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  spendLimit: number;
  onSave: (limit: number) => void;
}

/** Matches the server's ceiling in `clampSpendLimit`. */
const MAX_SPEND = 100_000;
const PRESETS = [500, 1000, 5000, 25000];

export function SettingsModal({
  open,
  onClose,
  spendLimit,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(String(spendLimit));
  const [error, setError] = useState<string | null>(null);

  /* Reopening after a cancel should show the limit in force, not whatever was
     half-typed last time. Adjusted during render rather than in an effect —
     React re-runs this component immediately without committing the stale
     paint, so there is no cascading render. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(String(spendLimit));
      setError(null);
    }
  }

  const commit = () => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount above zero.");
      return;
    }
    if (value > MAX_SPEND) {
      setError(`The ceiling is ₹${MAX_SPEND.toLocaleString("en-IN")}.`);
      return;
    }
    onSave(Math.round(value));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Spending limit"
      description="The agent cannot create an order above this amount. Enforced server-side, not by the model."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={commit}>
            Save limit
          </Button>
        </>
      }
    >
      <Input
        label="Maximum per order"
        prefix="₹"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_SPEND}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
        hint={`Up to ₹${MAX_SPEND.toLocaleString("en-IN")}.`}
      />

      <div className={styles.presets}>
        {PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            className={styles.preset}
            data-active={Number(draft) === amount}
            onClick={() => {
              setDraft(String(amount));
              setError(null);
            }}
          >
            ₹{amount.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
    </Modal>
  );
}
