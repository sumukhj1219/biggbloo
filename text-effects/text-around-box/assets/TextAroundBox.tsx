"use client";

import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  motion,
  motionValue,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

export interface TextAroundBoxProps {
  text: string;
  mode?: "scroll" | "loop";
  speed?: number;
  scrollLength?: string;
  height?: string | number;
  perspective?: number;
  depth?: number;
  rowGap?: number;
  rotateAfter?: number | null;
  rotateSpeed?: number;
  colors?: string[];
  bands?: number;
  rowsPerBand?: number;
  scrollContainer?: RefObject<HTMLElement | null>;
  className?: string;
}

interface Geometry {
  size: number;
  fontSize: number;
  spacing: number;
}

export function TextAroundBox({
  text,
  mode = "scroll",
  speed = mode === "scroll" ? 24 : 3,
  scrollLength = "300vh",
  height = "100vh",
  perspective = 0.5,
  depth = 2.5,
  rowGap = 0.85,
  rotateAfter = 3,
  rotateSpeed = 30,
  colors,
  bands = 3,
  rowsPerBand = 1,
  scrollContainer,
  className,
}: TextAroundBoxProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const spacingRef = useRef(0);

  // The box is a square tunnel as big as the viewport's longer side; each row of
  // text is scaled so its ink exactly spans one wall.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      const cs = getComputedStyle(viewport);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily}`;
      const m = ctx.measureText(text);
      const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || m.width || 1;
      const size = Math.max(viewport.clientWidth, viewport.clientHeight, 1);
      const fontSize = (100 * size) / ink;
      setGeometry({ size, fontSize, spacing: fontSize * rowGap });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [text, rowGap]);

  spacingRef.current = geometry?.spacing ?? 0;

  // How far we've travelled down the tunnel, in px. Rows are identical, so the
  // tunnel only ever moves by less than one row (`frac`) and then wraps: an
  // endless tunnel from a fixed set of rows.
  const offset = useMotionValue(0);
  const frac = useTransform(offset, (o) => {
    const d = spacingRef.current;
    return d ? ((o % d) + d) % d : 0;
  });

  const { scrollYProgress } = useScroll({
    target: trackRef,
    container: scrollContainer,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (mode === "scroll" && !reduceMotion) offset.set(p * speed * spacingRef.current);
  });
  // Spin around the tunnel axis once `rotateAfter` seconds have passed, easing
  // up to full speed over the first second.
  const rotation = useMotionValue(0);
  const spins = rotateAfter !== null && rotateSpeed !== 0;

  useAnimationFrame((time, delta) => {
    if (reduceMotion) return;
    if (mode === "loop") {
      offset.set(offset.get() + (speed * spacingRef.current * delta) / 1000);
    }
    if (spins) {
      const ramp = Math.min(Math.max((time - rotateAfter * 1000) / 1000, 0), 1);
      if (ramp > 0) rotation.set(rotation.get() + (rotateSpeed * ramp * delta) / 1000);
    }
  });

  // Rows in front of the mouth (negative depth) fill the viewport edges. A
  // spinning square needs more of them: at 45° the viewport corners reach √2 ×
  // further out than the walls, which is covered by rows up to 0.3 × the
  // camera distance in front.
  const front = geometry
    ? spins
      ? Math.ceil((0.3 * geometry.size * perspective) / geometry.spacing) + 1
      : 1
    : 0;
  // Slot i sits (i − front) rows deep.
  const rows = geometry ? Math.ceil((geometry.size * depth) / geometry.spacing) + front + 1 : 0;
  // One opacity per depth slot, shared by the four walls: rows fade into the
  // distance so new ones appear softly from the center.
  const opacities = useMemo(() => Array.from({ length: rows }, () => motionValue(1)), [rows]);
  const rowColors = useMemo(() => Array.from({ length: rows }, () => motionValue("currentColor")), [rows]);

  // Color bands: `colors` (or, by default, `bands` shades of the text color)
  // cycle ring by ring, `rowsPerBand` rings each.
  const palette = colors?.length ? colors.slice(0, Math.max(bands, 1)) : shades(bands);

  const updateRows = () => {
    if (!geometry) return;
    const far = geometry.size * depth;
    const fadeStart = far * 0.35;
    // Rows wrapped past so far: slot i now shows absolute row i + wraps, so a
    // ring keeps its color as it travels instead of jumping on every wrap.
    const wraps = Math.floor(offset.get() / geometry.spacing);
    const per = Math.max(Math.round(rowsPerBand), 1);
    opacities.forEach((o, i) => {
      const d = (i - front) * geometry.spacing - frac.get();
      o.set(d <= fadeStart ? 1 : Math.max(0, 1 - (d - fadeStart) / (far - fadeStart)));
      const band = Math.floor((i + wraps) / per);
      rowColors[i].set(palette[((band % palette.length) + palette.length) % palette.length]);
    });
  };
  useMotionValueEvent(frac, "change", updateRows);
  useLayoutEffect(updateRows);

  return (
    <div
      ref={trackRef}
      className={className}
      // Scroll: a tall track with a sticky viewport. Loop: just the viewport.
      style={{ position: "relative", height: mode === "scroll" ? scrollLength : height }}
    >
      <div
        ref={viewportRef}
        role="img"
        aria-label={text}
        style={{
          position: mode === "scroll" ? "sticky" : "relative",
          top: 0,
          height: mode === "scroll" ? height : "100%",
          overflow: "hidden",
          perspective: geometry ? `${geometry.size * perspective}px` : undefined,
          perspectiveOrigin: "50% 50%",
        }}
      >
        <motion.div
          aria-hidden
          style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", z: frac, rotateZ: rotation }}
        >
          {geometry &&
            [0, 1, 2, 3].map((wall) =>
              opacities.map((opacity, i) => (
                <motion.div
                  key={`${wall}-${i}`}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: geometry.size,
                    height: geometry.spacing,
                    marginLeft: -geometry.size / 2,
                    marginTop: -geometry.spacing / 2,
                    fontSize: geometry.fontSize,
                    lineHeight: `${geometry.spacing}px`,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    opacity,
                    color: rowColors[i],
                    // Lay the row flat on the top wall with letter tops toward the
                    // viewer, push it (i − front) rows deep, then turn it onto its wall.
                    transform:
                      `rotateZ(${wall * 90}deg) ` +
                      `translate3d(0, ${-geometry.size / 2}px, ${-(i - front) * geometry.spacing}px) ` +
                      `rotateX(-90deg)`,
                  }}
                >
                  {text}
                </motion.div>
              )),
            )}
        </motion.div>
      </div>
    </div>
  );
}

// n tones of the current text color, from solid down to 35%.
function shades(n: number) {
  const count = Math.max(Math.round(n), 1);
  return Array.from({ length: count }, (_, i) => {
    const pct = count === 1 ? 100 : Math.round(100 - (65 * i) / (count - 1));
    return pct === 100 ? "currentColor" : `color-mix(in srgb, currentColor ${pct}%, transparent)`;
  });
}
