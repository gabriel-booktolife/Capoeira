"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "@/lib/content/types";

export function MediaGallery({ media, ratio = "landscape", priority = false }: { media: MediaItem[]; ratio?: "portrait" | "landscape" | "square"; priority?: boolean }) {
  const sorted = [...media].sort((a, b) => a.order - b.order);
  const [index, setIndex] = useState(0);
  const displayedIndex = sorted.length ? index % sorted.length : 0;
  const item = sorted[displayedIndex];
  if (!item) return <div className={`media-frame ${ratio} media-placeholder`} aria-hidden="true"><span>Chão Batido</span></div>;
  return (
    <div className={`media-frame ${ratio}`}>
      {item.type === "video" ? (
        <video src={item.url} controls playsInline preload="metadata" aria-label={item.alt || item.name} />
      ) : (
        <Image src={item.url} alt={item.alt || item.name || "Registro do Chão Batido"} fill sizes="(max-width: 760px) 100vw, 50vw" priority={priority} />
      )}
      {item.caption ? <p className="media-caption">{item.caption}</p> : null}
      {sorted.length > 1 ? (
        <div className="gallery-controls" aria-label="Controles da galeria">
          <button type="button" onClick={() => setIndex((displayedIndex + sorted.length - 1) % sorted.length)} aria-label="Mídia anterior"><ChevronLeft /></button>
          <span aria-live="polite">{displayedIndex + 1} / {sorted.length}</span>
          <button type="button" onClick={() => setIndex((displayedIndex + 1) % sorted.length)} aria-label="Próxima mídia"><ChevronRight /></button>
        </div>
      ) : null}
    </div>
  );
}
