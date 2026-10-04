import { useEffect, useState } from 'react';

/** Re-render on an interval with the current time. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Hold-to-talk voice capture via the Web Speech API, where the browser supports it. */
export function useVoice(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [rec] = useState(() => (typeof window === 'undefined' ? null : getRecognition()));
  const supported = rec !== null;

  useEffect(() => {
    if (!rec) return;
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) onText(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
  }, [rec, onText]);

  return {
    supported,
    listening,
    start: () => {
      if (!rec || listening) return;
      setListening(true);
      rec.start();
    },
    stop: () => {
      if (!rec) return;
      rec.stop();
    },
  };
}
