"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useInView, useReducedMotion } from "motion/react";

export interface RumbleFlashProps {
  /** Words are shown one at a time, in order. */
  text: string;
  /** Seconds per word (roughly; longer words stay a little longer). */
  beat?: number;
  /** Chance (0–1) that a word slams in after a white flash frame. 0 = never. */
  flash?: number;
  /** Flash frame length, ms. Rounded to whole frames (at least one). */
  flashDuration?: number;
  flashColor?: string;
  /** Camera shake, 0–2. */
  rumble?: number;
  /** Glitch blocks, 0–1. */
  glitch?: number;
  /** Red/cyan split fringes on hits and glitches, 0–1. */
  chroma?: number;
  /** Size of the lettering and figures relative to the screen, 0.3–1.2. */
  size?: number;
  /** Lettering styles to pick from, one per word (never the same twice in a row when there's a choice). */
  styles?: Style[];
  /** Abstract scribbled figures between some words. */
  figures?: boolean;
  /** Frame rate. Drawings re-draw ("boil") at half of it. */
  fps?: number;
  loop?: boolean;
  delay?: number;
  /** Ink color. */
  color?: string;
  background?: string;
  trigger?: "load" | "inView";
  className?: string;
  style?: CSSProperties;
}

type Pt = [number, number];
export type Style = "dry" | "bubble" | "heavy" | "scrawl" | "nib" | "sketch" | "spray" | "drip";
const STYLES: Style[] = ["dry", "bubble", "heavy", "scrawl", "nib", "sketch", "spray", "drip"];
const FIGURES = 7;
// WCAG 2.3.1: never more than three flashes in any one second.
const MIN_FLASH_GAP = 1 / 3 + 0.01;

interface Shot {
  kind: "word" | "figure" | "gap";
  word: string;
  style: Style;
  vertical: boolean;
  figure: number;
  seed: number;
  start: number;
  dur: number;
  flash: boolean;
  /** Flash ends on one inverted frame (word in background color on white). */
  invert: boolean;
  /** Mid-shot smash zoom. */
  cut: boolean;
}

// ---------- randomness (only ever used inside effects) ----------

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function h1(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return h1(i) * (1 - u) + h1(i + 1) * u;
}

// ---------- single-stroke letters (units: x 0..w, y 0 top .. 6 bottom) ----------

const RING = "2,0 3.4,0.6 4,2 4,4 3.4,5.4 2,6 0.6,5.4 0,4 0,2 0.6,0.6 2,0";
const BOWL_P = "0,6 0,0 2.8,0 3.8,0.8 3.8,2.4 2.8,3.2 0,3.2";
const GLYPHS: Record<string, [number, string]> = {
  A: [4, "0,6 2,0 4,6|0.8,3.9 3.2,3.9"],
  B: [3.6, "0,0 0,6|0,0 2.6,0 3.4,0.7 3.4,2.2 2.6,3 0,3|2.6,3 3.6,3.7 3.6,5.3 2.8,6 0,6"],
  C: [4, "3.8,0.8 2.8,0 1.2,0 0.2,1 0,3 0.2,5 1.2,6 2.8,6 3.8,5.2"],
  D: [4, "0,0 0,6|0,0 2,0 3.4,0.8 4,3 3.4,5.2 2,6 0,6"],
  E: [3.6, "3.6,0 0,0 0,6 3.6,6|0,3 2.8,3"],
  F: [3.6, "3.6,0 0,0 0,6|0,3 2.8,3"],
  G: [4, "3.8,0.8 2.8,0 1.2,0 0.2,1 0,3 0.2,5 1.2,6 2.8,6 4,5 4,3.4 2.2,3.4"],
  H: [4, "0,0 0,6|4,0 4,6|0,3 4,3"],
  I: [0, "0,0 0,6"],
  J: [3, "3,0 3,4.6 2.4,5.8 1.2,6 0.2,5.2"],
  K: [3.8, "0,0 0,6|3.8,0 0,3.6|1.4,2.4 3.8,6"],
  L: [3.4, "0,0 0,6 3.4,6"],
  M: [5, "0,6 0,0 2.5,4 5,0 5,6"],
  N: [4, "0,6 0,0 4,6 4,0"],
  O: [4, RING],
  P: [3.8, BOWL_P],
  Q: [4, `${RING}|2.4,4.4 4.2,6.4`],
  R: [3.9, `${BOWL_P}|1.8,3.2 3.9,6`],
  S: [3.8, "3.8,0.8 2.8,0 1.2,0 0.2,0.8 0.2,2.2 1.2,2.9 2.8,3.1 3.8,3.8 3.8,5.2 2.8,6 1.2,6 0.1,5.2"],
  T: [4, "0,0 4,0|2,0 2,6"],
  U: [4, "0,0 0,4.4 0.6,5.6 2,6 3.4,5.6 4,4.4 4,0"],
  V: [4, "0,0 2,6 4,0"],
  W: [5, "0,0 1.2,6 2.5,2 3.8,6 5,0"],
  X: [4, "0,0 4,6|4,0 0,6"],
  Y: [4, "0,0 2,3|4,0 2,3 2,6"],
  Z: [4, "0,0 4,0 0,6 4,6"],
  "0": [3.2, "1.6,0 2.8,0.6 3.2,2 3.2,4 2.8,5.4 1.6,6 0.4,5.4 0,4 0,2 0.4,0.6 1.6,0"],
  "1": [2, "0,1.2 2,0 2,6"],
  "2": [4, "0.2,1 1.2,0 2.8,0 3.8,1 3.8,2.2 0,6 4,6"],
  "3": [3.9, "0.2,0.8 1.2,0 2.8,0 3.8,0.8 3.8,2.2 2.8,3 1.4,3|2.8,3 3.9,3.8 3.9,5.2 2.8,6 1.2,6 0.1,5.2"],
  "4": [4, "3,6 3,0 0,4.2 4,4.2"],
  "5": [3.8, "3.8,0 0.4,0 0.2,2.8 1.4,2.4 2.8,2.4 3.8,3.2 3.8,5.2 2.8,6 1.2,6 0.1,5.2"],
  "6": [3.9, "3.6,0.6 2.6,0 1.4,0 0.3,1 0,3.2 0.1,5 1.2,6 2.8,6 3.9,5 3.9,3.8 2.8,3 1.2,3 0.1,3.8"],
  "7": [4, "0,0 4,0 1.4,6"],
  "8": [4, "2,3 0.6,2.4 0.4,1 1.2,0 2.8,0 3.6,1 3.4,2.4 2,3 0.4,3.8 0.1,5.2 1.2,6 2.8,6 3.9,5.2 3.6,3.8 2,3"],
  "9": [3.9, "3.9,2.8 2.8,3.2 1.2,3.2 0.1,2.2 0.1,1 1.2,0 2.8,0 3.9,1 3.9,3.2 3.4,5.2 2.2,6 0.6,5.6"],
  "!": [0, "0,0 0,4|0,5.5 0,6"],
  "?": [3, "0,1 1,0 2,0 3,1 3,2 1.5,3.2 1.5,4.2|1.5,5.5 1.5,6"],
  ".": [0, "0,5.5 0,6"],
  ",": [0.5, "0.5,5.4 0,6.6"],
  "'": [0, "0,0 0,1.4"],
  "-": [2.4, "0,3.2 2.4,3.2"],
  ":": [0, "0,1.6 0,2.1|0,5.4 0,5.9"],
  "/": [3, "3,0 0,6"],
};
const parsed = new Map<string, Pt[][]>();
function glyph(ch: string): Pt[][] | null {
  const g = GLYPHS[ch];
  if (!g) return null;
  let p = parsed.get(ch);
  if (!p) {
    p = g[1].split("|").map((s) => s.split(" ").map((xy) => xy.split(",").map(Number) as Pt));
    parsed.set(ch, p);
  }
  return p;
}

