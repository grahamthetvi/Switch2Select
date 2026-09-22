import type { CSSProperties } from "react";

/** Type Talk–style letter bubble: a filled ring of text-shadow offsets. */
export function textBubbleShadow(color: string, thickness: number): string {
  const size = Math.max(0, Math.round(thickness));
  if (size <= 0) return "none";
  const shadows: string[] = [];
  for (let x = -size; x <= size; x += 1) {
    for (let y = -size; y <= size; y += 1) {
      if (x === 0 && y === 0) continue;
      shadows.push(`${x}px ${y}px 0 ${color}`);
    }
  }
  return shadows.join(", ");
}

/**
 * Book Maker–style object outline via radial drop-shadows.
 * Follows opaque pixels (works best on cut-out PNGs).
 */
export function photoOutlineFilter(color: string, thickness: number): string {
  const radius = Math.max(0, Math.round(thickness));
  if (radius <= 0) return "none";
  const steps = Math.max(12, Math.ceil(2 * Math.PI * radius));
  const shadows: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    shadows.push(`drop-shadow(${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${color})`);
  }
  return shadows.join(" ");
}

export function labelStyle(options: {
  fontSize: number;
  textColor: string;
  bubbleEnabled: boolean;
  bubbleColor: string;
  bubbleThickness: number;
}): CSSProperties {
  return {
    fontSize: `${options.fontSize}px`,
    color: options.textColor,
    textShadow: options.bubbleEnabled
      ? textBubbleShadow(options.bubbleColor, options.bubbleThickness)
      : "none",
  };
}

export function photoStyle(options: {
  imageX: number;
  imageY: number;
  imageZoom: number;
  outlineEnabled: boolean;
  outlineColor: string;
  outlineThickness: number;
}): CSSProperties {
  const outline = options.outlineEnabled
    ? photoOutlineFilter(options.outlineColor, options.outlineThickness)
    : "none";
  return {
    transform: `translate(${options.imageX}%, ${options.imageY}%) scale(${options.imageZoom})`,
    filter: outline === "none" ? undefined : outline,
  };
}
