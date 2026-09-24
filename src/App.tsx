import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmGate } from "./components/ConfirmGate";
import { SettingsCornerButton } from "./components/SettingsCornerButton";
import { useMotionOn } from "./lib/motion";
import { useAutoFullscreen } from "./lib/useAutoFullscreen";
import { hashFor, viewFromHash, viewNeedsGate, type ViewId } from "./nav";
import { LibraryProvider, useLibrary } from "./state/LibraryContext";
import { Communicate } from "./views/Communicate";
import { TwoChoice } from "./views/TwoChoice";

const Library = lazy(() => import("./views/Library").then((module) => ({ default: module.Library })));
const SettingsView = lazy(() => import("./views/SettingsView").then((module) => ({ default: module.SettingsView })));
const Calibration = lazy(() => import("./views/Calibration").then((module) => ({ default: module.Calibration })));
const Guide = lazy(() => import("./views/Guide").then((module) => ({ default: module.Guide })));
const Welcome = lazy(() => import("./views/Welcome").then((module) => ({ default: module.Welcome })));

export function App() {
  return (
    <CrashBoundary>
      <LibraryProvider>
        <Shell />
      </LibraryProvider>
    </CrashBoundary>
  );
}

function Shell() {
  const { ready, settings, welcomed } = useLibrary();
  const motionOn = useMotionOn(settings.motion);
  useAutoFullscreen(settings.autoFullscreen);
  const initial = viewFromHash(window.location.hash);
  const [view, setView] = useState<ViewId>(initial === "talk" || !viewNeedsGate(initial) ? initial : "talk");
  const [pending, setPending] = useState<ViewId | null>(viewNeedsGate(initial) ? initial : null);
  const [unlocked, setUnlocked] = useState(false);
  const ownNav = useRef(false);
  const [welcomeChecked, setWelcomeChecked] = useState(false);

  useEffect(() => {
    if (!ready || welcomeChecked) return;
    if (!welcomed && view === "talk" && pending === null) go("welcome");
    setWelcomeChecked(true);
  }, [ready, welcomed, view, pending, welcomeChecked]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.view = view;
    root.dataset.field = settings.field;
    root.dataset.motion = motionOn ? "on" : "off";
    root.style.setProperty("--outline", settings.outlineColor);
    root.style.setProperty("--image-scale", String(settings.imageScale));
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute("content", settings.field === "white" ? "#f7f7f5" : "#000000");
  }, [view, settings.field, settings.outlineColor, settings.imageScale, motionOn]);

  useEffect(() => {
    const onHash = () => {
      if (ownNav.current) {
        ownNav.current = false;
        return;
      }
      const next = viewFromHash(window.location.hash);
      setView((current) => {
        if (next === current) return current;
        if (viewNeedsGate(next) && !unlocked) {
          setPending(next);
          const hash = hashFor(current);
          if (window.location.hash !== hash) history.replaceState(null, "", hash);
          return current;
        }
        return next;
      });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [unlocked]);

  function go(next: ViewId) {
    setView(next);
    const hash = hashFor(next);
    if (window.location.hash !== hash) {
      ownNav.current = true;
      window.location.hash = hash;
    }
  }

  function request(next: ViewId) {
    if (next === view) return;
    if (!viewNeedsGate(next) || unlocked) {
      setPending(null);
      go(next);
      return;
    }
    setPending(next);
  }

  function accept(stayUnlocked: boolean) {
    if (!pending) return;
    if (stayUnlocked) setUnlocked(true);
    const next = pending;
    setPending(null);
    go(next);
  }

  return (
    <>
      <Suspense fallback={<p className="wait">One moment.</p>}>
        {view === "talk" && !welcomeChecked ? <p className="wait">One moment.</p> : null}
        {view === "talk" && welcomeChecked ? <Communicate gateOpen={pending !== null} request={request} /> : null}
        {view === "two" ? <TwoChoice gateOpen={pending !== null} request={request} /> : null}
        {view === "library" ? <Library request={request} /> : null}
        {view === "settings" ? <SettingsView request={request} /> : null}
        {view === "calibrate" ? <Calibration request={request} /> : null}
        {view === "guide" ? <Guide request={request} /> : null}
        {view === "welcome" ? <Welcome request={request} /> : null}
      </Suspense>
      <SettingsCornerButton onRequest={request} hidden={view === "settings"} />
      {pending ? (
        <ConfirmGate pin={settings.pin} onStay={() => setPending(null)} onContinue={accept} />
      ) : null}
    </>
  );
}

class CrashBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown): { message: string } {
    return { message: error instanceof Error ? error.message : "Something paused the app." };
  }

  render() {
    if (this.state.message) {
      return (
        <main className="partner-page">
          <h1>Something paused the app.</h1>
          <p>{this.state.message}</p>
        </main>
      );
    }
    return this.props.children;
  }
}
