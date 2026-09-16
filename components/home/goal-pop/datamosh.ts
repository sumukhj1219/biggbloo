// Adapted from a "datamoshed corrupted video" canvas engine: fixed non-uniform
// column grid, only vertical tile position animates. Ported near-verbatim since
// every spatial constant here is already a fraction of the canvas's own w/h.
const PALETTE = [
  "#ffffff",
  "#3566ff",
  "#ffcf00",
  "#192aff",
  "#d62036",
  "#282142",
  "#ec4978",
  "#ff9900",
  "#14101f",
  "#00dd33",
  "#00ef82",
] as const;

const COLS = 11;
const POWER = 1.65;
const TILES = 15;
const CYCLE = 0.2;
const STAGGER = 0.006;
const STRETCH = 8.5;
const EARLY = 1.0;
const SPRING_K = 1.6;
const BLEED = 0.012;
const COL_PHASE = -0.4;

const SPRING_NORM = 1 - Math.exp(-SPRING_K);

function springStep(p: number): number {
  const half = (t: number) => (1 - Math.exp(-SPRING_K * t)) / SPRING_NORM;
  return p < 0.5 ? 0.5 * half(2 * p) : 1 - 0.5 * half(2 * (1 - p));
}

function pickDifferent(from: number, avoid: number[]): number {
  for (let i = 1; i <= PALETTE.length; i++) {
    const c = (from + i) % PALETTE.length;
    if (!avoid.includes(c)) return c;
  }
  return from;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DatamoshReveal {
  private ctx: CanvasRenderingContext2D | null;
  private edges: number[] = [];
  private strip: number[] = [];

  readonly ok: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    seed = 1,
  ) {
    this.ctx = canvas.getContext("2d");
    this.ok = !!this.ctx;
    if (this.ok) {
      this.buildColours(seed);
      this.measure();
    }
  }

  private buildColours(seed: number) {
    const rand = mulberry32(seed);
    const WHITE = 0;
    const DARKS = [8, 5];
    const HUES = [1, 2, 3, 4, 6, 7, 9, 10];
    const LEN = 61;
    const strip: number[] = [];
    let lastHue = -1;

    for (let n = 0; n < LEN; n++) {
      const r = rand();
      let next: number;
      if (r < 0.26) {
        next = WHITE;
      } else if (r < 0.42) {
        next = DARKS[Math.floor(rand() * DARKS.length)];
      } else {
        let h = HUES[Math.floor(rand() * HUES.length)];
        if (h === lastHue) h = HUES[(HUES.indexOf(h) + 1) % HUES.length];
        lastHue = h;
        next = h;
      }
      if (n > 0 && next === strip[n - 1]) {
        next = pickDifferent(next, [strip[n - 1]]);
      }
      strip.push(next);
    }
    if (strip[LEN - 1] === strip[0]) {
      strip[LEN - 1] = pickDifferent(strip[LEN - 1], [strip[LEN - 2], strip[0]]);
    }
    this.strip = strip;
  }

  private measure() {
    const w = this.canvas.width;
    this.edges = [];
    for (let i = 0; i <= COLS; i++) {
      this.edges.push(Math.round(w * Math.pow(i / COLS, POWER)));
    }
  }

  private tileEdge(k: number): number {
    const u = k / TILES;
    if (u < 0) return u * 0.05;
    if (u > 1) return 1 + (u - 1) * 0.05;
    const v = Math.pow(u, EARLY);
    const a = Math.pow(v, STRETCH);
    return a / (a + Math.pow(1 - v, STRETCH));
  }

  render(elapsed: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const h = this.canvas.height;
    const edges = this.edges;
    ctx.clearRect(0, 0, this.canvas.width, h);

    for (let i = 0; i < COLS; i++) {
      const x0 = edges[i];
      const cw = edges[i + 1] - x0;
      if (cw <= 0) continue;

      const delay = (COLS - 1 - i) * STAGGER;
      const t = elapsed - delay;
      const raw = t <= 0 ? 0 : t / CYCLE;

      const linear = raw + i * COL_PHASE;
      const step = Math.floor(linear);
      const frac = linear - step;
      const flow = step + springStep(frac);

      const bleed = Math.round(BLEED * h);
      const base = -Math.floor(flow);
      for (let n = TILES + 2; n >= -2; n--) {
        const id = base + n;
        const k = id + flow;
        const top = Math.round(this.tileEdge(k) * h);
        const bot = Math.round(this.tileEdge(k + 1) * h) + bleed;
        if (bot <= top || bot <= 0 || top >= h) continue;
        const y = Math.max(0, top);
        const th = Math.min(h, bot) - y;
        if (th <= 0) continue;

        const s = id - i;
        const len = this.strip.length;
        ctx.fillStyle = PALETTE[this.strip[((s % len) + len) % len]];
        ctx.fillRect(x0, y, cw, th);
      }
    }
  }

  destroy() {
    this.edges = [];
    this.strip = [];
    this.ctx = null;
  }
}
