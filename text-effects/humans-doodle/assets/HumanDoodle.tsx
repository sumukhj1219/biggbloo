"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";

// Minimal sketched people built from basic shapes: round heads, boxy tops,
// skinny legs, a smudge of shadow. An SVG filter makes them look hand made:
// the edges wobble like a brush line, the fills get a streaky paint grain, and
// the wobble re-rolls a few times a second ("line boil").
//
// Brush lines: every shape is painted twice, ink first and then the color
// nudged a little up-left, so each line is thin on one side and thick on the
// other, the way a brush stroke swells. Arms and legs are two-segment limbs
// rigged with nested <g> joints; the idle loop is plain CSS keyframes.
//
// <HumanDoodle /> draws one person (pass a `person` to change the look).
// HumansDoodle.tsx paints a whole crowd of them on a canvas.

export type HairStyle = "spiky" | "short" | "long" | "bob" | "bun" | "ponytail" | "afro" | "beanie" | "bald";
export type Top = "hoodie" | "tee" | "sweater" | "jacket" | "dress";
export type Bottom = "pants" | "shorts" | "skirt";
export type Prop = "coffee" | "book" | "phone" | "flower" | "icecream" | "bag" | "balloon" | "umbrella";
export type Face = "grin" | "smile" | "open";

export interface Person {
  skin: string;
  hairStyle: HairStyle;
  /** Hair color (the hat color for "beanie"). */
  hair: string;
  top: Top;
  topColor: string;
  /** Ignored with a dress. */
  bottom: Bottom;
  bottomColor: string;
  shoes: string;
  face?: Face;
  glasses?: boolean;
  beard?: string;
  prop?: Prop;
  /** Which hand holds the prop. */
  propHand?: "l" | "r";
  /** Prop color, jacket lining. */
  accent?: string;
  /** Height multiplier, ~0.9–1.05. */
  height?: number;
}

export const DEFAULT_PERSON: Person = {
  skin: "#fbfaf7",
  hairStyle: "spiky",
  hair: "#fbfaf7",
  top: "hoodie",
  topColor: "#e2362b",
  bottom: "pants",
  bottomColor: "#1b1a1a",
  shoes: "#1b1a1a",
  face: "grin",
};

// A varied cast: every gender, skin tone, hairstyle, outfit and color, and
// something in hand for most. HumansDoodle cycles through it.
export const PEOPLE: Person[] = [
  DEFAULT_PERSON,
  { skin: "#f2c9a8", hairStyle: "long", hair: "#5a3825", top: "dress", topColor: "#f2b134", bottom: "skirt", bottomColor: "#f2b134", shoes: "#7a3b2e", face: "smile", prop: "coffee", propHand: "r", accent: "#b5794a", height: 0.95 },
  { skin: "#7a4a2e", hairStyle: "afro", hair: "#1b1a1a", top: "tee", topColor: "#3fa36b", bottom: "pants", bottomColor: "#3b5b9a", shoes: "#f4f1ea", face: "grin", prop: "phone", propHand: "l", height: 1.04 },
  { skin: "#c68e63", hairStyle: "bun", hair: "#2b1d14", top: "sweater", topColor: "#7b5cd6", bottom: "skirt", bottomColor: "#1b1a1a", shoes: "#1b1a1a", face: "smile", prop: "bag", propHand: "r", accent: "#e2725b", height: 0.94 },
  { skin: "#f6dcc8", hairStyle: "beanie", hair: "#2f7fd8", top: "jacket", topColor: "#f07b2c", bottom: "pants", bottomColor: "#2a3550", shoes: "#5a3a22", beard: "#a0522d", face: "smile", prop: "balloon", propHand: "l", accent: "#ff5a8a", height: 1.02 },
  { skin: "#5c3a24", hairStyle: "ponytail", hair: "#1b1a1a", top: "tee", topColor: "#ff7eb6", bottom: "shorts", bottomColor: "#4a73c9", shoes: "#f4f1ea", face: "grin", prop: "book", propHand: "l", accent: "#2e9e8f", height: 0.92 },
  { skin: "#e8b896", hairStyle: "short", hair: "#3a2a1e", top: "sweater", topColor: "#2aa3a3", bottom: "pants", bottomColor: "#c7a77a", shoes: "#3a2a1e", glasses: true, face: "smile", prop: "coffee", propHand: "l", accent: "#2e5a3a", height: 1.0 },
  { skin: "#fbfaf7", hairStyle: "bob", hair: "#1b1a1a", top: "hoodie", topColor: "#3c6fe0", bottom: "pants", bottomColor: "#1b1a1a", shoes: "#e2362b", face: "grin", prop: "flower", propHand: "r", accent: "#ff5a8a", height: 0.93 },
  { skin: "#8d5a3b", hairStyle: "bald", hair: "#1b1a1a", top: "tee", topColor: "#f4efe6", bottom: "pants", bottomColor: "#5b5b62", shoes: "#1b1a1a", beard: "#1b1a1a", face: "smile", prop: "umbrella", propHand: "r", accent: "#e2362b", height: 1.03 },
  { skin: "#e8b896", hairStyle: "afro", hair: "#ff7eb6", top: "hoodie", topColor: "#2e2e33", bottom: "pants", bottomColor: "#e9e2d6", shoes: "#1b1a1a", face: "open", prop: "icecream", propHand: "l", accent: "#a8e0ff", height: 0.96 },
  { skin: "#f6dcc8", hairStyle: "long", hair: "#f2c94c", top: "dress", topColor: "#e2362b", bottom: "skirt", bottomColor: "#e2362b", shoes: "#1b1a1a", face: "smile", glasses: true, prop: "bag", propHand: "l", accent: "#3c6fe0", height: 0.97 },
  { skin: "#c68e63", hairStyle: "spiky", hair: "#1b1a1a", top: "hoodie", topColor: "#f2c94c", bottom: "pants", bottomColor: "#1b1a1a", shoes: "#f4f1ea", face: "grin", prop: "phone", propHand: "r", height: 1.01 },
];

