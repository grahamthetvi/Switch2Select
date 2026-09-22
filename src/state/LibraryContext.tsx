import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteItem as deleteStoredItem,
  loadLibrary,
  replaceLibrary as replaceStoredLibrary,
  saveItem as saveStoredItem,
  saveSettings,
} from "../db/db";
import { type AppSettings, type VocabularyItem, defaultSettings, normalizeSettings } from "../types";

interface LibraryValue {
  ready: boolean;
  error: string | null;
  items: VocabularyItem[];
  settings: AppSettings;
  urls: Map<string, string>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  saveItem: (item: VocabularyItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  replaceLibrary: (items: VocabularyItem[], settings: AppSettings) => Promise<void>;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    let cancelled = false;
    loadLibrary()
      .then((loaded) => {
        if (cancelled) return;
        setItems(loaded.items);
        setSettings(loaded.settings);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError("The pictures on this device could not be opened.");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const urls = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.id, URL.createObjectURL(item.imageBlob));
    return map;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
    };
  }, [urls]);

  const value = useMemo<LibraryValue>(() => {
    return {
      ready,
      error,
      items,
      settings,
      urls,
      updateSettings(patch) {
        const next = normalizeSettings({ ...settings, ...patch });
        setSettings(next);
        void saveSettings(next).catch(() => setError("Those settings could not be saved."));
      },
      async saveItem(item) {
        await saveStoredItem(item);
        setItems((current) => {
          const index = current.findIndex((entry) => entry.id === item.id);
          if (index === -1) return [...current, item];
          const copy = current.slice();
          copy[index] = item;
          return copy;
        });
      },
      async deleteItem(id) {
        await deleteStoredItem(id);
        setItems((current) => current.filter((item) => item.id !== id));
      },
      async replaceLibrary(nextItems, nextSettings) {
        const normalized = normalizeSettings(nextSettings);
        await replaceStoredLibrary(nextItems, normalized);
        setItems(nextItems);
        setSettings(normalized);
      },
    };
  }, [ready, error, items, settings, urls]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("Library is not ready.");
  return value;
}
