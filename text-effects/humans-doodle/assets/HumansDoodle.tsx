"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { HumanDoodle, PEOPLE, type Person } from "./HumanDoodle";

// A crowd of sketched people, seen from the front, painted on a canvas so it
// stays smooth at thousands of people.
//
// 1. Sprites: every person in the cast is rendered once as an SVG (brush
//    filter and all) at FRAMES moments of its idle loop, rasterised, and
//    shrunk into a few mip levels. The line boil comes from changing the
//    noise seed every other frame.
// 2. Layout: candidate spots on staggered rows (with perspective: each row
//    back is smaller and higher), ranked by distance from the front center
//    through a lumpy, noisy outline. The first n spots are the crowd, so it
//    grows as an irregular blob, and spots never move as more people join.
// 3. Every frame: people back row first, each on its own loop phase. New
//    people rise up from below and fade in.
//
// The first `people.length` people are all different; after that the cast
// repeats in a hashed order, half of them mirrored.
//
// <CountDial> is a compact count control to drive it: the pointer stays in
// the middle, hovering left of it counts down and right counts up.

export interface HumansDoodleProps {
  count: number;
  people?: Person[];
  /** Height of a front-row person, px; the crowd shrinks below this to fit. */
  personHeight?: number;
  speed?: number;
  roughness?: number;
  ink?: string;
  /** Changes the crowd's outline. */
  shapeSeed?: number;
  className?: string;
  /** The canvas fills this box; give it a size. */
  style?: CSSProperties;
}

const LOOP = 3.6; // seconds, the idle cycle every sprite frame samples
const FRAMES = 16;
const SPRITE_H = 240; // px, largest mip level
const FEET = 0.91; // feet line, as a fraction of the sprite height

// Layout, in units of a front-row person's height.
const PERSPECTIVE = 0.035; // row r is 1 / (1 + r * PERSPECTIVE) the size
const ROW_DEPTH = 0.12; // feet rise per row (scaled)
const SPACING = 0.33; // between neighbours in a row (unscaled)
const WIDE = 1.7; // the crowd spreads this much wider than it goes deep


interface Slot {
  row: number;
  x: number;
  y: number; // rise of the feet above the front row
  s: number; // scale
}

function hash(i: number, k: number) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(k + 7, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// Smooth 1D value noise in [0, 1).
function noise1(t: number, k: number) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, k) * (1 - u) + hash(i + 1, k) * u;
}
// ---- layout ----------------------------------------------------------------

const slotCache = new Map<number, { rows: number; slots: Slot[] }>();

/**
 * The first n spots of the crowd, front center first. Spots are ranked by an
 * elliptical distance (wider than deep) divided by a lumpy outline that
 * varies with the angle, so the crowd grows as an irregular blob.
 * Deterministic, so it is safe to call during render.
 */
export function crowdSlots(n: number, shapeSeed = 1): Slot[] {
  const cached = slotCache.get(shapeSeed);
  // Enough rows that every spot past them ranks after the n-th one.
  const rows = Math.ceil(Math.sqrt((n * SPACING * ROW_DEPTH) / ((Math.PI / 2) * WIDE)) * 1.9 / ROW_DEPTH) + 6;
  if (cached && cached.rows >= rows && cached.slots.length >= n) return cached.slots.slice(0, n);

  const cand: (Slot & { score: number })[] = [];
  let y = 0;
  for (let row = 0; row < rows; row++) {
    const s = 1 / (1 + row * PERSPECTIVE);
    const z = row * ROW_DEPTH; // unscaled depth
    const off = row % 2 ? 0.5 : 0;
    const reach = (z + 1) * WIDE * 1.5;
    const k = Math.ceil(reach / SPACING);
    for (let j = -k; j <= k; j++) {
      const wx = (j + off) * SPACING;
      const a = Math.atan2(z + 0.15, wx); // 0..π, right to left
      const lumps = 1 + 0.2 * (noise1(a * 2.2, shapeSeed) - 0.5) * 2 + 0.1 * (noise1(a * 6.5, shapeSeed + 1) - 0.5) * 2;
      const e = Math.hypot(wx / WIDE, z);
      const i = cand.length;
      cand.push({
        row,
        x: wx * s + (hash(i, 3) - 0.5) * 0.25 * SPACING * s,
        y: y + (hash(i, 4) - 0.5) * 0.15 * ROW_DEPTH * s,
        s: s * (0.96 + hash(i, 5) * 0.08),
        score: e / lumps + hash(i, 8) * 0.06,
      });
    }
    y += ROW_DEPTH * s;
  }
  cand.sort((a, b) => a.score - b.score || a.row - b.row || a.x - b.x);
  const slots = cand.map(({ score: _s, ...slot }) => slot);
  slotCache.set(shapeSeed, { rows, slots });
  return slots.slice(0, n);
}

