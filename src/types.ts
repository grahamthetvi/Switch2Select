export interface VocabularyItem {
  id: string;
  label: string;
  utterance: string;
  imageBlob: Blob;
  audioBlob?: Blob;
  parentId: string | null;
  colorAccent: string | null;
  order: number;
  active: boolean;
  demo: boolean;
  imageZoom: number;
  imageX: number;
  imageY: number;
}

export interface AppSettings {
  field: "black" | "white";
  outlineColor: string;
  photoOutlineEnabled: boolean;
  photoOutlineThickness: number;
  imageScale: number;
  showChildLabel: boolean;
  labelFontSize: number;
  labelTextColor: string;
  labelBubbleEnabled: boolean;
  labelBubbleColor: string;
  labelBubbleThickness: number;
  autoFullscreen: boolean;
  motion: "subtle" | "off";
  rotationMs: number;
  appearDwellMs: number;
  previewHoldMs: number;
  latchTimeoutMs: number;
  speakHoldMs: number;
  autoResumeAfterSpeak: boolean;
  previewAudio: boolean;
  previewVolume: number;
  utteranceVolume: number;
  ttsVoiceURI: string;
  ttsRate: number;
  simpleMode: boolean;
  pin: string;
  pressInHoldMs: number;
  pressCommitHoldMs: number;
  gamepadInButton: number;
  gamepadCommitButton: number;
  oneSwitch: boolean;
}

export const defaultSettings: AppSettings = {
  field: "black",
  outlineColor: "#f4f4f4",
  photoOutlineEnabled: true,
  photoOutlineThickness: 6,
  imageScale: 0.78,
  showChildLabel: false,
  labelFontSize: 64,
  labelTextColor: "#f4f4f4",
  labelBubbleEnabled: true,
  labelBubbleColor: "#ff0000",
  labelBubbleThickness: 4,
  autoFullscreen: true,
  motion: "subtle",
  rotationMs: 6000,
  appearDwellMs: 500,
  previewHoldMs: 250,
  latchTimeoutMs: 20000,
  speakHoldMs: 5000,
  autoResumeAfterSpeak: false,
  previewAudio: false,
  previewVolume: 0.35,
  utteranceVolume: 1,
  ttsVoiceURI: "",
  ttsRate: 0.9,
  simpleMode: false,
  pin: "",
  pressInHoldMs: 280,
  pressCommitHoldMs: 700,
  gamepadInButton: 0,
  gamepadCommitButton: 1,
  oneSwitch: false,
};

function hexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  const merged: AppSettings = { ...defaultSettings, ...value };
  const pressInHoldMs = clamp(merged.pressInHoldMs, 80, 1500);
  let pressCommitHoldMs = clamp(merged.pressCommitHoldMs, 200, 2500);
  if (pressCommitHoldMs < pressInHoldMs + 80) {
    pressCommitHoldMs = Math.min(2500, pressInHoldMs + 80);
  }
  return {
    field: merged.field === "white" ? "white" : "black",
    outlineColor: hexColor(merged.outlineColor, defaultSettings.outlineColor),
    photoOutlineEnabled:
      typeof merged.photoOutlineEnabled === "boolean"
        ? merged.photoOutlineEnabled
        : defaultSettings.photoOutlineEnabled,
    photoOutlineThickness: clamp(
      merged.photoOutlineThickness ?? defaultSettings.photoOutlineThickness,
      0,
      24,
    ),
    imageScale: clamp(merged.imageScale, 0.45, 0.95),
    showChildLabel: Boolean(merged.showChildLabel),
    labelFontSize: clamp(merged.labelFontSize ?? defaultSettings.labelFontSize, 24, 120),
    labelTextColor: hexColor(merged.labelTextColor, defaultSettings.labelTextColor),
    labelBubbleEnabled:
      typeof merged.labelBubbleEnabled === "boolean"
        ? merged.labelBubbleEnabled
        : defaultSettings.labelBubbleEnabled,
    labelBubbleColor: hexColor(merged.labelBubbleColor, defaultSettings.labelBubbleColor),
    labelBubbleThickness: clamp(
      merged.labelBubbleThickness ?? defaultSettings.labelBubbleThickness,
      0,
      12,
    ),
    autoFullscreen:
      typeof merged.autoFullscreen === "boolean"
        ? merged.autoFullscreen
        : defaultSettings.autoFullscreen,
    motion: merged.motion === "off" ? "off" : "subtle",
    rotationMs: clamp(merged.rotationMs, 2000, 20000),
    appearDwellMs: clamp(merged.appearDwellMs, 300, 800),
    previewHoldMs: clamp(merged.previewHoldMs, 150, 800),
    latchTimeoutMs: clamp(merged.latchTimeoutMs, 5000, 120000),
    speakHoldMs: clamp(merged.speakHoldMs, 3000, 20000),
    autoResumeAfterSpeak: Boolean(merged.autoResumeAfterSpeak),
    previewAudio: Boolean(merged.previewAudio),
    previewVolume: clamp(merged.previewVolume, 0, 1),
    utteranceVolume: clamp(merged.utteranceVolume, 0, 1),
    ttsVoiceURI: typeof merged.ttsVoiceURI === "string" ? merged.ttsVoiceURI : "",
    ttsRate: clamp(merged.ttsRate, 0.6, 1.3),
    simpleMode: Boolean(merged.simpleMode),
    pin: /^\d{4}$/.test(merged.pin) ? merged.pin : "",
    pressInHoldMs,
    pressCommitHoldMs,
    gamepadInButton: clamp(Math.round(merged.gamepadInButton), 0, 15),
    gamepadCommitButton: clamp(Math.round(merged.gamepadCommitButton), 0, 15),
    oneSwitch: Boolean(merged.oneSwitch),
  };
}
