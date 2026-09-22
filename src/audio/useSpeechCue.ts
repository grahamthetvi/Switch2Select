import { useEffect, useRef } from "react";
import type { SpeechCue } from "../input/pressMachine";

interface SpeechActions {
  speech: SpeechCue | null;
  preview: () => Promise<void>;
  utterance: () => Promise<void>;
  stop: () => void;
  onUtteranceDone: () => void;
}

export function useSpeechCue(speechSeq: number, actions: SpeechActions): void {
  const played = useRef(0);
  const current = useRef(actions);
  current.current = actions;

  useEffect(() => {
    if (speechSeq === played.current) return;
    played.current = speechSeq;
    const cue = current.current.speech;
    if (!cue || cue === "stop") {
      current.current.stop();
      return;
    }
    let cancelled = false;
    const pending = cue === "preview" ? current.current.preview() : current.current.utterance();
    void pending.then(() => {
      if (!cancelled && cue === "utterance") current.current.onUtteranceDone();
    });
    return () => {
      cancelled = true;
    };
  }, [speechSeq]);
}