export interface HumanDoodleProps {
  /** The look; any field left out comes from the default person. */
  person?: Partial<Person>;
  /** Animation speed multiplier. */
  speed?: number;
  /** Offset into the idle loop, seconds (desyncs a crowd). */
  delay?: number;
  /** Rendered height in px (width follows, 3:5). Omit to size with CSS. */
  size?: number;
  ink?: string;
  /** Soft painted shadow under the feet. */
  shadow?: boolean;
  /** How rough the brush edges are, 0–2. */
  roughness?: number;
  /** Re-roll the wobble a few times a second, like hand-drawn animation. */
  boil?: boolean;
  /** Noise seed, so people in a crowd don't wobble alike. */
  seed?: number;
  /**
   * Freeze the idle loop at this many seconds (0–3.6). Every part then runs
   * on the same 3.6 s cycle, so frames taken across it loop cleanly. Used to
   * bake crowd sprites.
   */
  frozenAt?: number;
  className?: string;
  style?: CSSProperties;
}

// Rig, in viewBox units (120 × 200).
const SHOULDER_L = [45, 64] as const;
const SHOULDER_R = [75, 64] as const;
const UPPER_ARM = 26;
const FOREARM = 24;
const HIP_L = [53.5, 116] as const;
const HIP_R = [66.5, 116] as const;
const THIGH = 30;
const SHIN = 30;
const HAND = 7.5; // hand center past the wrist

const SLEEVE = 9;
const LEG = 8;
const LINE = 1.45; // ink width around a fill (average; the offset makes it uneven)
const DX = -0.55; // color offset against the ink, gives the thick/thin line
const DY = -0.35;

// Resting angles. 0° hangs straight down; positive swings toward screen-left.
const REST_SH = { l: 3, r: -3 };
const REST_EL = { l: 5, r: -5 };
// Holding something in front: the upper arm swings out a little and the
// forearm bends up toward the chest. The forearm points at the viewer, so it
// is drawn foreshortened, which lands the hand mid-chest.
const HOLD_SH = 8;
const HOLD_EL: Partial<Record<Prop, number>> = { coffee: 100, book: 96, phone: 140, flower: 96, icecream: 110 };
const FORESHORTEN = 0.45;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// Ink outline underneath, color on top, slightly offset.
function Brushed({ d, fill, ink, w = LINE }: { d: string; fill: string; ink: string; w?: number }) {
  return (
    <>
      <path d={d} fill={ink} stroke={ink} strokeWidth={w * 2} strokeLinejoin="round" />
      <path d={d} fill={fill} transform={`translate(${DX} ${DY})`} />
    </>
  );
}

