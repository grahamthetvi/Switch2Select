import { describe, expect, it } from "vitest";
import { labelStyle, photoStyle } from "./visualStyle";

const label = {
  fontSize: 64,
  textColor: "#ffffff",
  bubbleColor: "#ff0000",
  bubbleThickness: 2,
};

describe("visualStyle", () => {
  it("draws a letter bubble with one stroke", () => {
    const style = labelStyle({ ...label, bubbleEnabled: true });
    expect(style.WebkitTextStroke).toBe("4px #ff0000");
    expect(style.paintOrder).toBe("stroke fill");
    expect(style.color).toBe("#ffffff");
  });

  it("keeps a thick letter bubble to a single stroke", () => {
    const style = labelStyle({ ...label, bubbleEnabled: true, bubbleThickness: 12 });
    expect(style.WebkitTextStroke).toBe("24px #ff0000");
  });

  it("skips empty bubbles and outlines", () => {
    expect(labelStyle({ ...label, bubbleEnabled: false }).WebkitTextStroke).toBe("0px transparent");
    expect(labelStyle({ ...label, bubbleEnabled: true, bubbleThickness: 0 }).WebkitTextStroke).toBe("0px transparent");
    const plain = photoStyle({
      imageX: 0,
      imageY: 0,
      imageZoom: 1,
      outlineEnabled: false,
      outlineThickness: 4,
      outlineFilterId: "cutout",
    });
    expect(plain.filter).toBeUndefined();
    expect(plain.transform).toBe("translate(0%, 0%) scale(1)");
  });

  it("references one photo-outline filter when the outline is thick", () => {
    const style = photoStyle({
      imageX: 10,
      imageY: -4,
      imageZoom: 1.2,
      outlineEnabled: true,
      outlineThickness: 24,
      outlineFilterId: "cutout-a",
    });
    expect(style.filter).toBe("url(#cutout-a)");
    expect(style.transform).toBe("translate(10%, -4%) scale(1.2)");
  });
});
