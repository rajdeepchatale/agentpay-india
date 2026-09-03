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
  /**
   * Fetch a line's audio now so it can play the instant it is wanted.
   *
   * Browsers block PLAYBACK before a gesture; they do not block the fetch.
   * The greeting is a fixed string known at load, so waiting for the tap to
   * even start asking Sarvam for it costs the buyer the whole round trip —
   * measured at 1.54s of a 1.62s delay — for no reason.
   */
  prime: (text: string, language: SupportedLanguage) => void;
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
  const cacheRef = useRef(new Map<string, { url: string; total: number }>());
  /* Mirrors `enabled` for the async paths — a fetch that resolves after she
     has muted must not still make a sound. Synced in an effect rather than
     during render; `toggle` also sets it directly, so the guard is never stale
     at the moment it matters. */
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /* Bumped every time she is silenced. A clip whose generation is stale by the
     time its audio is ready must never reach the speaker: the greeting is
     fetched on her first gesture, and if that gesture was the microphone, the
     audio would otherwise arrive a second later and be recorded by the very
     mic she just opened. Pausing an element that does not exist yet is a
     no-op, so cancellation has to survive the await. */
  const genRef = useRef(0);

  const silence = useCallback(() => {
    genRef.current += 1;
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.pause();
      a.currentTime = 0;
    }
    setSpeaking(false);
  }, []);

  /* Fetch one clip. Cached by text+language+index, so replaying a reply — a
     judge running the guardrail three times — costs nothing after the first. */
  const fetchClip = useCallback(
    async (text: string, language: SupportedLanguage, index: number) => {
      const key = `${language}:${index}:${text}`;
      const cached = cacheRef.current.get(key);
      if (cached) return cached;

      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, chunk: index }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size === 0) return null;

      const clip = {
        url: URL.createObjectURL(blob),
        total: Number(res.headers.get("X-Chunk-Count") ?? 1) || 1,
      };
      cacheRef.current.set(key, clip);
      return clip;
    },
    [],
  );

  const play = useCallback(
    async (text: string, language: SupportedLanguage) => {
      if (!enabledRef.current) return;
      const body = text.trim();
      if (!body) return;

      /* Interrupt whatever is playing. Two voices at once is not a
         conversation, and the newest reply is always the relevant one. */
      silence();
      const gen = genRef.current;
      const live = () => enabledRef.current && genRef.current === gen;

      try {
        let index = 0;
        let total = 1;
        /* The reply is spoken clip by clip. She used to say the first clip and
           stop, which meant one line of a four-line answer and then silence —
           a shopkeeper finishes her sentence. */
        while (index < total) {
          const clip = await fetchClip(body, language, index);
          if (!clip || !live()) return;
          total = clip.total;

          /* Start the NEXT clip generating while this one plays, so the gap
             between clips is hidden behind audio the buyer is already
             hearing. Only the first clip's latency is ever silence. */
          const ahead =
            index + 1 < total
              ? fetchClip(body, language, index + 1).catch(() => null)
              : null;

          const audio = new Audio(clip.url);
          audioRef.current = audio;
          urlRef.current = clip.url;

          await new Promise<void>((resolve) => {
            audio.onplay = () => setSpeaking(true);
            /* Resolve on end, pause and error alike — a clip that fails must
               not strand the rest of the reply unspoken. */
            audio.onended = () => resolve();
            audio.onpause = () => resolve();
            audio.onerror = () => resolve();
            void audio.play().catch(() => resolve());
          });

          if (!live()) return;
          await ahead;
          index += 1;
        }
      } catch {
        /* The reply is on screen. A failed read-aloud is not worth a message. */
      } finally {
        if (genRef.current === gen) setSpeaking(false);
      }
    },
    [silence, fetchClip],
  );

  const speak = useCallback(
    (text: string, language: SupportedLanguage) => void play(text, language),
    [play],
  );

  /* Warms the cache and, incidentally, the serverless function — the first
     call of a session is about 0.9s slower than the rest, and this spends
     that penalty while she is still reading the page. */
  const prime = useCallback(
    (text: string, language: SupportedLanguage) => {
      if (!enabledRef.current) return;
      const body = text.trim();
      if (!body) return;
      void fetchClip(body, language, 0).catch(() => {
        /* A failed warm-up is not worth reporting; play() will try again. */
      });
    },
    [fetchClip],
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
      for (const clip of cache.values()) URL.revokeObjectURL(clip.url);
      cache.clear();
    };
  }, []);

  /* Memoised. Returning a fresh object each render made every consumer's
     effect re-run on every render — including the one that speaks new replies,
     which then set state and rendered again. A stable identity is what stops
     that loop. */
  return useMemo(
    () => ({ enabled, toggle, speaking, speak, silence, unlock, prime }),
    [enabled, toggle, speaking, speak, silence, unlock, prime],
  );
}
