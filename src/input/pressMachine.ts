import type { AppSettings } from "../types";

export type SpeechCue = "preview" | "utterance" | "stop";

export interface PressState {
  phase: "rotating" | "latched" | "speaking" | "holding";
  paused: boolean;
  index: number;
  itemCount: number;
  visibleMs: number;
  latchMs: number;
  holdMs: number;
  speech: SpeechCue | null;
  speechSeq: number;
  confirm: boolean;
  appearSeq: number;
}

export interface PressConfig {
  rotationMs: number;
  appearDwellMs: number;
  previewHoldMs: number;
  latchTimeoutMs: number;
  speakHoldMs: number;
  autoResumeAfterSpeak: boolean;
  previewAudio: boolean;
}

export type PressEvent =
  | { type: "tick"; dt: number }
  | { type: "pressIn" }
  | { type: "pressCommit"; ready?: boolean }
  | { type: "cancel" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "speechDone" }
  | { type: "setCount"; count: number };

export interface ChoiceState {
  phase: "idle" | "latched" | "speaking" | "holding";
  offer: 0 | 1;
  side: 0 | 1 | null;
  visibleMs: number;
  latchMs: number;
  holdMs: number;
  paused: boolean;
  speech: SpeechCue | null;
  speechSeq: number;
  confirm: boolean;
  nav: "into" | "back" | null;
  navSeq: number;
  appearSeq: number;
}

export interface ChoiceConfig {
  appearDwellMs: number;
  previewHoldMs: number;
  latchTimeoutMs: number;
  speakHoldMs: number;
  autoResumeAfterSpeak: boolean;
  previewAudio: boolean;
}

export type ChoiceEvent =
  | { type: "tick"; dt: number }
  | { type: "pressIn"; side?: 0 | 1 }
  | { type: "pressCommit"; effect: "speak" | "open"; ready?: boolean; side?: 0 | 1 }
  | { type: "cancel" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "back" }
  | { type: "speechDone" }
  | { type: "reset" };

export function pressConfigFrom(settings: AppSettings): PressConfig {
  return {
    rotationMs: settings.rotationMs,
    appearDwellMs: settings.appearDwellMs,
    previewHoldMs: settings.previewHoldMs,
    latchTimeoutMs: settings.latchTimeoutMs,
    speakHoldMs: settings.speakHoldMs,
    autoResumeAfterSpeak: settings.autoResumeAfterSpeak,
    previewAudio: settings.previewAudio,
  };
}

export function choiceConfigFrom(settings: AppSettings): ChoiceConfig {
  return {
    appearDwellMs: settings.appearDwellMs,
    previewHoldMs: settings.previewHoldMs,
    latchTimeoutMs: settings.latchTimeoutMs,
    speakHoldMs: settings.speakHoldMs,
    autoResumeAfterSpeak: settings.autoResumeAfterSpeak,
    previewAudio: settings.previewAudio,
  };
}

export function initialPressState(itemCount: number): PressState {
  return {
    phase: "rotating",
    paused: false,
    index: 0,
    itemCount,
    visibleMs: 0,
    latchMs: 0,
    holdMs: 0,
    speech: null,
    speechSeq: 0,
    confirm: false,
    appearSeq: 1,
  };
}

export function initialChoiceState(): ChoiceState {
  return {
    phase: "idle",
    offer: 0,
    side: null,
    visibleMs: 0,
    latchMs: 0,
    holdMs: 0,
    paused: false,
    speech: null,
    speechSeq: 0,
    confirm: false,
    nav: null,
    navSeq: 0,
    appearSeq: 1,
  };
}

function withCue<T extends { speech: SpeechCue | null; speechSeq: number }>(
  state: T,
  speech: SpeechCue | null,
  patch: Partial<T>,
): T {
  const next = { ...state, ...patch, speech };
  if (speech) next.speechSeq = state.speechSeq + 1;
  return next;
}

function pausedLatchAdvance(phase: string, latchMs: number, dt: number, previewHoldMs: number): number | null {
  if (phase !== "latched" || latchMs >= previewHoldMs) return null;
  return Math.min(previewHoldMs, latchMs + dt);
}

