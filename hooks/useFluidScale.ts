"use client";

import { useEffect, useState } from "react";

/**
 * Returns a scale multiplier that ramps linearly from `minScale` (at
 * `minWidth`) up to `maxScale` (approaching `maxWidth`), then resets to 1
 * at `maxWidth` and beyond - because at that point the element's own
 * responsive classes (e.g. a `sm:` breakpoint) take over with real,
 * larger dimensions, so no extra scaling should be layered on top.
 * Used to grow fixed-size cards to fill the row instead of leaving a
 * gap as the viewport widens toward that breakpoint.
 */
export const useFluidScale = (
  minWidth: number,
  maxWidth: number,
  minScale: number,
  maxScale: number
) => {
  const [scale, setScale] = useState(minScale);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w <= minWidth) {
        setScale(minScale);
        return;
      }
      if (w >= maxWidth) {
        setScale(1);
        return;
      }
      const t = (w - minWidth) / (maxWidth - minWidth);
      setScale(minScale + t * (maxScale - minScale));
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [minWidth, maxWidth, minScale, maxScale]);

  return scale;
};

export default useFluidScale;
