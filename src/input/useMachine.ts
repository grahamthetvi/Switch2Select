import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChoiceConfig,
  type ChoiceEvent,
  type ChoiceState,
  type PressConfig,
  type PressEvent,
  type PressState,
  initialChoiceState,
  initialPressState,
  reduceChoice,
  reducePress,
} from "./pressMachine";

type TickEvent = { type: "tick"; dt: number };

const pressPaintKeys = [
  "phase",
  "paused",
  "index",
  "itemCount",
  "speech",
  "speechSeq",
  "confirm",
  "appearSeq",
] as const satisfies readonly (keyof PressState)[];

const choicePaintKeys = [
  "phase",
  "offer",
  "side",
  "paused",
  "speech",
  "speechSeq",
  "confirm",
  "nav",
  "navSeq",
  "appearSeq",
] as const satisfies readonly (keyof ChoiceState)[];

export function pressViewChanged(prev: PressState, next: PressState): boolean {
  return viewChanged(prev, next, pressPaintKeys);
}

export function choiceViewChanged(prev: ChoiceState, next: ChoiceState): boolean {
  return viewChanged(prev, next, choicePaintKeys);
}

function viewChanged<T>(prev: T, next: T, keys: readonly (keyof T)[]): boolean {
  for (const key of keys) {
    if (!Object.is(prev[key], next[key])) return true;
  }
  return false;
}

function useTicker(dispatch: (event: TickEvent) => void, running: boolean): void {
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = document.hidden ? 0 : Math.min(250, now - last);
      last = now;
      if (dt > 0) dispatch({ type: "tick", dt });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [dispatch, running]);
}

function useClockedReducer<State, Event>(
  reduce: (state: State, event: Event) => State,
  getInitial: () => State,
  paintKeys: readonly (keyof State)[],
): [State, (event: Event) => void] {
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;
  const [state, setState] = useState(getInitial);
  const stateRef = useRef(state);
  const paintedRef = useRef(state);
  const dispatch = useCallback((event: Event) => {
    const next = reduceRef.current(stateRef.current, event);
    stateRef.current = next;
    if (!viewChanged(paintedRef.current, next, paintKeys)) return;
    paintedRef.current = next;
    setState(next);
  }, [paintKeys]);
  const onTick = useCallback((event: TickEvent) => {
    // Both machines accept a tick event. The generic event union cannot express that here.
    dispatch({ type: "tick", dt: event.dt } as Event);
  }, [dispatch]);
  useTicker(onTick, true);
  return [state, dispatch];
}

export function usePressMachine(itemCount: number, config: PressConfig): [PressState, (event: PressEvent) => void] {
  const configRef = useRef(config);
  configRef.current = config;
  const reduce = useCallback(
    (state: PressState, event: PressEvent) => reducePress(state, event, configRef.current),
    [],
  );
  const [state, dispatch] = useClockedReducer(reduce, () => initialPressState(itemCount), pressPaintKeys);
  useEffect(() => {
    dispatch({ type: "setCount", count: itemCount });
  }, [dispatch, itemCount]);
  return [state, dispatch];
}

export function useChoiceMachine(config: ChoiceConfig, resetKey: string): [ChoiceState, (event: ChoiceEvent) => void] {
  const configRef = useRef(config);
  configRef.current = config;
  const reduce = useCallback(
    (state: ChoiceState, event: ChoiceEvent) => reduceChoice(state, event, configRef.current),
    [],
  );
  const [state, dispatch] = useClockedReducer(reduce, initialChoiceState, choicePaintKeys);
  const skipReset = useRef(true);
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    dispatch({ type: "reset" });
  }, [dispatch, resetKey]);
  return [state, dispatch];
}
