"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";

export interface StitchedTextProps {
  text: string;
  /** Fill thread color. Defaults to the CSS color. */
  color?: string;
  /** Fill thread colors cycled letter by letter (spaces skipped). Overrides `color`. */
  colors?: string[];
  /** Border (satin edge) thread color. */
  borderColor?: string;
  /** Border width, em. 0 = no border. */
  border?: number;
  /** Thread thickness, em. */
  thread?: number;
  /** Fill stitch slant, degrees from straight across the stroke. */
  slant?: number;
  /** Seconds to sew everything. 0 = appears finished. */
  duration?: number;
  delay?: number;
  /** Show the needle while sewing. */
  needle?: boolean;
  /** Soft drop shadow under the patch. */
  shadow?: boolean;
  trigger?: "load" | "inView";
  className?: string;
  style?: CSSProperties;
}

type RGB = [number, number, number];
interface Stitch {
  pts: Float32Array;
  border: boolean;
  /** Fill color index (per letter). */
  ink?: number;
}

const INF = 1e20;
const MAX_PIXELS = 2_400_000;
const LIGHT: [number, number] = [-0.6, -0.8]; // toward the light, y down

function parseColor(css: string): RGB {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
const rgb = ([r, g, b]: RGB) => `rgb(${r | 0},${g | 0},${b | 0})`;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- distance field (Felzenszwalb & Huttenlocher) ----------

function dt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Euclidean distance from every pixel to the nearest `target` pixel. */
function edt(target: Uint8Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = target[i] ? 0 : INF;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    dt1(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    dt1(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]);
  }
  return out;
}

/** Separable box blur, in place, `passes` times. */
function boxBlur(a: Float32Array, w: number, h: number, r: number, passes = 2) {
  const tmp = new Float32Array(Math.max(w, h));
  const run = (len: number, get: (i: number) => number, set: (i: number, v: number) => void) => {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += get(Math.min(len - 1, Math.max(0, i)));
    for (let i = 0; i < len; i++) {
      tmp[i] = sum / (2 * r + 1);
      sum += get(Math.min(len - 1, i + r + 1)) - get(Math.max(0, i - r));
    }
    for (let i = 0; i < len; i++) set(i, tmp[i]);
  };
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) run(w, (i) => a[y * w + i], (i, v) => (a[y * w + i] = v));
    for (let x = 0; x < w; x++) run(h, (i) => a[i * w + x], (i, v) => (a[i * w + x] = v));
  }
}

// ---------- marching squares: closed contours of f = level ----------

function contours(f: Float32Array, w: number, h: number, level: number): number[][] {
  const pos = new Map<number, [number, number]>();
  const adj = new Map<number, number[]>();
  const val = (x: number, y: number) => f[y * w + x] - level;
  const hId = (x: number, y: number) => (y * w + x) * 2;
  const vId = (x: number, y: number) => (y * w + x) * 2 + 1;
  const point = (id: number) => {
    let p = pos.get(id);
    if (!p) {
      const cell = id >> 1;
      const x = cell % w;
      const y = (cell / w) | 0;
      const a = val(x, y);
      if (id & 1) {
        const b = val(x, y + 1);
        p = [x, y + a / (a - b)];
      } else {
        const b = val(x + 1, y);
        p = [x + a / (a - b), y];
      }
      pos.set(id, p);
    }
    return p;
  };
  const link = (a: number, b: number) => {
    point(a);
    point(b);
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const a = val(x, y);
      const b = val(x + 1, y);
      const c = val(x + 1, y + 1);
      const d = val(x, y + 1);
      const idx = (a < 0 ? 8 : 0) | (b < 0 ? 4 : 0) | (c < 0 ? 2 : 0) | (d < 0 ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = hId(x, y);
      const B = hId(x, y + 1);
      const L = vId(x, y);
      const R = vId(x + 1, y);
      const centre = (a + b + c + d) / 4 < 0;
      switch (idx) {
        case 1: case 14: link(L, B); break;
        case 2: case 13: link(B, R); break;
        case 3: case 12: link(L, R); break;
        case 4: case 11: link(T, R); break;
        case 6: case 9: link(T, B); break;
        case 7: case 8: link(L, T); break;
        case 5:
          if (centre) { link(L, T); link(B, R); } else { link(T, R); link(L, B); }
          break;
        case 10:
          if (centre) { link(T, R); link(L, B); } else { link(L, T); link(B, R); }
          break;
      }
    }
  }
  const seen = new Set<number>();
  const out: number[][] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const line: number[] = [];
    let prev = -1;
    let cur = start;
    while (cur !== -1 && !seen.has(cur)) {
      seen.add(cur);
      const p = pos.get(cur)!;
      line.push(p[0], p[1]);
      const next = (adj.get(cur) ?? []).find((n) => n !== prev && !seen.has(n));
      prev = cur;
      cur = next ?? -1;
    }
    if (line.length >= 8) out.push(line);
  }
  return out;
}

