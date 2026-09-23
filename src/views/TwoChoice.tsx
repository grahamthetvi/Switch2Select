import { useEffect, useRef, useState } from "react";
import { Speaker } from "../audio/speech";
import { useSpeechCue } from "../audio/useSpeechCue";
import { Beacon } from "../components/Beacon";
import { PartnerBar, toggleFullscreen } from "../components/PartnerBar";
import { useChoiceMachine } from "../input/useMachine";
import { choiceConfigFrom } from "../input/pressMachine";
import { usePointerPress, useSwitchInput } from "../input/useSwitchInput";
import { useMotionOn } from "../lib/motion";
import { childrenOf, parentOf } from "../lib/tree";
import type { ViewId } from "../nav";
import { useLibrary } from "../state/LibraryContext";
import { clamp, type VocabularyItem } from "../types";

export function TwoChoice({
  gateOpen,
  request,
}: {
  gateOpen: boolean;
  request: (view: ViewId) => void;
}) {
  const library = useLibrary();
  const [parentId, setParentId] = useState<string | null>(null);
  const motion = useMotionOn(library.settings.motion);
  const kids = childrenOf(library.items, parentId);
  const pair: [VocabularyItem | undefined, VocabularyItem | undefined] = [kids[0], kids[1]];
  const [state, dispatch] = useChoiceMachine(choiceConfigFrom(library.settings), parentId ?? "root");
  const speaker = useRef(new Speaker());
  const pairRef = useRef(pair);
  pairRef.current = pair;
  const seenNav = useRef(state.navSeq);
  const items = library.items;

  useEffect(() => {
    if (state.navSeq === seenNav.current) return;
    seenNav.current = state.navSeq;
    if (state.nav === "into" && state.side !== null) {
      const item = pairRef.current[state.side];
      if (item) setParentId(item.id);
      return;
    }
    if (state.nav === "back") {
      if (parentId === null) request("talk");
      else setParentId(parentOf(items, parentId));
    }
  }, [state.navSeq, state.nav, state.side, parentId, items, request]);

  useSpeechCue(state.speechSeq, {
    speech: state.speech,
    preview: () => speakSide("preview"),
    utterance: () => speakSide("utterance"),
    stop: () => speaker.current.stop(),
    onUtteranceDone: () => dispatch({ type: "speechDone" }),
  });

  useEffect(() => () => speaker.current.stop(), []);

  function speakSide(kind: "preview" | "utterance"): Promise<void> {
    const item = state.side === null ? undefined : pairRef.current[state.side];
    if (!item) return Promise.resolve();
    if (kind === "utterance" && item.audioBlob) {
      return speaker.current.speakBlob(item.audioBlob, library.settings.utteranceVolume);
    }
    const text = kind === "preview" ? item.label : item.utterance;
    const volume = kind === "preview" ? library.settings.previewVolume : library.settings.utteranceVolume;
    return speaker.current.speakText(text, {
      volume,
      rate: library.settings.ttsRate,
      voiceURI: library.settings.ttsVoiceURI,
    });
  }

  function effectFor(item: VocabularyItem | undefined): "speak" | "open" {
    return item && childrenOf(items, item.id).length >= 2 ? "open" : "speak";
  }

  useSwitchInput({
    enabled: !gateOpen && Boolean(pair[0] && pair[1]),
    oneSwitch: library.settings.oneSwitch,
    latched: state.phase === "latched",
    pressCommitHoldMs: library.settings.pressCommitHoldMs,
    gamepadInButton: library.settings.gamepadInButton,
    gamepadCommitButton: library.settings.gamepadCommitButton,
    onIn: () => dispatch({ type: "pressIn" }),
    onCommit: () => dispatch({ type: "pressCommit", effect: effectFor(state.side === null ? undefined : pair[state.side]) }),
    onCancel: () => dispatch({ type: "cancel" }),
    onNext: () => dispatch({ type: "next" }),
    onPrev: () => dispatch({ type: "prev" }),
  });

  const pointer = {
    enabled: !gateOpen,
    pressInHoldMs: library.settings.pressInHoldMs,
    pressCommitHoldMs: library.settings.pressCommitHoldMs,
    previewHoldMs: library.settings.previewHoldMs,
  };
  const leftRef = usePointerPress({
    ...pointer,
    onIn: () => dispatch({ type: "pressIn", side: 0 }),
    onCommit: () => dispatch({
      type: "pressCommit",
      effect: effectFor(pairRef.current[0]),
      side: 0,
      ready: true,
    }),
  });
  const rightRef = usePointerPress({
    ...pointer,
    onIn: () => dispatch({ type: "pressIn", side: 1 }),
    onCommit: () => dispatch({
      type: "pressCommit",
      effect: effectFor(pairRef.current[1]),
      side: 1,
      ready: true,
    }),
  });

  function speakAgain() {
    const item = state.side === null ? pair[state.offer] : pair[state.side];
    if (!item) return;
    if (item.audioBlob) void speaker.current.speakBlob(item.audioBlob, library.settings.utteranceVolume);
    else {
      void speaker.current.speakText(item.utterance, {
        volume: library.settings.utteranceVolume,
        rate: library.settings.ttsRate,
        voiceURI: library.settings.ttsVoiceURI,
      });
    }
  }

  const offered = pair[state.offer];
  const live = !offered
    ? "This branch needs two pictures."
    : state.phase === "latched"
      ? `${offered.label}. Light press.`
      : state.phase === "speaking" || state.phase === "holding"
        ? `Said: ${offered.utterance}`
        : offered.label;

  return (
    <main className="field" onContextMenu={(event) => event.preventDefault()} data-phase={state.phase}>
      <p className="sr-only" aria-live="polite">{live}</p>
      {kids.length > 2 ? <p className="partner-aside">This branch has extra pictures. Showing the first two.</p> : null}
      {pair[0] && pair[1] ? (
        <div className="pair">
          {([0, 1] as const).map((side) => {
            const item = pair[side];
            const url = item ? library.urls.get(item.id) : undefined;
            if (!item || !url) return null;
            return (
              <Beacon
                key={item.id}
                item={item}
                url={url}
                latched={state.side === side && state.phase !== "idle"}
                offer={state.offer === side}
                attentionKey={state.appearSeq}
                confirm={state.confirm && state.side === side}
                motion={motion}
                showLabel={library.settings.showChildLabel}
                settings={library.settings}
                size="pair"
                pointerRef={side === 0 ? leftRef : rightRef}
              />
            );
          })}
        </div>
      ) : (
        <p className="partner-note">This branch needs two pictures.</p>
      )}
      <PartnerBar
        simpleMode={library.settings.simpleMode}
        paused={state.paused}
        mode="two"
        previewAudio={library.settings.previewAudio}
        showLabels={library.settings.showChildLabel}
        onPauseToggle={() => dispatch({ type: state.paused ? "resume" : "pause" })}
        onSlower={() => library.updateSettings({ rotationMs: clamp(library.settings.rotationMs + 1000, 2000, 20000) })}
        onFaster={() => library.updateSettings({ rotationMs: clamp(library.settings.rotationMs - 1000, 2000, 20000) })}
        onPrev={() => dispatch({ type: "prev" })}
        onNext={() => dispatch({ type: "next" })}
        onSpeakAgain={speakAgain}
        onBack={() => dispatch({ type: "back" })}
        onTogglePreview={() => library.updateSettings({ previewAudio: !library.settings.previewAudio })}
        onToggleLabels={() => library.updateSettings({ showChildLabel: !library.settings.showChildLabel })}
        onRequest={request}
        onFullscreen={() => void toggleFullscreen()}
      />
    </main>
  );
}
