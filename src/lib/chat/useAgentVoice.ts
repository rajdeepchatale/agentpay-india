"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SupportedLanguage } from "@/types";

/**
 * The agent's voice.
 *
 * A shopkeeper talks. She does not hand you a printed card and wait for you to
 * tap a speaker icon on it. So when voice is on, every reply is spoken — and
 * the buyer can interrupt, which is what a conversation actually is.
 *
 * The hard constraint this is built around: **browsers refuse to play audio
 * before a user gesture.** A greeting fired on page load plays to nobody, in
 * Chrome and Safari alike. So the shop greets her on her first tap instead,
 * which is closer to a real shop anyway — Sakhi looks up when you walk in, not
 * before you arrive.
 */

const STORAGE_KEY = "agentpay_voice_on";

/* Read once, at module scope. Reading in an effect and calling setState there
   causes a cascading render, and useSyncExternalStore is how the rest of this
   codebase reports client-only state without one. Voice defaults ON: a shop
   that talks is the point, and silencing it is one click. */
const subscribeNever = () => () => {};
let storedPref: boolean | undefined;
const getStoredPref = () => {
  if (storedPref === undefined) {
    try {
      storedPref = window.localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      storedPref = true;
    }
  }
  return storedPref;
};
const getStoredPrefServer = () => true;

export interface AgentVoice {
  enabled: boolean;
  toggle: () => void;
  /** True while audio is actually coming out. */
  speaking: boolean;
  /** Speak this text. Cancels whatever was playing — she may interrupt. */
  speak: (text: string, language: SupportedLanguage) => void;
  /** Stop immediately. Used when she starts talking over the agent. */
  silence: () => void;
  /** Call on the first real gesture; unlocks audio and greets her once. */
  unlock: (greeting: string, language: SupportedLanguage) => void;
}

export function useAgentVoice(): AgentVoice {
  const stored = useSyncExternalStore(subscribeNever, getStoredPref, getStoredPrefServer);
  /* Null until she touches the toggle; then this session's choice wins. */
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? stored;
  const [speaking, setSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const greetedRef = useRef(false);
  /* Same reply, same audio. A judge replaying the guardrail three times should
     not cost three TTS calls. */
  const cacheRef = useRef(new Map<string, string>());
  /* Mirrors `enabled` for the async paths — a fetch that resolves after she
     has muted must not still make a sound. Synced in an effect rather than
     during render; `toggle` also sets it directly, so the guard is never stale
     at the moment it matters. */
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const silence = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.pause();
      a.currentTime = 0;
    }
    setSpeaking(false);
  }, []);

  const play = useCallback(
    async (text: string, language: SupportedLanguage) => {
      if (!enabledRef.current) return;
      const body = text.trim();
      if (!body) return;

      /* Interrupt whatever is playing. Two voices at once is not a
         conversation, and the newest reply is always the relevant one. */
      silence();

      const key = `${language}:${body}`;
      try {
        let url = cacheRef.current.get(key);

        if (!url) {
          const res = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: body, language }),
          });
          if (!res.ok) return;
          const blob = await res.blob();
          if (blob.size === 0) return;
          url = URL.createObjectURL(blob);
          cacheRef.current.set(key, url);
        }

        /* A toggle-off mid-fetch must not still produce sound. */
        if (!enabledRef.current) return;

        const audio = new Audio(url);
        audio.onplay = () => setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onpause = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        audioRef.current = audio;
        urlRef.current = url;
        await audio.play().catch(() => setSpeaking(false));
      } catch {
        /* The reply is on screen. A failed read-aloud is not worth a message. */
        setSpeaking(false);
      }
    },
    [silence],
  );

  const speak = useCallback(
    (text: string, language: SupportedLanguage) => void play(text, language),
    [play],
  );

  const unlock = useCallback(
    (greeting: string, language: SupportedLanguage) => {
      if (greetedRef.current || !enabledRef.current) return;
      greetedRef.current = true;
      void play(greeting, language);
    },
    [play],
  );

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setOverride(next);
    if (!next) silence();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      storedPref = next;
    } catch {
      /* Not persisted; the session still honours the choice. */
    }
  }, [silence]);

  /* Release every cached clip when the conversation ends, or a long session
     holds on to every reply it ever spoke. */
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      audioRef.current?.pause();
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  /* Memoised. Returning a fresh object each render made every consumer's
     effect re-run on every render — including the one that speaks new replies,
     which then set state and rendered again. A stable identity is what stops
     that loop. */
  return useMemo(
    () => ({ enabled, toggle, speaking, speak, silence, unlock }),
    [enabled, toggle, speaking, speak, silence, unlock],
  );
}
