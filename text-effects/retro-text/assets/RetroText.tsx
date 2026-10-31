"use client";

import { useMemo, type CSSProperties } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

export interface RetroTextProps {
  text: string;
  /** Letter face color (under the dots). */
  fillColor?: string;
  /** Halftone dot color. */
  dotColor?: string;
  /** Thin border around each letter. */
  outlineColor?: string;
  /** 3D extrude color. */
  shadowColor?: string;
  /** Dot diameter, in em. */
  dotSize?: number;
  /** Distance between dots, in em. */
  dotSpacing?: number;
  /** Outline thickness, in em. */
  outlineWidth?: number;
  /** Extrude length, in em. */
  depth?: number;
  /** Extrude direction in degrees: 0 = right, 90 = down. */
  angle?: number;
  /** Extra space between letters, in em, so outlines don't touch. */
  letterGap?: number;
  /** Seconds before the first letter. */
  delay?: number;
  /** Seconds between letters. */
  stagger?: number;
  /** Seconds per letter. */
  duration?: number;
  /** How far below each letter starts, in em. */
  rise?: number;
  trigger?: "load" | "inView";
  once?: boolean;
  className?: string;
  style?: CSSProperties;
}

// Distance (em) between extrude copies. Small enough that the copies merge
// into one solid block at any size.
const EXTRUDE_STEP = 0.006;

export function RetroText({
  text,
  fillColor = "#ffbb00",
  dotColor = "#b5123f",
  outlineColor = "#fdebd3",
  shadowColor = "#2b0812",
  dotSize = 0.02,
  dotSpacing = 0.055,
  outlineWidth = 0.02,
  depth = 0.09,
  angle = 45,
  letterGap = 0,
  delay = 0,
  stagger = 0.1,
  duration = 1,
  rise = 0.6,
  trigger = "load",
  once = true,
  className,
  style,
}: RetroTextProps) {
  const reduceMotion = useReducedMotion();

  // Words keep their letters together so lines only break between words.
  // `index` counts letters across the whole text for the stagger.
  const words = useMemo(() => {
    let index = 0;
    return text.split(/(\s+)/).map((part) =>
      /^\s+$/.test(part) ? null : Array.from(part).map((char) => ({ char, index: index++ })),
    );
  }, [text]);

  const layers = useMemo(() => {
    // The extrude is a stack of copies of the outlined glyph, each nudged a
    // little further along `angle`. (A drop-shadow chain looks the same but
    // Chrome rounds sub-pixel shadow offsets to 0, so it vanishes at small sizes.)
    const rad = (angle * Math.PI) / 180;
    const steps = Math.max(1, Math.ceil(depth / EXTRUDE_STEP));
    const extrude: CSSProperties[] = Array.from({ length: steps }, (_, i) => {
      const t = (depth * (steps - i)) / steps;
      return {
        gridArea: "1 / 1",
        color: shadowColor,
        WebkitTextStroke: `${outlineWidth * 2}em ${shadowColor}`,
        transform: `translate(${(Math.cos(rad) * t).toFixed(4)}em, ${(Math.sin(rad) * t).toFixed(4)}em)`,
      };
    });

    const r = dotSize / 2;
    const dot = `radial-gradient(circle, ${dotColor} ${r}em, transparent ${r + 0.004}em)`;
    const half = dotSpacing / 2;

    // position: relative keeps these above the (transformed) extrude copies.
    const outline: CSSProperties = {
      gridArea: "1 / 1",
      position: "relative",
      color: outlineColor,
      // The stroke is centered on the edge; the face covers the inner half.
      WebkitTextStroke: `${outlineWidth * 2}em ${outlineColor}`,
    };
    const face: CSSProperties = {
      gridArea: "1 / 1",
      position: "relative",
      color: "transparent",
      // Two offset dot grids make the diagonal halftone pattern.
      backgroundImage: `${dot}, ${dot}`,
      backgroundSize: `${dotSpacing}em ${dotSpacing}em`,
      backgroundPosition: `0 0, ${half}em ${half}em`,
      backgroundColor: fillColor,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
    };
    const letter: CSSProperties = { display: "inline-grid", margin: `0 ${letterGap / 2}em` };
    return { letter, extrude, outline, face };
  }, [fillColor, dotColor, outlineColor, shadowColor, dotSize, dotSpacing, outlineWidth, depth, angle, letterGap]);

  const hidden = { opacity: 0, y: reduceMotion ? 0 : `${rise}em` };
  const shown = { opacity: 1, y: 0 };
  const play =
    trigger === "inView"
      ? { initial: hidden, whileInView: shown, viewport: { once, amount: 0.4 } }
      : { initial: hidden, animate: shown };

  return (
    <span
      role="img"
      aria-label={text}
      className={className}
      style={{ display: "inline-block", lineHeight: 1.15, padding: `0 ${depth}em ${depth}em 0`, ...style }}
    >
      {words.map((word, w) =>
        word === null ? (
          <span key={w} aria-hidden> </span>
        ) : (
          <span key={w} aria-hidden style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {word.map(({ char, index }) => {
              const transition: Transition = {
                duration: reduceMotion ? 0.2 : duration,
                delay: delay + index * stagger,
                ease: [0.22, 1.2, 0.36, 1],
                opacity: { duration: duration * 0.5, delay: delay + index * stagger },
              };
              return (
                <motion.span key={index} {...play} transition={transition} style={layers.letter}>
                  {layers.extrude.map((copy, i) => (
                    <span key={i} style={copy}>{char}</span>
                  ))}
                  <span style={layers.outline}>{char}</span>
                  <span style={layers.face}>{char}</span>
                </motion.span>
              );
            })}
          </span>
        ),
      )}
    </span>
  );
}
