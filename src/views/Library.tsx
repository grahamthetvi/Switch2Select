import { useEffect, useState } from "react";
import { PartnerPage } from "../components/PartnerPage";
import { exportLibrary, importLibrary } from "../lib/backup";
import { fitImage } from "../lib/images";
import { removePhotoBackground } from "../lib/removeBackground";
import { canPlace, childrenOf } from "../lib/tree";
import type { ViewId } from "../nav";
import { useLibrary } from "../state/LibraryContext";
import type { VocabularyItem } from "../types";

interface Draft {
  id: string | null;
  label: string;
  utterance: string;
  parentId: string | null;
  colorAccent: string | null;
  order: number;
  active: boolean;
  demo: boolean;
  imageBlob: Blob;
  audioBlob: Blob | null;
  imageZoom: number;
  imageX: number;
  imageY: number;
  imageReplaced: boolean;
}

export function Library({ request }: { request: (view: ViewId) => void }) {
  const library = useLibrary();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ items: VocabularyItem[]; settings: typeof library.settings } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const activeCount = library.items.filter((item) => item.active).length;

  useEffect(() => {
    if (!draft) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.imageBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.imageBlob]);

  async function addFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    try {
      const imageBlob = await fitImage(file);
      const stem = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      setDraft({
        id: null,
        label: stem || "Picture",
        utterance: "",
        parentId: openParent(library.items),
        colorAccent: null,
        order: library.items.length,
        active: activeCount < 8,
        demo: false,
        imageBlob,
        audioBlob: null,
        imageZoom: 1,
        imageX: 0,
        imageY: 0,
        imageReplaced: true,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read that picture.");
    }
  }

  function edit(item: VocabularyItem) {
    setMessage(null);
    setDraft({
      id: item.id,
      label: item.label,
      utterance: item.utterance,
      parentId: item.parentId,
      colorAccent: item.colorAccent,
      order: item.order,
      active: item.active,
      demo: item.demo,
      imageBlob: item.imageBlob,
      audioBlob: item.audioBlob ?? null,
      imageZoom: item.imageZoom,
      imageX: item.imageX,
      imageY: item.imageY,
      imageReplaced: false,
    });
  }

  async function removeBackground() {
    if (!draft) return;
    setBusy("Taking the background away. This stays on this device.");
    setMessage(null);
    try {
      const imageBlob = await removePhotoBackground(draft.imageBlob, (current, total) => {
        if (total > 0) setBusy(`Taking the background away. ${current} of ${total}.`);
      });
      setDraft({ ...draft, imageBlob, imageReplaced: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the background.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    const id = draft.id ?? crypto.randomUUID();
    const reason = canPlace(library.items, id, draft.parentId);
    if (!draft.label.trim()) {
      setMessage("Add a short name.");
      return;
    }
    if (reason) {
      setMessage(reason);
      return;
    }
    const item: VocabularyItem = {
      id,
      label: draft.label.trim(),
      utterance: draft.utterance.trim() || draft.label.trim(),
      imageBlob: draft.imageBlob,
      parentId: draft.parentId,
      colorAccent: draft.colorAccent,
      order: Number.isFinite(draft.order) ? draft.order : 0,
      active: draft.active,
      demo: draft.imageReplaced ? false : draft.demo,
      imageZoom: draft.imageZoom,
      imageX: draft.imageX,
      imageY: draft.imageY,
    };
    if (draft.audioBlob) item.audioBlob = draft.audioBlob;
    await library.saveItem(item);
    setDraft(null);
    setMessage("Saved on this device.");
  }

  async function remove(id: string) {
    if (library.items.some((item) => item.parentId === id)) {
      setMessage("This picture has others inside it. Move those first.");
      return;
    }
    await library.deleteItem(id);
    if (draft?.id === id) setDraft(null);
  }

  async function onExport() {
    const blob = await exportLibrary(library.items, library.settings);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "switch2select-backup.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      setPendingImport(await importLibrary(file));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open that backup.");
    }
  }

  const countNote = activeCount > 8
    ? `${activeCount} pictures today. A hard vision day is easier with 3 to 8.`
    : activeCount === 0
      ? "No pictures are turned on for today."
      : `${activeCount} pictures today.`;

  return (
    <PartnerPage
      title="Library"
      lede="Real photos from this child’s life. One person or one thing, alone on the field."
      onBack={() => request("talk")}
    >
      {library.items.some((item) => item.demo) ? (
        <p className="note">Example pictures are standing in. Replace them with photos from this child’s life.</p>
      ) : null}
      <p className="note">{countNote}</p>
      {message ? <p className="note">{message}</p> : null}
      {busy ? <p className="note">{busy}</p> : null}
      <div className="row">
        <label className="button button-strong">
          Add a picture
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              void addFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <button type="button" className="button" onClick={() => void onExport()}>
          Export backup
        </button>
        <label className="button">
          Import backup
          <input
            className="sr-only"
            type="file"
            accept="application/zip,.zip"
            onChange={(event) => {
              void onImport(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {pendingImport ? (
        <div className="panel">
          <p>Replace the pictures and partner settings on this device with this backup?</p>
          <div className="row">
            <button
              type="button"
              className="button button-strong"
              onClick={() => {
                void library.replaceLibrary(pendingImport.items, pendingImport.settings).then(() => {
                  setPendingImport(null);
                  setDraft(null);
                  setMessage("Backup restored on this device.");
                });
              }}
            >
              Replace
            </button>
            <button type="button" className="button" onClick={() => setPendingImport(null)}>
              Keep current
            </button>
          </div>
        </div>
      ) : null}
      {draft && previewUrl ? (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="preview-field" data-field={library.settings.field}>
            <img
              src={previewUrl}
              alt=""
              style={{ transform: `translate(${draft.imageX}%, ${draft.imageY}%) scale(${draft.imageZoom})` }}
            />
          </div>
          <label className="stack">
            <span>Name</span>
            <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
          </label>
          <label className="stack">
            <span>What to say</span>
            <input
              value={draft.utterance}
              onChange={(event) => setDraft({ ...draft, utterance: event.target.value })}
              placeholder={draft.label || "The full message"}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
            <span>On for today</span>
          </label>
          <label className="stack">
            <span>Inside</span>
            <select
              value={draft.parentId ?? ""}
              onChange={(event) => setDraft({ ...draft, parentId: event.target.value || null })}
            >
              <option value="">Top</option>
              {library.items
                .filter((item) => item.id !== draft.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
            </select>
          </label>
          <p className="hint">Each branch holds two pictures. Two-choice never shows a third. A new picture can sit inside another until it has a partner.</p>
          <label className="stack">
            <span>Order</span>
            <input
              type="number"
              value={draft.order}
              onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={Boolean(draft.colorAccent)}
              onChange={(event) => setDraft({ ...draft, colorAccent: event.target.checked ? "#f4f4f4" : null })}
            />
            <span>Color edge</span>
          </label>
          {draft.colorAccent ? (
            <label className="stack">
              <span>Edge color</span>
              <input
                type="color"
                value={draft.colorAccent}
                onChange={(event) => setDraft({ ...draft, colorAccent: event.target.value })}
              />
            </label>
          ) : null}
          <label className="stack">
            <span>Size</span>
            <input
              type="range"
              min={0.6}
              max={2.2}
              step={0.05}
              value={draft.imageZoom}
              onChange={(event) => setDraft({ ...draft, imageZoom: Number(event.target.value) })}
            />
          </label>
          <label className="stack">
            <span>Across</span>
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={draft.imageX}
              onChange={(event) => setDraft({ ...draft, imageX: Number(event.target.value) })}
            />
          </label>
          <label className="stack">
            <span>Down</span>
            <input
              type="range"
              min={-40}
              max={40}
              step={1}
              value={draft.imageY}
              onChange={(event) => setDraft({ ...draft, imageY: Number(event.target.value) })}
            />
          </label>
          <label className="button">
            {draft.audioBlob ? "Replace recorded voice" : "Add a recorded voice"}
            <input
              className="sr-only"
              type="file"
              accept="audio/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setDraft({ ...draft, audioBlob: file });
                event.target.value = "";
              }}
            />
          </label>
          {draft.audioBlob ? (
            <button type="button" className="button" onClick={() => setDraft({ ...draft, audioBlob: null })}>
              Remove recording
            </button>
          ) : null}
          <div className="row">
            <button type="button" className="button" disabled={Boolean(busy)} onClick={() => void removeBackground()}>
              Remove background
            </button>
            <button type="submit" className="button button-strong">
              Save
            </button>
            <button type="button" className="button" onClick={() => setDraft(null)}>
              Close
            </button>
          </div>
        </form>
      ) : null}
      <ul className="library-list">
        {library.items
          .slice()
          .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
          .map((item) => {
            const url = library.urls.get(item.id);
            const parent = library.items.find((entry) => entry.id === item.parentId);
            return (
              <li key={item.id}>
                {url ? <img src={url} alt="" /> : null}
                <div>
                  <strong>{item.label}</strong>
                  <span>{parent ? `Inside ${parent.label}` : "Top"}</span>
                  {childrenOf(library.items, item.id).length > 0 ? <span>Branch</span> : null}
                </div>
                <button
                  type="button"
                  className="button"
                  aria-pressed={item.active}
                  onClick={() => void library.saveItem({ ...item, active: !item.active })}
                >
                  {item.active ? "On today" : "Off today"}
                </button>
                <button type="button" className="button" onClick={() => edit(item)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    if (confirmRemove !== item.id) {
                      setConfirmRemove(item.id);
                      return;
                    }
                    setConfirmRemove(null);
                    void remove(item.id);
                  }}
                >
                  {confirmRemove === item.id ? "Remove for good" : "Remove"}
                </button>
              </li>
            );
          })}
      </ul>
    </PartnerPage>
  );
}

function openParent(items: VocabularyItem[]): string | null {
  if (canPlace(items, "draft", null) === null) return null;
  const withRoom = items.find((item) => canPlace(items, "draft", item.id) === null);
  return withRoom?.id ?? null;
}
