import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceStatus } from "../domain/types";

/* Minimal typings for the vendor-prefixed Web Speech API. */
interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onnomatch: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechController {
  status: VoiceStatus;
  supported: boolean;
  /** Last recognized utterance (session-only; never persisted). */
  transcript: string | null;
  errorDetail: string | null;
  /** Begin one push-to-talk utterance. */
  start: () => void;
  /** Stop listening early. */
  stop: () => void;
  /** Clear transient recognized/no-match/error status back to idle. */
  reset: () => void;
}

/**
 * Opt-in, single-utterance push-to-talk over the browser Speech API.
 * Never starts on load, hover, focus, a timer, or navigation. Recognized
 * text lives only in component state for the current session.
 */
export function useSpeech(onUtterance: (text: string) => boolean): SpeechController {
  const supported = getRecognitionCtor() !== null;
  const [status, setStatus] = useState<VoiceStatus>(supported ? "idle" : "unsupported");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const settled = useRef(false);

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognition.current?.abort();
    recognition.current = null;
    setStatus(supported ? "idle" : "unsupported");
    setTranscript(null);
    setErrorDetail(null);
  }, [supported]);

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    if (recognition.current) recognition.current.abort();
    const rec = new Ctor();
    recognition.current = rec;
    settled.current = false;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    setTranscript(null);
    setErrorDetail(null);
    setStatus("requesting-permission");
    rec.onaudiostart = () => setStatus("listening");
    rec.onresult = e => {
      settled.current = true;
      const text = e.results[0]?.[0]?.transcript ?? "";
      setTranscript(text);
      const matched = onUtterance(text);
      setStatus(matched ? "recognized" : "no-match");
    };
    rec.onnomatch = () => {
      settled.current = true;
      setStatus("no-match");
    };
    rec.onerror = e => {
      settled.current = true;
      setErrorDetail(e.error ?? "unknown");
      setStatus("error");
    };
    rec.onend = () => {
      recognition.current = null;
      if (!settled.current) setStatus("no-match");
    };
    try {
      rec.start();
    } catch {
      setErrorDetail("start-failed");
      setStatus("error");
    }
  }, [onUtterance]);

  return { status, supported, transcript, errorDetail, start, stop, reset };
}

/**
 * User-triggered, stoppable narration with visible-caption pairing.
 * Callers must render the text; speech is an optional layer over it.
 */
export function useNarration(): {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
} {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  useEffect(() => cancel, [cancel]);

  return { supported, speaking, speak, cancel };
}