/** Evenly spaced points along a closed polyline. */
function resampleClosed(line: number[], step: number): number[] {
  const n = line.length / 2;
  const out: number[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const ax = line[i * 2];
    const ay = line[i * 2 + 1];
    const bx = line[((i + 1) % n) * 2];
    const by = line[((i + 1) % n) * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay);
    let t = carry;
    while (t < len) {
      out.push(ax + ((bx - ax) * t) / len, ay + ((by - ay) * t) / len);
      t += step;
    }
    carry = t - len;
  }
  return out;
}

// ---------- building the stitches ----------

interface Built {
  w: number;
  h: number;
  /** Letter shape and letter + border shape, anti-aliased, for clean edges. */
  letterMask: HTMLCanvasElement;
  bandMask: HTMLCanvasElement;
  stitches: Stitch[];
  shade: HTMLCanvasElement;
  tw: number;
  spacing: number;
  fs: number;
}

function build(mask: Uint8ClampedArray, w: number, h: number, fs: number, o: { border: number; thread: number; slant: number }): Built {
  const N = w * h;
  const inside = new Uint8Array(N);
  const outside = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const a = mask[i * 4 + 3] / 255;
    inside[i] = a >= 0.5 ? 1 : 0;
    outside[i] = 1 - inside[i];
  }
  const dOut = edt(inside, w, h);
  const dIn = edt(outside, w, h);
  const sdf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = mask[i * 4 + 3] / 255;
    sdf[i] = a > 0.02 && a < 0.98 ? 0.5 - a : inside[i] ? -(dIn[i] - 0.5) : dOut[i] - 0.5;
  }

  const spacing = Math.max(1.6, o.thread * fs);
  const tw = spacing * 1.15;
  const B = o.border * fs;

  const at = (x: number, y: number) => {
    const xi = Math.min(w - 2, Math.max(0, Math.floor(x)));
    const yi = Math.min(h - 2, Math.max(0, Math.floor(y)));
    const fx = Math.min(1, Math.max(0, x - xi));
    const fy = Math.min(1, Math.max(0, y - yi));
    const i = yi * w + xi;
    return (sdf[i] * (1 - fx) + sdf[i + 1] * fx) * (1 - fy) + (sdf[i + w] * (1 - fx) + sdf[i + w + 1] * fx) * fy;
  };
  const grad = (x: number, y: number): [number, number] => {
    const gx = at(x + 1, y) - at(x - 1, y);
    const gy = at(x, y + 1) - at(x, y - 1);
    const l = Math.hypot(gx, gy) || 1;
    return [gx / l, gy / l];
  };

  // Stitch direction: across the stroke (the distance gradient), stored as a
  // doubled angle so opposite sides of a stroke agree, then smoothed.
  const vx = new Float32Array(N);
  const vy = new Float32Array(N);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (sdf[i] > 1) continue;
      const gx = sdf[i + 1] - sdf[i - 1];
      const gy = sdf[i + w] - sdf[i - w];
      const l = gx * gx + gy * gy;
      if (l < 1e-6) continue;
      vx[i] = (gx * gx - gy * gy) / l;
      vy[i] = (2 * gx * gy) / l;
    }
  }
  const r = Math.max(2, Math.round(fs * 0.035));
  boxBlur(vx, w, h, r);
  boxBlur(vy, w, h, r);
  const sl = (o.slant * Math.PI) / 180;
  const dir = (x: number, y: number): [number, number] => {
    const i = Math.min(h - 1, Math.max(0, Math.round(y))) * w + Math.min(w - 1, Math.max(0, Math.round(x)));
    let a: number;
    if (Math.abs(vx[i]) + Math.abs(vy[i]) < 1e-4) {
      const [gx, gy] = grad(x, y);
      a = Math.atan2(gy, gx);
    } else a = Math.atan2(vy[i], vx[i]) / 2;
    a += sl;
    return [Math.cos(a), Math.sin(a)];
  };

  const byX = (a: number[], b: number[]) => {
    let ma = Infinity;
    let mb = Infinity;
    for (let i = 0; i < a.length; i += 2) ma = Math.min(ma, a[i]);
    for (let i = 0; i < b.length; i += 2) mb = Math.min(mb, b[i]);
    return ma - mb;
  };

  const stitches: Stitch[] = [];
  const stampInto = (grid: Uint8Array, x: number, y: number, rad: number) => {
    const r0 = Math.ceil(rad);
    const cx = Math.round(x);
    const cy = Math.round(y);
    for (let dy = -r0; dy <= r0; dy++) {
      for (let dx = -r0; dx <= r0; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && py >= 0 && px < w && py < h) grid[py * w + px] = 1;
      }
    }
  };

  // Border: satin stitches straight across the band, perpendicular to the
  // letter edge. First pass shoots out from the letter edge and stops at the
  // band's outer edge, or at the ridge where it meets stitches from the other
  // side (tight counters, gaps between letters). Second pass comes in from the
  // outer edge to fill gaps where stitches fan apart around convex corners.
  if (B > 0.5) {
    const bcov = new Uint8Array(N);
    const bs = 0.1;
    const cs = Math.cos(bs);
    const sn = Math.sin(bs);
    const ray = (x0: number, y0: number, sign: 1 | -1): number[] | null => {
      let [gx, gy] = grad(x0, y0);
      const nx = (gx * cs - gy * sn) * sign;
      const ny = (gx * sn + gy * cs) * sign;
      let x = x0;
      let y = y0;
      let d = at(x, y);
      for (let k = 0; k < B * 2; k++) {
        const nxp = x + nx;
        const nyp = y + ny;
        const nd = at(nxp, nyp);
        // Outward: stop at the outer edge or when distance stops growing.
        if (sign > 0 && (nd > B + 0.6 || (d > tw && nd < d + 0.25))) break;
        // Inward: stop once under the letter, or at a ridge.
        if (sign < 0 && (nd < -tw * 0.8 || (d < B - tw && nd > d - 0.25))) break;
        x = nxp;
        y = nyp;
        d = nd;
      }
      [gx, gy] = [x - x0, y - y0];
      if (Math.hypot(gx, gy) < tw) return null;
      return [x0, y0, x, y];
    };
    const mark = (seg: number[]) => {
      const len = Math.hypot(seg[2] - seg[0], seg[3] - seg[1]);
      for (let t = 0; t <= len; t += 2) {
        const f = t / (len || 1);
        stampInto(bcov, seg[0] + (seg[2] - seg[0]) * f, seg[1] + (seg[3] - seg[1]) * f, spacing * 0.5);
      }
    };
    contours(sdf, w, h, -tw * 0.8).sort(byX).forEach((line) => {
      const pts = resampleClosed(line, spacing * 0.95);
      for (let i = 0; i < pts.length; i += 2) {
        const seg = ray(pts[i], pts[i + 1], 1);
        if (!seg) continue;
        mark(seg);
        stitches.push({ pts: new Float32Array(seg), border: true });
      }
    });
    contours(sdf, w, h, B).sort(byX).forEach((line) => {
      const pts = resampleClosed(line, spacing * 0.95);
      for (let i = 0; i < pts.length; i += 2) {
        const [gx, gy] = grad(pts[i], pts[i + 1]);
        const ix = Math.round(pts[i] - gx * 2);
        const iy = Math.round(pts[i + 1] - gy * 2);
        if (ix < 0 || iy < 0 || ix >= w || iy >= h || bcov[iy * w + ix]) continue;
        const seg = ray(pts[i] + gx * 0.6, pts[i + 1] + gy * 0.6, -1);
        if (!seg) continue;
        mark(seg);
        stitches.push({ pts: new Float32Array([seg[2], seg[3], seg[0], seg[1]]), border: true });
      }
    });
  }

  // Fill: satin threads traced from the outline along the smoothed direction
  // field until they leave the letter on the other side. Threads that would
  // start where another already lies are skipped, so they never pile up.
  const covered = new Uint8Array(N);
  const stamp = (x: number, y: number, rad: number) => stampInto(covered, x, y, rad);
  const maxStitch = fs * 0.32;
  const fill = contours(sdf, w, h, 0).sort(byX);
  let threadNo = 0;
  fill.forEach((line) => {
    const seeds = resampleClosed(line, spacing);
    for (let i = 0; i < seeds.length; i += 2) {
      const sx = seeds[i];
      const sy = seeds[i + 1];
      const [gx, gy] = grad(sx, sy);
      const ix = Math.round(sx - gx * 1.5);
      const iy = Math.round(sy - gy * 1.5);
      if (ix < 0 || iy < 0 || ix >= w || iy >= h || covered[iy * w + ix]) continue;
      let [px, py] = dir(sx, sy);
      if (px * -gx + py * -gy < 0) {
        px = -px;
        py = -py;
      }
      const pts: number[] = [sx + gx * 0.6, sy + gy * 0.6];
      let x = sx;
      let y = sy;
      const step = 1;
      for (let k = 0; k < fs * 3; k++) {
        let [dx, dy] = dir(x, y);
        if (dx * px + dy * py < 0) {
          dx = -dx;
          dy = -dy;
        }
        let [ex, ey] = dir(x + dx * step * 0.5, y + dy * step * 0.5);
        if (ex * dx + ey * dy < 0) {
          ex = -ex;
          ey = -ey;
        }
        x += ex * step;
        y += ey * step;
        px = ex;
        py = ey;
        pts.push(x, y);
        if (at(x, y) > 0.6) break;
      }
      if (pts.length < 8) continue;
      for (let k = 0; k < pts.length; k += 4) stamp(pts[k], pts[k + 1], spacing * 0.5);
      // Long threads are split into shorter, staggered stitches.
      let total = 0;
      for (let k = 2; k < pts.length; k += 2) total += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
      if (total <= maxStitch) {
        stitches.push({ pts: new Float32Array(pts), border: false });
      } else {
        const pieces = Math.ceil(total / maxStitch);
        const len = total / pieces;
        let off = ((threadNo * 0.618) % 1) * len;
        let acc = 0;
        let piece: number[] = [pts[0], pts[1]];
        for (let k = 2; k < pts.length; k += 2) {
          acc += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
          piece.push(pts[k], pts[k + 1]);
          if (acc >= off + len * 0.5 && acc >= len * 0.5 && k < pts.length - 4) {
            stitches.push({ pts: new Float32Array(piece), border: false });
            piece = [pts[k], pts[k + 1]];
            acc = 0;
            off = 0;
          }
        }
        if (piece.length >= 4) stitches.push({ pts: new Float32Array(piece), border: false });
      }
      threadNo++;
    }
  });

  // Puffy lighting: fill rises from its edge; the border is a rounded tube;
  // dark creases where fill meets border and at the outer edge.
  const shade = document.createElement("canvas");
  shade.width = w;
  shade.height = h;
  const sctx = shade.getContext("2d")!;
  const img = sctx.createImageData(w, h);
  const puff = fs * 0.05;
  const hasBorder = B > 0.5;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const d = sdf[i];
      if (d > (hasBorder ? B : 0) + 1) continue;
      let gx = sdf[i + 1] - sdf[i - 1];
      let gy = sdf[i + w] - sdf[i - w];
      const l = Math.hypot(gx, gy) || 1;
      gx /= l;
      gy /= l;
      const lit = gx * LIGHT[0] + gy * LIGHT[1];
      let s: number;
      if (d < 0 || !hasBorder) {
        const edge = 1 - smoothstep(0, puff, -d);
        s = edge * lit * 0.45 - edge * 0.16;
      } else {
        const u = Math.min(1, d / B);
        s = -Math.cos(Math.PI * u) * lit * 0.4 - 0.1 * (1 - Math.sin(Math.PI * u));
        s -= 0.3 * Math.exp(-((d - B) * (d - B)) / (tw * tw * 0.6));
      }
      if (hasBorder) s -= 0.42 * Math.exp(-(d * d) / (tw * tw * 0.5));
      const k = i * 4;
      const a = Math.min(0.6, Math.abs(s));
      const c = s > 0 ? 255 : 0;
      img.data[k] = c;
      img.data[k + 1] = c;
      img.data[k + 2] = c;
      img.data[k + 3] = a * 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const maskOf = (level: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const mc = c.getContext("2d")!;
    const im = mc.createImageData(w, h);
    for (let i = 0; i < N; i++) im.data[i * 4 + 3] = Math.min(1, Math.max(0, level + 0.5 - sdf[i])) * 255;
    mc.putImageData(im, 0, 0);
    return c;
  };
  return { w, h, letterMask: maskOf(0), bandMask: maskOf(hasBorder ? B : 0), stitches, shade, tw, spacing, fs };
}