// Split a polyline at sharp corners: hand-letterers lift the brush there.
function splitCorners(pts: Pt[], maxTurn = 0.9): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    cur.push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      const b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(b - a);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > maxTurn) {
        out.push(cur);
        cur = [pts[i]];
      }
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

// ---------- dry brush ----------

interface BrushOpts {
  /** 0 = fully inked, 1 = very dry and streaky. */
  dry: number;
  /** Solid stroke under the bristles. */
  core?: number;
  /** Sideways hand wobble, in brush widths. */
  wobble?: number;
  /** Extend both ends by half the width (square, blocky ends). */
  extend?: boolean;
}

/** Draws one brush stroke along `pts` and returns its (wobbled) centre line. */
function brush(ctx: CanvasRenderingContext2D, input: Pt[], width: number, seed: number, o: BrushOpts): Pt[] {
  let pts = input;
  if (o.extend && pts.length > 1) {
    const ext = (a: Pt, b: Pt): Pt => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const l = Math.hypot(dx, dy) || 1;
      return [a[0] + (dx / l) * width * 0.45, a[1] + (dy / l) * width * 0.45];
    };
    pts = [ext(pts[0], pts[1]), ...pts.slice(1, -1), ext(pts[pts.length - 1], pts[pts.length - 2])];
    if (input.length === 2) pts = [pts[0], pts[pts.length - 1]];
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  if (total < 0.5) return pts;
  const n = Math.max(2, Math.ceil(total / Math.max(1, width / 5)));
  const wob = (o.wobble ?? 0.25) * width;
  const cx: number[] = [];
  const cy: number[] = [];
  const nx: number[] = [];
  const ny: number[] = [];
  const ws: number[] = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * total;
    while (j < pts.length - 2 && cum[j + 1] < d) j++;
    const segLen = cum[j + 1] - cum[j] || 1;
    const f = (d - cum[j]) / segLen;
    const tx = (pts[j + 1][0] - pts[j][0]) / segLen;
    const ty = (pts[j + 1][1] - pts[j][1]) / segLen;
    const off = (noise1(d / (width * 4) + seed) - 0.5) * 2 * wob;
    nx.push(-ty);
    ny.push(tx);
    cx.push(pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f - ty * off);
    cy.push(pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f + tx * off);
    const t = k / n;
    // Pressure: lands heavy, lifts a little at the end.
    ws.push(width * (0.82 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.3)) - 0.12 * t));
  }

  if (o.core) {
    ctx.lineWidth = width * o.core;
    ctx.lineCap = o.extend ? "butt" : "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx[0], cy[0]);
    for (let k = 1; k <= n; k++) ctx.lineTo(cx[k], cy[k]);
    ctx.stroke();
  }

  const B = Math.max(6, Math.min(40, Math.round(width / 1.4)));
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  for (let b = 0; b < B; b++) {
    const r = h1(seed * 3.1 + b * 7.7);
    const off = (b + 0.5) / B - 0.5 + (r - 0.5) * (0.6 / B);
    const freq = 1 / (width * (1.5 + 2.5 * r));
    const edge = Math.abs(off) * 2;
    ctx.lineWidth = (width / B) * (0.8 + 1.1 * h1(seed + b * 1.3));
    ctx.beginPath();
    let down = false;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const d = (k / n) * total;
      // Sharpened noise: long inked streaks with clean gaps between them.
      const ink = Math.min(1, Math.max(0, (noise1(d * freq + b * 13.7 + seed) - 0.5) * 2.2 + 0.5));
      const thresh = o.dry * (0.3 + 0.55 * t + 0.5 * edge * edge) - 0.08;
      const x = cx[k] + nx[k] * off * ws[k];
      const y = cy[k] + ny[k] * off * ws[k];
      if (ink > thresh) {
        if (!down) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        down = true;
      } else down = false;
    }
    ctx.stroke();
  }
  return cx.map((x, k) => [x, cy[k]] as Pt);
}

