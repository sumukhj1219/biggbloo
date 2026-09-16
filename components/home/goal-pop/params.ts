// Adapted from a stepped-10fps "letters fall, squash, swell, pop" canvas engine,
// rescaled from a 720x400 showcase-card coordinate space down to a compact
// celebration-pill scene. LOOP_MS must equal GOAL_CELEBRATION_MS in FootballScore.tsx
// so the canvas's own single playthrough finishes exactly when the pill exits.
export const LOOP_MS = 2600;
export const FRAME_MS = 100;

export function frameStart(t: number): number {
  return Math.floor(t / FRAME_MS) * FRAME_MS;
}

// Matches the celebration pill's own design-space width (the foreignObject is
// 542 wide) so the canvas scales in lockstep with the rest of the SVG bar.
export const SCENE_W = 522;
export const SCENE_H = 84;

export const FACE = "#E2C988";
export const SHADOW_COLOR = "#8C6B2E";
export const POP_RING_COLOR = "#FFFFFF";

export const FONT_WEIGHT = 800;

export const WORD = ["G", "O", "A", "L"] as const;
export const N = WORD.length;

export const BASELINE = 52;
export const CAP = 26;

// Fraction of SCENE_W the word should span; the per-letter gap is solved for
// this target rather than guessed as a fixed pixel value, since it depends on
// measured glyph widths at runtime.
export const WORD_SPAN_FRAC = 0.96;

