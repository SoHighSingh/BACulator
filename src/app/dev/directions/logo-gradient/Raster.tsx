"use client";

/* eslint-disable @next/next/no-img-element -- favicons are judged as real <img> of a data URL */
import { useEffect, useRef } from "react";

import { OPTIONS, type MarkState, type OptionId } from "./marks";

/**
 * Favicon renders: the inline mark is serialised once to an SVG data URL and shown the way a
 * browser would, as an <img> at 16 and 32 CSS px, plus a true 16x16 / 32x32 raster (drawn to a
 * canvas at 1 device pixel per pixel) blown up 4x, so a 1x screen's favicon can be judged on a
 * retina capture. Rendered once on mount; nothing moves.
 */
export function FaviconStrip({
  id,
  state,
}: {
  id: OptionId;
  state: MarkState;
}) {
  const { Mark } = OPTIONS.find((o) => o.id === id)!;
  const srcRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = srcRef.current?.querySelector("svg");
    const root = rootRef.current;
    if (!svg || !root) return;
    const url =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(new XMLSerializer().serializeToString(svg));
    root
      .querySelectorAll<HTMLImageElement>("img[data-fav]")
      .forEach((img) => (img.src = url));
    root.querySelectorAll<HTMLCanvasElement>("canvas[data-px]").forEach((c) => {
      const px = Number(c.dataset.px);
      const img = new Image(px, px);
      img.onload = () => c.getContext("2d")?.drawImage(img, 0, 0, px, px);
      img.src = url;
    });
  }, []);

  const tab = (theme: "light" | "dark") => (
    <div className={`lg-tabbar lg-tabbar-${theme}`}>
      <div className="lg-tab">
        <img data-fav alt="" width={16} height={16} />
        <span>BACulator</span>
      </div>
      <img data-fav alt="" width={32} height={32} className="ml-3" />
      <Mark state={state} size={16} />
      <Mark state={state} size={32} />
    </div>
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div ref={srcRef} hidden>
        <Mark state={state} size={64} />
      </div>
      {tab("light")}
      {tab("dark")}
      <div className="text-ink-2 flex items-end gap-3 text-sm">
        <figure className="flex flex-col items-center gap-1">
          <canvas
            data-px={16}
            width={16}
            height={16}
            className="lg-px"
            style={{ width: 64, height: 64 }}
          />
          <figcaption>16 at 1x, x4</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1">
          <canvas
            data-px={32}
            width={32}
            height={32}
            className="lg-px"
            style={{ width: 96, height: 96 }}
          />
          <figcaption>32 at 1x, x3</figcaption>
        </figure>
      </div>
    </div>
  );
}
