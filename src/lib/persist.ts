let askedThisSitting = false;

/** Best-effort. Once per page load, and never on the path that opens the talking screen. */
export function requestPersistentStore(): void {
  if (askedThisSitting) return;
  askedThisSitting = true;
  try {
    if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persist !== "function") {
      return;
    }
    void navigator.storage.persist().catch(() => undefined);
  } catch {
    // A persisted store is optional.
  }
}