// ---------- drawing ----------

interface Palette {
  under: string;
  dark: string;
  base: string;
  light: string;
}
function palette(c: RGB, border: boolean): Palette {
  const white: RGB = [255, 255, 255];
  return {
    under: rgb(scale(c, border ? 0.74 : 0.55)),
    dark: rgb(scale(c, border ? 0.72 : 0.52)),
    base: rgb(c),
    light: rgb(mix(c, white, border ? 0.9 : 0.5)),
  };
}

function path(ctx: CanvasRenderingContext2D, p: Float32Array, from = 0, to = p.length / 2) {
  ctx.beginPath();
  ctx.moveTo(p[from * 2], p[from * 2 + 1]);
  for (let i = from + 1; i < to; i++) ctx.lineTo(p[i * 2], p[i * 2 + 1]);
}

function drawStitch(ctx: CanvasRenderingContext2D, s: Stitch, b: Built, fillPals: Palette[], borderPal: Palette) {
  const pal = s.border ? borderPal : fillPals[(s.ink ?? 0) % fillPals.length];
  const p = s.pts;
  const n = p.length / 2;
  const tw = b.tw;
  // Underlay closes the gaps between neighbouring threads.
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.strokeStyle = pal.under;
  ctx.lineWidth = b.spacing * 1.08;
  path(ctx, p);
  ctx.stroke();
  // Thread: dark rim, body, then a highlight along its middle stretch,
  // nudged toward the light, so each thread reads as a little cylinder.
  ctx.lineCap = "round";
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = tw;
  path(ctx, p);
  ctx.stroke();
  ctx.strokeStyle = pal.base;
  ctx.lineWidth = tw * 0.72;
  path(ctx, p);
  ctx.stroke();
  const dx = p[(n - 1) * 2] - p[0];
  const dy = p[(n - 1) * 2 + 1] - p[1];
  const l = Math.hypot(dx, dy) || 1;
  let ox = -dy / l;
  let oy = dx / l;
  if (ox * LIGHT[0] + oy * LIGHT[1] < 0) {
    ox = -ox;
    oy = -oy;
  }
  const a = Math.floor(n * 0.18);
  const z = Math.max(a + 2, Math.ceil(n * 0.82));
  ctx.save();
  ctx.translate(ox * tw * 0.14, oy * tw * 0.14);
  ctx.strokeStyle = pal.light;
  ctx.lineWidth = tw * 0.24;
  ctx.globalAlpha = 0.9;
  path(ctx, p, a, Math.min(n, z));
  ctx.stroke();
  ctx.restore();
}