/** Cut `len` px off both ends of a polyline. */
function trim(pts: Pt[], len: number): Pt[] {
  const cutStart = (p: Pt[]) => {
    let left = len;
    for (let i = 1; i < p.length; i++) {
      const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d >= left) {
        const f = left / (d || 1);
        return [[p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f] as Pt, ...p.slice(i)];
      }
      left -= d;
    }
    return [];
  };
  return cutStart(cutStart(pts).reverse()).reverse();
}

function brushPath(ctx: CanvasRenderingContext2D, pts: Pt[], width: number, seed: number, o: BrushOpts) {
  splitCorners(pts).forEach((s, i) => brush(ctx, s, width, seed + i * 17.3, o));
}

/** Evenly spaced points along a polyline, wobbled sideways by noise. */
function resample(pts: Pt[], step: number, wob: number, seed: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / step));
    const nx = -(by - ay) / (len || 1);
    const ny = (bx - ax) / (len || 1);
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const f = k / n;
      const off = (noise1((out.length * step) / (step * 25) + seed) - 0.5) * 2 * wob;
      out.push([ax + (bx - ax) * f + nx * off, ay + (by - ay) * f + ny * off]);
    }
  }
  return out;
}

/** Broad-nib calligraphy: a flat pen held at a fixed angle, thick and thin. */
function nib(ctx: CanvasRenderingContext2D, pts: Pt[], width: number, angle: number, seed: number) {
  const s = resample(pts, Math.max(1, width / 8), width * 0.08, seed);
  if (s.length < 2) return;
  for (let k = 1; k < s.length; k++) {
    const t = k / (s.length - 1);
    const pw = (width / 2) * (0.75 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.2)));
    const nx = Math.cos(angle) * pw;
    const ny = Math.sin(angle) * pw;
    const [ax, ay] = s[k - 1];
    const [bx, by] = s[k];
    ctx.beginPath();
    ctx.moveTo(ax + nx, ay + ny);
    ctx.lineTo(bx + nx, by + ny);
    ctx.lineTo(bx - nx, by - ny);
    ctx.lineTo(ax - nx, ay - ny);
    ctx.closePath();
    ctx.fill();
  }
  // Ink runs dry in streaks toward the end of the stroke.
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = Math.max(1, width * 0.045);
  ctx.lineCap = "butt";
  for (let b = 0; b < 7; b++) {
    const off = (h1(seed + b * 3.1) - 0.5) * 0.9 * (width / 2);
    const ox = Math.cos(angle) * off;
    const oy = Math.sin(angle) * off;
    ctx.beginPath();
    let down = false;
    s.forEach(([x, y], k) => {
      const t = k / (s.length - 1);
      const gap = noise1(k * 0.12 + b * 9.1 + seed) < -0.15 + t * 0.9;
      if (gap) {
        if (!down) ctx.moveTo(x + ox, y + oy);
        else ctx.lineTo(x + ox, y + oy);
        down = true;
      } else down = false;
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** Pencil sketch: a few loose overshooting passes plus hatched shading. */
function sketch(ctx: CanvasRenderingContext2D, pts: Pt[], U: number, seed: number, rng: () => number) {
  for (let pass = 0; pass < 3; pass++) {
    const jit = pts.map(([x, y]) => [x + (rng() - 0.5) * U * 0.35, y + (rng() - 0.5) * U * 0.35] as Pt);
    const ext = (a: Pt, b: Pt): Pt => {
      const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      const o = U * (0.15 + rng() * 0.6);
      return [a[0] + ((a[0] - b[0]) / l) * o, a[1] + ((a[1] - b[1]) / l) * o];
    };
    if (jit.length > 1) {
      jit[0] = ext(jit[0], jit[1]);
      jit[jit.length - 1] = ext(jit[jit.length - 1], jit[jit.length - 2]);
    }
    brushPath(ctx, jit, U * (pass ? 0.12 : 0.2), seed + pass * 5.1, { dry: 0.3, wobble: 0.9 });
  }
  // Hatched drop shadow down-right of the stroke.
  const s = resample(pts, U * 0.42, 0, seed);
  ctx.lineWidth = Math.max(1, U * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  s.forEach(([x, y]) => {
    const x0 = x + U * 0.45 + (rng() - 0.5) * U * 0.15;
    const y0 = y + U * 0.5 + (rng() - 0.5) * U * 0.15;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + U * 0.45, y0 - U * 0.6);
  });
  ctx.stroke();
}

function drip(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x - w * 0.2, y + len * 0.5, x - w * 0.3, y + len);
  ctx.arc(x, y + len, w * 0.5, Math.PI, 0, true);
  ctx.quadraticCurveTo(x + w * 0.2, y + len * 0.5, x + w / 2, y);
  ctx.closePath();
  ctx.fill();
}

/** Paint drips hanging from flat parts of a stroke and from its lowest end. */
function drips(ctx: CanvasRenderingContext2D, pts: Pt[], w: number, U: number, rng: () => number, chance: number) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    if (Math.abs(by - ay) < Math.abs(bx - ax) * 0.6 && rng() < chance) {
      const t = 0.15 + rng() * 0.7;
      drip(ctx, ax + (bx - ax) * t, ay + (by - ay) * t + w * 0.4, U * (0.8 + rng() * 4.5 * rng()), w * (0.45 + rng() * 0.55));
    }
  }
  const a = pts[0];
  const b = pts[pts.length - 1];
  const low = a[1] > b[1] ? a : b;
  if (rng() < chance) drip(ctx, low[0], low[1], U * (0.6 + rng() * rng() * 4), w * 0.8);
}

