import { useId } from "react";
import { createPortal } from "react-dom";
import { photoStyle } from "../lib/visualStyle";

export function CutoutPhoto({
  src,
  alt,
  imageX,
  imageY,
  imageZoom,
  outlineEnabled,
  outlineColor,
  outlineThickness,
}: {
  src: string;
  alt: string;
  imageX: number;
  imageY: number;
  imageZoom: number;
  outlineEnabled: boolean;
  outlineColor: string;
  outlineThickness: number;
}) {
  const filterId = `cutout-${useId().replace(/:/g, "")}`;
  const style = photoStyle({
    imageX,
    imageY,
    imageZoom,
    outlineEnabled,
    outlineThickness,
    outlineFilterId: filterId,
  });
  const radius = Math.max(0, Math.round(outlineThickness));
  return (
    <>
      {style.filter
        ? createPortal(
            <svg className="outline-defs" aria-hidden="true" focusable="false">
              <filter
                id={filterId}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
                colorInterpolationFilters="sRGB"
              >
                <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="dilated" />
                <feFlood floodColor={outlineColor} result="flood" />
                <feComposite in="flood" in2="dilated" operator="in" result="outline" />
                <feMerge>
                  <feMergeNode in="outline" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </svg>,
            document.body,
          )
        : null}
      <div className="cutout-move" style={{ transform: style.transform }}>
        <img src={src} alt={alt} draggable={false} style={style.filter ? { filter: style.filter } : undefined} />
      </div>
    </>
  );
}
