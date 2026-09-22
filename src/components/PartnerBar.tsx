import { useEffect, useRef, useState } from "react";
import type { ViewId } from "../nav";

const BAR_IDLE_MS = 4000;

export function PartnerBar({
  simpleMode,
  paused,
  mode,
  onPauseToggle,
  onSlower,
  onFaster,
  onPrev,
  onNext,
  onSpeakAgain,
  onBack,
  onTogglePreview,
  onToggleLabels,
  previewAudio,
  showLabels,
  onRequest,
  onFullscreen,
}: {
  simpleMode: boolean;
  paused: boolean;
  mode: "talk" | "two";
  onPauseToggle: () => void;
  onSlower: () => void;
  onFaster: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSpeakAgain: () => void;
  onBack?: () => void;
  onTogglePreview: () => void;
  onToggleLabels: () => void;
  previewAudio: boolean;
  showLabels: boolean;
  onRequest: (view: ViewId) => void;
  onFullscreen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<number | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);
  const pointerEngagedRef = useRef(false);

  function clearIdle() {
    if (idleRef.current !== null) {
      window.clearTimeout(idleRef.current);
      idleRef.current = null;
    }
  }

  function reveal() {
    clearIdle();
    setOpen(true);
  }

  function settle() {
    clearIdle();
    if (pointerInsideRef.current || focusInsideRef.current) return;
    idleRef.current = window.setTimeout(() => setOpen(false), BAR_IDLE_MS);
  }

  useEffect(() => clearIdle, []);

  return (
    <div
      ref={barRef}
      className={open ? "partner-bar is-open" : "partner-bar"}
      onPointerEnter={() => {
        pointerInsideRef.current = true;
        reveal();
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        settle();
        if (!pointerEngagedRef.current) return;
        window.setTimeout(() => {
          if (!pointerEngagedRef.current) return;
          pointerEngagedRef.current = false;
          const active = document.activeElement;
          if (active instanceof HTMLElement && barRef.current?.contains(active)) active.blur();
        }, 0);
      }}
      onPointerDownCapture={() => {
        pointerEngagedRef.current = true;
        focusInsideRef.current = false;
        reveal();
      }}
      onFocus={() => {
        if (pointerEngagedRef.current) return;
        focusInsideRef.current = true;
        reveal();
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && barRef.current?.contains(next)) return;
        focusInsideRef.current = false;
        settle();
      }}
      onClick={() => {
        if (!pointerEngagedRef.current) return;
        pointerEngagedRef.current = false;
        const active = document.activeElement;
        if (active instanceof HTMLElement && barRef.current?.contains(active)) active.blur();
      }}
    >
      {onBack ? (
        <button type="button" className="button button-strong" onClick={onBack}>
          Back
        </button>
      ) : null}
      <button type="button" className="button button-strong" aria-pressed={paused} onClick={onPauseToggle}>
        {paused ? "Resume" : "Pause"}
      </button>
      <button type="button" className="button button-strong" onClick={onSpeakAgain}>
        Say it again
      </button>
      {simpleMode ? (
        <button type="button" className="button" onClick={() => onRequest("settings")}>
          Partner
        </button>
      ) : (
        <>
          <button type="button" className="button" onClick={onSlower}>
            Slower
          </button>
          <button type="button" className="button" onClick={onFaster}>
            Faster
          </button>
          <button type="button" className="button" onClick={onPrev}>
            Previous
          </button>
          <button type="button" className="button" onClick={onNext}>
            Next
          </button>
          <button
            type="button"
            className="button"
            aria-expanded={showMore}
            onClick={() => setShowMore((value) => !value)}
          >
            More
          </button>
          {showMore ? (
            <>
              <button type="button" className="button" aria-pressed={previewAudio} onClick={onTogglePreview}>
                {previewAudio ? "Preview sound on" : "Preview sound off"}
              </button>
              <button type="button" className="button" aria-pressed={showLabels} onClick={onToggleLabels}>
                {showLabels ? "Words on" : "Words off"}
              </button>
              <button type="button" className="button" onClick={() => onRequest(mode === "talk" ? "two" : "talk")}>
                {mode === "talk" ? "Two pictures" : "One picture"}
              </button>
              <button type="button" className="button" onClick={() => onRequest("library")}>
                Library
              </button>
              <button type="button" className="button" onClick={() => onRequest("settings")}>
                Settings
              </button>
              <button type="button" className="button" onClick={() => onRequest("calibrate")}>
                Practice
              </button>
              <button type="button" className="button" onClick={() => onRequest("guide")}>
                Guide
              </button>
              <button type="button" className="button" onClick={onFullscreen}>
                Full screen
              </button>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Full screen can be denied. The page still works.
  }
}