/** Spray paint: crisp core, soft overspray dots, runs. */
function spray(ctx: CanvasRenderingContext2D, pts: Pt[], U: number, seed: number, rng: () => number) {
  const s = resample(pts, U * 0.1, U * 0.05, seed);
  ctx.save();
  // Soft haze: wide faint passes, narrower and stronger toward the core.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [w, a] of [[2.4, 0.07], [1.7, 0.1], [1.15, 0.16]]) {
    ctx.globalAlpha = a;
    ctx.lineWidth = U * w;
    ctx.beginPath();
    s.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  // Overspray speckle.
  ctx.globalAlpha = 0.85;
  s.forEach(([x, y]) => {
    for (let i = 0; i < 16; i++) {
      const g = (rng() + rng() + rng() - 1.5) / 1.5;
      const r = U * 1.3 * g;
      const a = rng() * Math.PI * 2;
      const d = Math.max(1, U * (0.025 + 0.07 * rng() * rng()));
      ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, d, d);
    }
  });
  ctx.restore();
  brushPath(ctx, pts, U * 0.62, seed, { dry: 0.04, core: 0.75, wobble: 0.08 });
  drips(ctx, pts, U * 0.2, U, rng, 0.7);
}

/** Ink splat: lumpy blob, satellite drops and flung streaks. */
function splat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rng: () => number) {
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.55 + rng() * 0.6);
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
  const drops = 8 + Math.floor(rng() * 10);
  for (let i = 0; i < drops; i++) {
    const a = rng() * Math.PI * 2;
    const d = r * (1.2 + rng() * rng() * 4);
    const sz = r * (0.05 + rng() * 0.22);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, sz, 0, Math.PI * 2);
    ctx.fill();
    if (rng() < 0.35) {
      ctx.lineWidth = sz * 0.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
      ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      ctx.stroke();
    }
  }
}

// ---------- plates (one drawing of a shot) ----------

interface Placed {
  ch: string;
  cx: number;
  cy: number;
  sc: number;
  rot: number;
}

function layout(shot: Shot, W: number, H: number, measure: (ch: string) => number) {
  const rng = mulberry32(shot.seed);
  const chars = [...shot.word.toUpperCase()].filter((c) => c.trim());
  const width = (c: string) => (glyph(c) ? GLYPHS[c][0] : measure(c));
  const gap = { dry: 1.4, bubble: 2.6, heavy: 2, scrawl: 1.2, nib: 1.5, sketch: 1.6, spray: 2.1, drip: 2 }[shot.style];
  const pad = { dry: 1, bubble: 2.6, heavy: 1.8, scrawl: 0.8, nib: 1.4, sketch: 1.4, spray: 2, drip: 1.8 }[shot.style];
  const rotAmt = { dry: 0.14, bubble: 0.32, heavy: 0.09, scrawl: 0.1, nib: 0.06, sketch: 0.16, spray: 0.12, drip: 0.08 }[shot.style];
  const placed: Placed[] = [];
  let U: number;
  if (shot.vertical) {
    const maxW = Math.max(...chars.map(width)) + pad;
    U = Math.min((H * 0.88) / (chars.length * 6 + (chars.length - 1) * 1.4 + pad), (W * 0.55) / maxW);
    const step = (6 + 1.4) * U;
    const y0 = H / 2 - ((chars.length - 1) * step) / 2;
    chars.forEach((ch, i) => {
      placed.push({
        ch,
        cx: W / 2 + (rng() - 0.5) * 1.6 * U,
        cy: y0 + i * step + (rng() - 0.5) * 0.6 * U,
        sc: 0.95 + rng() * 0.15,
        rot: (rng() - 0.5) * rotAmt,
      });
    });
    return { placed, U };
  }
  // One row or two, whichever lets the letters be bigger.
  const rowH = 6 + pad + 1.5;
  const fit = (rows: string[][]) => {
    const rowW = rows.map((r) => r.reduce((s, c) => s + width(c), 0) + gap * (r.length - 1) + pad);
    const U = Math.min((W * 0.82) / Math.max(...rowW), (H * (rows.length > 1 ? 0.8 : 0.58)) / (rowH * rows.length));
    return { rows, rowW, U };
  };
  const half = Math.ceil(chars.length / 2);
  const one = fit([chars]);
  const two = chars.length >= 4 ? fit([chars.slice(0, half), chars.slice(half)]) : one;
  const { rows, rowW } = two.U > one.U * 1.15 ? two : one;
  U = (two.U > one.U * 1.15 ? two : one).U;
  rows.forEach((row, ri) => {
    let x = W / 2 - ((rowW[ri] - pad) * U) / 2;
    const cy = H / 2 + (ri - (rows.length - 1) / 2) * rowH * U;
    row.forEach((ch) => {
      const w = width(ch);
      placed.push({
        ch,
        cx: x + (w * U) / 2,
        cy: cy + (rng() - 0.5) * 1.1 * U,
        sc: 0.88 + rng() * 0.24,
        rot: (rng() - 0.5) * rotAmt,
      });
      x += (w + gap) * U;
    });
  });
  return { placed, U };
}