function extents(slots: Slot[]) {
  let minX = -0.35;
  let maxX = 0.35;
  let top = 1;
  for (const p of slots) {
    minX = Math.min(minX, p.x - 0.4 * p.s);
    maxX = Math.max(maxX, p.x + 0.4 * p.s);
    top = Math.max(top, p.y + p.s);
  }
  return { minX, maxX, top, bottom: 0.14 };
}

// ---- sprites ---------------------------------------------------------------

type Mips = HTMLCanvasElement[]; // largest first, each half the previous

function bakeSvg(person: Person, t: number, seed: number, roughness: number, ink: string) {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => {
    root.render(<HumanDoodle person={person} frozenAt={t} boil={false} seed={seed} roughness={roughness} ink={ink} size={SPRITE_H} />);
  });
  const svg = host.querySelector("svg")!;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(SPRITE_H * 0.6));
  svg.setAttribute("height", String(SPRITE_H));
  const markup = new XMLSerializer().serializeToString(svg);
  root.unmount();
  return markup;
}

async function rasterize(markup: string): Promise<Mips> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await img.decode();
  const mips: Mips = [];
  let w = Math.round(SPRITE_H * 0.6);
  let h = SPRITE_H;
  let src: CanvasImageSource = img;
  while (h >= 20) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, w, h);
    mips.push(c);
    src = c;
    w = Math.round(w / 2);
    h = Math.round(h / 2);
  }
  return mips;
}

// ---- crowd -----------------------------------------------------------------

