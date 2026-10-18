"use client";

import { useEffect } from "react";
import { brandMarkDataUrl } from "~/lib/brand-mark-svg";

const OURS = "data-alert-favicon";
const PAUSED_REL = "alert-favicon-paused";

/**
 * While `alert` is true (drinks counted: not safe to drive) the tab's favicon turns into the red
 * mark, so the warning is visible even from another tab. Nothing animates.
 *
 * Next renders the site's own <link rel="icon"> tags through React, so we never edit or remove
 * them. Ours is appended last (browsers take the last matching icon) and the originals' `rel` is
 * parked while it's up; both are undone when alert goes false or the component unmounts. If React
 * re-renders a head link meanwhile it simply restores its own `rel`, which still leaves ours last.
 */
export function AlertFavicon({ alert }: { alert: boolean }) {
  useEffect(() => {
    if (!alert) return;
    const head = document.head;
    const originals = Array.from(head.querySelectorAll<HTMLLinkElement>(`link[rel~="icon"]:not([${OURS}])`)).map(
      (link) => ({ link, rel: link.getAttribute("rel") ?? "icon" }),
    );
    for (const { link } of originals) link.setAttribute("rel", PAUSED_REL);

    const ours = document.createElement("link");
    ours.setAttribute(OURS, "");
    ours.rel = "icon";
    ours.type = "image/svg+xml";
    ours.sizes.value = "any";
    ours.href = brandMarkDataUrl("alert", { small: true });
    head.appendChild(ours);

    return () => {
      ours.remove();
      for (const { link, rel } of originals) if (link.isConnected) link.setAttribute("rel", rel);
    };
  }, [alert]);

  return null;
}
