"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport width is below `breakpoint` (default 352px).
 * Used for the very-small-phone layout where fixed-size side-by-side cards
 * (150px + 150px + a 20px gap = 320px) would overflow their row. 352px is
 * the exact point where a 32px-padded container first has 320px of content
 * width to spare - below it, cards fall back to a fluid fill-the-row size.
 */
export const useMobile = (breakpoint: number = 352) => {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const update = () => setIsCompact(mql.matches);
    update();

    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isCompact;
};

export default useMobile;
