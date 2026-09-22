import { describe, expect, it } from "vitest";
import { photoOutlineFilter, textBubbleShadow } from "./visualStyle";

describe("visualStyle", () => {
  it("builds a Type Talk style letter bubble", () => {
    const shadow = textBubbleShadow("#ff0000", 2);
    expect(shadow).toContain("-2px -2px 0 #ff0000");
    expect(shadow).toContain("2px 2px 0 #ff0000");
    expect(shadow).not.toContain("0px 0px 0 #ff0000");
  });

  it("skips empty bubbles and outlines", () => {
    expect(textBubbleShadow("#ff0000", 0)).toBe("none");
    expect(photoOutlineFilter("#ffff00", 0)).toBe("none");
  });

  it("builds a radial photo outline like Book Maker", () => {
    const filter = photoOutlineFilter("#ffff00", 4);
    expect(filter.startsWith("drop-shadow(")).toBe(true);
    expect(filter.split("drop-shadow(").length).toBeGreaterThan(12);
  });
});
