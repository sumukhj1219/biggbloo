"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  motionValue,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";

export interface SizeCascadeProps {
  text: string;
  rows?: number;
  minScale?: number;
  gap?: number;
  duration?: number;
  hold?: number;
  ease?: [number, number, number, number];
  trigger?: "auto" | "hover";
  loop?: boolean;
  className?: string;
}

// Ink metrics of the word, in em (canvas at 100px / 100).
interface Metrics {
  left: number; // ink starts this far left of the pen origin (negative = right of it)
  width: number;
  ascent: number;
  descent: number;
  fontAscent: number;
  fontDescent: number;
  basePx: number; // wrapper font-size = size of the biggest row
}

// The cycle: sizes ascending (small top → big bottom) or descending, aligned left (0) or right (1).
const STATES = [
  { descending: false, align: 0 }, // start
  { descending: true, align: 0 }, // 1: top grows, bottom shrinks, stuck left
  { descending: false, align: 1 }, // 2: mirror: back to ascending, stuck right
  { descending: true, align: 1 }, // 3: top grows again, stuck right
] as const;

export function SizeCascade({
  text,
  rows = 9,
  minScale = 0.3,
  gap = 0.06,
  duration = 1,
  hold = 0.6,
  // Ease-out cubic: settles softly without the snap of steeper ease-out curves.
  ease = [0.33, 1, 0.68, 1],
  trigger = "auto",
  loop = true,
  className,
}: SizeCascadeProps) {
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const count = Math.max(Math.round(rows), 1);

  // Ascending row sizes, as a fraction of the biggest row.
  const ladder = useMemo(
    () => Array.from({ length: count }, (_, i) => (count > 1 ? minScale + ((1 - minScale) * i) / (count - 1) : 1)),
    [count, minScale],
  );

  // One driver for everything: phase 0 → 1 → 2 → 3 → 4 (= 0) walks the states.
  // Every row's size and position is computed from it, so nothing drifts apart.
  const phase = useMotionValue(0);
  const rowStyles = useMemo(
    () => Array.from({ length: count }, () => ({ fontSize: motionValue("0px"), x: motionValue(0), y: motionValue(0) })),
    [count],
  );

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const next = measureWord(el, text);
      setMetrics((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    document.fonts?.addEventListener("loadingdone", measure);
    return () => document.fonts?.removeEventListener("loadingdone", measure);
  });

  // Box size: the biggest row's ink width, and the stack height. The stack height
  // is the same in every state (rows only trade sizes), so the block never resizes.
  const box = metrics && {
    width: metrics.width * metrics.basePx,
    height:
      ladder.reduce((sum, s) => sum + (metrics.ascent + metrics.descent + gap) * s * metrics.basePx, 0) -
      gap * ladder[ladder.length - 1] * metrics.basePx,
  };

  useLayoutEffect(() => {
    if (!metrics || !box) return;
    const layout = (p: number) => {
      const k = Math.floor(p);
      const t = p - k;
      const from = STATES[((k % 4) + 4) % 4];
      const to = STATES[(((k + 1) % 4) + 4) % 4];
      const align = from.align + (to.align - from.align) * t;
      const { basePx, left, width, ascent, descent, fontAscent, fontDescent } = metrics;
      let top = 0;
      rowStyles.forEach((row, i) => {
        const sizeAt = (descending: boolean) => ladder[descending ? count - 1 - i : i];
        const scale = sizeAt(from.descending) + (sizeAt(to.descending) - sizeAt(from.descending)) * t;
        const px = scale * basePx;
        // Ink edge on the left (align 0) or right (align 1) of the box.
        const inkX = align * (box.width - width * px);
        // A line-height 0 box sits (A − D) / 2 above the baseline; put the ink top at `top`.
        const boxY = top + ascent * px - ((fontAscent - fontDescent) / 2) * px;
        row.fontSize.set(`${px}px`);
        row.x.set(inkX + left * px);
        row.y.set(boxY);
        top += (ascent + descent + gap) * px;
      });
    };
    layout(phase.get());
    return phase.on("change", layout);
  }, [metrics, box?.width, box?.height, ladder, rowStyles, phase, gap, count]);

  // Sequencer: ease from each state to the next, hold, repeat.
  const running = useRef<{ cancelled: boolean; controls?: AnimationPlaybackControls } | null>(null);
  const play = async () => {
    if (running.current || reduceMotion) return;
    const run: { cancelled: boolean; controls?: AnimationPlaybackControls } = { cancelled: false };
    running.current = run;
    const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
    do {
      for (let step = 1; step <= 4 && !run.cancelled; step++) {
        await wait(hold);
        if (run.cancelled) break;
        run.controls = animate(phase, step, { duration, ease });
        await run.controls;
      }
      // State 4 is the start state again; jump the driver back without a visible change.
      if (!run.cancelled) phase.set(0);
    } while (trigger === "auto" && loop && !run.cancelled);
    if (running.current === run) running.current = null;
  };

  useEffect(() => {
    if (trigger === "auto" && metrics) play();
    return () => {
      if (!running.current) return;
      running.current.cancelled = true;
      running.current.controls?.stop();
      running.current = null;
    };
  }, [trigger, loop, !!metrics, reduceMotion]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      role="img"
      aria-label={text}
      onPointerEnter={trigger === "hover" ? play : undefined}
      style={{
        position: "relative",
        width: box ? box.width : undefined,
        height: box ? box.height : undefined,
        visibility: box ? "visible" : "hidden",
      }}
    >
      {rowStyles.map((row, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            lineHeight: 0,
            whiteSpace: "nowrap",
            fontSize: row.fontSize,
            x: row.x,
            y: row.y,
          }}
        >
          {text}
        </motion.span>
      ))}
    </div>
  );
}

function measureWord(el: HTMLElement, text: string): Metrics | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  const m = ctx.measureText(text);
  const round = (n: number) => Math.round(n * 1e3) / 1e5;
  return {
    left: round(m.actualBoundingBoxLeft),
    width: round(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) || 0.01,
    ascent: round(m.actualBoundingBoxAscent),
    descent: round(m.actualBoundingBoxDescent),
    fontAscent: round(m.fontBoundingBoxAscent),
    fontDescent: round(m.fontBoundingBoxDescent),
    basePx: parseFloat(cs.fontSize) || 16,
  };
}
