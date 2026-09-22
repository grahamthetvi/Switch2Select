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
