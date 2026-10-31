"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react";

type Tag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

export interface DistortEffectProps {
  text: string;
  from?: "left" | "right";
  ratio?: number;
  anchor?: "center" | "baseline" | "top";
  duration?: number;
  active?: boolean;
  tight?: boolean;
  as?: Tag;
  className?: string;
}

const radians = (deg: number) => (deg * Math.PI) / 180;

export function DistortEffect({
  text,
  from = "left",
  ratio = 2.2,
  anchor = "center",
  duration = 0.4,
  active,
  tight = false,
  as: Wrapper = "span",
  className,
}: DistortEffectProps) {
  const reduceMotion = useReducedMotion();
  // When `active` is passed the parent drives the swing (e.g. to sync stacked words).
  const controlled = active !== undefined;
  const stageRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ width: number; baseline: number } | null>(null);
  // Empty space the font leaves before the first and after the last glyph, in em.
  const [bearings, setBearings] = useState({ left: 0, right: 0 });

  // The word is rotated in 3D, so its top and bottom edges stay straight lines.
  // Perspective distance = word width, which makes the near/far height ratio
  // depend only on the angle:  ratio = (1 + a) / (1 - a),  a = sin(angle) / 2.
  const r = Math.min(Math.max(ratio, 1), 2.9);
  const angle = (Math.asin((2 * (r - 1)) / (r + 1)) * 180) / Math.PI;
  const restAngle = from === "left" ? angle : -angle;

  // In perspective the near side grows more than the far side shrinks, so the
  // word drifts toward its big side and gets taller overall. With `tight`, undo
  // both: shift back by the drift (c·s / (4 − s²) of the width) and scale the
  // height by (4 − s²) / 4 so the average height stays 1 at every angle.
  // Stacked lines then keep matching edges through the whole swing.
  const rotateY = useMotionValue(restAngle);
  const x = useTransform(rotateY, (deg) => {
    if (!tight) return "0%";
    const s = Math.sin(radians(deg));
    return `${(100 * Math.cos(radians(deg)) * s) / (4 - s * s)}%`;
  });
  const scaleY = useTransform(rotateY, (deg) => {
    if (!tight) return 1;
    const s = Math.sin(radians(deg));
    return (4 - s * s) / 4;
  });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const marker = baselineRef.current;
    if (!stage || !marker) return;
    const measure = () =>
      setBox({ width: Math.max(stage.offsetWidth, 1), baseline: marker.offsetTop });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // With `tight`, trim the side bearings so the box edges are the ink edges.
  useLayoutEffect(() => {
    const word = wordRef.current;
    if (!tight || !word) return;
    const measure = () => {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      const cs = getComputedStyle(word);
      const fontSize = parseFloat(cs.fontSize) || 16;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
      const m = ctx.measureText(text);
      const left = -m.actualBoundingBoxLeft / fontSize;
      const right = (m.width - m.actualBoundingBoxRight) / fontSize;
      setBearings((prev) =>
        Math.abs(prev.left - left) < 1e-4 && Math.abs(prev.right - right) < 1e-4 ? prev : { left, right },
      );
    };
    measure();
    // Re-measure when the font changes or finishes loading (both resize the word).
    const observer = new ResizeObserver(measure);
    if (stageRef.current) observer.observe(stageRef.current);
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [text, tight]);

  // Before measuring (SSR, first paint) estimate the width from the letter count.
  const perspective = box ? `${box.width}px` : `${Math.max(Array.from(text).length, 1) * 0.6}em`;
  // Points level with the perspective origin don't move vertically, so that line
  // stays flat. A tight box runs exactly from cap height to baseline.
  const originY = tight
    ? { center: "50%", baseline: "100%", top: "0%" }[anchor]
    : anchor === "baseline" && box
      ? `${box.baseline}px`
      : anchor === "top"
        ? "0%"
        : "50%";

  const word: Variants = {
    rest: { rotateY: restAngle, transition: { duration, ease: [0.22, 1, 0.36, 1] } },
    hover: { rotateY: -restAngle, transition: { duration, ease: [0.22, 1, 0.36, 1] } },
  };

  // Trim the box to cap height → baseline and to the ink left/right, rotating
  // around the ink's center. line-height is the fallback where text-box isn't
  // supported yet.
  const trim = tight
    ? ({
        textBox: "trim-both cap alphabetic",
        lineHeight: 0.75,
        marginLeft: `${-bearings.left}em`,
        marginRight: `${-bearings.right}em`,
        transformOrigin: `calc(50% + ${(bearings.left - bearings.right) / 2}em) 50%`,
      } as unknown as CSSProperties)
    : undefined;

  return (
    <Wrapper className={className} aria-label={text}>
      <motion.span
        ref={stageRef}
        aria-hidden
        style={{
          display: "inline-block",
          position: "relative",
          whiteSpace: "nowrap",
          perspective,
          perspectiveOrigin: `50% ${originY}`,
          transformOrigin: `50% ${originY}`,
          lineHeight: tight ? 0 : undefined,
          verticalAlign: tight ? "top" : undefined,
          cursor: "default",
          x,
          scaleY,
        }}
        initial="rest"
        animate={controlled && active && !reduceMotion ? "hover" : "rest"}
        whileHover={controlled || reduceMotion ? undefined : "hover"}
        whileTap={controlled || reduceMotion ? undefined : "hover"}
      >
        <motion.span ref={wordRef} variants={word} style={{ display: "inline-block", rotateY, ...trim }}>
          {text}
        </motion.span>
        {/* Zero-size inline-block: its offsetTop is the text baseline. */}
        <span ref={baselineRef} style={{ display: "inline-block", width: 0, height: 0 }} />
      </motion.span>
    </Wrapper>
  );
}

