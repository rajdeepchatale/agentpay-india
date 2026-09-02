"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Input.module.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  /** Sits inside the field, before the value. Used for the ₹ on spend limits. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Helper text below the field. Hidden while an error is showing. */
  hint?: string;
  /** Names the problem and, where possible, the recovery. */
  error?: string;
}

export function Input({
  label,
  prefix,
  suffix,
  hint,
  error,
  id,
  className,
  disabled,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const shellClasses = [
    styles.shell,
    error ? styles.invalid : "",
    disabled ? styles.disabled : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className={shellClasses}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          id={inputId}
          className={styles.input}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...rest}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>

      {error ? (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
