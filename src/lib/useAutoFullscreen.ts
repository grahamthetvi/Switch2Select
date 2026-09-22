import { useEffect, useRef } from "react";
import { enterFullscreen, exitFullscreen, isFullscreen } from "./fullscreen";

/**
 * Try fullscreen on launch when enabled. Browsers often deny that without a
 * user gesture, so also request on the first pointer or key press.
 */
export function useAutoFullscreen(enabled: boolean): void {
  const armed = useRef(false);

  useEffect(() => {
    if (!enabled) {
      armed.current = false;
      void exitFullscreen();
      return;
    }

    let cancelled = false;
    armed.current = true;

    void enterFullscreen().then((ok) => {
      if (!cancelled && ok) armed.current = false;
    });

    function onGesture() {
      if (!armed.current || !enabled) return;
      if (isFullscreen()) {
        armed.current = false;
        return;
      }
      void enterFullscreen().then((ok) => {
        if (ok) armed.current = false;
      });
    }

    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("keydown", onGesture, true);
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    };
  }, [enabled]);
}
