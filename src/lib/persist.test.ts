import { describe, expect, it, vi } from "vitest";

describe("requestPersistentStore", () => {
  it("asks once and ignores a refusal", async () => {
    vi.resetModules();
    const calls: Promise<boolean>[] = [];
    vi.stubGlobal("navigator", {
      storage: {
        persist: () => {
          const pending = Promise.reject(new Error("refused"));
          calls.push(pending);
          return pending;
        },
      },
    });
    const { requestPersistentStore } = await import("./persist");
    requestPersistentStore();
    requestPersistentStore();
    expect(calls).toHaveLength(1);
    await Promise.allSettled(calls);
    vi.unstubAllGlobals();
  });

  it("does nothing when the browser has no storage manager", async () => {
    vi.resetModules();
    vi.stubGlobal("navigator", {});
    const { requestPersistentStore } = await import("./persist");
    expect(() => requestPersistentStore()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
