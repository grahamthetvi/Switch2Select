import { describe, expect, it } from "vitest";
import { canPlace, libraryTreeError, openParentId, type TreeNode } from "./tree";

function node(id: string, parentId: string | null): TreeNode {
  return { id, parentId };
}

describe("library tree", () => {
  it("keeps a new picture at the top until the top has two", () => {
    const items = [node("a", null)];
    expect(openParentId(items, "draft")).toBeNull();
    expect(canPlace(items, "draft", null)).toBeNull();
  });

  it("offers an unfinished pair when the top is full, and nowhere else", () => {
    const items = [node("a", null), node("b", null), node("c", "a")];
    expect(openParentId(items, "draft")).toBe("a");
    expect(openParentId([node("a", null), node("b", null)], "draft")).toBeNull();
    expect(canPlace([node("a", null), node("b", null)], "draft", null)).toBe("That branch already has two pictures.");
  });

  it("rejects a loop, a third picture, a missing parent, and a repeated id", () => {
    expect(libraryTreeError([node("a", "b"), node("b", "a")])).toBe("That would make a loop.");
    expect(libraryTreeError([node("a", null), node("b", null), node("c", null)])).toBe(
      "That branch already has two pictures.",
    );
    expect(libraryTreeError([node("a", "missing")])).toBe("That backup points a picture at a missing parent.");
    expect(libraryTreeError([node("a", null), node("a", null)])).toBe("That backup lists the same picture twice.");
    expect(libraryTreeError([node("a", null), node("b", "a"), node("c", "a")])).toBeNull();
  });
});