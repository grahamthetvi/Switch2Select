import { describe, expect, it } from "vitest";
import { readSwitchLevel, resolveSwitchLevel } from "./switchEvent";
import { defaultSettings, normalizeSettings } from "../types";

describe("resolveSwitchLevel", () => {
  it("keeps a light press as a light press until the picture is held", () => {
    expect(resolveSwitchLevel("in", { oneSwitch: true, latched: false })).toBe("in");
  });

  it("turns a second light press into a deep press when one switch is on", () => {
    expect(resolveSwitchLevel("in", { oneSwitch: true, latched: true })).toBe("commit");
  });

  it("does not steal a second light press when two switches are in use", () => {
    expect(resolveSwitchLevel("in", { oneSwitch: false, latched: true })).toBe("in");
  });

  it("leaves a dedicated deep press and a cancel alone", () => {
    expect(resolveSwitchLevel("commit", { oneSwitch: true, latched: true })).toBe("commit");
    expect(resolveSwitchLevel("cancel", { oneSwitch: true, latched: true })).toBe("cancel");
  });
});

describe("readSwitchLevel", () => {
  it("reads an adapter event", () => {
    const event = new CustomEvent("switch2select:input", { detail: { level: "in" } });
    expect(readSwitchLevel(event)).toBe("in");
  });

  it("ignores a malformed event", () => {
    expect(readSwitchLevel(new Event("switch2select:input"))).toBeNull();
    expect(readSwitchLevel(new CustomEvent("switch2select:input", { detail: { level: "hold" } }))).toBeNull();
  });
});

describe("one-switch setting", () => {
  it("stays off unless the partner asked for it", () => {
    expect(defaultSettings.oneSwitch).toBe(false);
    expect(normalizeSettings({}).oneSwitch).toBe(false);
    expect(normalizeSettings({ oneSwitch: true }).oneSwitch).toBe(true);
  });
});
