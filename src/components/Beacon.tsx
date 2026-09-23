import type { CSSProperties } from "react";
import { CutoutPhoto } from "./CutoutPhoto";
import { labelStyle } from "../lib/visualStyle";
import type { AppSettings, VocabularyItem } from "../types";

export function Beacon({
  item,
  url,
  latched,
  offer,
  attentionKey,
  confirm,
  motion,
  showLabel,
  settings,
  size,
  pointerRef,
}: {
  item: VocabularyItem;
  url: string;
  latched: boolean;
  offer: boolean;
  attentionKey: number;
  confirm: boolean;
  motion: boolean;
  showLabel: boolean;
  settings: AppSettings;
  size: "solo" | "pair";
  pointerRef?: (node: HTMLElement | null) => void;
}) {
  const outlineColor = item.colorAccent ?? settings.outlineColor;
  const className = [
    "beacon",
    size === "pair" ? "beacon-pair" : "beacon-solo",
    latched ? "is-latched" : "",
    offer && !latched ? "is-offer" : "",
    motion ? "is-motion" : "",
    confirm && motion ? "is-confirm" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const textStyle = labelStyle({
    fontSize: settings.labelFontSize,
    textColor: settings.labelTextColor,
    bubbleEnabled: settings.labelBubbleEnabled,
    bubbleColor: settings.labelBubbleColor,
    bubbleThickness: settings.labelBubbleThickness,
  });
  return (
    <div
      className={className}
      style={{ "--beacon-outline": outlineColor } as CSSProperties}
      ref={pointerRef}
      data-label={item.label}
    >
      <div className={motion ? "beacon-frame arrive" : "beacon-frame"} key={attentionKey}>
        <CutoutPhoto
          src={url}
          alt={item.label}
          imageX={item.imageX}
          imageY={item.imageY}
          imageZoom={item.imageZoom}
          outlineEnabled={settings.photoOutlineEnabled}
          outlineColor={outlineColor}
          outlineThickness={settings.photoOutlineThickness}
        />
      </div>
      {showLabel ? (
        <p className="beacon-label" style={textStyle}>
          {item.label}
        </p>
      ) : null}
    </div>
  );
}
