import JSZip from "jszip";
import { libraryTreeError } from "./tree";
import { type AppSettings, type VocabularyItem, clamp, normalizeSettings } from "../types";

interface BackupItem {
  id: string;
  label: string;
  utterance: string;
  parentId: string | null;
  colorAccent: string | null;
  order: number;
  active: boolean;
  demo: boolean;
  imageZoom: number;
  imageX: number;
  imageY: number;
  imageFile: string;
  audioFile: string | null;
}

interface BackupFile {
  version: 1;
  exportedAt: string;
  settings: Omit<AppSettings, "pin">;
  items: BackupItem[];
}

function extensionFor(blob: Blob): string {
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mpeg") || blob.type.includes("mp3")) return "mp3";
  if (blob.type.includes("wav")) return "wav";
  if (blob.type.includes("mp4") || blob.type.includes("m4a")) return "m4a";
  if (blob.type.includes("ogg")) return "ogg";
  return "audio";
}

function settingsForExport(settings: AppSettings): Omit<AppSettings, "pin"> {
  const { pin, ...rest } = normalizeSettings(settings);
  void pin;
  return rest;
}

export async function exportLibrary(items: VocabularyItem[], settings: AppSettings): Promise<Blob> {
  const zip = new JSZip();
  const manifest: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsForExport(settings),
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      utterance: item.utterance,
      parentId: item.parentId,
      colorAccent: item.colorAccent,
      order: item.order,
      active: item.active,
      demo: item.demo,
      imageZoom: item.imageZoom,
      imageX: item.imageX,
      imageY: item.imageY,
      imageFile: `images/${item.id}.png`,
      audioFile: item.audioBlob ? `audio/${item.id}.${extensionFor(item.audioBlob)}` : null,
    })),
  };
  zip.file("library.json", JSON.stringify(manifest));
  for (const item of items) {
    zip.file(`images/${item.id}.png`, item.imageBlob);
    const audioName = manifest.items.find((entry) => entry.id === item.id)?.audioFile;
    if (item.audioBlob && audioName) zip.file(audioName, item.audioBlob);
  }
  return zip.generateAsync({ type: "blob" });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function importLibrary(
  file: Blob,
): Promise<{ items: VocabularyItem[]; settings: AppSettings; includesPin: boolean }> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("library.json");
  if (!manifestFile) throw new Error("That backup has no library.");
  const parsed: unknown = JSON.parse(await manifestFile.async("string"));
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    throw new Error("That backup is not a Switch2Select library.");
  }
  const items: VocabularyItem[] = [];
  for (const entry of parsed.items) {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.imageFile !== "string") {
      throw new Error("That backup is missing a picture.");
    }
    const image = zip.file(entry.imageFile);
    if (!image) throw new Error("That backup is missing a picture file.");
    const audioFile = typeof entry.audioFile === "string" ? entry.audioFile : null;
    const audio = audioFile ? zip.file(audioFile) : null;
    const label = typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : "Picture";
    const spoken = typeof entry.utterance === "string" && entry.utterance.trim() ? entry.utterance.trim() : label;
    const accent = typeof entry.colorAccent === "string" && /^#[0-9a-fA-F]{6}$/.test(entry.colorAccent)
      ? entry.colorAccent
      : null;
    const item: VocabularyItem = {
      id: entry.id,
      label,
      utterance: spoken,
      imageBlob: await image.async("blob"),
      parentId: typeof entry.parentId === "string" ? entry.parentId : null,
      colorAccent: accent,
      order: typeof entry.order === "number" && Number.isFinite(entry.order) ? entry.order : 0,
      active: entry.active === true,
      demo: entry.demo === true,
      imageZoom: clamp(typeof entry.imageZoom === "number" ? entry.imageZoom : 1, 0.6, 2.2),
      imageX: clamp(typeof entry.imageX === "number" ? entry.imageX : 0, -40, 40),
      imageY: clamp(typeof entry.imageY === "number" ? entry.imageY : 0, -40, 40),
    };
    if (audio) item.audioBlob = await audio.async("blob");
    items.push(item);
  }
  const treeError = libraryTreeError(items);
  if (treeError) throw new Error(treeError);
  const rawSettings = isRecord(parsed.settings) ? parsed.settings : {};
  const includesPin = Object.prototype.hasOwnProperty.call(rawSettings, "pin");
  const settings = normalizeSettings(rawSettings as Partial<AppSettings>);
  return { items, settings, includesPin };
}

/** Keep the partner code already on this device when the backup has none. */
export function settingsFromBackup(
  imported: { settings: AppSettings; includesPin: boolean },
  devicePin: string,
): AppSettings {
  if (imported.includesPin) return imported.settings;
  return { ...imported.settings, pin: normalizeSettings({ pin: devicePin }).pin };
}