export function HumansDoodle({
  count,
  people = PEOPLE,
  personHeight = 120,
  speed = 1,
  roughness = 1,
  ink = "#1b1a1a",
  shapeSeed = 1,
  className,
  style,
}: HumansDoodleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef(count);
  countRef.current = Math.max(0, Math.floor(count));
  const opts = useRef({ personHeight, speed });
  opts.current = { personHeight, speed };

  // Sprites: sprites[person][frame], filled in progressively (frame 0 of
  // everyone first, so the crowd shows up right away).
  const spritesRef = useRef<(Mips | undefined)[][]>([]);
  useEffect(() => {
    let cancelled = false;
    spritesRef.current = people.map(() => []);
    (async () => {
      for (let f = 0; f < FRAMES; f++) {
        for (let c = 0; c < people.length; c++) {
          // Yield first: flushSync can't render inside an effect, and this keeps
          // the page responsive while baking.
          await new Promise((r) => setTimeout(r, 0));
          if (cancelled) return;
          const seed = 3 + c * 5 + (Math.floor(f / 2) % 4) * 8;
          const markup = bakeSvg(people[c], (f / FRAMES) * LOOP, seed, roughness, ink);
          try {
            spritesRef.current[c][f] = await rasterize(markup);
          } catch {
            /* skip a frame that failed to decode */
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [people, roughness, ink]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let Hc = 0;
    let dpr = 1;
    let refit = true;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      Hc = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hc * dpr);
      refit = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Per-person appear/leave times (ms) for the rise-in.
    let shown = 0;
    let slots: Slot[] = [];
    const born: number[] = [];
    const leaving: { i: number; at: number }[] = [];

    // Camera eases toward the fit for the current count.
    let cam = { H: 0, cx: 0, baseY: 0 };
    let target = cam;

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!W || !Hc) return;
      const o = opts.current;
      const n = countRef.current;

      if (n !== shown || refit) {
        if (n > slots.length) slots = crowdSlots(Math.max(n, Math.ceil(slots.length * 1.25)), shapeSeed);
        if (n > shown) {
          const firstRow = slots[shown]?.row ?? 0;
          for (let i = shown; i < n; i++) {
            const rowsBack = Math.max(0, slots[i].row - firstRow);
            born[i] = now + Math.min(700, rowsBack * 25) + hash(i, 9) * 220;
          }
        } else if (n < shown) {
          for (let i = n; i < shown; i++) leaving.push({ i, at: now + hash(i, 9) * 120 });
        }
        shown = n;
        refit = false;
        // Fit the crowd's box into the canvas.
        const e = extents(slots.slice(0, Math.max(1, n)));
        const H = Math.min(o.personHeight, (W * 0.94) / (e.maxX - e.minX), (Hc * 0.9) / (e.top + e.bottom));
        const baseY = Hc / 2 + ((e.top - e.bottom) * H) / 2;
        target = { H, cx: W / 2 - ((e.minX + e.maxX) / 2) * H, baseY };
        if (!cam.H) cam = target;
      }

      const k = reduced ? 1 : 1 - Math.exp(-(1 / 60) * 6);
      cam = {
        H: cam.H + (target.H - cam.H) * k,
        cx: cam.cx + (target.cx - cam.cx) * k,
        baseY: cam.baseY + (target.baseY - cam.baseY) * k,
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hc);

      // people, back row first
      const sprites = spritesRef.current;
      const time = now / 1000;
      const draw = (i: number, alpha: number, rise: number) => {
        const p = slots[i];
        const cast = i < people.length ? i : Math.floor(hash(i, 1) * people.length);
        const rate = o.speed * (0.88 + hash(i, 6) * 0.24);
        const frame = reduced ? 0 : Math.floor(((time * rate) / LOOP + hash(i, 7)) * FRAMES) % FRAMES;
        const mips = sprites[cast]?.[frame] ?? sprites[cast]?.[0];
        if (!mips) return;
        const h = p.s * (people[cast].height ?? 1) * cam.H;
        const px = h * dpr;
        let m = 0;
        while (m + 1 < mips.length && mips[m + 1].height >= px) m++;
        const x = cam.cx + p.x * cam.H;
        const y = cam.baseY - p.y * cam.H + rise * h;
        ctx.globalAlpha = alpha;
        if (i >= people.length && hash(i, 2) < 0.5) {
          ctx.save();
          ctx.translate(x, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(mips[m], -0.3 * h, y - FEET * h, 0.6 * h, h);
          ctx.restore();
        } else {
          ctx.drawImage(mips[m], x - 0.3 * h, y - FEET * h, 0.6 * h, h);
        }
      };

      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const items: { i: number; a: number; r: number }[] = [];
      for (let i = 0; i < shown; i++) {
        const t = reduced ? 1 : Math.min(1, Math.max(0, (now - born[i]) / 520));
        if (t <= 0) continue;
        const e = ease(t);
        items.push({ i, a: e, r: (1 - e) * 0.45 });
      }
      for (let j = leaving.length - 1; j >= 0; j--) {
        const { i, at } = leaving[j];
        const t = Math.min(1, Math.max(0, (now - at) / 300));
        if (t >= 1 || i < shown) {
          leaving.splice(j, 1);
          continue;
        }
        items.push({ i, a: 1 - t, r: t * t * 0.45 });
      }
      items.sort((a, b) => slots[b.i].row - slots[a.i].row || slots[b.i].y - slots[a.i].y);
      for (const it of items) draw(it.i, it.a, it.r);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [people, shapeSeed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      role="img"
      aria-label={`A crowd of ${count.toLocaleString()} sketched people`}
    />
  );
}

// ---- count dial ------------------------------------------------------------

export interface CountDialProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Width in px. */
  width?: number;
  /** Seconds to sweep the whole range at full tilt. */
  sweep?: number;
  accent?: string;
  className?: string;
  style?: CSSProperties;
}

const STEPS = 1000;

/**
 * A small count control: the pointer and the number stay in the middle while
 * the ruler scrolls under them. Hover (or press) left of the pointer to count
 * down, right to count up, faster the further out. The scale is exponential,
 * so 1→20 is as easy to hit as 1,000→5,000. Arrow keys nudge it.
 */
export function CountDial({
  value,
  onChange,
  min = 1,
  max = 5000,
  width = 200,
  sweep = 2.4,
  accent = "#6a5af9",
  className,
  style,
}: CountDialProps) {
  const toValue = (p: number) => Math.round(min * Math.exp((p / STEPS) * Math.log(max / min)));
  const toPos = (v: number) => (Math.log(Math.max(min, v) / min) / Math.log(max / min)) * STEPS;

  const [pos, setPos] = useState(() => toPos(value));
  const posRef = useRef(pos);
  const velRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const emitted = useRef(value);
  const emit = (v: number) => {
    if (v === emitted.current) return;
    emitted.current = v;
    onChangeRef.current(v);
  };

  // Follow outside changes to `value`.
  useEffect(() => {
    emitted.current = value;
    if (toValue(posRef.current) !== value) {
      posRef.current = toPos(value);
      setPos(posRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = velRef.current;
      if (!v) return;
      const next = Math.min(STEPS, Math.max(0, posRef.current + v * (STEPS / sweep) * dt));
      if (next === posRef.current) return;
      posRef.current = next;
      setPos(next);
      emit(toValue(next));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweep, min, max]);

  const steer = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const t = ((clientX - r.left) / r.width) * 2 - 1; // -1 … 1
    const dead = 0.12;
    const m = Math.max(0, (Math.abs(t) - dead) / (1 - dead));
    velRef.current = Math.sign(t) * m * m;
  };
  const stop = () => {
    velRef.current = 0;
  };
  const nudge = (d: number) => {
    const next = Math.min(STEPS, Math.max(0, posRef.current + d));
    posRef.current = next;
    setPos(next);
    emit(toValue(next));
  };

  const shown = toValue(pos);
  const tickGap = 9;
  return (
    <div
      className={className}
      role="slider"
      tabIndex={0}
      aria-label="Count"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={shown}
      onPointerMove={(e) => steer(e.clientX, e.currentTarget)}
      onPointerDown={(e) => steer(e.clientX, e.currentTarget)}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onPointerUp={(e) => (e.pointerType === "mouse" ? undefined : stop())}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") nudge(-12);
        else if (e.key === "ArrowRight" || e.key === "ArrowUp") nudge(12);
        else return;
        e.preventDefault();
      }}
      style={{
        position: "relative",
        width,
        height: 58,
        cursor: "ew-resize",
        touchAction: "none",
        userSelect: "none",
        outline: "none",
        ...style,
      }}
    >
      {/* the number, riding on the pointer */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          transform: "translateX(-50%)",
          padding: "3px 10px",
          borderRadius: 999,
          background: "#1b1a1f",
          color: "#fff",
          font: '500 13px "JetBrains Mono", ui-monospace, monospace',
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {shown.toLocaleString("en-US")}
      </div>
      {/* ruler, scrolling with the value, fading out at both ends */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 8,
          height: 18,
          background: `repeating-linear-gradient(90deg, #c4c4cc 0 1.5px, transparent 1.5px ${tickGap}px)`,
          backgroundPositionX: `${-(pos * 0.9) % tickGap}px`,
          maskImage: "linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)",
          pointerEvents: "none",
        }}
      />
      {/* the pointer, fixed in the middle */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 4,
          width: 2.5,
          height: 26,
          marginLeft: -1.25,
          borderRadius: 2,
          background: accent,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
