import { useCallback, useEffect, useReducer, useRef } from "react";
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

function useTicker(dispatch: (event: { type: "tick"; dt: number }) => void, running: boolean): void {
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

export function usePressMachine(itemCount: number, config: PressConfig): [PressState, (event: PressEvent) => void] {
  const configRef = useRef(config);
  configRef.current = config;
  const reducer = useCallback(
    (state: PressState, event: PressEvent) => reducePress(state, event, configRef.current),
    [],
  );
  const [state, dispatch] = useReducer(reducer, itemCount, initialPressState);
  useEffect(() => {
    dispatch({ type: "setCount", count: itemCount });
  }, [itemCount]);
  useTicker(dispatch, true);
  return [state, dispatch];
}

export function useChoiceMachine(config: ChoiceConfig, resetKey: string): [ChoiceState, (event: ChoiceEvent) => void] {
  const configRef = useRef(config);
  configRef.current = config;
  const reducer = useCallback(
    (state: ChoiceState, event: ChoiceEvent) => reduceChoice(state, event, configRef.current),
    [],
  );
  const [state, dispatch] = useReducer(reducer, undefined, initialChoiceState);
  const skipReset = useRef(true);
  useEffect(() => {
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    dispatch({ type: "reset" });
  }, [resetKey]);
  useTicker(dispatch, true);
  return [state, dispatch];
}
