"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlammingLine } from "./RansomLine";
import { composeLine, hashSeed, lineWidth } from "./manifest";

export function RansomHeading({
  text = "my little gallery",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(900);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const placed = useMemo(() => composeLine(text.toUpperCase(), hashSeed(text)), [text]);

  // Target a letter height proportional to the available width, then shrink
  // it further if the composed line would still overflow that width.
  const lineH = useMemo(() => {
    const target = Math.max(28, Math.min(88, Math.round(avail * 0.06)));
    const room = avail * 0.96;
    const natural = lineWidth(placed, target);
    return natural > room && natural > 0
      ? Math.max(14, Math.floor((target * room) / natural))
      : target;
  }, [placed, avail]);

  return (
    <div ref={stageRef} className={`w-full ${className}`}>
      <SlammingLine placed={placed} lineH={lineH} nowrap />
    </div>
  );
}

export default RansomHeading;
