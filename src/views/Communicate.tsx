import { useEffect, useRef } from "react";
import { Speaker } from "../audio/speech";
import { useSpeechCue } from "../audio/useSpeechCue";
import { Beacon } from "../components/Beacon";
import { PartnerBar, toggleFullscreen } from "../components/PartnerBar";
import { usePointerPress, useSwitchInput } from "../input/useSwitchInput";
import { usePressMachine } from "../input/useMachine";
import { pressConfigFrom } from "../input/pressMachine";
import { useMotionOn } from "../lib/motion";
import { activeSet } from "../lib/tree";
import type { ViewId } from "../nav";
import { useLibrary } from "../state/LibraryContext";
import type { VocabularyItem } from "../types";
import { clamp } from "../types";

export function Communicate({
  gateOpen,
  request,
}: {
  gateOpen: boolean;
  request: (view: ViewId) => void;
}) {
  const { ready, items, settings, urls, updateSettings, error } = useLibrary();
  if (!ready) return <p className="wait">One moment.</p>;
  return (
    <Talk
      items={activeSet(items)}
      urls={urls}
      settings={settings}
      updateSettings={updateSettings}
      error={error}
      gateOpen={gateOpen}
      request={request}
    />
  );
}

function Talk({
  items,
  urls,
  settings,
  updateSettings,
  error,
  gateOpen,
  request,
}: {
  items: VocabularyItem[];
  urls: Map<string, string>;
  settings: ReturnType<typeof useLibrary>["settings"];
  updateSettings: ReturnType<typeof useLibrary>["updateSettings"];
  error: string | null;
  gateOpen: boolean;
  request: (view: ViewId) => void;
}) {
  const motion = useMotionOn(settings.motion);
  const [state, dispatch] = usePressMachine(items.length, pressConfigFrom(settings));
  const speaker = useRef(new Speaker());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const lastSpoken = useRef<VocabularyItem | null>(null);
  const current = items[state.index] ?? null;
  const pointerRef = usePointerPress({
    enabled: !gateOpen && items.length > 0,
    pressInHoldMs: settings.pressInHoldMs,
    pressCommitHoldMs: settings.pressCommitHoldMs,
    previewHoldMs: settings.previewHoldMs,
    onIn: () => dispatch({ type: "pressIn" }),
    onCommit: () => dispatch({ type: "pressCommit", ready: true }),
  });

  useSwitchInput({
    enabled: !gateOpen,
    gamepadInButton: settings.gamepadInButton,
    gamepadCommitButton: settings.gamepadCommitButton,
    onIn: () => dispatch({ type: "pressIn" }),
    onCommit: () => dispatch({ type: "pressCommit" }),
    onCancel: () => dispatch({ type: "cancel" }),
    onNext: () => dispatch({ type: "next" }),
    onPrev: () => dispatch({ type: "prev" }),
  });

  useSpeechCue(state.speechSeq, {
    speech: state.speech,
    preview: () => {
      const item = itemsRef.current[state.index];
      if (!item) return Promise.resolve();
      return speaker.current.speakText(item.label, {
        volume: settings.previewVolume,
        rate: settings.ttsRate,
        voiceURI: settings.ttsVoiceURI,
      });
    },
    utterance: () => {
      const item = itemsRef.current[state.index];
      if (!item) return Promise.resolve();
      lastSpoken.current = item;
      if (item.audioBlob) return speaker.current.speakBlob(item.audioBlob, settings.utteranceVolume);
      return speaker.current.speakText(item.utterance, {
        volume: settings.utteranceVolume,
        rate: settings.ttsRate,
        voiceURI: settings.ttsVoiceURI,
      });
    },
    stop: () => speaker.current.stop(),
    onUtteranceDone: () => dispatch({ type: "speechDone" }),
  });

  useEffect(() => {
    for (const item of items) {
      const url = urls.get(item.id);
      if (!url) continue;
      const image = new Image();
      image.src = url;
    }
  }, [items, urls]);

  useEffect(() => () => speaker.current.stop(), []);

  const url = current ? urls.get(current.id) : undefined;
  const latched = state.phase === "latched" || state.phase === "speaking" || state.phase === "holding";
  const live = liveText(current, state.phase, state.paused);

  function stepRotation(delta: number) {
    updateSettings({ rotationMs: clamp(settings.rotationMs + delta, 2000, 20000) });
  }

  function speakAgain() {
    const item = lastSpoken.current ?? current;
    if (!item) return;
    lastSpoken.current = item;
    if (item.audioBlob) void speaker.current.speakBlob(item.audioBlob, settings.utteranceVolume);
    else {
      void speaker.current.speakText(item.utterance, {
        volume: settings.utteranceVolume,
        rate: settings.ttsRate,
        voiceURI: settings.ttsVoiceURI,
      });
    }
  }

  return (
    <main className="field" onContextMenu={(event) => event.preventDefault()} data-phase={state.phase}>
      <p className="sr-only" aria-live="polite">{live}</p>
      {error ? <p className="partner-aside">{error}</p> : null}
      {current && url ? (
        <Beacon
          item={current}
          url={url}
          latched={latched}
          offer={false}
          attentionKey={state.appearSeq}
          confirm={state.confirm}
          motion={motion}
          showLabel={settings.showChildLabel}
          size="solo"
          pointerRef={pointerRef}
        />
      ) : (
        <p className="partner-note">Add pictures in the library. Three to eight is a good day.</p>
      )}
      <PartnerBar
        simpleMode={settings.simpleMode}
        paused={state.paused}
        mode="talk"
        previewAudio={settings.previewAudio}
        showLabels={settings.showChildLabel}
        onPauseToggle={() => dispatch({ type: state.paused ? "resume" : "pause" })}
        onSlower={() => stepRotation(1000)}
        onFaster={() => stepRotation(-1000)}
        onPrev={() => dispatch({ type: "prev" })}
        onNext={() => dispatch({ type: "next" })}
        onSpeakAgain={speakAgain}
        onTogglePreview={() => updateSettings({ previewAudio: !settings.previewAudio })}
        onToggleLabels={() => updateSettings({ showChildLabel: !settings.showChildLabel })}
        onRequest={request}
        onFullscreen={() => void toggleFullscreen()}
      />
    </main>
  );
}

function liveText(item: VocabularyItem | null, phase: string, paused: boolean): string {
  if (!item) return "No pictures yet.";
  if (paused && phase === "rotating") return `Paused on ${item.label}.`;
  switch (phase) {
    case "latched":
      return `${item.label}. Light press.`;
    case "speaking":
    case "holding":
      return `Said: ${item.utterance}`;
    default:
      return item.label;
  }
}
