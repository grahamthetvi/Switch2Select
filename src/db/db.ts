import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import { drawDemo } from "../lib/demoImages";
import { type AppSettings, type VocabularyItem, defaultSettings, normalizeSettings } from "../types";

interface SwitchDB extends DBSchema {
  items: {
    key: string;
    value: VocabularyItem;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  meta: {
    key: string;
    value: boolean;
  };
}

const DB_NAME = "switch2select";
const DB_VERSION = 1;

let database: Promise<IDBPDatabase<SwitchDB>> | null = null;

function db(): Promise<IDBPDatabase<SwitchDB>> {
  database ??= openDB<SwitchDB>(DB_NAME, DB_VERSION, {
    upgrade(store) {
      store.createObjectStore("items", { keyPath: "id" });
      store.createObjectStore("settings");
      store.createObjectStore("meta");
    },
  });
  return database;
}

interface SeedSpec {
  id: string;
  label: string;
  utterance: string;
  parentId: string | null;
  order: number;
  active: boolean;
  color: string;
  kind: string;
}

const seedSpecs: SeedSpec[] = [
  { id: "demo-people", label: "People", utterance: "People", parentId: null, order: 0, active: false, color: "#f4f4f4", kind: "people" },
  { id: "demo-everyday", label: "Everyday", utterance: "Everyday", parentId: null, order: 1, active: false, color: "#9fd7ff", kind: "everyday" },
  { id: "demo-person", label: "Person", utterance: "I want someone", parentId: "demo-people", order: 10, active: true, color: "#f4f4f4", kind: "person" },
  { id: "demo-friend", label: "Friend", utterance: "I want my friend", parentId: "demo-people", order: 11, active: true, color: "#f0d38a", kind: "friend" },
  { id: "demo-drink", label: "Drink", utterance: "I want a drink", parentId: "demo-everyday", order: 20, active: true, color: "#9fd7ff", kind: "drink" },
  { id: "demo-more", label: "More", utterance: "More", parentId: "demo-everyday", order: 21, active: false, color: "#f0a36b", kind: "more" },
  { id: "demo-eat", label: "Eat", utterance: "I want to eat", parentId: "demo-more", order: 30, active: true, color: "#f0a36b", kind: "eat" },
  { id: "demo-also", label: "Also", utterance: "Also", parentId: "demo-more", order: 31, active: false, color: "#e07a7a", kind: "also" },
  { id: "demo-toy", label: "Toy", utterance: "I want my toy", parentId: "demo-also", order: 40, active: true, color: "#e07a7a", kind: "toy" },
  { id: "demo-help", label: "Help", utterance: "I need help", parentId: "demo-also", order: 41, active: true, color: "#b7e3b0", kind: "help" },
];

async function buildSeed(): Promise<VocabularyItem[]> {
  const items: VocabularyItem[] = [];
  for (const spec of seedSpecs) {
    items.push({
      id: spec.id,
      label: spec.label,
      utterance: spec.utterance,
      imageBlob: await drawDemo(spec.kind, spec.color),
      parentId: spec.parentId,
      colorAccent: spec.color,
      order: spec.order,
      active: spec.active,
      demo: true,
      imageZoom: 1,
      imageX: 0,
      imageY: 0,
    });
  }
  return items;
}

export async function loadLibrary(): Promise<{ items: VocabularyItem[]; settings: AppSettings; welcomed: boolean }> {
  const store = await db();
  const seeded = await store.get("meta", "seeded");
  let items = await store.getAll("items");
  if (!seeded && items.length === 0) {
    items = await buildSeed();
    const tx = store.transaction(["items", "meta"], "readwrite");
    for (const item of items) await tx.objectStore("items").put(item);
    await tx.objectStore("meta").put(true, "seeded");
    await tx.done;
  }
  const stored = await store.get("settings", "app");
  const welcomed = Boolean(await store.get("meta", "welcomed"));
  return { items, settings: normalizeSettings(stored ?? defaultSettings), welcomed };
}

export async function markWelcomeSeen(): Promise<void> {
  const store = await db();
  await store.put("meta", true, "welcomed");
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await db();
  await store.put("settings", normalizeSettings(settings), "app");
}

export async function saveItem(item: VocabularyItem): Promise<void> {
  const store = await db();
  await store.put("items", item);
}

export async function deleteItem(id: string): Promise<void> {
  const store = await db();
  await store.delete("items", id);
}

export async function replaceLibrary(items: VocabularyItem[], settings: AppSettings): Promise<void> {
  const store = await db();
  const tx = store.transaction(["items", "settings", "meta"], "readwrite");
  await tx.objectStore("items").clear();
  for (const item of items) await tx.objectStore("items").put(item);
  await tx.objectStore("settings").put(normalizeSettings(settings), "app");
  await tx.objectStore("meta").put(true, "seeded");
  await tx.done;
}
