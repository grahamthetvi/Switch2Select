import { useRef } from "react";
import { Speaker } from "../audio/speech";
import { useSpeechCue } from "../audio/useSpeechCue";
import { PartnerPage } from "../components/PartnerPage";
import { usePressMachine } from "../input/useMachine";
import { pressConfigFrom } from "../input/pressMachine";
import { usePointerPress, useSwitchInput } from "../input/useSwitchInput";
import { useMotionOn } from "../lib/motion";
import type { ViewId } from "../nav";
import { useLibrary } from "../state/LibraryContext";

export function Calibration({ request }: { request: (view: ViewId) => void }) {
  const { settings, updateSettings } = useLibrary();
  const motion = useMotionOn(settings.motion);
  const config = {
    ...pressConfigFrom(settings),
    previewAudio: true,
    rotationMs: 60000,
    autoResumeAfterSpeak: true,
    speakHoldMs: 1800,
  };
  const [state, dispatch] = usePressMachine(1, config);
  const speaker = useRef(new Speaker());
  const pointerRef = usePointerPress({
    enabled: true,
    pressInHoldMs: settings.pressInHoldMs,
    pressCommitHoldMs: settings.pressCommitHoldMs,
    previewHoldMs: settings.previewHoldMs,
    onIn: () => dispatch({ type: "pressIn" }),
    onCommit: () => dispatch({ type: "pressCommit", ready: true }),
  });

  useSwitchInput({
    enabled: true,
    oneSwitch: settings.oneSwitch,
    latched: state.phase === "latched",
    pressCommitHoldMs: settings.pressCommitHoldMs,
    gamepadInButton: settings.gamepadInButton,
    gamepadCommitButton: settings.gamepadCommitButton,
    onIn: () => dispatch({ type: "pressIn" }),
    onCommit: () => dispatch({ type: "pressCommit" }),
    onCancel: () => dispatch({ type: "cancel" }),
  });

  useSpeechCue(state.speechSeq, {
    speech: state.speech,
    preview: () => speaker.current.speakText("This one", {
      volume: settings.previewVolume,
      rate: settings.ttsRate,
      voiceURI: settings.ttsVoiceURI,
    }),
    utterance: () => speaker.current.speakText("I mean it", {
      volume: settings.utteranceVolume,
      rate: settings.ttsRate,
      voiceURI: settings.ttsVoiceURI,
    }),
    stop: () => speaker.current.stop(),
    onUtteranceDone: () => dispatch({ type: "speechDone" }),
  });

  const status = state.phase === "latched"
    ? "Light press. This one."
    : state.phase === "speaking" || state.phase === "holding"
      ? settings.oneSwitch
        ? "Same switch again. Say it."
        : "Deep press. Say it."
      : settings.oneSwitch
        ? "One switch. First press finds it. The same press again, or a hold, says it."
        : "Hold the circle. A short hold finds it. A longer hold says it.";

  return (
    <PartnerPage
      title="Practice"
      lede={settings.oneSwitch
        ? "One switch does both jobs. First press means this one. The same press again says it."
        : "Light press means this one. Deep press says it. The same two presses work everywhere."}
      onBack={() => request("talk")}
    >
      <div className="practice-wrap">
        <div
          ref={pointerRef}
          className={motion && (state.phase === "latched" || state.phase === "speaking" || state.phase === "holding")
            ? "practice-target is-latched is-motion"
            : state.phase === "latched" || state.phase === "speaking" || state.phase === "holding"
              ? "practice-target is-latched"
              : "practice-target"}
          data-phase={state.phase}
        />
        <p className="practice-status" aria-live="polite">{status}</p>
      </div>
      <section className="panel">
        <h2>Pointer holds</h2>
        <label className="stack">
          <span>Light press after {secondsFromMs(settings.pressInHoldMs)}</span>
          <input
            type="range"
            min={80}
            max={1500}
            step={20}
            value={settings.pressInHoldMs}
            onChange={(event) => updateSettings({ pressInHoldMs: Number(event.target.value) })}
          />
        </label>
        <label className="stack">
          <span>Deep press after {secondsFromMs(settings.pressCommitHoldMs)}</span>
          <input
            type="range"
            min={200}
            max={2500}
            step={20}
            value={settings.pressCommitHoldMs}
            onChange={(event) => updateSettings({ pressCommitHoldMs: Number(event.target.value) })}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.oneSwitch}
            onChange={(event) => updateSettings({ oneSwitch: event.target.checked })}
          />
          <span>One switch: same button for both presses</span>
        </label>
        <h2>Gamepad buttons</h2>
        <label className="stack">
          <span>{settings.oneSwitch ? "Switch button" : "Light press button"} {settings.gamepadInButton}</span>
          <input
            type="number"
            min={0}
            max={15}
            value={settings.gamepadInButton}
            onChange={(event) => updateSettings({ gamepadInButton: Number(event.target.value) })}
          />
        </label>
        {settings.oneSwitch ? null : (
          <label className="stack">
            <span>Deep press button {settings.gamepadCommitButton}</span>
            <input
              type="number"
              min={0}
              max={15}
              value={settings.gamepadCommitButton}
              onChange={(event) => updateSettings({ gamepadCommitButton: Number(event.target.value) })}
            />
          </label>
        )}
        <p className="hint">
          {settings.oneSwitch
            ? "Keyboard: Space is both presses. Hold it to say it. Escape lets go. Arrows move the picture."
            : "Keyboard: Space is light, Enter is deep, Escape lets go. Arrows move the picture."}
        </p>
      </section>
    </PartnerPage>
  );
}

function secondsFromMs(ms: number): string {
  const text = (Math.round(ms) / 1000).toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  return `${text} ${text === "1" ? "second" : "seconds"}`;
}
