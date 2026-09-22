import { useCallback, useEffect, useRef } from "react";
import { readSwitchLevel } from "./switchEvent";

interface SwitchHandlers {
  enabled: boolean;
  onIn: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  gamepadInButton: number;
  gamepadCommitButton: number;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useSwitchInput(handlers: SwitchHandlers): void {
  const current = useRef(handlers);
  current.current = handlers;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!current.current.enabled || event.repeat || isTypingTarget(event.target)) return;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          current.current.onIn();
          break;
        case "Enter":
        case "NumpadEnter":
          event.preventDefault();
          current.current.onCommit();
          break;
        case "Escape":
          current.current.onCancel();
          break;
        case "ArrowRight":
          current.current.onNext?.();
          break;
        case "ArrowLeft":
          current.current.onPrev?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onSwitch = (event: Event) => {
      if (!current.current.enabled) return;
      const level = readSwitchLevel(event);
      switch (level) {
        case "in":
          current.current.onIn();
          break;
        case "commit":
          current.current.onCommit();
          break;
        case "cancel":
          current.current.onCancel();
          break;
        case null:
          break;
        default: {
          const exhaustive: never = level;
          return exhaustive;
        }
      }
    };
    window.addEventListener("switch2select:input", onSwitch);
    return () => window.removeEventListener("switch2select:input", onSwitch);
  }, []);

  useEffect(() => {
    let frame = 0;
    let prevIn = false;
    let prevCommit = false;
    const poll = () => {
      frame = requestAnimationFrame(poll);
      if (!current.current.enabled || !navigator.getGamepads) return;
      let inPressed = false;
      let commitPressed = false;
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        inPressed = inPressed || Boolean(pad.buttons[current.current.gamepadInButton]?.pressed);
        commitPressed = commitPressed || Boolean(pad.buttons[current.current.gamepadCommitButton]?.pressed);
      }
      if (inPressed && !prevIn) current.current.onIn();
      if (commitPressed && !prevCommit) current.current.onCommit();
      prevIn = inPressed;
      prevCommit = commitPressed;
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);
}

interface PointerPressHandlers {
  enabled: boolean;
  pressInHoldMs: number;
  pressCommitHoldMs: number;
  previewHoldMs: number;
  onIn: () => void;
  onCommit: () => void;
}

export function usePointerPress(handlers: PointerPressHandlers): (node: HTMLElement | null) => void {
  const current = useRef(handlers);
  current.current = handlers;
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  return useCallback((node: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node) return;
    let timers: number[] = [];
    let active = false;
    let secondaryTimer: number | null = null;
    const clearSecondary = () => {
      if (secondaryTimer === null) return;
      window.clearTimeout(secondaryTimer);
      secondaryTimer = null;
    };
    const clear = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
      active = false;
    };
    const down = (event: PointerEvent) => {
      if (!current.current.enabled) return;
      if (event.button === 2) {
        event.preventDefault();
        current.current.onIn();
        if (secondaryTimer !== null) return;
        const wait = current.current.previewHoldMs;
        secondaryTimer = window.setTimeout(() => {
          secondaryTimer = null;
          if (!current.current.enabled) return;
          current.current.onCommit();
        }, wait);
        return;
      }
      if (event.button !== 0) return;
      clearSecondary();
      active = true;
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Some pointers cannot be captured. The timers still run.
      }
      const inMs = current.current.pressInHoldMs;
      const commitMs = Math.max(
        current.current.pressCommitHoldMs,
        inMs + current.current.previewHoldMs,
      );
      timers.push(window.setTimeout(() => {
        if (active) current.current.onIn();
      }, inMs));
      timers.push(window.setTimeout(() => {
        if (active) current.current.onCommit();
      }, commitMs));
    };
    const up = () => clear();
    const menu = (event: Event) => event.preventDefault();
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") clearSecondary();
    };
    node.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    node.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", onKey);
    cleanup.current = () => {
      clear();
      clearSecondary();
      node.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      node.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}