function drawWord(ctx: CanvasRenderingContext2D, shot: Shot, variant: number, W: number, H: number, font: string) {
  const measure = (ch: string) => {
    ctx.font = `900 100px ${font}`;
    return (ctx.measureText(ch).width / 100) * 6.6;
  };
  const { placed, U } = layout(shot, W, H, measure);
  const vr = mulberry32(shot.seed + variant * 1013);
  placed.forEach((p, li) => {
    const strokes = glyph(p.ch);
    const s = U * p.sc;
    const rot = p.rot + (vr() - 0.5) * 0.03;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const skew = shot.style === "scrawl" ? 0.28 : shot.style === "nib" ? 0.2 : 0;
    const w = strokes ? GLYPHS[p.ch][0] : 0;
    const map = ([gx, gy]: Pt): Pt => {
      const lx = (gx - w / 2 + (6 - gy - 3) * skew) * s;
      const ly = (gy - 3) * s;
      return [p.cx + lx * cos - ly * sin, p.cy + lx * sin + ly * cos];
    };
    const seed = shot.seed * 0.001 + li * 31.7 + variant * 5.3;
    if (!strokes) {
      // No hand-drawn glyph: use the CSS font, roughened later.
      ctx.save();
      ctx.translate(p.cx, p.cy);
      ctx.rotate(rot);
      ctx.font = `900 ${6.6 * s}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (shot.style === "bubble") {
        ctx.lineWidth = s * 0.5;
        ctx.lineJoin = "miter";
        ctx.strokeText(p.ch, 0, 0);
      } else ctx.fillText(p.ch, 0, 0);
      ctx.restore();
      return;
    }
    const paths = strokes.map((st) => st.map(map));
    if (shot.style === "dry") {
      paths.forEach((pts, i) => brushPath(ctx, pts, U * 0.78, seed + i * 3.3, { dry: 0.6, core: 0.18, wobble: 0.3 }));
    } else if (shot.style === "heavy") {
      paths.forEach((pts, i) => brushPath(ctx, pts, U * 1.2, seed + i * 3.3, { dry: 0.3, core: 0.55, wobble: 0.2 }));
    } else if (shot.style === "nib") {
      paths.forEach((pts, i) => splitCorners(pts, 1.5).forEach((seg, k) => nib(ctx, seg, U * 1.15, -0.8, seed + i * 3.3 + k)));
    } else if (shot.style === "sketch") {
      paths.forEach((pts, i) => sketch(ctx, pts, U, seed + i * 3.3, vr));
    } else if (shot.style === "spray") {
      const dr = mulberry32(shot.seed + li * 97);
      paths.forEach((pts, i) => spray(ctx, pts, U, seed + i * 3.3, dr));
    } else if (shot.style === "drip") {
      const dr = mulberry32(shot.seed + li * 97);
      paths.forEach((pts, i) => {
        brushPath(ctx, pts, U * 1.1, seed + i * 3.3, { dry: 0.25, core: 0.6, wobble: 0.15 });
        drips(ctx, pts, U * 0.38, U, dr, 0.85);
      });
    } else if (shot.style === "scrawl") {
      paths.forEach((pts, i) => {
        brushPath(ctx, pts, U * 0.3, seed + i * 3.3, { dry: 0.15, wobble: 0.6 });
        if (vr() < 0.6) {
          const o = U * 0.22;
          brushPath(ctx, pts.map(([x, y]) => [x + o, y - o * 0.5] as Pt), U * 0.2, seed + i * 9.1, { dry: 0.5, wobble: 0.8 });
        }
      });
    } else {
      // Bubble: thick blocky stroke, hollowed out, a few dry streaks inside.
      const outer = U * 1.9;
      const border = U * 0.42;
      const inner = outer - border * 2;
      const centres: Pt[][] = [];
      paths.forEach((pts, i) =>
        splitCorners(pts).forEach((seg, k) =>
          centres.push(brush(ctx, seg, outer, seed + i * 3.3 + k * 1.7, { dry: 0.1, core: 0.85, wobble: 0.1, extend: true })),
        ),
      );
      // Hollow out with square-ended cuts, stopping `border` short of each
      // stroke end, so the outline stays blocky and closed.
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = inner;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      centres.forEach((c) => {
        const cut = trim(c, border);
        if (cut.length < 2) return;
        ctx.beginPath();
        cut.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
      ctx.restore();
      centres.forEach((c, k) => {
        if (vr() < 0.3) brush(ctx, trim(c, border), inner * 0.7, seed + k * 5.9 + 40, { dry: 0.9, wobble: 0.1 });
      });
    }
  });

  // Calligraphy gets a swash underline now and then.
  const sr = mulberry32(shot.seed ^ 0x5a5a);
  if (shot.style === "nib" && placed.length && sr() < 0.65) {
    const x0 = Math.min(...placed.map((p) => p.cx)) - U * 2;
    const x1 = Math.max(...placed.map((p) => p.cx)) + U * 2.5;
    const yb = Math.max(...placed.map((p) => p.cy)) + U * 3.8;
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([x0 + (x1 - x0) * t, yb + Math.sin(t * Math.PI * 1.6 + 0.4) * U * 0.9 - t * U * 1.2]);
    }
    nib(ctx, pts, U * 0.8, -0.8, shot.seed * 0.003);
  }
}

/** Ink splats around the drawing (same in every boil variant). */
function splats(ctx: CanvasRenderingContext2D, shot: Shot, W: number, H: number) {
  const rng = mulberry32(shot.seed ^ 0x1234);
  if (rng() > 0.45) return;
  const n = 1 + Math.floor(rng() * 3);
  const m = Math.min(W, H);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    splat(ctx, W / 2 + Math.cos(a) * W * (0.3 + rng() * 0.15), H / 2 + Math.sin(a) * H * (0.3 + rng() * 0.12), m * (0.02 + rng() * 0.04), rng);
  }
}

function drawFigure(ctx: CanvasRenderingContext2D, shot: Shot, variant: number, W: number, H: number) {
  const rng = mulberry32(shot.seed);
  const vr = mulberry32(shot.seed + variant * 1013);
  const cx = W / 2 + (rng() - 0.5) * W * 0.15;
  const cy = H / 2 + (rng() - 0.5) * H * 0.1;
  const R = Math.min(W, H) * (0.28 + rng() * 0.08);
  const seed = shot.seed * 0.001 + variant * 7.1;
  const j = () => (vr() - 0.5) * R * 0.04;
  const circle = (r: number, turns: number, from = 0, wobble = 0.12): Pt[] => {
    const pts: Pt[] = [];
    const n = Math.ceil(48 * turns);
    for (let i = 0; i <= n; i++) {
      const a = from + (i / n) * turns * Math.PI * 2;
      const rr = r * (1 + (noise1(i * 0.15 + seed + rng()) - 0.5) * wobble);
      pts.push([cx + Math.cos(a) * rr + j(), cy + Math.sin(a) * rr * 0.92 + j()]);
    }
    return pts;
  };
  const line = (a: Pt, b: Pt, w: number, s: number, dry = 0.4) => brush(ctx, [a, b], w, s, { dry, core: 0.3 });
  switch (shot.figure % FIGURES) {
    case 0: // scribbled ring
      brush(ctx, circle(R, 2.4, rng() * 6, 0.25), R * 0.08, seed, { dry: 0.45, wobble: 0.5 });
      break;
    case 1: {
      // eye
      const up: Pt[] = [];
      const lo: Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = cx + (t - 0.5) * 2.2 * R;
        const y = Math.sin(Math.PI * t) * R * 0.62;
        up.push([x + j(), cy - y + j()]);
        lo.push([x + j(), cy + y * 0.8 + j()]);
      }
      brush(ctx, up, R * 0.09, seed, { dry: 0.4 });
      brush(ctx, lo, R * 0.09, seed + 3, { dry: 0.4 });
      brush(ctx, circle(R * 0.22, 3.5, 0, 0.3).map(([x, y]) => [cx + (x - cx) * (0.4 + 0.6 * vr()), y] as Pt), R * 0.16, seed + 5, { dry: 0.2, core: 0.7 });
      for (let i = 0; i < 7; i++) {
        const t = 0.15 + (i / 6) * 0.7;
        const x = cx + (t - 0.5) * 2.2 * R;
        const y = cy - Math.sin(Math.PI * t) * R * 0.62;
        line([x, y], [x + (t - 0.5) * R * 0.5, y - R * 0.35], R * 0.04, seed + 9 + i, 0.3);
      }
      break;
    }
    case 2: // big X
      line([cx - R, cy - R], [cx + R, cy + R], R * 0.24, seed, 0.35);
      line([cx + R, cy - R * 0.9], [cx - R * 0.9, cy + R], R * 0.24, seed + 4, 0.35);
      break;
    case 3: {
      // lightning zigzag
      const pts: Pt[] = [];
      for (let i = 0; i <= 6; i++) pts.push([cx + (i % 2 ? 0.45 : -0.45) * R + j() * 4, cy - R * 1.2 + (i / 6) * R * 2.4]);
      brushPath(ctx, pts, R * 0.16, seed, { dry: 0.35, core: 0.4 });
      break;
    }
    case 4: {
      // spiral
      const pts: Pt[] = [];
      for (let i = 0; i <= 160; i++) {
        const t = i / 160;
        const a = t * Math.PI * 2 * 3.4;
        pts.push([cx + Math.cos(a) * R * t + j(), cy + Math.sin(a) * R * t + j()]);
      }
      brush(ctx, pts, R * 0.07, seed, { dry: 0.35, wobble: 0.4 });
      break;
    }
    case 5: // burst
      brush(ctx, circle(R * 0.3, 1.1, 0, 0.2), R * 0.1, seed, { dry: 0.3, core: 0.5 });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + vr() * 0.15;
        const r1 = R * 0.48;
        const r2 = R * (0.8 + rng() * 0.45);
        line([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(a) * r2, cy + Math.sin(a) * r2], R * 0.07, seed + i, 0.5);
      }
      break;
    default: {
      // nested boxes
      for (let k = 0; k < 3; k++) {
        const r = R * (1 - k * 0.3);
        const a = (rng() - 0.5) * 0.4;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const pts: Pt[] = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1.15]].map(([x, y]) => [cx + (x * c - y * s) * r + j(), cy + (x * s + y * c) * r + j()] as Pt);
        brushPath(ctx, pts, R * 0.08, seed + k * 7, { dry: 0.5, extend: true });
      }
    }
  }
}

/** Ragged, hand-cut edges: shift thin rows sideways by noise. */
function roughen(src: HTMLCanvasElement, seed: number, dpr: number) {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  const h = Math.max(2, Math.round(2 * dpr));
  const amp = Math.max(1, Math.min(src.width, src.height) * 0.0035);
  for (let y = 0; y < src.height; y += h) {
    const dx = (noise1(y / (10 * dpr) + seed) - 0.5) * 2 * amp + (h1(y + seed) - 0.5) * amp;
    ctx.drawImage(src, 0, y, src.width, h, dx, y, src.width, h);
  }
  return out;
}

/** The plate's shape filled with one flat color. */
function tint(src: HTMLCanvasElement, col: string) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function makePlate(shot: Shot, variant: number, W: number, H: number, ink: string, font: string, dpr: number, size: number) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  // Scale the whole drawing about the centre.
  ctx.translate(W / 2, H / 2);
  ctx.scale(size, size);
  ctx.translate(-W / 2, -H / 2);
  if (shot.kind === "word") drawWord(ctx, shot, variant, W, H, font);
  else if (shot.kind === "figure") drawFigure(ctx, shot, variant, W, H);
  if (shot.kind !== "gap") splats(ctx, shot, W, H);
  return roughen(c, shot.seed * 0.01 + variant * 3.7, dpr);
}

// ---------- timeline ----------

function schedule(words: string[], seed: number, o: { beat: number; flash: number; figures: boolean; loop: boolean; tall: boolean; styles: Style[] }) {
  const rng = mulberry32(seed);
  const shots: Shot[] = [];
  let t = 0;
  let lastFlash = -10;
  let lastStyle: Style | null = null;
  const push = (s: Omit<Shot, "start" | "flash" | "seed" | "invert" | "cut">, flashChance: number) => {
    const flash = o.flash > 0 && rng() < flashChance && t - lastFlash >= MIN_FLASH_GAP;
    if (flash) lastFlash = t;
    const invert = flash && rng() < 0.6;
    const cut = s.kind === "word" && s.dur > 0.22 && rng() < 0.55;
    shots.push({ ...s, start: t, flash, invert, cut, seed: Math.floor(rng() * 1e9) });
    t += s.dur;
  };
  words.forEach((word, i) => {
    if (o.figures && i > 0 && rng() < 0.35) {
      push({ kind: "figure", word: "", style: "dry", vertical: false, figure: Math.floor(rng() * FIGURES), dur: Math.max(0.1, o.beat * 0.45) }, o.flash * 0.7);
    }
    const choices = o.styles.length > 1 ? o.styles.filter((s) => s !== lastStyle) : o.styles;
    const style = choices[Math.floor(rng() * choices.length)];
    lastStyle = style;
    const len = [...word].length;
    push(
      {
        kind: "word",
        word,
        style,
        vertical: o.tall && style === "bubble" && len <= 4 && len > 1 && rng() < 0.7,
        figure: 0,
        dur: o.beat * (0.8 + 0.06 * Math.min(len, 8)) * (0.8 + 0.4 * rng()),
      },
      i === 0 ? 1 : o.flash,
    );
  });
  if (o.loop) push({ kind: "gap", word: "", style: "dry", vertical: false, figure: 0, dur: Math.max(MIN_FLASH_GAP, o.beat * 0.8) }, 0);
  return { shots, total: t };
}

// ---------- component ----------

export function RumbleFlash({
  text,
  beat = 0.32,
  flash = 0.8,
  flashDuration = 50,
  flashColor = "#ffffff",
  rumble = 1,
  glitch = 0.6,
  chroma = 0.7,
  size = 0.65,
  styles = STYLES,
  figures = true,
  fps = 24,
  loop = true,
  delay = 0.2,
  color = "#ffffff",
  background = "#000000",
  trigger = "load",
  className,
  style,
}: RumbleFlashProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.3 });
  const started = trigger === "load" || inView;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const words = text.split(/\s+/).filter(Boolean);
    // Stack short words vertically only in tall boxes.
    const opts = { beat: Math.max(0.12, beat), flash: Math.min(1, Math.max(0, flash)), figures, loop, tall: root.clientHeight > root.clientWidth * 0.9, styles: styles.length ? styles : STYLES };
    const base = hashStr(text);

    let W = 1;
    let H = 1;
    let dpr = 1;
    let font = "sans-serif";
    let lastFrame = -1;
    let shot: Shot | null = null;
    interface Plate {
      ink: HTMLCanvasElement;
      red?: HTMLCanvasElement;
      cyan?: HTMLCanvasElement;
      inv?: HTMLCanvasElement;
    }
    let plates: Plate[] = [];
    // Film grain tiles, picked at random each frame.
    const grain = [0, 1, 2].map(() => {
      const g = document.createElement("canvas");
      g.width = g.height = 160;
      const gc = g.getContext("2d")!;
      gc.fillStyle = color;
      for (let i = 0; i < 900; i++) gc.fillRect(Math.random() * 160, Math.random() * 160, 1 + Math.random(), 1 + Math.random());
      return ctx.createPattern(g, "repeat");
    });
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(root.clientWidth * dpr));
      H = Math.max(1, Math.round(root.clientHeight * dpr));
      canvas.width = W;
      canvas.height = H;
      // Fallback letters (no hand-drawn glyph) use the CSS font family, heavy.
      font = getComputedStyle(root).fontFamily || "sans-serif";
      shot = null;
      lastFrame = -1;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    const onFonts = () => {
      shot = null;
      lastFrame = -1;
    };
    document.fonts?.addEventListener("loadingdone", onFonts);

    let loopIdx = 0;
    let loopStart = 0;
    let sched = schedule(words, base, opts);
    const t0 = performance.now();
    let raf = 0;

    const clear = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = (now - t0) / 1000 - delay;
      const frame = Math.floor(t * fps);
      if (frame === lastFrame) return;
      lastFrame = frame;
      if (!started || t < 0 || !words.length) return clear();

      while (loop && t - loopStart >= sched.total) {
        loopStart += sched.total;
        loopIdx++;
        sched = schedule(words, base + loopIdx * 7919, opts);
      }
      let local = t - loopStart;
      let cur = sched.shots.find((s) => local >= s.start && local < s.start + s.dur);
      let held = false;
      if (!cur) {
        // Not looping: hold the last word, still boiling and rumbling softly.
        cur = [...sched.shots].reverse().find((s) => s.kind === "word")!;
        local = cur.start + cur.dur + (t - loopStart - sched.total);
        held = true;
      }
      if (cur !== shot) {
        shot = cur;
        plates = [];
      }
      const ts = local - cur.start;
      const flashFrames = Math.max(1, Math.round((flashDuration / 1000) * fps));
      const lf = Math.floor(ts * fps + 1e-6);
      const minD = Math.min(W, H);
      const getPlate = (v: number) => (plates[v] ??= { ink: makePlate(cur, v, W, H, color, font, dpr, size) });
      if (cur.flash && !held && lf < flashFrames) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, W, H);
        return;
      }
      // Still inside the same flash: one inverted frame, the word cut out of the white.
      if (cur.flash && cur.invert && !held && lf === flashFrames && cur.kind !== "gap") {
        const p = getPlate(0);
        p.inv ??= tint(p.ink, background);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.setTransform(1.2, 0, 0, 1.2, W / 2, H / 2);
        ctx.drawImage(p.inv, -W / 2, -H / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        return;
      }
      clear();
      const glitchy = glitch > 0 && cur.kind !== "gap" && Math.random() < glitch * 0.6;
      if (cur.kind !== "gap") {
        const flashLen = cur.flash ? (flashFrames + (cur.invert ? 1 : 0)) / fps : 0;
        let ti = Math.max(0, ts - flashLen);
        // Smash zoom: partway through, the word jumps closer with a fresh hit.
        const cutAt = (cur.dur - flashLen) * 0.55;
        const zoomed = cur.cut && !held && ti >= cutAt;
        if (zoomed) ti -= cutAt;
        const variant = Math.floor((ti * fps) / 2) % 3;
        const plate = getPlate(variant);
        const hit = Math.exp(-ti * 8);
        const A = rumble * minD * (0.05 * hit + 0.005);
        const dx = (Math.random() * 2 - 1) * A;
        const dy = (Math.random() * 2 - 1) * A;
        const tilt = zoomed ? ((cur.seed % 7) - 3) * 0.02 : 0;
        const rot = tilt + (Math.random() * 2 - 1) * 0.03 * rumble * Math.exp(-ti * 5);
        const sc = (zoomed ? 1.12 : 1) * (1 + 0.2 * Math.exp(-ti * 14) * Math.min(1, rumble + 0.3));
        const place = (img: HTMLCanvasElement, ox: number, oy: number) => {
          ctx.setTransform(sc, 0, 0, sc, W / 2 + ox, H / 2 + oy);
          ctx.rotate(rot);
          ctx.drawImage(img, -W / 2, -H / 2);
        };
        // Speed lines bursting out from behind the word on the hit.
        if (ti < 2 / fps && rumble > 0) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.45;
          ctx.lineCap = "round";
          for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2;
            const r0 = minD * (0.32 + Math.random() * 0.2);
            const r1 = r0 + minD * (0.15 + Math.random() * 0.5);
            ctx.lineWidth = Math.max(1, minD * Math.random() * 0.008);
            ctx.beginPath();
            ctx.moveTo(W / 2 + Math.cos(a) * r0 * 1.4, H / 2 + Math.sin(a) * r0);
            ctx.lineTo(W / 2 + Math.cos(a) * r1 * 1.4, H / 2 + Math.sin(a) * r1);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        // Red/cyan split fringes while it's shaking hard or glitching.
        const split = chroma * (ti < 0.18 ? 1 - ti / 0.18 : glitchy ? 0.6 : 0);
        if (split > 0.02) {
          plate.red ??= tint(plate.ink, "#ff1744");
          plate.cyan ??= tint(plate.ink, "#00e5ff");
          const o = minD * 0.018 * split + A;
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = Math.min(1, 0.4 + split);
          place(plate.red, dx - o, dy);
          place(plate.cyan, dx + o, dy + o * 0.3);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        } else if (rumble > 0 && ti < 0.2) {
          ctx.globalAlpha = 0.3 * (1 - ti / 0.2);
          place(plate.ink, dx * -2.5, dy * -2.5);
          ctx.globalAlpha = 1;
        }
        place(plate.ink, dx, dy);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // Glitch: shifted slices and stray pixel blocks.
      if (glitchy) {
        const k = 2 + Math.floor(Math.random() * 7 * glitch);
        for (let i = 0; i < k; i++) {
          const w = W * (0.04 + Math.random() * 0.25);
          const h = H * (0.006 + Math.random() * 0.05);
          const x = Math.random() * (W - w);
          const y = Math.random() * (H - h);
          ctx.drawImage(canvas, x, y, w, h, x + (Math.random() - 0.5) * W * 0.08, y + (Math.random() - 0.5) * h, w, h);
        }
        for (let i = 0; i < k; i++) {
          const s = minD * (0.008 + Math.random() * 0.025);
          ctx.fillStyle = Math.random() < 0.5 ? color : background;
          ctx.fillRect(W * (0.2 + Math.random() * 0.6), H * (0.15 + Math.random() * 0.7), s, s * (0.5 + Math.random()));
        }
      }
      // Film grain.
      const pat = grain[Math.floor(Math.random() * grain.length)];
      if (pat) {
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = pat;
        ctx.setTransform(dpr, 0, 0, dpr, Math.random() * 160, Math.random() * 160);
        ctx.fillRect(-160, -160, W / dpr + 320, H / dpr + 320);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
      }
      // Dust and scratches.
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      const specks = Math.floor(Math.random() * 7);
      for (let i = 0; i < specks; i++) {
        const s = Math.max(1, minD * Math.random() * 0.004);
        ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
      }
      if (Math.random() < 0.12) ctx.fillRect(Math.random() * W, 0, Math.max(1, dpr * 0.8), H);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", onFonts);
    };
  }, [text, beat, flash, styles.join(), flashDuration, flashColor, rumble, glitch, chroma, size, figures, fps, loop, delay, color, background, started, reduceMotion]);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={text}
      className={className}
      style={{ position: "relative", aspectRatio: "16 / 10", background, color, overflow: "hidden", ...style }}
    >
      {reduceMotion ? (
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", fontSize: "2em", fontWeight: 900, padding: "0.5em" }}
        >
          {text}
        </div>
      ) : (
        <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
