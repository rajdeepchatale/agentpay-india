"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "@/types";
import { SpeakerIcon, StopIcon, SpinnerIcon } from "@/components/ui/Icon";
import styles from "./SpeakButton.module.css";

export interface SpeakButtonProps {
  text: string;
  language: SupportedLanguage;
}

type State = "idle" | "loading" | "playing";

/**
 * Hear the reply in her own language.
 *
 * The counterpart to the microphone: if she can ask by speaking, she should be
 * able to listen too. That matters most for the buyer who can speak Marathi
 * comfortably but reads it slowly — a real constraint, and one a text-only
 * interface quietly excludes.
 *
 * Never autoplays. A shop that starts talking on its own is a shop she closes.
 */
export function SpeakButton({ text, language }: SpeakButtonProps) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  /* Release the object URL when this message scrolls out of the conversation,
     or a long session leaks every clip it ever played. */
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
  }, []);

  /* State follows the audio element's own events rather than whether play()
     resolved. A promise from play() is not a reliable signal — it rejects on
     some autoplay policies and on machines with no output device, which would
     leave the button showing "idle" while sound was coming out, or stuck on
     "loading" forever. onplay/onended/onpause are what actually happened. */
  const attach = useCallback((audio: HTMLAudioElement) => {
    audio.onplay = () => setState("playing");
    audio.onended = () => setState("idle");
    audio.onpause = () => setState("idle");
    audio.onerror = () => setState("idle");
  }, []);

  const play = useCallback(async () => {
    /* Already fetched once — replay costs nothing. */
    if (audioRef.current) {
      void audioRef.current.play().catch(() => setState("idle"));
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) {
        setState("idle");
        return;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        setState("idle");
        return;
      }

      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      attach(audio);
      audioRef.current = audio;

      await audio.play().catch(() => setState("idle"));
    } catch {
      /* The text is already on screen. A failed read-aloud is not worth an
         error message. */
      setState("idle");
    }
  }, [text, language, attach]);

  const label =
    state === "playing" ? "Stop speaking" : "Listen to this reply";

  return (
    <button
      type="button"
      className={styles.speak}
      data-playing={state === "playing" || undefined}
      onClick={state === "playing" ? stop : play}
      disabled={state === "loading"}
      aria-label={label}
      title={label}
    >
      {state === "loading" && <SpinnerIcon size={14} className={styles.spinner} />}
      {state === "playing" && <StopIcon size={14} />}
      {state === "idle" && <SpeakerIcon size={14} />}
    </button>
  );
}