function showIndex(state: PressState, index: number, paused: boolean): PressState {
  const count = state.itemCount;
  const wrapped = count <= 0 ? 0 : ((index % count) + count) % count;
  const leaving = state.phase !== "rotating";
  return withCue(state, leaving ? "stop" : null, {
    phase: "rotating",
    paused,
    index: wrapped,
    visibleMs: 0,
    latchMs: 0,
    holdMs: 0,
    confirm: false,
    appearSeq: state.appearSeq + 1,
  });
}

export function reducePress(state: PressState, event: PressEvent, config: PressConfig): PressState {
  switch (event.type) {
    case "tick": {
      if (state.itemCount <= 0 || event.dt <= 0) return state;
      if (state.paused) {
        const visibleMs = state.phase === "rotating" && state.visibleMs < config.appearDwellMs
          ? Math.min(config.appearDwellMs, state.visibleMs + event.dt)
          : state.visibleMs;
        const latchMs = pausedLatchAdvance(state.phase, state.latchMs, event.dt, config.previewHoldMs);
        if (visibleMs === state.visibleMs && latchMs === null) return state;
        return { ...state, visibleMs, latchMs: latchMs ?? state.latchMs };
      }
      if (state.phase === "rotating") {
        const visibleMs = state.visibleMs + event.dt;
        if (visibleMs < config.rotationMs) return { ...state, visibleMs };
        if (state.itemCount <= 1) return { ...state, visibleMs: 0 };
        return showIndex(state, state.index + 1, false);
      }
      if (state.phase === "latched") {
        const latchMs = state.latchMs + event.dt;
        if (latchMs < config.latchTimeoutMs) return { ...state, latchMs };
        return withCue(state, "stop", {
          phase: "rotating",
          visibleMs: 0,
          latchMs: 0,
          holdMs: 0,
          confirm: false,
          appearSeq: state.appearSeq + 1,
        });
      }
      if (state.phase === "holding" && config.autoResumeAfterSpeak) {
        const holdMs = state.holdMs + event.dt;
        if (holdMs < config.speakHoldMs) return { ...state, holdMs };
        if (state.itemCount <= 1) {
          return withCue(state, null, {
            phase: "rotating",
            visibleMs: 0,
            holdMs: 0,
            confirm: false,
          });
        }
        return showIndex(state, state.index + 1, false);
      }
      if (state.phase === "holding") return state;
      return state;
    }
    case "pressIn": {
      if (state.itemCount <= 0 || state.phase === "speaking" || state.phase === "latched") return state;
      if (state.phase === "rotating" && state.visibleMs < config.appearDwellMs) return state;
      return withCue(state, config.previewAudio ? "preview" : null, {
        phase: "latched",
        latchMs: 0,
        holdMs: 0,
        confirm: false,
      });
    }
    case "pressCommit": {
      if (state.itemCount <= 0 || state.phase !== "latched") return state;
      if (!event.ready && state.latchMs < config.previewHoldMs) return state;
      return withCue(state, "utterance", {
        phase: "speaking",
        confirm: true,
      });
    }
    case "cancel": {
      if (state.phase === "rotating") return state;
      return showIndex(state, state.index, state.paused);
    }
    case "pause":
      return state.paused ? state : { ...state, paused: true };
    case "resume":
      return state.paused ? { ...state, paused: false } : state;
    case "next":
      if (state.itemCount <= 0) return state;
      return showIndex(state, state.index + 1, state.paused);
    case "prev":
      if (state.itemCount <= 0) return state;
      return showIndex(state, state.index - 1, state.paused);
    case "speechDone":
      if (state.phase !== "speaking") return state;
      return { ...state, phase: "holding", holdMs: 0 };
    case "setCount": {
      const itemCount = Math.max(0, Math.floor(event.count));
      if (itemCount === state.itemCount) return state;
      if (itemCount === 0) {
        return withCue(state, state.phase === "rotating" ? null : "stop", {
          itemCount: 0,
          index: 0,
          phase: "rotating",
          visibleMs: 0,
          latchMs: 0,
          holdMs: 0,
          confirm: false,
        });
      }
      return {
        ...state,
        itemCount,
        index: Math.min(state.index, itemCount - 1),
      };
    }
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function otherSide(side: 0 | 1): 0 | 1 {
  return side === 0 ? 1 : 0;
}

export function reduceChoice(state: ChoiceState, event: ChoiceEvent, config: ChoiceConfig): ChoiceState {
  switch (event.type) {
    case "tick": {
      if (event.dt <= 0) return state;
      if (state.paused) {
        const visibleMs = state.phase === "idle" && state.visibleMs < config.appearDwellMs
          ? Math.min(config.appearDwellMs, state.visibleMs + event.dt)
          : state.visibleMs;
        const latchMs = pausedLatchAdvance(state.phase, state.latchMs, event.dt, config.previewHoldMs);
        if (visibleMs === state.visibleMs && latchMs === null) return state;
        return { ...state, visibleMs, latchMs: latchMs ?? state.latchMs };
      }
      const visibleMs = state.visibleMs + event.dt;
      if (state.phase === "latched") {
        const latchMs = state.latchMs + event.dt;
        if (latchMs < config.latchTimeoutMs) return { ...state, visibleMs, latchMs };
        return withCue(state, "stop", {
          phase: "idle",
          side: null,
          visibleMs,
          latchMs: 0,
          confirm: false,
          appearSeq: state.appearSeq + 1,
        });
      }
      if (state.phase === "holding" && config.autoResumeAfterSpeak) {
        const holdMs = state.holdMs + event.dt;
        if (holdMs < config.speakHoldMs) return { ...state, visibleMs, holdMs };
        return withCue(state, null, {
          phase: "idle",
          side: null,
          visibleMs,
          holdMs: 0,
          confirm: false,
        });
      }
      return { ...state, visibleMs };
    }
    case "pressIn": {
      if (state.phase === "speaking") return state;
      if (state.phase === "idle" && state.visibleMs < config.appearDwellMs) return state;
      const side = event.side ?? state.offer;
      if (state.phase === "latched" && state.side === side) return state;
      return withCue(state, config.previewAudio ? "preview" : null, {
        phase: "latched",
        side,
        offer: side,
        latchMs: 0,
        confirm: false,
      });
    }
    case "pressCommit": {
      if (state.phase !== "latched" || state.side === null) return state;
      if (event.side !== undefined && event.side !== state.side) return state;
      if (!event.ready && state.latchMs < config.previewHoldMs) return state;
      if (event.effect === "open") {
        const next = withCue(state, "stop", {
          phase: "idle",
          latchMs: 0,
          visibleMs: 0,
          offer: 0,
          confirm: false,
          appearSeq: state.appearSeq + 1,
        });
        return { ...next, nav: "into", navSeq: state.navSeq + 1 };
      }
      return withCue(state, "utterance", {
        phase: "speaking",
        confirm: true,
      });
    }
    case "cancel": {
      if (state.phase === "idle") return state;
      return withCue(state, "stop", {
        phase: "idle",
        side: null,
        latchMs: 0,
        confirm: false,
      });
    }
    case "pause":
      return state.paused ? state : { ...state, paused: true };
    case "resume":
      return state.paused ? { ...state, paused: false } : state;
    case "next":
    case "prev": {
      const offer = otherSide(state.offer);
      const leaving = state.phase !== "idle";
      return withCue(state, leaving ? "stop" : null, {
        phase: "idle",
        offer,
        side: null,
        latchMs: 0,
        confirm: false,
      });
    }
    case "back": {
      const next = withCue(state, state.phase === "idle" ? null : "stop", {
        phase: "idle",
        side: null,
        latchMs: 0,
        confirm: false,
      });
      return { ...next, nav: "back", navSeq: state.navSeq + 1 };
    }
    case "speechDone":
      if (state.phase !== "speaking") return state;
      return { ...state, phase: "holding", holdMs: 0 };
    case "reset":
      return {
        ...initialChoiceState(),
        speech: "stop",
        speechSeq: state.speechSeq + 1,
        navSeq: state.navSeq,
      };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
