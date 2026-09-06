import manifestJson from "../../../public/ransom-letters/manifest.json";

export type Variant = { file: string; w: number; h: number };
export type Manifest = Record<string, Variant[]>;

export const RANSOM: Manifest = manifestJson as Manifest;

export const RANSOM_BASE = "/ransom-letters/";
export function spriteUrl(file: string): string {
  return `${RANSOM_BASE}${file}`;
}

export function hasGlyph(ch: string): boolean {
  return RANSOM[ch] !== undefined;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Placed = {
  kind: "glyph" | "space";
  ch: string;
  variant?: Variant;
  rot: number;
  dy: number;
  scale: number;
  mx: number;
  depth: number;
};

export type JitterConfig = {
  rot: number;
  dy: number;
  scale: number;
  gap: number;
};

export const DEFAULT_JITTER: JitterConfig = {
  rot: 8,
  dy: 0.06,
  scale: 0.12,
  gap: 0.05,
};

export function variantsFor(ch: string): Variant[] {
  const key = keyFor(ch);
  return key ? RANSOM[key] : [];
}

function keyFor(ch: string): string | null {
  if (ch === " ") return null;
  const up = ch.toUpperCase();
  if (RANSOM[up]) return up;
  if (RANSOM[ch]) return ch;
  if (ch === "(" || ch === ")") return RANSOM["()"] ? "()" : null;
  if (ch === "." && RANSOM[","]) return null;
  return null;
}

export function lineWidth(placed: Placed[], lineH: number): number {
  let w = 0;
  const gap = lineH * 0.04;
  placed.forEach((p, i) => {
    if (i > 0) w += gap;
    if (p.kind === "space") {
      w += lineH * 0.32;
      return;
    }
    const v = p.variant!;
    w += (v.w / v.h) * (lineH * p.scale) + p.mx * lineH;
  });
  return w;
}

export function composeLine(
  text: string,
  seed: number,
  jitter: JitterConfig = DEFAULT_JITTER,
): Placed[] {
  const rnd = mulberry32(seed);
  const out: Placed[] = [];
  for (const ch of text) {
    const key = keyFor(ch);
    if (!key) {
      out.push({ kind: "space", ch, rot: 0, dy: 0, scale: 1, mx: 0, depth: 0 });
      continue;
    }
    const variants = RANSOM[key];
    const v = variants[Math.floor(rnd() * variants.length)];
    out.push({
      kind: "glyph",
      ch,
      variant: v,
      rot: (rnd() * 2 - 1) * jitter.rot,
      dy: (rnd() * 2 - 1) * jitter.dy,
      scale: 1 + (rnd() * 2 - 1) * jitter.scale,
      mx: rnd() * jitter.gap,
      depth: 0.35 + rnd() * 0.65,
    });
  }
  return out;
}
