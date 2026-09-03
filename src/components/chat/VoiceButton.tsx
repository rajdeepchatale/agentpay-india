"use client";

import { useCallback, useRef, useState } from "react";
import { MicIcon, SpinnerIcon } from "@/components/ui/Icon";
import styles from "./VoiceButton.module.css";

export interface VoiceButtonProps {
  /** Called with the transcript once she stops speaking. */
  onTranscript: (text: string) => void;
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
export function VoiceButton({ onTranscript, disabled = false }: VoiceButtonProps) {
  const [state, setState] = useState<State>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
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
      try {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        const res = await fetch("/api/voice/stt", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string };
        if (data.text?.trim()) onTranscript(data.text.trim());
      } catch {
        /* Swallowed on purpose: the composer still works, and an error toast
           for a failed transcription is more disruptive than silence. */
      } finally {
        setState("idle");
      }
    };

    recorder.start();
    setState("recording");
  }, [onTranscript]);

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

      {(recording || busy || state === "denied") && (
        <span className={styles.hint} role="status">
          {recording && "Listening — tap to stop"}
          {busy && "Transcribing…"}
          {state === "denied" && "Microphone blocked. Type instead."}
        </span>
      )}
    </div>
  );
}