// ---------- component ----------

export function StitchedText({
  text,
  color,
  colors,
  borderColor = "#f4f1e8",
  border = 0.07,
  thread = 0.013,
  slant = 28,
  duration = 3.2,
  delay = 0.2,
  needle = true,
  shadow = true,
  trigger = "load",
  className,
  style,
}: StitchedTextProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useMotionValue(0);
  const inView = useInView(rootRef, { once: true, amount: 0.3 });
  const started = trigger === "load" || inView;
  const [failed, setFailed] = useState(false);

  // Room around the text for the border and the shadow, em.
  const pad = border + 0.14;

  useEffect(() => {
    if (!started) return;
    if (reduceMotion || duration <= 0) {
      progress.set(1);
      return;
    }
    // A machine sews at a constant speed.
    const controls = animate(progress, 1, { duration, delay, ease: "linear" });
    return () => controls.stop();
  }, [started, reduceMotion, duration, delay, progress]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setFailed(true);
      return;
    }
    // Border and fill are sewn on separate layers, each clipped to its shape.
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d")!;
    const borderLayer = document.createElement("canvas");
    const bctx = borderLayer.getContext("2d")!;
    const fillLayer = document.createElement("canvas");
    const fctx = fillLayer.getContext("2d")!;
    let built: Built | null = null;
    let fillPals: Palette[];
    let borderPal: Palette;
    let drawn = 0;
    let shown = -1;
    let px = 1; // device px per css px

    const rebuild = () => {
      const cs = getComputedStyle(root);
      const fs = parseFloat(cs.fontSize) || 16;
      const rect = root.getBoundingClientRect();
      const cssW = rect.width + pad * 2 * fs;
      const cssH = rect.height + pad * 2 * fs;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      px = Math.min(dpr, Math.sqrt(MAX_PIXELS / Math.max(1, cssW * cssH)));
      const w = Math.max(4, Math.round(cssW * px));
      const h = Math.max(4, Math.round(cssH * px));
      canvas.width = w;
      canvas.height = h;
      for (const c of [layer, borderLayer, fillLayer]) {
        c.width = w;
        c.height = h;
      }

      const m = document.createElement("canvas");
      m.width = w;
      m.height = h;
      const mctx = m.getContext("2d", { willReadFrequently: true })!;
      mctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs * px}px ${cs.fontFamily}`;
      if ("letterSpacing" in mctx && cs.letterSpacing !== "normal") {
        (mctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${parseFloat(cs.letterSpacing) * px}px`;
      }
      mctx.textAlign = "center";
      mctx.textBaseline = "middle";
      mctx.fillStyle = "#000";
      mctx.fillText(text, w / 2, (pad * fs + rect.height / 2) * px);
      const data = mctx.getImageData(0, 0, w, h).data;

      built = build(data, w, h, fs * px, { border, thread, slant });
      const inks = colors?.length ? colors : [color ?? cs.color];
      fillPals = inks.map((c) => palette(parseColor(c), false));
      if (inks.length > 1) {
        // Which letter each fill stitch belongs to, from the text's advance widths.
        const total = mctx.measureText(text).width;
        const x0 = w / 2 - total / 2;
        const edges: number[] = [];
        const inkOf: number[] = [];
        let n = 0;
        [...text].forEach((ch, i, arr) => {
          edges.push(x0 + mctx.measureText(arr.slice(0, i + 1).join("")).width);
          inkOf.push(ch.trim() ? n++ : -1);
        });
        for (const st of built.stitches) {
          if (st.border) continue;
          const p = st.pts;
          const mx = (p[0] + p[p.length - 2]) / 2;
          let i = edges.findIndex((e) => mx < e);
          if (i < 0) i = edges.length - 1;
          while (i > 0 && inkOf[i] < 0) i--;
          st.ink = Math.max(0, inkOf[i]);
        }
      }
      borderPal = palette(parseColor(borderColor), true);
      drawn = 0;
      shown = -1;
    };

    const draw = () => {
      if (!built) return;
      const total = built.stitches.length;
      const target = Math.min(total, Math.round(progress.get() * total));
      if (target === shown) return;
      const { w, h } = built;
      let newBorder = false;
      let newFill = false;
      for (; drawn < target; drawn++) {
        const st = built.stitches[drawn];
        drawStitch(st.border ? bctx : fctx, st, built, fillPals, borderPal);
        if (st.border) newBorder = true;
        else newFill = true;
      }
      const clip = (c: CanvasRenderingContext2D, m: HTMLCanvasElement) => {
        c.globalCompositeOperation = "destination-in";
        c.drawImage(m, 0, 0);
        c.globalCompositeOperation = "source-over";
      };
      if (newBorder) clip(bctx, built.bandMask);
      if (newFill) clip(fctx, built.letterMask);
      shown = target;
      lctx.clearRect(0, 0, w, h);
      lctx.drawImage(borderLayer, 0, 0);
      lctx.drawImage(fillLayer, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(layer, 0, 0);
      ctx.globalCompositeOperation = "source-atop";
      ctx.drawImage(built.shade, 0, 0);
      if (shadow) {
        ctx.globalCompositeOperation = "destination-over";
        ctx.shadowColor = "rgba(0,0,0,0.32)";
        ctx.shadowBlur = built.fs * 0.06;
        ctx.shadowOffsetX = built.fs * 0.012;
        ctx.shadowOffsetY = built.fs * 0.03;
        ctx.drawImage(layer, 0, 0);
        ctx.shadowColor = "transparent";
      }
      ctx.globalCompositeOperation = "source-over";
      // The needle rides on the last stitch while sewing.
      if (needle && target > 0 && target < total) {
        const p = built.stitches[target - 1].pts;
        const x = p[p.length - 2];
        const y = p[p.length - 1];
        const L = built.fs * 0.5;
        const nw = Math.max(1.5, built.tw * 0.7);
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = nw * 1.6;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + L * 0.35 + 2, y - L + 2);
        ctx.stroke();
        const g = ctx.createLinearGradient(x - nw, 0, x + nw, 0);
        g.addColorStop(0, "#8c9097");
        g.addColorStop(0.5, "#f4f6f8");
        g.addColorStop(1, "#6d7178");
        ctx.strokeStyle = g;
        ctx.lineWidth = nw;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + L * 0.35, y - L);
        ctx.stroke();
      }
    };

    rebuild();
    draw();
    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        rebuild();
        draw();
      }, 120);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(root);
    document.fonts?.addEventListener("loadingdone", onResize);
    const unsub = progress.on("change", draw);

    return () => {
      clearTimeout(timer);
      unsub();
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", onResize);
    };
  }, [text, color, colors?.join(), borderColor, border, thread, slant, needle, shadow, pad, progress]);

  return (
    <span
      ref={rootRef}
      role="img"
      aria-label={text}
      className={className}
      style={{ position: "relative", display: "inline-block", lineHeight: 1, whiteSpace: "pre", ...style }}
    >
      {/* Invisible copy of the text sizes the box; the canvas draws it. */}
      <span aria-hidden style={{ color: failed ? undefined : "transparent" }}>
        {text}
      </span>
      {!failed && (
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            position: "absolute",
            left: `${-pad}em`,
            top: `${-pad}em`,
            width: `calc(100% + ${pad * 2}em)`,
            height: `calc(100% + ${pad * 2}em)`,
            pointerEvents: "none",
          }}
        />
      )}
    </span>
  );
}
