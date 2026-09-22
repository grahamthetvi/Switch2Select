import type { ViewId } from "../nav";

export function SettingsCornerButton({
  onRequest,
  hidden,
}: {
  onRequest: (view: ViewId) => void;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <button
      type="button"
      className="settings-corner"
      aria-label="Settings"
      title="Settings"
      onClick={() => onRequest("settings")}
    >
      <span aria-hidden="true">⚙</span>
    </button>
  );
}