// A circle with a bumpy edge (afro, pom-pom).
function scallop(cx: number, cy: number, r: number, n: number, amp: number) {
  const pt = (rad: number, a: number) => `${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`;
  let d = `M${pt(r, 0)}`;
  for (let i = 0; i < n; i++) {
    const a1 = ((i + 0.5) / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    d += ` Q${pt(r + amp * 2, a1)} ${pt(r, a2)}`;
  }
  return d + " Z";
}

export function HumanDoodle({
  person: personProp,
  speed = 1,
  delay = 0,
  size,
  ink = "#1b1a1a",
  shadow = true,
  roughness = 1,
  boil = true,
  seed = 3,
  frozenAt,
  className,
  style,
}: HumanDoodleProps) {
  const p: Person = { ...DEFAULT_PERSON, ...personProp };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = useReducedMotion();
  const s = Math.max(0.05, speed);
  const r = Math.max(0, roughness);
  const vars = {
    "--hd-idle": `${3.6 / s}s`,
    "--hd-blink": `${4.2 / s}s`,
    "--hd-delay": `${-Math.abs(frozenAt ?? delay)}s`,
  } as CSSProperties;
  const shade = (c: string, pct = 78) => `color-mix(in srgb, ${c} ${pct}%, ${ink})`;
  const accent = p.accent ?? "#e2725b";

  const dress = p.top === "dress";
  const longSleeves = p.top === "hoodie" || p.top === "sweater" || p.top === "jacket";
  const armColors: [string, string] = [p.topColor, longSleeves ? p.topColor : p.skin];
  const legColors: [string, string] =
    dress || p.bottom === "skirt" ? [p.skin, p.skin] : p.bottom === "shorts" ? [p.bottomColor, p.skin] : [p.bottomColor, p.bottomColor];
  const holdAngle = p.prop ? HOLD_EL[p.prop] : undefined;

  // A limb is painted twice: ink strokes, then the colored strokes on top
  // (nudged like every other fill). Both passes share the joint classes, so
  // their animations stay in lockstep and elbows/knees bend without a seam.
  const limb = (kind: "arm" | "leg", side: "l" | "r", pass: "ink" | "paint") => {
    const arm = kind === "arm";
    const [x0, y] = arm ? (side === "l" ? SHOULDER_L : SHOULDER_R) : side === "l" ? HIP_L : HIP_R;
    const holds = arm && !!p.prop && (p.propHand ?? "r") === side;
    const bend = holds && holdAngle !== undefined ? (side === "l" ? -holdAngle : holdAngle) : undefined;
    const lift = bend !== undefined ? (side === "l" ? HOLD_SH : -HOLD_SH) : undefined;
    const my = y + (arm ? UPPER_ARM : THIGH);
    const ey = my + (arm ? FOREARM * (bend !== undefined ? FORESHORTEN : 1) : SHIN);
    const paint = pass === "paint";
    const x = paint ? x0 + DX : x0;
    const o = paint ? DY : 0;
    const width = arm ? SLEEVE : LEG;
    const [c1, c2] = arm ? armColors : legColors;
    const seg = (c: string) => ({
      stroke: paint ? c : ink,
      strokeWidth: paint ? width : width + LINE * 2,
      strokeLinecap: "round" as const,
    });
    const [j1, j2] = arm ? ["sh", "el"] : ["hip", "knee"];

    // Undo the arm's rotation so the prop stays upright in the hand.
    const total = (lift ?? REST_SH[side]) + (bend ?? REST_EL[side]);
    const elbowStyle = {
      transformOrigin: `${x0}px ${my}px`,
      ...(bend !== undefined ? { "--hd-hold": `${bend}deg` } : null),
    } as CSSProperties;

    return (
      <g
        className={`hd-j hd-${j1}-${side}${lift !== undefined ? " hd-lift" : ""}`}
        style={{ transformOrigin: `${x0}px ${y}px`, ...(lift !== undefined ? { "--hd-lift": `${lift}deg` } : null) } as CSSProperties}
      >
        <line x1={x} y1={y + o} x2={x} y2={my + o} {...seg(c1)} />
        <g className={`hd-j hd-${j2}-${side}${bend !== undefined ? " hd-hold" : ""}`} style={elbowStyle}>
          {paint && arm && (
            <>
              {holds && (
                <g transform={`translate(${x0} ${ey + HAND}) rotate(${-total})`}>
                  <PropArt prop={p.prop!} side={side} accent={accent} ink={ink} />
                </g>
              )}
              <Brushed d={`M${x0 - 3.4} ${ey + HAND} a3.4 4 0 1 0 6.8 0 a3.4 4 0 1 0 -6.8 0 Z`} fill={p.skin} ink={ink} w={1.1} />
            </>
          )}
          <line x1={x} y1={my + o} x2={x} y2={ey + o} {...seg(c2)} />
          {paint && !arm && (
            <path
              d={`M${x0 + 4.5} ${ey - 2} L${x0 + 4.5} ${ey + 4} L${x0 - 6} ${ey + 4} Q${x0 - 9} ${ey + 4} ${x0 - 8} ${ey + 1} Q${x0 - 7} ${ey - 2} ${x0 - 4.5} ${ey - 2} Z`}
              fill={p.shoes}
              stroke={ink}
              strokeWidth={LINE}
              strokeLinejoin="round"
            />
          )}
        </g>
      </g>
    );
  };

  const body = dress ? DRESS : BODY;
  const hair = HAIR[p.hairStyle];

  return (
    <svg
      viewBox="0 0 120 200"
      className={`hd${frozenAt !== undefined ? " hd-frozen" : ""}${className ? ` ${className}` : ""}`}
      style={{ ...vars, ...(size ? { height: size, width: (size * 3) / 5 } : null), ...style }}
      role="img"
      aria-label="Sketched doodle person"
    >
      <style>{CSS}</style>
      <defs>
        {/* Brush: a slow wobble plus a fine ragged edge, then streaky paint grain. */}
        <filter id={`${uid}-brush`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={2} seed={seed} result="wobble">
            {boil && !reduced && (
              <animate
                attributeName="seed"
                values={`${seed};${seed + 8};${seed + 16};${seed + 24}`}
                dur="0.6s"
                calcMode="discrete"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale={1.6 * r} xChannelSelector="R" yChannelSelector="G" result="wobbled" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={seed + 4} result="fine" />
          <feDisplacementMap in="wobbled" in2="fine" scale={0.9 * r} xChannelSelector="R" yChannelSelector="G" result="ragged" />
          {/* paint grain: stretched noise reads as bristle streaks */}
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.16" numOctaves={3} seed={seed + 2} result="streaks" />
          <feColorMatrix in="streaks" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey" result="grain">
            <feFuncR type="linear" slope={0.55} intercept={0.68} />
            <feFuncG type="linear" slope={0.55} intercept={0.68} />
            <feFuncB type="linear" slope={0.55} intercept={0.68} />
          </feComponentTransfer>
          <feBlend in="ragged" in2="grain" mode="multiply" result="painted" />
          <feComposite in="painted" in2="ragged" operator="in" />
        </filter>
        {/* Shadow: a soft, blotchy wash. */}
        <filter id={`${uid}-wash`} x="-30%" y="-200%" width="160%" height="500%">
          <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves={2} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={4} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={0.6} />
        </filter>
        <clipPath id={`${uid}-body`}>
          <path d={body} />
        </clipPath>
      </defs>

      {shadow && (
        <g filter={`url(#${uid}-wash)`}>
          <ellipse cx={63} cy={182} rx={18} ry={2.8} fill="#8f7fc0" opacity={0.3} />
          <ellipse cx={58} cy={182.4} rx={10} ry={1.9} fill="#8f7fc0" opacity={0.35} />
        </g>
      )}

      <g filter={`url(#${uid}-brush)`}>
        <g className="hd-j hd-body">
          {limb("leg", "r", "ink")}
          {limb("leg", "r", "paint")}
          {limb("leg", "l", "ink")}
          {limb("leg", "l", "paint")}

          <g className="hd-j hd-torso" style={{ transformOrigin: "60px 118px" }}>
            {/* neck, for tops without a hood */}
            <Brushed d="M55 46 L65 46 L65 58 L55 58 Z" fill={p.skin} ink={ink} />
            {!dress && p.bottom === "skirt" && <Brushed d={SKIRT} fill={p.bottomColor} ink={ink} />}

            {/* top: a box with soft shoulders (or a flared dress) and a darker side */}
            <Brushed d={body} fill={p.topColor} ink={ink} />
            <g clipPath={`url(#${uid}-body)`}>
              <path d="M71 50 Q78 100 76 150 L96 150 L96 50 Z" fill={shade(p.topColor)} transform={`translate(${DX} ${DY})`} />
            </g>
            {!dress && (
              <path d="M42 111 Q52 114 61 113.6 Q71 113 79 110.5" fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />
            )}
            {p.top === "hoodie" && (
              <>
                <path d="M50 70 Q49 84 51 96" fill="none" stroke={shade(p.topColor)} strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />
                <Brushed d="M47 57 Q50 50 60 50 Q70 50 73 57 Q66 63 60 63 Q54 63 47 57 Z" fill={shade(p.topColor)} ink={ink} />
              </>
            )}
            {(p.top === "tee" || p.top === "dress") && (
              <path d="M53.5 55.6 Q60 61.5 66.5 55.6" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" />
            )}
            {dress && <path d="M44 92 Q60 95 76 92" fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" opacity={0.6} />}
            {p.top === "sweater" && (
              <Brushed d="M52 55.4 Q60 61 68 55.4 L68 57 Q60 63.5 52 57 Z" fill={shade(p.topColor, 85)} ink={ink} w={0.8} />
            )}
            {p.top === "jacket" && (
              <>
                <Brushed d="M56.5 55.5 L63.5 55.5 L63 117 L57 117 Z" fill="#f4efe6" ink={ink} w={0.8} />
                <path d="M56.5 56 L53 67 L57.5 71 M63.5 56 L67 67 L62.5 71" fill="none" stroke={ink} strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}

            <g className="hd-j hd-head" style={{ transformOrigin: "60px 58px" }}>
              {hair.back && <Brushed d={hair.back} fill={p.hair} ink={ink} />}
              <Brushed d="M44 36 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 Z" fill={p.skin} ink={ink} />
              {p.beard && <Brushed d="M45 39 Q46 53.5 60 53.5 Q74 53.5 75 39 Q71 45.5 60 45.5 Q49 45.5 45 39 Z" fill={p.beard} ink={ink} w={1} />}
              {hair.front && <Brushed d={hair.front} fill={p.hair} ink={ink} />}
              {hair.extra?.(p.hair, ink)}
              {/* face: dot eyes and a mouth */}
              <g className="hd-j hd-eyes" style={{ transformOrigin: "60px 36px" }}>
                <ellipse cx={55} cy={36} rx={1.4} ry={1.7} fill={ink} />
                <ellipse cx={65} cy={36.2} rx={1.5} ry={1.6} fill={ink} />
              </g>
              {p.glasses && (
                <g fill="none" stroke={ink} strokeWidth={1}>
                  <circle cx={55} cy={36} r={4} />
                  <circle cx={65} cy={36} r={4} />
                  <path d="M59 35.5 Q60 34.5 61 35.5 M51 35 L45 33.5 M69 35 L75 33.5" strokeLinecap="round" />
                </g>
              )}
              {p.face === "smile" && <path d="M55.5 43 Q60 46.5 64.5 43" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" />}
              {p.face === "open" && <Brushed d="M58 43.5 a2 2.4 0 1 0 4 0 a2 2.4 0 1 0 -4 0 Z" fill="#c44a3d" ink={ink} w={0.7} />}
              {(p.face ?? "grin") === "grin" && <Brushed d="M54 41.5 Q60 49.5 66 41.5 Q60 42.6 54 41.5 Z" fill="#fbfaf7" ink={ink} w={0.8} />}
            </g>

            {/* arms in front of the body; the holding arm last, over everything */}
            {(p.prop && (p.propHand ?? "r") === "l" ? (["r", "l"] as const) : (["l", "r"] as const)).map((side) => (
              <g key={side}>
                {limb("arm", side, "ink")}
                {limb("arm", side, "paint")}
              </g>
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

// Things to hold, drawn upright around the hand center (0, 0). The hand is
// painted over them, so it looks like a grip.
function PropArt({ prop, side, accent, ink }: { prop: Prop; side: "l" | "r"; accent: string; ink: string }) {
  const out = side === "l" ? -1 : 1; // away from the body
  switch (prop) {
    case "coffee":
      return (
        <g>
          <path d="M-1 -16 q-2 -3 0 -5.5 q2 -2.5 0 -5" fill="none" stroke={ink} strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
          <Brushed d="M-4.5 -12 L4.5 -12 L3.5 1.5 L-3.5 1.5 Z" fill="#f4efe6" ink={ink} w={1} />
          <Brushed d="M-4.1 -7.5 L4.1 -7.5 L3.8 -3 L-3.8 -3 Z" fill={accent} ink={ink} w={0.6} />
          <Brushed d="M-5.4 -14 L5.4 -14 L5 -11.8 L-5 -11.8 Z" fill="#e2dccf" ink={ink} w={0.9} />
        </g>
      );
    case "book":
      return (
        <g transform="rotate(-8)">
          <Brushed d="M-6 -15 L6 -15 L6 2 L-6 2 Z" fill={accent} ink={ink} w={1} />
          <path d="M-3.4 -15 L-3.4 2" stroke={ink} strokeWidth={0.8} opacity={0.6} />
          <path d="M-1 -11 L4 -11 M-1 -8.5 L3 -8.5" stroke="#fbfaf7" strokeWidth={0.9} strokeLinecap="round" />
        </g>
      );
    case "phone":
      return (
        <g transform="rotate(6)">
          <Brushed d="M-3.6 -11 L3.6 -11 L3.6 2 L-3.6 2 Z" fill="#26262b" ink={ink} w={0.9} />
          <path d="M-2.5 -9.8 L2.5 -9.8 L2.5 0.6 L-2.5 0.6 Z" fill="#8fd3ff" />
        </g>
      );
    case "flower":
      return (
        <g>
          <path d="M0 1 Q-1.5 -9 0.5 -19" fill="none" stroke="#3f8f46" strokeWidth={1.4} strokeLinecap="round" />
          <path d="M-0.5 -9 Q-6 -11 -6 -14 Q-2 -14 -0.5 -10.5 Z" fill="#5bb35f" stroke={ink} strokeWidth={0.7} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={0.5 + Math.cos((a * Math.PI) / 180) * 3}
              cy={-21 + Math.sin((a * Math.PI) / 180) * 3}
              r={2.6}
              fill={accent}
              stroke={ink}
              strokeWidth={0.8}
            />
          ))}
          <circle cx={0.5} cy={-21} r={1.8} fill="#ffd23f" stroke={ink} strokeWidth={0.6} />
        </g>
      );
    case "icecream":
      return (
        <g>
          <Brushed d={scallop(0, -10, 4.6, 7, 0.5)} fill={accent} ink={ink} w={0.9} />
          <Brushed d="M-4.5 -7 L4.5 -7 L0 6 Z" fill="#e2b06a" ink={ink} w={0.9} />
          <path d="M-2.5 -5 L1.5 1 M1 -6 L-1.5 -1" stroke={ink} strokeWidth={0.6} opacity={0.5} />
        </g>
      );
    case "bag":
      return (
        <g>
          <path d="M-4.5 7 Q-5 -1.5 0 -1 Q5 -1.5 4.5 7" fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" />
          <Brushed d="M-8 6 L8 6 L9 22 L-9 22 Z" fill={accent} ink={ink} w={1.1} />
          <path d="M-7.5 10 L7.6 10" stroke={ink} strokeWidth={0.7} opacity={0.4} />
        </g>
      );
    case "balloon":
      return (
        <g className="hd-j hd-balloon" style={{ transformOrigin: "0px 0px" }}>
          <path d={`M0 0 Q${-4 * out} -30 ${11 * out} -66`} fill="none" stroke={ink} strokeWidth={0.7} />
          <Brushed d={`M${11 * out - 1.5} -64 L${11 * out + 1.5} -64 L${11 * out} -67 Z`} fill={accent} ink={ink} w={0.6} />
          <Brushed d={`M${11 * out - 9} -78 a9 11 0 1 0 18 0 a9 11 0 1 0 -18 0 Z`} fill={accent} ink={ink} w={1.1} />
          <path d={`M${11 * out - 4.5} -83 q1.5 -3.5 4.5 -4`} fill="none" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        </g>
      );
    case "umbrella":
      return (
        <g>
          <path d={`M0 0 L0 -5 Q0 -9 ${-3 * out} -9`} fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
          <path d="M0 0 L0 54" stroke={ink} strokeWidth={1.2} />
          <Brushed d="M0 9 L4.5 42 L0 52 L-4.5 42 Z" fill={accent} ink={ink} w={1} />
          <path d="M0 10 L1.5 46" stroke={ink} strokeWidth={0.6} opacity={0.5} />
        </g>
      );
  }
}

const BODY = "M43 66 Q43 57 52 55 L68 55 Q77 57 77 66 L80.6 117.6 Q60 121 39.4 117.6 Z";
const DRESS = "M43 66 Q43 57 52 55 L68 55 Q77 57 77 66 L77.5 94 L87 140 Q60 146 33 140 L42.5 94 Z";
const SKIRT = "M41.5 110 L78.5 110 L84 136 Q60 140 36 136 Z";

// Hair per style: `back` is painted behind the head, `front` over it.
const HAIR: Record<HairStyle, { back?: string; front?: string; extra?: (hair: string, ink: string) => ReactNode }> = {
  spiky: {
    front:
      "M44.5 37 Q41.5 35.5 40.5 33.5 Q42.5 32 44 31 Q40.5 29 39 26.5 Q42 25.5 44.5 25 Q42.5 21.5 41.5 18.5 Q45.5 19 48.5 20 Q47.5 16 47.5 13 Q51 15 54 17 Q54.5 13 55.5 9.5 Q58.5 12.5 60.5 15.5 Q62 12 64.5 9 Q66 12.5 66.5 16 Q69.5 13.5 72.5 12 Q72.5 15.5 71.5 19 Q75 18 78.5 18 Q77 21 75 24 Q78 25.5 80.5 27 Q78 28.5 75.5 29.5 Q76.5 31.5 76.5 34 Q73 27 67 27.5 Q63 23 59 26.5 Q54 23.5 51 28.5 Q46.5 29.5 44.5 37 Z",
    extra: (_hair, ink) => (
      <g fill="none" stroke={ink} strokeLinecap="round">
        <path d="M52 18 q2 3 1 6" strokeWidth={1.1} />
        <path d="M63 15 q1 3 -1 6" strokeWidth={0.9} />
        <path d="M71 19 q-1 3 1 5" strokeWidth={1.1} />
      </g>
    ),
  },
  short: {
    front: "M44 35 Q42.5 20 59 19 Q77 19 76.5 34 Q73 27 66 26.5 Q62 28.5 56 27.5 Q48 28 44 35 Z",
  },
  long: {
    back: "M43 34 Q40 17 60 17.5 Q80 17 77 34 L80.5 72 Q74 76 68 70 L52 70 Q46 76 39.5 72 Z",
    front: "M44 35 Q43 19 60 19 Q77 19 76 35 Q73 27 68 24.5 Q61 30 51 27.5 Q46.5 29.5 44 35 Z",
  },
  bob: {
    back: "M42.5 37 Q40 17 60 17.5 Q80 17 77.5 37 L79 51 Q72 55 67 49 L53 49 Q48 55 41 51 Z",
    front: "M44 33 Q44.5 19 60 19 Q75.5 19 76 33 Q68 29.5 60 30.5 Q52 29.5 44 33 Z",
  },
  bun: {
    back: scallop(60, 15, 6.5, 9, 0.6),
    front: "M44 33 Q44.5 20 60 20 Q75.5 20 76 33 Q70 26.5 60 27 Q50 26.5 44 33 Z",
  },
  ponytail: {
    back: "M70 23 Q85 20 86 34 Q88.5 48 81 56 Q81 44 75 35 Z",
    front: "M44 33 Q44.5 20 60 20 Q75.5 20 76 33 Q70 26.5 60 27 Q50 26.5 44 33 Z",
    extra: (hair, ink) => <Brushed d="M71.5 22.5 L76 21 L77.5 26.5 L73 28 Z" fill={`color-mix(in srgb, ${hair} 50%, #ff5a8a)`} ink={ink} w={0.8} />,
  },
  afro: {
    back: scallop(60, 29, 21, 12, 2),
    front: "M44 33 Q45 21 60 21 Q75 21 76 33 Q70 27.5 60 28 Q50 27.5 44 33 Z",
  },
  beanie: {
    front: "M43 32 Q42.5 14 60 14 Q77.5 14 77 32 Z",
    extra: (hair, ink) => (
      <>
        <Brushed d="M41.5 28.5 L78.5 28.5 L78.5 34 L41.5 34 Z" fill={`color-mix(in srgb, ${hair} 80%, ${ink})`} ink={ink} w={1} />
        <path d="M46 29.5 v3.5 M51 29.5 v3.5 M56 29.5 v3.5 M61 29.5 v3.5 M66 29.5 v3.5 M71 29.5 v3.5 M76 29.5 v3.5" stroke={ink} strokeWidth={0.6} opacity={0.5} />
        <Brushed d={scallop(60, 12, 3.6, 8, 0.5)} fill="#fbfaf7" ink={ink} w={0.9} />
      </>
    ),
  },
  bald: {
    extra: (_hair, ink) => <path d="M50 24 q4 -3 9 -3" fill="none" stroke={ink} strokeWidth={0.8} strokeLinecap="round" opacity={0.35} />,
  },
};

const CSS = `
.hd { display: block; overflow: visible; }
.hd .hd-j { transform-box: view-box; }

.hd .hd-torso { animation: hd-breathe var(--hd-idle) ease-in-out infinite; }
.hd .hd-head { animation: hd-tilt calc(var(--hd-idle) * 1.3) ease-in-out infinite; }
.hd .hd-eyes { animation: hd-blink var(--hd-blink) linear infinite; }
.hd .hd-sh-l { animation: hd-arm-l var(--hd-idle) ease-in-out infinite; }
.hd .hd-sh-r { animation: hd-arm-r var(--hd-idle) ease-in-out infinite; }
.hd .hd-el-l { animation: hd-el-l var(--hd-idle) ease-in-out infinite; }
.hd .hd-el-r { animation: hd-el-r var(--hd-idle) ease-in-out infinite; }
.hd .hd-j.hd-hold { animation: hd-hold var(--hd-idle) ease-in-out infinite; }
.hd .hd-j.hd-lift { animation: hd-lift var(--hd-idle) ease-in-out infinite; }
.hd .hd-balloon { animation: hd-bob-balloon calc(var(--hd-idle) * 0.9) ease-in-out infinite; }
.hd .hd-hip-l { transform: rotate(1.5deg); }
.hd .hd-hip-r { transform: rotate(-1.5deg); }
.hd .hd-j { animation-delay: var(--hd-delay, 0s); }

@keyframes hd-breathe { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-0.6px) scaleY(1.01); } }
@keyframes hd-tilt { 0%, 100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
@keyframes hd-blink { 0%, 44%, 50%, 100% { transform: scaleY(1); } 47% { transform: scaleY(0.1); } }
@keyframes hd-arm-l { 0%, 100% { transform: rotate(4deg); } 50% { transform: rotate(1.5deg); } }
@keyframes hd-arm-r { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(-1.5deg); } }
@keyframes hd-el-l { 0%, 100% { transform: rotate(4deg); } 50% { transform: rotate(7deg); } }
@keyframes hd-el-r { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(-7deg); } }
@keyframes hd-hold { 0%, 100% { transform: rotate(var(--hd-hold)); } 50% { transform: rotate(calc(var(--hd-hold) * 0.96)); } }
@keyframes hd-lift { 0%, 100% { transform: rotate(var(--hd-lift)); } 50% { transform: rotate(calc(var(--hd-lift) * 0.8)); } }
@keyframes hd-bob-balloon { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }

/* a single still frame of the loop */
.hd-frozen .hd-j { animation-play-state: paused !important; animation-duration: var(--hd-idle) !important; }

@media (prefers-reduced-motion: reduce) {
  .hd .hd-j { animation: none !important; }
  .hd .hd-j.hd-hold { transform: rotate(var(--hd-hold)); }
  .hd .hd-j.hd-lift { transform: rotate(var(--hd-lift)); }
}
`;
