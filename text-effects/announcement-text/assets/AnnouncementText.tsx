"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  animate,
  motion,
  motionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from "motion/react";

export interface AnnouncementTextProps {
  lines: [string, string];
  trigger?: "auto" | "hover";
  loop?: boolean;
  cardColor?: string | string[];
  textColor?: string;
  maxScale?: number;
  minScale?: number;
  duration?: number;
  stagger?: number;
  hold?: number;
  pause?: number;
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  radius?: number;
  className?: string;
}

interface Slot {
  char: string;
  // Index among this line's cards (spaces aren't cards).
  card: number;
}

export function AnnouncementText({
  lines,
  trigger = "auto",
  loop = true,
  cardColor = "#e00245",
  textColor = "currentColor",
  maxScale = 1.5,
  minScale = 0.7,
  duration = 0.35,
  stagger = 0,
  hold = 0.5,
  pause = 0.8,
  cardWidth = 0.78,
  cardHeight = 0.95,
  gap = 0.05,
  radius = 0,
  className,
}: AnnouncementTextProps) {
  const reduceMotion = useReducedMotion();
  const linesKey = lines.join("\n");

  const rows = useMemo(
    () =>
      lines.map((line) => {
        let card = 0;
        return Array.from(line).map((char): Slot => ({ char, card: char === " " ? -1 : card++ }));
      }),
    [linesKey],
  );
  // One scale per card; 1 = rest size.
  const scales = useMemo(
    () => rows.map((row) => row.filter((s) => s.card >= 0).map(() => motionValue(1))),
    [rows],
  );

  // Per-letter shift (em) that puts the letter's ink in the exact middle of its
  // card. Re-checked after every render, since the font can change through CSS.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = useState<Record<string, [number, number]>>({});
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const next = measureOffsets(el, new Set(rows.flat().map((s) => s.char)));
      setOffsets((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    document.fonts?.addEventListener("loadingdone", measure);
    return () => document.fonts?.removeEventListener("loadingdone", measure);
  });

  const running = useRef<{ cancelled: boolean; controls: AnimationPlaybackControls[] } | null>(null);

  const stop = () => {
    if (!running.current) return;
    running.current.cancelled = true;
    running.current.controls.forEach((c) => c.stop());
    running.current = null;
    scales.flat().forEach((s) => animate(s, 1, { duration, ease: "easeOut" }));
  };

  const play = async () => {
    if (running.current || reduceMotion) return;
    const run = { cancelled: false, controls: [] as AnimationPlaybackControls[] };
    running.current = run;
    const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

    do {
      for (const phase of phases) {
        if (run.cancelled) return;
        await Promise.all(
          scales.flatMap((line) =>
            line.map((scale, i) => {
              const { target, order } = phase(i, line.length, maxScale, minScale);
              const controls = animate(scale, target, {
                duration,
                delay: order * stagger,
                ease: [0.34, 1.3, 0.64, 1],
              });
              run.controls.push(controls);
              return controls;
            }),
          ),
        );
        run.controls = [];
        await wait(hold);
      }
      if (run.cancelled) return;
      // Settle back to rest before the next round.
      await Promise.all(scales.flat().map((s) => animate(s, 1, { duration, ease: "easeOut" })));
      if (trigger === "auto" && loop) await wait(pause);
    } while (trigger === "auto" && loop && !run.cancelled);

    if (running.current === run) running.current = null;
  };

  useEffect(() => {
    if (trigger === "auto") play();
    return stop;
  }, [trigger, loop, scales, reduceMotion]);

  // Reserve the tallest a card can get, so the block never changes height and
  // the seam between the lines stays put.
  const rowHeight = `${cardHeight * Math.max(maxScale, 1)}em`;
  const colors = Array.isArray(cardColor) ? cardColor : [cardColor];

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-label={lines.join(" ")}
      role="img"
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: `${gap}em` }}
      onPointerEnter={trigger === "hover" ? play : undefined}
      onPointerLeave={trigger === "hover" ? stop : undefined}
    >
      {rows.map((row, r) => (
        <div
          key={r}
          aria-hidden
          style={{
            display: "flex",
            justifyContent: "center",
            gap: `${gap}em`,
            height: rowHeight,
            // Top line grows up from its bottom edge, bottom line grows down
            // from its top edge.
            alignItems: r === 0 ? "flex-end" : "flex-start",
          }}
        >
          {row.map((slot, i) =>
            slot.card < 0 ? (
              <span key={i} style={{ width: `${cardWidth * 0.5}em` }} />
            ) : (
              <Card
                key={i}
                char={slot.char}
                offset={offsets[slot.char] ?? [0, 0]}
                scale={scales[r][slot.card]}
                style={{
                  width: `${cardWidth}em`,
                  height: `${cardHeight}em`,
                  background: colors[slot.card % colors.length],
                  color: textColor,
                  borderRadius: `${radius}em`,
                }}
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

// Card size and letter scale together through font-size: width/height are in
// em of the card's own font-size, so one value drives everything and
// neighbours make room instead of overlapping.
function Card({
  char,
  offset,
  scale,
  style,
}: {
  char: string;
  offset: [number, number];
  scale: MotionValue<number>;
  style: CSSProperties;
}) {
  const fontSize = useTransform(scale, (s) => `${s}em`);
  return (
    <motion.div style={{ fontSize, flex: "none" }}>
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* line-height 0 gives a zero-height box at a known spot relative to the
            baseline; the measured offset then centers the ink on it. */}
        <span style={{ lineHeight: 0, transform: `translate(${offset[0]}em, ${offset[1]}em)` }}>{char}</span>
      </div>
    </motion.div>
  );
}

// For each letter, the translate (in em) from its default spot to ink-centered:
// - x: ink spans [-left, right] from the pen origin; move its middle onto the
//   middle of the advance width.
// - y: with line-height 0 the box's center sits (A − D) / 2 above the baseline
//   (A/D = font ascent/descent); the ink's center sits (a − d) / 2 above it
//   (a/d = this glyph's ascent/descent). Move the difference.
function measureOffsets(el: HTMLElement, chars: Set<string>) {
  const ctx = document.createElement("canvas").getContext("2d");
  const out: Record<string, [number, number]> = {};
  if (!ctx) return out;
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily}`;
  for (const char of chars) {
    if (char === " ") continue;
    const m = ctx.measureText(char);
    const x = (m.width - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft)) / 2;
    const y =
      (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent - (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent)) / 2;
    out[char] = [round(x / 100), round(y / 100)];
  }
  return out;
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;

type Phase = (i: number, n: number, max: number, min: number) => { target: number; order: number };

// Rank cards by distance from the middle: equal distances share a rank, so the
// two neighbours of the center move together.
function ranks(i: number, n: number) {
  const center = (n - 1) / 2;
  const levels = [...new Set(Array.from({ length: n }, (_, k) => Math.abs(k - center)))].sort((a, b) => a - b);
  return { rank: levels.indexOf(Math.abs(i - center)), count: levels.length };
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const phases: Phase[] = [
  // 1. Center out: middle biggest, shrinking outward; outermost scaled down.
  (i, n, max, min) => {
    const { rank, count } = ranks(i, n);
    const t = count > 1 ? rank / (count - 1) : 0;
    return { target: lerp(max, min, t), order: rank };
  },
  // 2. Edges in: corners biggest, middle scaled down.
  (i, n, max, min) => {
    const { rank, count } = ranks(i, n);
    const t = count > 1 ? 1 - rank / (count - 1) : 0;
    return { target: lerp(max, min, t), order: count - 1 - rank };
  },
  // 3. Alternate: every other card up, the rest down, all at once.
  (i, _n, max, min) => ({ target: i % 2 === 0 ? max : min, order: 0 }),
];
