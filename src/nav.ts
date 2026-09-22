export type ViewId = "talk" | "two" | "library" | "settings" | "calibrate" | "guide";

export function hashFor(view: ViewId): string {
  switch (view) {
    case "talk":
      return "#/";
    case "two":
      return "#/two";
    case "library":
      return "#/library";
    case "settings":
      return "#/settings";
    case "calibrate":
      return "#/calibrate";
    case "guide":
      return "#/guide";
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

export function viewFromHash(hash: string): ViewId {
  switch (hash) {
    case "#/two":
    case "#/two/":
      return "two";
    case "#/library":
    case "#/library/":
      return "library";
    case "#/settings":
    case "#/settings/":
      return "settings";
    case "#/calibrate":
    case "#/calibrate/":
      return "calibrate";
    case "#/guide":
    case "#/guide/":
      return "guide";
    default:
      return "talk";
  }
}

export function viewNeedsGate(view: ViewId): boolean {
  return view !== "talk";
}
