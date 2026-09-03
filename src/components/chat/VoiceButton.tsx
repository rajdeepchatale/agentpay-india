"use client";

import { useCallback, useRef, useState } from "react";
import type { SupportedLanguage } from "@/types";
import { MicIcon, SpinnerIcon } from "@/components/ui/Icon";
import styles from "./VoiceButton.module.css";

export interface VoiceButtonProps {
  /** Called with the transcript once she stops speaking. */
  onTranscript: (text: string) => void;
  /**
   * Fired the moment the microphone opens, before any audio is captured.
   *
   * The agent has to stop talking here. A shop assistant who keeps speaking
   * into your sentence is rude; one whose voice lands in your recording is
   * also a transcription bug, because Sarvam hears her over you.
   */
  onStart?: () => void;
  /**
   * Her chosen language, passed to Sarvam as a hint.
   *
   * Detection is good but not free: told the language, saarika stops having to
   * decide, and a Marathi speaker saying one English brand name mid-sentence
   * no longer risks the whole utterance being read as English.
   */
  language?: SupportedLanguage;
  disabled?: boolean;
}

type State = "idle" | "recording" | "transcribing" | "denied" | "unsupported";

/**
 * Speak instead of typing.
 *
 * This is not a novelty on an Indian commerce surface. Typing Devanagari on a
 * phone is slow enough that most buyers give up and type romanised Hinglish;
 * speaking removes that tax entirely, and it is the difference between a
 * merchant's actual customers being able to use this and only the ones
 * comfortable with a keyboard.
 *
 * Tap to start, tap to stop. Not press-and-hold: holding a phone button
 * steady while speaking a sentence is harder than it sounds, and a slip
 * mid-sentence loses the whole utterance.
 */
export function VoiceButton({
  onTranscript,
  onStart,
  language,
  disabled = false,
}: VoiceButtonProps) {
  const [state, setState] = useState<State>("idle");
  /** Why nothing happened, when nothing happened. Cleared on the next tap. */
  const [notice, setNotice] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setNotice(null);
    /* Before the permission prompt, not after: the greeting fetched on this
       same tap is still in flight, and silencing has to beat it to the
       speaker. */
    onStart?.();
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setState("unsupported");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      /* Denied, or no microphone. Either way she types — the field is right
         there and never became unavailable. */
      setState("denied");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      /* Release the microphone immediately — a hot mic indicator left on
         after recording is alarming, and rightly so. */
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      if (blob.size === 0) {
        setState("idle");
        return;
      }

      setState("transcribing");
      setNotice(null);
      try {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        if (language) form.append("language", language);
        const res = await fetch("/api/voice/stt", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string; message?: string };
        const text = data.text?.trim();
        if (text) {
          onTranscript(text);
        } else {
          /* Silence here is what hid a broken microphone in production: the
             route answers a Sarvam failure with 200 and an empty transcript,
             so a swallowed empty result looks exactly like a working mic that
             heard nothing. She gets told either way now. */
          setNotice(data.message ?? "I couldn't catch that. Try again, or type it.");
        }
      } catch {
        setNotice("Couldn't reach the transcriber. Type it instead.");
      } finally {
        setState("idle");
      }
    };

    recorder.start();
    setState("recording");
  }, [onTranscript, onStart, language]);

  if (state === "unsupported") return null;

  const busy = state === "transcribing";
  const recording = state === "recording";

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.mic}
        data-recording={recording || undefined}
        onClick={recording ? stop : start}
        disabled={disabled || busy}
        aria-label={recording ? "Stop recording" : "Speak your message"}
        aria-pressed={recording}
      >
        {busy ? (
          <SpinnerIcon size={20} className={styles.spinner} />
        ) : (
          <MicIcon size={20} />
        )}
        {recording && <span className={styles.pulse} aria-hidden="true" />}
      </button>

      {(recording || busy || state === "denied" || notice) && (
        <span className={styles.hint} role="status">
          {recording && "Listening — tap to stop"}
          {busy && "Transcribing…"}
          {state === "denied" && "Microphone blocked. Type instead."}
          {!recording && !busy && state !== "denied" && notice}
        </span>
      )}
    </div>
  );
}