export interface DistortStackProps {
  lines: string[];
  ratio?: number;
  duration?: number;
  gap?: number;
  as?: Tag;
  className?: string;
}

// Lines stacked flush, each scaled to the same ink width, alternating direction,
// all swinging together when the block is hovered. Lines are scaled to the same
// width so their cap heights differ; two slants of different heights can't sit
// flush, so the seams are kept flat instead: the first line pivots on its
// baseline, the last on its cap height, middle lines on their center.
export function DistortStack({
  lines,
  ratio,
  duration,
  gap = 0.12,
  as: Wrapper = "div",
  className,
}: DistortStackProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [scales, setScales] = useState<number[] | null>(null);
  const linesKey = lines.join("\n");

  useLayoutEffect(() => {
    const measure = () =>
      setScales((prev) => {
        // Widths grow with font size, so divide out the scale already applied.
        const natural = lines.map((_, i) => (lineRefs.current[i]?.offsetWidth ?? 0) / (prev?.[i] ?? 1));
        const widest = Math.max(...natural, 1);
        const next = natural.map((w) => (w ? widest / w : 1));
        const same = prev?.length === next.length && next.every((s, i) => Math.abs(s - prev[i]) < 1e-3);
        return same ? prev : next;
      });
    measure();
    // Lines re-measure their ink after mount and when fonts load; follow them.
    const observer = new ResizeObserver(measure);
    lineRefs.current.slice(0, lines.length).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [linesKey]);

  const anchorFor = (i: number) =>
    lines.length < 2 ? "center" : i === 0 ? "baseline" : i === lines.length - 1 ? "top" : "center";

  return (
    <Wrapper
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: `${gap}em` }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          ref={(el) => {
            lineRefs.current[i] = el;
          }}
          style={{ display: "block", fontSize: `${scales?.[i] ?? 1}em`, lineHeight: 0 }}
        >
          <DistortEffect
            text={line}
            from={i % 2 === 0 ? "left" : "right"}
            ratio={ratio}
            anchor={anchorFor(i)}
            duration={duration}
            active={hovered && !reduceMotion}
            tight
          />
        </span>
      ))}
    </Wrapper>
  );
}
