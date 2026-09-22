import type { CSSProperties } from "react";
import type { VocabularyItem } from "../types";

export function Beacon({
  item,
  url,
  latched,
  offer,
  attentionKey,
  confirm,
  motion,
  showLabel,
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
  size: "solo" | "pair";
  pointerRef?: (node: HTMLElement | null) => void;
}) {
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
  return (
    <div
      className={className}
      style={{ "--beacon-outline": item.colorAccent ?? "var(--outline)" } as CSSProperties}
      ref={pointerRef}
      data-label={item.label}
    >
      <div className={motion ? "beacon-frame arrive" : "beacon-frame"} key={attentionKey}>
        <img
          src={url}
          alt={item.label}
          draggable={false}
          style={{ transform: `translate(${item.imageX}%, ${item.imageY}%) scale(${item.imageZoom})` }}
        />
      </div>
      {showLabel ? <p className="beacon-label">{item.label}</p> : null}
    </div>
  );
}
