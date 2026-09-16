// Adapted from a "letters turn edge-on as the word swings past a fixed window"
// canvas engine. Simplified for a one-shot ~1s reveal of a single fixed word
// (no multi-word cycling / letter-turnover flip logic): angle = (x - centre) / K,
// a detent-warped pendulum phase, and per-letter squash/lean sampled tables.
const DEG = Math.PI / 180;

const WORD = ["G", "O", "A", "L"] as const;
const N = WORD.length;

const PITCH_DEG = 78;
const PITCH_RAD = PITCH_DEG * DEG;
const DETENT = 0.7;
const CULL_RAD = 90 * DEG;
const K_OVER_CAP = 115 / 263;
const CAP_FRAC = 0.46;
const PIVOT_CAP = 0.37;
const PERIOD_S = 2.0;

const AMPLITUDE = ((N - 1) / 2) * PITCH_RAD;

const VSCALE = [1.0, 0.995, 0.985, 0.955, 0.923, 0.86, 0.83];
const LEAN = [0.0, 0.06, 0.115, 0.14, 0.15, 0.12, 0.06];

const INK = ["#F0413B", "#E88500", "#0FA3A3", "#2F6BE0"];

const FONT_WEIGHT = 800;

function table(t: readonly number[], absDeg: number): number {
  const s = Math.min(absDeg, 90) / 15;
  const i = Math.min(Math.floor(s), t.length - 2);
  return t[i] + (t[i + 1] - t[i]) * (s - i);
}

function detent(phi: number): number {
  return phi - (DETENT * PITCH_RAD * Math.sin((2 * Math.PI * phi) / PITCH_RAD)) / (2 * Math.PI);
}

interface Glyph {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  dx: number;
  dy: number;
}

export class SwingReveal {
  private ctx: CanvasRenderingContext2D | null;
  private glyphs: Glyph[] = [];
  private cap = 0;
  private K = 0;
  private pivotY = 0;
  private cx = 0;

  readonly ok: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private sceneW: number,
    private sceneH: number,
    private family: string,
  ) {
    this.ctx = canvas.getContext("2d");
    this.ok = !!this.ctx;
    if (this.ok) this.layout();
  }

  refreshFont(family?: string) {
    if (family) this.family = family;
    this.layout();
  }

  private layout() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.cap = this.sceneH * CAP_FRAC;
    this.K = this.cap * K_OVER_CAP;
    this.cx = this.sceneW / 2;
    const baseline = this.sceneH / 2 + this.cap / 2;
    this.pivotY = baseline - this.cap * PIVOT_CAP;

    const dpr = this.canvas.width / this.sceneW;
    const probe = 200;
    ctx.font = `${FONT_WEIGHT} ${probe}px ${this.family}`;
    const capAt = ctx.measureText("H").actualBoundingBoxAscent || probe * 0.72;
    const size = (probe * this.cap) / capAt;

    this.glyphs = WORD.map((ch, i) => {
      ctx.font = `${FONT_WEIGHT} ${size}px ${this.family}`;
      const m = ctx.measureText(ch);
      const left = m.actualBoundingBoxLeft;
      const right = m.actualBoundingBoxRight;
      const asc = m.actualBoundingBoxAscent;
      const desc = m.actualBoundingBoxDescent;
      const gw = Math.max(1, left + right);
      const gh = Math.max(1, asc + desc);
      const pad = 4;
      const c = document.createElement("canvas");
      c.width = Math.ceil((gw + pad * 2) * dpr);
      c.height = Math.ceil((gh + pad * 2) * dpr);
      const g = c.getContext("2d");
      if (g) {
        g.scale(dpr, dpr);
        g.font = `${FONT_WEIGHT} ${size}px ${this.family}`;
        g.textBaseline = "alphabetic";
        g.fillStyle = INK[i % INK.length];
        g.fillText(ch, pad + left, pad + asc);
      }
      return {
        canvas: c,
        w: gw + pad * 2,
        h: gh + pad * 2,
        dx: -(gw + pad * 2) / 2,
        dy: this.cap * PIVOT_CAP - asc - pad,
      };
    });
  }

  render(tSec: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = this.canvas.width / this.sceneW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.glyphs.length !== N) return;

    const phi = detent(AMPLITUDE * Math.sin((2 * Math.PI * tSec) / PERIOD_S));

    const slots = WORD.map((_, i) => {
      const u = (i - (N - 1) / 2) * PITCH_RAD;
      return { i, a: u + phi };
    }).sort((p, q) => Math.abs(q.a) - Math.abs(p.a));

    for (const { i, a } of slots) {
      if (Math.abs(a) >= CULL_RAD) continue;
      const g = this.glyphs[i];
      const x = this.cx + this.K * a;
      const absDeg = Math.abs(a) / DEG;
      const sq = Math.cos(a);
      const vs = table(VSCALE, absDeg);
      const rho = -Math.atan(table(LEAN, absDeg) * (a < 0 ? 1 : -1));
      const cr = Math.cos(rho);
      const sr = Math.sin(rho);
      ctx.setTransform(sq * cr * dpr, sq * sr * dpr, -vs * sr * dpr, vs * cr * dpr, x * dpr, this.pivotY * dpr);
      ctx.drawImage(g.canvas, g.dx, g.dy, g.w, g.h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  destroy() {
    this.glyphs = [];
    this.ctx = null;
  }
}
