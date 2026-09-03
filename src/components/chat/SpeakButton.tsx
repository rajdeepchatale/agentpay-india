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
  /* Keyed by language, index AND text — the same key useAgentVoice uses.
     Keying by index alone replayed the Hinglish greeting after the buyer
     switched the header to मराठी, because the component stays mounted and
     only its props change. */
  const clipsRef = useRef(new Map<string, { url: string; total: number }>());
  const genRef = useRef(0);

  /* Release the object URL when this message scrolls out of the conversation,
     or a long session leaks every clip it ever played. */
  useEffect(() => {
    const clips = clipsRef.current;
    return () => {
      audioRef.current?.pause();
      for (const clip of clips.values()) URL.revokeObjectURL(clip.url);
      clips.clear();
    };
  }, []);

  const stop = useCallback(() => {
    /* Bump first: pausing only ends the clip that is playing, and the loop
       would otherwise fetch and play the next one straight after. */
    genRef.current += 1;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
  }, []);

  /* State follows the audio element's own events rather than whether play()
     resolved. A promise from play() is not a reliable signal — it rejects on
     some autoplay policies and on machines with no output device, which would
     leave the button showing "idle" while sound was coming out, or stuck on
     "loading" forever. onplay/onended/onpause are what actually happened. */
  const attach = useCallback((audio: HTMLAudioElement, done: () => void) => {
    audio.onplay = () => setState("playing");
    /* Resolve on end, pause and error alike — one clip failing must not strand
       the rest of the reply unspoken. */
    audio.onended = done;
    audio.onpause = done;
    audio.onerror = done;
  }, []);

  const play = useCallback(async () => {
    setState("loading");
    /* A fresh generation for this press; a Stop mid-reply must abandon the
       clips still queued behind the one playing. */
    const gen = ++genRef.current;
    const live = () => genRef.current === gen;

    try {
      let index = 0;
      let total = 1;
      /* Every clip of the reply, not just the first. This button used to make
         one request and play one clip, so a four-sentence answer stopped after
         the first sentence — the same truncation the agent's own voice had. */
      while (index < total) {
        const key = `${language}:${index}:${text}`;
        let clip = clipsRef.current.get(key);
        if (!clip) {
          const res = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, language, chunk: index }),
          });
          if (!res.ok) break;
          const blob = await res.blob();
          if (blob.size === 0) break;
          clip = {
            url: URL.createObjectURL(blob),
            total: Number(res.headers.get("X-Chunk-Count") ?? 1) || 1,
          };
          clipsRef.current.set(key, clip);
        }
        if (!live()) return;
        total = clip.total;

        const audio = new Audio(clip.url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          attach(audio, resolve);
          void audio.play().catch(() => resolve());
        });

        if (!live()) return;
        index += 1;
      }
    } catch {
      /* The text is already on screen. A failed read-aloud is not worth an
         error message. */
    } finally {
      if (genRef.current === gen) setState("idle");
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
