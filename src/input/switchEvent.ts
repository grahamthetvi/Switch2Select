export type SwitchLevel = "in" | "commit" | "cancel";

export function resolveSwitchLevel(
  level: SwitchLevel,
  options: { oneSwitch: boolean; latched: boolean },
): SwitchLevel {
  if (options.oneSwitch && options.latched && level === "in") return "commit";
  return level;
}

export interface SwitchInputDetail {
  level: SwitchLevel;
  source?: "keyboard" | "pointer" | "gamepad" | "adapter";
}

declare global {
  interface WindowEventMap {
    "switch2select:input": CustomEvent<SwitchInputDetail>;
  }
}

export function readSwitchLevel(event: Event): SwitchLevel | null {
  if (!("detail" in event)) return null;
  const detail = (event as CustomEvent<unknown>).detail;
  if (typeof detail !== "object" || detail === null || !("level" in detail)) return null;
  const level = (detail as { level: unknown }).level;
  if (level === "in" || level === "commit" || level === "cancel") return level;
  return null;
}
