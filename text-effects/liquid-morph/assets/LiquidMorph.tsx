"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { motion, motionValue, useAnimationFrame } from "motion/react";

export interface LiquidMorphProps {
  text: string;
  /** Outline color. Defaults to the text color. */
  color?: string;
  /** Fill inside the outline. "none" = outline only. */
  fill?: string;
  /** Outline thickness, em. 0 with a fill = solid blobs. */
  strokeWidth?: number;
  /** Goo softness, em. Bigger = rounder letters and wider joints. Too big and
   *  thin strokes melt away. */
  goo?: number;
  /** Space between letters, em. Negative makes neighbors start out joined. */
  tracking?: number;
  /** Thickness of the liquid neck between joined letters, em. */
  neck?: number;
  /** How far (em) joined letters can be pulled apart before the neck snaps. */
  maxStretch?: number;
  /** Let the viewer drag letters around. */
  draggable?: boolean;
  /** Keep dragged letters inside this element. */
  dragBounds?: RefObject<Element | null>;
  /** Double-click a letter to send every letter home. */
  resetOnDoubleClick?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface Home {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export function LiquidMorph({
  text,
  color = "currentColor",
  fill = "none",
  strokeWidth = 0.01,
  goo = 0.06,
  tracking = -0.04,
  neck = 0.32,
  maxStretch = 0.5,
  draggable = true,
  dragBounds,
  resetOnDoubleClick = true,
  className,
  style,
}: LiquidMorphProps) {
  const filterId = `liquid-${useId().replace(/:/g, "")}`;
  const chars = useMemo(() => Array.from(text), [text]);
  // Changing the key remounts the letters, which puts them back home.
  const [resetKey, setResetKey] = useState(0);

  // Each letter's drag offset. Recreated on reset so everything starts at 0.
  const offsets = useMemo(
    () => chars.map(() => ({ x: motionValue(0), y: motionValue(0) })),
    [chars, resetKey],
  );

  // Every pair of (non-space) letters could be joined by a neck.
  const pairs = useMemo(() => {
    const list: [number, number][] = [];
    chars.forEach((a, i) =>
      chars.forEach((b, j) => {
        if (j > i && a.trim() && b.trim()) list.push([i, j]);
      }),
    );
    return list;
  }, [chars]);

  // Neighbours start out joined (a space between them breaks the join).
  const bonds = useRef(new Set<string>());
  useLayoutEffect(() => {
    bonds.current = new Set(
      chars.flatMap((c, i) => (c.trim() && chars[i + 1]?.trim() ? [`${i}-${i + 1}`] : [])),
    );
  }, [chars, resetKey]);

  // The filter works in pixels, so it needs the font size. Letter home
  // centers are cached and re-read when anything resizes.
  const rootRef = useRef<HTMLSpanElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const neckRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const homes = useRef<Home[]>([]);
  const [fontSize, setFontSize] = useState(0);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const read = () => {
      setFontSize(parseFloat(getComputedStyle(el).fontSize) || 16);
      homes.current = letterRefs.current.map((l) =>
        l
          ? {
              cx: l.offsetLeft + l.offsetWidth / 2,
              cy: l.offsetTop + l.offsetHeight / 2,
              w: l.offsetWidth,
              h: l.offsetHeight,
            }
          : { cx: 0, cy: 0, w: 0, h: 0 },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    document.fonts?.addEventListener("loadingdone", read);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", read);
    };
  }, [chars, resetKey]);

  // Necks: joined letters are linked by a bar that thins as they're pulled
  // apart and snaps past `maxStretch`. Letters that touch join up. The goo
  // filter turns the bar and the letters into one liquid shape.
  useAnimationFrame(() => {
    const fs = fontSize;
    if (!fs) return;
    pairs.forEach(([a, b], k) => {
      const el = neckRefs.current[k];
      const ha = homes.current[a];
      const hb = homes.current[b];
      if (!el || !ha || !hb) return;
      const ax = ha.cx + offsets[a].x.get();
      const ay = ha.cy + offsets[a].y.get();
      const bx = hb.cx + offsets[b].x.get();
      const by = hb.cy + offsets[b].y.get();
      const dist = Math.hypot(bx - ax, by - ay);
      // How far past "just touching" the two letters are.
      const stretch = dist - ((ha.w + hb.w) / 2 + tracking * fs);
      const key = `${a}-${b}`;
      if (bonds.current.has(key)) {
        if (stretch > maxStretch * fs) bonds.current.delete(key);
      } else if (stretch < 0) {
        bonds.current.add(key);
      }
      // Touching letters already merge through the goo; a neck is only
      // needed once they're pulled apart.
      if (!bonds.current.has(key) || stretch <= 0) {
        el.style.display = "none";
        return;
      }
      // The neck spans just the gap: from a bit inside one letter's edge to a
      // bit inside the other's (edges approximated by an ellipse per letter),
      // so it never fills the letters themselves.
      const angle = Math.atan2(by - ay, bx - ax);
      const edge = (h: Home) =>
        0.75 / Math.hypot(Math.cos(angle) / (h.w / 2 || 1), Math.sin(angle) / (h.h * 0.35 || 1));
      const from = edge(ha);
      const length = Math.max(0, dist - from - edge(hb));
      const thin = Math.min(1, stretch / (maxStretch * fs));
      const th = neck * fs * (1 - thin) ** 1.2;
      el.style.display = "block";
      el.style.width = `${length}px`;
      el.style.height = `${th}px`;
      el.style.borderRadius = `${th / 2}px`;
      el.style.transform =
        `translate(${ax + Math.cos(angle) * from}px, ${ay + Math.sin(angle) * from - th / 2}px) rotate(${angle}rad)`;
    });
  });

  const blur = goo * fontSize;
  const stroke = strokeWidth * fontSize;
  const hasFill = fill !== "none";

  return (
    <span
      ref={rootRef}
      role="img"
      aria-label={text}
      className={className}
      style={{ position: "relative", display: "inline-block", padding: `${goo * 2}em`, lineHeight: 1, ...style }}
    >
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {/* Huge user-space region so dragged letters are never clipped. */}
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            x="-4000"
            y="-4000"
            width="8000"
            height="8000"
            colorInterpolationFilters="sRGB"
          >
            {/* 1. Blur the shapes so nearby ones bleed into each other. */}
            <feGaussianBlur in="SourceAlpha" stdDeviation={blur} result="blur" />
            {/* 2. Threshold the blur back to a hard edge: the gooey shape.
                   Where two blurs overlap they add up past the threshold and
                   a smooth liquid joint fills the gap. */}
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 24 -8"
              result="goo"
            />
            {/* 3. Outline = goo minus a slightly shrunk copy of itself. */}
            <feMorphology in="goo" operator="erode" radius={stroke} result="inner" />
            <feComposite in="goo" in2="inner" operator="out" result="ring" />
            <feFlood floodColor={color} result="lineColor" />
            <feComposite in="lineColor" in2={stroke > 0 ? "ring" : "goo"} operator="in" result="line" />
            {hasFill && (
              <>
                <feFlood floodColor={fill} result="fillColor" />
                <feComposite in="fillColor" in2="goo" operator="in" result="body" />
              </>
            )}
            <feMerge>
              {hasFill && <feMergeNode in="body" />}
              {(stroke > 0 || !hasFill) && <feMergeNode in="line" />}
            </feMerge>
          </filter>
        </defs>
      </svg>

      <span
        key={resetKey}
        aria-hidden
        style={{
          position: "relative",
          display: "inline-flex",
          gap: `${tracking}em`,
          filter: fontSize ? `url(#${filterId})` : undefined,
          visibility: fontSize ? "visible" : "hidden",
          whiteSpace: "pre",
        }}
      >
        {pairs.map((_, k) => (
          <span
            key={`neck-${k}`}
            ref={(el) => {
              neckRefs.current[k] = el;
            }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              display: "none",
              background: "#000",
              transformOrigin: "0 50%",
              pointerEvents: "none",
            }}
          />
        ))}
        {chars.map((char, i) => (
          <motion.span
            key={i}
            ref={(el: HTMLSpanElement | null) => {
              letterRefs.current[i] = el;
            }}
            drag={draggable && char.trim() !== ""}
            dragMomentum={false}
            dragConstraints={dragBounds}
            dragElastic={0.15}
            onDoubleClick={resetOnDoubleClick ? () => setResetKey((k) => k + 1) : undefined}
            whileDrag={{ scale: 1.06, cursor: "grabbing" }}
            style={{
              x: offsets[i].x,
              y: offsets[i].y,
              display: "inline-block",
              cursor: draggable ? "grab" : undefined,
              touchAction: draggable ? "none" : undefined,
              userSelect: "none",
            }}
          >
            {char}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
