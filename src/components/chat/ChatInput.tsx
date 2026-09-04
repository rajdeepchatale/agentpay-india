"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SupportedLanguage } from "@/types";
import { uiText } from "@/lib/chat/ui-text";
import { Button } from "@/components/ui/Button";
import { SendIcon } from "@/components/ui/Icon";
import { VoiceButton } from "./VoiceButton";
import styles from "./ChatInput.module.css";

export interface ChatInputProps {
  /** Called with the trimmed message. Never fires with an empty string. */
  onSend: (message: string) => void;
  /**
   * True while the agent is composing a reply. Disables the field so the
   * buyer cannot double-send, and swaps the send control for a spinner.
   */
  isLoading?: boolean;
  /** Falls back to the chosen language when not given. */
  placeholder?: string;
  /** The spending cap in force, in ₹. Stated beside the composer, always. */
  spendLimit?: number;
  /** Opens the limit editor. The limit line is static when this is absent. */
  onEditLimit?: () => void;
  /** Voice capture. The mic appears only once this is wired up. */
  onVoiceInput?: (
    text: string,
    heard?: { language: SupportedLanguage; confidence: number },
  ) => void;
  /** Fired when the mic opens, so the agent can stop talking into it. */
  onVoiceStart?: () => void;
  /** Her chosen language, handed to Sarvam as a transcription hint. */
  voiceLanguage?: SupportedLanguage;
  /** The language the interface itself speaks. */
  uiLanguage?: SupportedLanguage;
  disabled?: boolean;
}

const MAX_HEIGHT = 168;

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder,
  spendLimit,
  onEditLimit,
  onVoiceInput,
  onVoiceStart,
  voiceLanguage,
  uiLanguage = "hinglish",
  disabled = false,
}: ChatInputProps) {
  const t = uiText(uiLanguage);
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBlocked = disabled || isLoading;
  const canSend = value.trim().length > 0 && !isBlocked;

  /* Grow with the content, then scroll. Measured from a reset height so the
     box shrinks again when text is deleted. */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(resize, [value, resize]);

  /* Return focus to the field once the agent has replied — but only on the
     busy → idle transition. Focusing on mount would steal focus from the page
     and can scroll the viewport to the composer on load. */
  const wasLoading = useRef(false);
  useEffect(() => {
    if (wasLoading.current && !isLoading && !disabled) {
      textareaRef.current?.focus();
    }
    wasLoading.current = isLoading;
  }, [isLoading, disabled]);

  const submit = useCallback(() => {
    const message = value.trim();
    if (message.length === 0 || isBlocked) return;
    onSend(message);
    setValue("");
  }, [value, isBlocked, onSend]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    /* Shift+Enter is a newline. Enter alone sends. An IME composing a
       Devanagari cluster also uses Enter — never steal it mid-composition. */
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    submit();
  };

  return (
    <div className={styles.composer}>
      <div className={styles.row}>
        {onVoiceInput && (
          <VoiceButton
            onTranscript={onVoiceInput}
            onStart={onVoiceStart}
            language={voiceLanguage}
            uiLanguage={uiLanguage}
            disabled={isBlocked}
          />
        )}

        <div
          className={`${styles.shell} ${isBlocked ? styles.shellDisabled : ""}`}
        >
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? t.placeholder}
            disabled={isBlocked}
            aria-label="Message"
            lang="hi"
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          iconOnly
          round
          onClick={submit}
          disabled={!canSend}
          loading={isLoading}
          aria-label="Send message"
        >
          <SendIcon size={20} />
        </Button>
      </div>

      {/* Only the AMOUNT waits for the buyer to name one. Gating this whole
          row on `spendLimit` also hid "Change" and the Enter-to-send hint —
          two unrelated affordances gone from the first screen every visitor
          sees, as collateral of a display decision. */}
      <p className={styles.guardrail}>
        {spendLimit !== undefined && (
          <span className={styles.tag}>
            <span className={styles.limitValue}>
              ₹{spendLimit.toLocaleString("en-IN")}
            </span>
            <span className={styles.limitWord}>{t.limitLabel}</span>
          </span>
        )}

        {onEditLimit && spendLimit !== undefined && (
          <button
            type="button"
            className={styles.editLimit}
            onClick={onEditLimit}
          >
            {t.change}
          </button>
        )}

        <span className={styles.hintKeys}>
          <kbd className={styles.key}>Enter</kbd> {t.enterToSend}
        </span>
      </p>

    </div>
  );
}
