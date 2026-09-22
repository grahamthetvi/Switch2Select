import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { defaultSettings, type VocabularyItem } from "../types";
import { exportLibrary, importLibrary, settingsFromBackup } from "./backup";

function picture(): VocabularyItem {
  return {
    id: "cup",
    label: "Cup",
    utterance: "I want a drink",
    imageBlob: new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" }),
    parentId: null,
    colorAccent: null,
    order: 1,
    active: true,
    demo: false,
    imageZoom: 1,
    imageX: 0,
    imageY: 0,
  };
}

describe("library backup", () => {
  it("leaves the partner code out of the file and keeps the one already on the device", async () => {
    const blob = await exportLibrary([picture()], { ...defaultSettings, pin: "1234", field: "white", ttsRate: 1.1 });
    const zip = await JSZip.loadAsync(blob);
    const manifestFile = zip.file("library.json");
    if (!manifestFile) throw new Error("missing library.json");
    const manifest = JSON.parse(await manifestFile.async("string")) as {
      settings: Record<string, unknown>;
    };
    expect(manifest.settings.pin).toBeUndefined();
    expect(manifest.settings.field).toBe("white");
    expect(manifest.settings.ttsRate).toBe(1.1);

    const imported = await importLibrary(blob);
    expect(imported.includesPin).toBe(false);
    expect(imported.settings.field).toBe("white");
    expect(imported.settings.ttsRate).toBe(1.1);
    expect(imported.items.map((item) => item.label)).toEqual(["Cup"]);
    expect(settingsFromBackup(imported, "9876").pin).toBe("9876");
  });

  it("uses a partner code that is actually in the backup", async () => {
    const blob = await exportLibrary([picture()], { ...defaultSettings, field: "white" });
    const zip = await JSZip.loadAsync(blob);
    const manifestFile = zip.file("library.json");
    if (!manifestFile) throw new Error("missing library.json");
    const manifest = JSON.parse(await manifestFile.async("string")) as { settings: Record<string, unknown> };
    manifest.settings.pin = "1234";
    zip.file("library.json", JSON.stringify(manifest));
    const withPin = await zip.generateAsync({ type: "blob" });
    const imported = await importLibrary(withPin);
    expect(imported.includesPin).toBe(true);
    expect(settingsFromBackup(imported, "9876").pin).toBe("1234");
    expect(settingsFromBackup(imported, "9876").field).toBe("white");
  });
});