export interface GlyphMetrics {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Box {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

export function layoutWord(metrics: readonly GlyphMetrics[]): { boxes: Box[]; px: number } {
  const capRatio = -metrics[0].top;
  const px = capRatio > 0 ? CAP / capRatio : CAP;
  const widths = metrics.map((m) => (m.right - m.left) * px);
  const natural = widths.reduce((a, w) => a + w, 0);
  const gap =
    metrics.length > 1 ? Math.max(0, (SCENE_W * WORD_SPAN_FRAC - natural) / (metrics.length - 1)) : 0;
  const span = natural + gap * (metrics.length - 1);
  let x = SCENE_W / 2 - span / 2;
  const boxes = metrics.map((m, k) => {
    const box = { x0: x, x1: x + widths[k], top: BASELINE + m.top * px, bottom: BASELINE + m.bottom * px };
    x += widths[k] + gap;
    return box;
  });
  return { boxes, px };
}

export function easeFlick(u: number): number {
  const c = 1 - Math.min(1, Math.max(0, u));
  return 1 - c * c * c * c;
}

export function easeInflate(u: number): number {
  const c = Math.min(1, Math.max(0, u));
  return (Math.pow(2, SWELL_K * c) - 1) / (Math.pow(2, SWELL_K) - 1);
}

export const CONTACT_MS: readonly number[] = [380, 490, 600, 710];

export const G = 490;
export const START_BOTTOM = -44;

export const FALL_MS = Math.sqrt((2 * (BASELINE - START_BOTTOM)) / G) * 1000;

export const LAND_V = (G * FALL_MS) / 1000;

export const STRETCH_V = 810;

export const SQUASH = 0.68;
export const LAND_DECAY = 8;
export const LAND_OMEGA = (2 * Math.PI) / 0.4;

export const KICK = 0.035;
export const KICK_FALLOFF = 0.7;

export function releaseMs(i: number): number {
  return CONTACT_MS[i] - FALL_MS;
}

export function landSpring(tauS: number): number {
  const a = LAND_V / STRETCH_V;
  const quarter = Math.PI / 2 / LAND_OMEGA;
  const b = (SQUASH - 1) / Math.exp(-LAND_DECAY * quarter);
  return Math.exp(-LAND_DECAY * tauS) * (a * Math.cos(LAND_OMEGA * tauS) + b * Math.sin(LAND_OMEGA * tauS));
}

export function kickSpring(tauS: number, d: number): number {
  return -KICK * Math.exp(-KICK_FALLOFF * d) * Math.exp(-LAND_DECAY * tauS) * Math.sin(LAND_OMEGA * tauS);
}

export interface Pose {
  bottom: number;
  sy: number;
  sx: number;
  live: boolean;
}

export function dropPose(i: number, t: number): Pose {
  const rel = t - releaseMs(i);
  if (rel < 0) return { bottom: START_BOTTOM - BASELINE, sy: 1, sx: 1, live: false };
  const tauS = rel / 1000;
  const contact = CONTACT_MS[i];
  let bottom: number;
  let sy: number;
  if (t < contact) {
    bottom = START_BOTTOM - BASELINE + 0.5 * G * tauS * tauS;
    sy = 1 + (G * tauS) / STRETCH_V;
  } else {
    bottom = 0;
    sy = 1 + landSpring((t - contact) / 1000);
  }

  for (let j = 0; j < N; j++) {
    if (j === i || CONTACT_MS[j] <= contact || t < CONTACT_MS[j]) continue;
    sy += kickSpring((t - CONTACT_MS[j]) / 1000, Math.abs(i - j));
  }
  return { bottom, sy, sx: 1 / Math.sqrt(sy), live: true };
}

export function poseBox(rest: Box, p: Pose): Box {
  const cx = (rest.x0 + rest.x1) / 2;
  const w = (rest.x1 - rest.x0) * p.sx;
  const h = (rest.bottom - rest.top) * p.sy;
  const bottom = rest.bottom + p.bottom;
  return { x0: cx - w / 2, x1: cx + w / 2, top: bottom - h, bottom };
}

export const SHADOW = { x: -1.9, y: 1.5 } as const;

export const SHADOW_LAG_MS = 40;
export const SHADOW_WOBBLE = { amp: 0.6, decay: 80, period: 157 } as const;

export const SHADOW_LIFT = 0.9;

export function shadowPose(i: number, t: number): Pose {
  const p = dropPose(i, t - SHADOW_LAG_MS);
  const tau = t - CONTACT_MS[i] - SHADOW_LAG_MS;
  if (tau > 0) {
    const w = SHADOW_WOBBLE;
    p.bottom += w.amp * Math.exp(-tau / w.decay) * Math.sin((tau / w.period) * 2 * Math.PI);
  }
  return p;
}

export function shadowOffset(A: number): { x: number; y: number } {
  const lift = 1 + (SHADOW_LIFT * Math.max(0, A)) / SWELL_PEAK;
  return { x: SHADOW.x * lift, y: SHADOW.y * lift };
}

export const MARK_MS = 140;
export const MARK = { gap: 1.1, spread: 4.2, len: 1.9, minLen: 0.6, width: 1 } as const;

export function markAt(i: number, t: number): { spread: number; len: number; alpha: number } | null {
  const tau = t - CONTACT_MS[i];
  if (tau < 0 || tau >= MARK_MS) return null;
  const u = tau / MARK_MS;
  return { spread: MARK.gap + MARK.spread * easeFlick(u), len: MARK.len + (MARK.minLen - MARK.len) * u, alpha: 1 - u };
}

export const POP_MS = 2000;

export const SWELL_START_MS = 1400;
export const SWELL_END_MS = POP_MS - FRAME_MS;

export const SWELL_PEAK = 0.34;
export const SWELL_K = 5;

export const BULGE_C = { x: SCENE_W / 2, y: 40 } as const;
export const BULGE_SIGMA = 38;

export const STRIPS = 8;

export function swellAmp(t: number): number {
  if (t >= POP_MS || t <= SWELL_START_MS) return 0;
  return SWELL_PEAK * easeInflate((t - SWELL_START_MS) / (SWELL_END_MS - SWELL_START_MS));
}

export function bulge(x: number, y: number, A: number): { x: number; y: number } {
  const dx = x - BULGE_C.x;
  const dy = y - BULGE_C.y;
  const s = 1 + A * Math.exp(-(dx * dx + dy * dy) / (BULGE_SIGMA * BULGE_SIGMA));
  return { x: BULGE_C.x + dx * s, y: BULGE_C.y + dy * s };
}

export const STRIP_OVERLAP = 0.6;
export function bentStrips(b: Box, A: number): { from: number; to: number; box: Box }[] {
  const bh = b.bottom - b.top;
  const cx = (b.x0 + b.x1) / 2;
  const out: { from: number; to: number; box: Box }[] = [];
  for (let s = 0; s < STRIPS; s++) {
    const last = s === STRIPS - 1;
    const y0 = b.top + (bh * s) / STRIPS;
    const y1 = b.top + (bh * (s + 1)) / STRIPS + (last ? 0 : STRIP_OVERLAP);
    const cy = (y0 + y1) / 2;
    out.push({
      from: (y0 - b.top) / bh,
      to: (y1 - b.top) / bh,
      box: { x0: bulge(b.x0, cy, A).x, x1: bulge(b.x1, cy, A).x, top: bulge(cx, y0, A).y, bottom: bulge(cx, y1, A).y },
    });
  }
  return out;
}

export const POP_CENTRE = { x: SCENE_W / 2, y: 44 } as const;
export const POP_SPOKES = 12;

export const POP_RADIUS = { at0: 16, at1: 38 } as const;
export const POP_DASH = { length: 3.2, width: 1.2 } as const;

export const POP_ALPHA = [1, 0.35, 0] as const;

export function popAt(tau: number): { r: number; alpha: number } | null {
  if (tau < 0 || tau >= 2 * FRAME_MS) return null;
  const u = tau / FRAME_MS;
  const r = POP_RADIUS.at0 + (POP_RADIUS.at1 - POP_RADIUS.at0) * u;
  const alpha =
    u < 1 ? POP_ALPHA[0] + (POP_ALPHA[1] - POP_ALPHA[0]) * u : POP_ALPHA[1] + (POP_ALPHA[2] - POP_ALPHA[1]) * (u - 1);
  return { r, alpha };
}
