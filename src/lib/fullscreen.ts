export function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export async function enterFullscreen(): Promise<boolean> {
  if (document.fullscreenElement) return true;
  try {
    await document.documentElement.requestFullscreen();
    return Boolean(document.fullscreenElement);
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // Leaving full screen can fail; the page still works.
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await exitFullscreen();
  else await enterFullscreen();
}
