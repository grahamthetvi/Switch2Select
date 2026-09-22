import { useEffect, useState } from "react";
import { listenForVoices, voicesForSettings } from "../audio/speech";
import { PartnerPage } from "../components/PartnerPage";
import type { ViewId } from "../nav";
import { useLibrary } from "../state/LibraryContext";

export function SettingsView({ request }: { request: (view: ViewId) => void }) {
  const { settings, updateSettings } = useLibrary();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pinDraft, setPinDraft] = useState(settings.pin);
  const listedVoices = voicesForSettings(voices);
  const selectedVoice = listedVoices.some((voice) => voice.voiceURI === settings.ttsVoiceURI)
    ? settings.ttsVoiceURI
    : "";

  useEffect(() => listenForVoices(setVoices), []);
  useEffect(() => setPinDraft(settings.pin), [settings.pin]);

  function setPin(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPinDraft(digits);
    if (digits.length === 0 || digits.length === 4) updateSettings({ pin: digits });
  }

  return (
    <PartnerPage
      title="Settings"
      lede="Wait. One picture. Light press means this one. Deep press says it."
      onBack={() => request("talk")}
    >
      <section className="panel">
        <h2>Field</h2>
        <div className="row">
          <button
            type="button"
            className="button"
            aria-pressed={settings.field === "black"}
            onClick={() => updateSettings({
              field: "black",
              outlineColor: settings.outlineColor.toLowerCase() === "#111111" ? "#f4f4f4" : settings.outlineColor,
            })}
          >
            Black
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={settings.field === "white"}
            onClick={() => updateSettings({
              field: "white",
              outlineColor: settings.outlineColor.toLowerCase() === "#f4f4f4" ? "#111111" : settings.outlineColor,
            })}
          >
            White
          </button>
        </div>
        <label className="stack">
          <span>Edge color</span>
          <input
            type="color"
            value={settings.outlineColor}
            onChange={(event) => updateSettings({ outlineColor: event.target.value })}
          />
        </label>
        <Slider
          label="Picture size"
          min={0.45}
          max={0.95}
          step={0.01}
          value={settings.imageScale}
          display={`${Math.round(settings.imageScale * 100)}%`}
          onChange={(imageScale) => updateSettings({ imageScale })}
        />
        <div className="row">
          <button
            type="button"
            className="button"
            aria-pressed={settings.motion === "subtle"}
            onClick={() => updateSettings({ motion: "subtle" })}
          >
            Gentle motion
          </button>
          <button
            type="button"
            className="button"
            aria-pressed={settings.motion === "off"}
            onClick={() => updateSettings({ motion: "off" })}
          >
            No motion
          </button>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.showChildLabel}
            onChange={(event) => updateSettings({ showChildLabel: event.target.checked })}
          />
          <span>Show one word under the picture</span>
        </label>
      </section>
      <section className="panel">
        <h2>Time</h2>
        <Slider
          label="Time on each picture"
          min={2}
          max={20}
          step={1}
          value={settings.rotationMs / 1000}
          display={`${settings.rotationMs / 1000} seconds`}
          onChange={(seconds) => updateSettings({ rotationMs: seconds * 1000 })}
        />
        <Slider
          label="Quiet moment before a press counts"
          min={300}
          max={800}
          step={50}
          value={settings.appearDwellMs}
          display={secondsFromMs(settings.appearDwellMs)}
          onChange={(appearDwellMs) => updateSettings({ appearDwellMs })}
        />
        <Slider
          label="Hold after a light press"
          min={150}
          max={800}
          step={50}
          value={settings.previewHoldMs}
          display={secondsFromMs(settings.previewHoldMs)}
          onChange={(previewHoldMs) => updateSettings({ previewHoldMs })}
        />
        <Slider
          label="Let go of a light press after"
          min={5}
          max={120}
          step={1}
          value={settings.latchTimeoutMs / 1000}
          display={`${Math.round(settings.latchTimeoutMs / 1000)} seconds`}
          onChange={(seconds) => updateSettings({ latchTimeoutMs: seconds * 1000 })}
        />
        <Slider
          label="Stay after speaking, if auto-resume is on"
          min={3}
          max={20}
          step={1}
          value={settings.speakHoldMs / 1000}
          display={`${settings.speakHoldMs / 1000} seconds`}
          onChange={(seconds) => updateSettings({ speakHoldMs: seconds * 1000 })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={settings.autoResumeAfterSpeak}
            onChange={(event) => updateSettings({ autoResumeAfterSpeak: event.target.checked })}
          />
          <span>After speaking, go on by itself. Off means you press Next.</span>
        </label>
      </section>
      <section className="panel">
        <h2>Sound</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.previewAudio}
            onChange={(event) => updateSettings({ previewAudio: event.target.checked })}
          />
          <span>Light press whispers the name</span>
        </label>
        <Slider
          label="Whisper volume"
          min={0}
          max={1}
          step={0.05}
          value={settings.previewVolume}
          display={`${Math.round(settings.previewVolume * 100)}%`}
          onChange={(previewVolume) => updateSettings({ previewVolume })}
        />
        <Slider
          label="Speaking volume"
          min={0}
          max={1}
          step={0.05}
          value={settings.utteranceVolume}
          display={`${Math.round(settings.utteranceVolume * 100)}%`}
          onChange={(utteranceVolume) => updateSettings({ utteranceVolume })}
        />
        <Slider
          label="Speaking speed"
          min={0.6}
          max={1.3}
          step={0.05}
          value={settings.ttsRate}
          display={settings.ttsRate.toFixed(2)}
          onChange={(ttsRate) => updateSettings({ ttsRate })}
        />
        <label className="stack">
          <span>Voice</span>
          <select
            value={selectedVoice}
            onChange={(event) => updateSettings({ ttsVoiceURI: event.target.value })}
          >
            <option value="">Device default</option>
            {listedVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">
          Recorded clips stay on this device; a built-in voice speaks on this device; a network voice would send the words out, so those are not listed when a built-in voice exists.
        </p>
      </section>
      <section className="panel">
        <h2>Partner</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.simpleMode}
            onChange={(event) => updateSettings({ simpleMode: event.target.checked })}
          />
          <span>Simple bar: Pause, Say it again, Partner, and Back in two pictures</span>
        </label>
        <label className="stack">
          <span>Partner code, four numbers. Leave empty for a simple question.</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            value={pinDraft}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        {pinDraft.length > 0 && pinDraft.length < 4 ? <p className="hint">Use four numbers, or clear the code.</p> : null}
        <div className="row">
          <button type="button" className="button" onClick={() => request("calibrate")}>
            Practice presses
          </button>
          <button type="button" className="button" onClick={() => request("guide")}>
            Partner guide
          </button>
        </div>
      </section>
    </PartnerPage>
  );
}

function secondsFromMs(ms: number): string {
  const text = (Math.round(ms) / 1000).toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  return `${text} ${text === "1" ? "second" : "seconds"}`;
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="stack">
      <span>
        {label}: {display}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
