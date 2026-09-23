import type { CSSProperties } from "react";

/**
 * Letter bubble as one text stroke.
 * A filled text-shadow disk is one shadow per pixel of thickness squared
 * (about 600 shadows at the thickest setting) and that paint freezes the tab.
 * Stroke width is twice the thickness because the stroke is centered on the
 * glyph; paint-order keeps the word color on top.
 */
export function labelStyle(options: {
  fontSize: number;
  textColor: string;
  bubbleEnabled: boolean;
  bubbleColor: string;
  bubbleThickness: number;
}): CSSProperties {
  const thickness = options.bubbleEnabled ? Math.max(0, Math.round(options.bubbleThickness)) : 0;
  return {
    fontSize: `${options.fontSize}px`,
    color: options.textColor,
    WebkitTextStroke: thickness > 0 ? `${thickness * 2}px ${options.bubbleColor}` : "0px transparent",
    paintOrder: "stroke fill",
  };
}

/**
 * Photo outline reference. The outline itself is one SVG morphology filter
 * (see CutoutPhoto). A ring of drop-shadow() copies — one per pixel around
 * the circumference — repaints the full photo on the main thread and makes
 * the browser report the page as unresponsive.
 */
export function photoStyle(options: {
  imageX: number;
  imageY: number;
  imageZoom: number;
  outlineEnabled: boolean;
  outlineThickness: number;
  outlineFilterId?: string;
}): CSSProperties {
  const filterId = options.outlineFilterId;
  const outlined = Boolean(options.outlineEnabled && options.outlineThickness > 0 && filterId);
  return {
    transform: `translate(${options.imageX}%, ${options.imageY}%) scale(${options.imageZoom})`,
    filter: outlined && filterId ? `url(#${filterId})` : undefined,
  };
}
