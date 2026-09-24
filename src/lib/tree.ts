import type { VocabularyItem } from "../types";

export interface TreeNode {
  id: string;
  parentId: string | null;
}

export function childrenOf(items: VocabularyItem[], parentId: string | null): VocabularyItem[] {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function activeSet(items: VocabularyItem[]): VocabularyItem[] {
  return items
    .filter((item) => item.active)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function canPlace(items: TreeNode[], itemId: string, parentId: string | null): string | null {
  if (parentId === itemId) return "A picture cannot sit inside itself.";
  const seen = new Set<string>();
  let cursor = parentId;
  while (cursor) {
    if (cursor === itemId || seen.has(cursor)) return "That would make a loop.";
    seen.add(cursor);
    cursor = items.find((item) => item.id === cursor)?.parentId ?? null;
  }
  const siblings = items.filter((item) => item.parentId === parentId && item.id !== itemId);
  if (siblings.length >= 2) return "That branch already has two pictures.";
  return null;
}

export function parentOf(items: TreeNode[], id: string | null): string | null {
  if (!id) return null;
  return items.find((item) => item.id === id)?.parentId ?? null;
}

/** A place for a new picture: the top when it has room, otherwise a pair that is waiting for its second picture. */
export function openParentId(items: TreeNode[], itemId: string): string | null {
  if (canPlace(items, itemId, null) === null) return null;
  const incomplete = items.find((item) => {
    const count = items.filter((child) => child.parentId === item.id && child.id !== itemId).length;
    return count === 1 && canPlace(items, itemId, item.id) === null;
  });
  return incomplete?.id ?? null;
}

/** Why this set of pictures cannot be a library. Null means the pairs, parents, and ids are usable. */
export function libraryTreeError(items: TreeNode[]): string | null {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) return "That backup lists the same picture twice.";
    ids.add(item.id);
  }
  for (const item of items) {
    if (item.parentId !== null && !ids.has(item.parentId)) {
      return "That backup points a picture at a missing parent.";
    }
    const reason = canPlace(items, item.id, item.parentId);
    if (reason) return reason;
  }
  return null;
}
