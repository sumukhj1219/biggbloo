"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";

export interface TearTheme {
  /** Letter fill. */
  fill: string;
  /** Outer glow outline + echo trail. */
  rim: string;
  /** Thin inner outline. */
  edge: string;
}

export interface TextTearProps {
  /** Words in the loop. Each one tears open to reveal the next. */
  words: string[];
  /** Per-word look, cycled. */
  themes?: TearTheme[];
  /** Colors of the tear itself: hot core, warm streaks, cool outer rim. */
  tearColors?: [string, string, string];
  /** Seconds each word rests before tearing. */
  hold?: number;
  /** Seconds for one tear, from the first crack to the next word filling in. */
  duration?: number;
  /** Vertical stretch of the letters, 1 = natural. They fill the box either way. */
  aspect?: number;
  /** Perspective turn, degrees. Positive: left side closer. 0 = flat. */
  tilt?: number;
  /** Echo outlines trailing to the left. */
  echoes?: number;
  /** Controlled mode: freeze the tear from the first word to the second at this
   *  point, 0–1 (e.g. drive it from scroll). Omit for the automatic loop. */
  progress?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_THEMES: TearTheme[] = [
  { fill: "#f5c536", rim: "#3fd6e8", edge: "#ff4f6e" },
  { fill: "#f3e8ef", rim: "#3ccfe2", edge: "#ff6aa8" },
  { fill: "#ff8a3d", rim: "#46e0d0", edge: "#ff3d7f" },
];

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Two premultiplied word textures, A (current) and B (next). A tear runs
// along y = uYc from left to right: a wedge, widest behind its tip, with a
// jagged edge. Inside it B shows; around it A is pulled toward the tear and
// smeared backwards; the edge glows hot pink/orange with scan streaks and a
// cyan outer rim. After the tip crosses, the wedge opens until B fills all.
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uP;       // 0..1 through the tear
uniform float uTime;
uniform float uYc;      // tear line
uniform float uSeed;
uniform float uPlain;   // 1 = reduced motion: plain cross-fade
uniform vec2 uRes;
uniform vec3 uHot;
uniform vec3 uWarm;
uniform vec3 uCool;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

// Horizontal smear: average taps trailing to the left (behind the tip).
vec4 smear(sampler2D t, vec2 uv, float len) {
  if (len < 0.0005) return texture2D(t, uv);
  vec4 s = vec4(0.0);
  for (int i = 0; i < 8; i++) {
    float k = float(i) / 7.0;
    s += texture2D(t, uv - vec2(len * k * k, 0.0));
  }
  return s / 8.0;
}

void main() {
  vec2 uv = vUv;
  float p = uP;

  if (uPlain > 0.5) {
    gl_FragColor = mix(texture2D(uA, uv), texture2D(uB, uv), smoothstep(0.0, 1.0, p));
    return;
  }

  // Zipper geometry: a ">" whose tip runs left to right. Behind the tip the two
  // lips spread apart in straight lines (half-height grows linearly with the
  // distance behind the tip), so the left side is wide open while the tip is
  // still sharp. Small teeth ride along the lips.
  float tip = mix(-0.02, 2.0, smoothstep(0.02, 1.0, p));
  float behind = tip - uv.x;
  float slope = 0.62;                                   // how fast the zip spreads
  float dy = uv.y - uYc;
  float teeth = 0.006 * abs(fract(uv.x * 46.0 + (dy > 0.0 ? 0.5 : 0.0)) - 0.5) * 2.0;
  float wobble = 0.006 * (noise(vec2(uv.x * 9.0 + uSeed, uTime * 0.9)) - 0.5);
  float halfH = behind > 0.0 ? behind * slope + teeth + wobble : 0.0;
  float inside = halfH - abs(dy);                       // > 0 inside the opening
  float w = clamp(behind / 0.6, 0.0, 1.0);              // 0 at the tip, 1 well behind it
  float soft = 0.003 + 0.006 * w;
  float m = smoothstep(-soft, soft, inside);            // 1 = next word

  float fadeFx = smoothstep(0.0, 0.05, p) * (1.0 - smoothstep(0.85, 1.0, p));
  // A hairline crack runs just ahead of the tip.
  float crack = exp(-max(-behind, 0.0) * 10.0) * exp(-abs(dy) * 110.0) * step(behind, 0.0);

  // The current word isn't cut away, it's torn apart: each half is pushed
  // away from the line by the opening and bunches up against the box edge
  // (compressed, not deleted), so the letters bend around the ">" and stay
  // visible as flaps until they're squeezed out at the top and bottom.
  float side = dy > 0.0 ? 1.0 : -1.0;
  float room = (dy > 0.0 ? 1.0 - uYc : uYc) + 0.04;     // line to the box edge
  float d = abs(dy);
  float h = min(max(halfH, 0.0), room * 0.985);
  float bunch = mix(1.0, room / max(room - h, 0.002), 0.6);
  float src = max(d - h, 0.0) * bunch;
  float lip = d - h;                                    // distance from the torn edge
  float fold = exp(-max(lip, 0.0) / (0.018 + 0.03 * w)) * step(0.0, behind);
  vec2 uvA = uv;
  uvA.y = uYc + side * src;
  uvA.x -= 0.025 * fold * fadeFx;                       // the edge drags toward the tip
  vec4 A = smear(uA, uvA, (0.035 * fold + 0.012 * crack) * fadeFx);
  // Fold shading: the torn edge rolls under (darker), with a lit ridge on top.
  float ridge = exp(-max(lip, 0.0) / 0.006) * step(0.0, behind);
  A.rgb *= 1.0 - 0.4 * fold * (1.0 - ridge) * fadeFx;
  A.rgb += A.a * vec3(0.25) * ridge * fadeFx;
  // Flaps thin out as they get squeezed against the edge, and are gone by the end.
  A *= 1.0 - 0.75 * smoothstep(0.55, 1.0, h / room);
  A *= 1.0 - smoothstep(0.9, 1.0, p);

  // The next word bubbles up right behind the tip: it starts small and bright
  // at the lips, overshoots, and settles within a short distance.
  float age = max(behind, 0.0);
  float bubble = 1.0 - 0.28 * exp(-age * 16.0) + 0.07 * sin(age * 26.0) * exp(-age * 9.0);
  vec2 uvB = uv;
  uvB.y = uYc + dy / bubble;
  uvB.x = tip - (tip - uv.x) / mix(1.0, bubble, 0.5);
  vec4 B = texture2D(uB, uvB);
  B.rgb *= 1.0 + 0.35 * exp(-age * 12.0) * fadeFx;      // a flash as it pops
  float inBand = (1.0 - smoothstep(0.0, 0.035 + 0.04 * w, inside)) * fadeFx;

  vec4 col = mix(A, B, m);

  // Glowing edge: hot core with fine scan streaks, cyan just outside.
  float stripes = 0.5 + 0.5 * sin(dy * uRes.y * 0.9 + uv.x * 40.0);
  vec3 hot = mix(uHot, uWarm, stripes * 0.7 + 0.3 * noise(vec2(uv.x * 30.0, dy * 200.0)));
  float edgeW = 0.003 + 0.006 * w;
  float edge = exp(-abs(inside) / edgeW);
  vec3 glowCol = mix(hot, uCool, smoothstep(0.0, edgeW * 2.5, -inside));
  float ink = max(A.a, B.a);
  // The lips glow; strongest on the letters, faint over empty background.
  float g = (edge * (0.2 + 0.55 * ink) + crack * 0.8) * fadeFx;
  // Streaked, tinted band just inside the tear (the torn fibres).
  float fib = inBand * m * (0.35 + 0.65 * stripes) * ink;
  col.rgb = mix(col.rgb, hot * col.a, fib * 0.55);

  // Screen the glow on (keeps the hue, never blows out to white), premultiplied.
  g = clamp(g, 0.0, 1.0);
  col.rgb = col.rgb + glowCol * g * (1.0 - col.rgb * 0.6);
  col.a = clamp(max(col.a, g * 0.85), 0.0, 1.0);
  col.rgb = min(col.rgb, vec3(col.a) * 1.15);
  gl_FragColor = col;
}`;

export function TextTear({
  words,
  themes = DEFAULT_THEMES,
  tearColors = ["#ff3d7f", "#ffb347", "#3fe0f0"],
  hold = 0.1,
  duration = 1.8,
  aspect = 1.05,
  tilt = 18,
  echoes = 3,
  progress,
  className,
  style,
}: TextTearProps) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ words, themes, tearColors, hold, duration, echoes, reduced, progress });
  live.current = { words, themes, tearColors, hold, duration, echoes, reduced, progress };
  const wordsKey = words.join("\u0000") + "|" + themes.map((t) => t.fill + t.rim + t.edge).join() + "|" + echoes;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;

    const prog = program(gl, VERT, FRAG);
    if (!prog) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      A: u("uA"), B: u("uB"), P: u("uP"), T: u("uTime"), Yc: u("uYc"), Seed: u("uSeed"),
      Plain: u("uPlain"), Res: u("uRes"), Hot: u("uHot"), Warm: u("uWarm"), Cool: u("uCool"),
    };
    gl.uniform1i(U.A, 0);
    gl.uniform1i(U.B, 1);

    let textures: WebGLTexture[] = [];
    let W = 0;
    let H = 0;

    const build = () => {
      const { words: ws, themes: th, echoes: ec } = live.current;
      const rect = root.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.round(rect.width * dpr);
      let h = Math.round(rect.height * dpr);
      const cap = 2_400_000 / (w * h);
      if (cap < 1) {
        w = Math.round(w * Math.sqrt(cap));
        h = Math.round(h * Math.sqrt(cap));
      }
      W = w;
      H = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      for (const t of textures) gl.deleteTexture(t);
      const cs = getComputedStyle(root);
      const font = { family: cs.fontFamily, weight: cs.fontWeight };
      textures = ws.map((word, i) => {
        const c = drawWord(word, th[i % th.length], w, h, font, ec);
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
      });
    };

    let raf = 0;
    let visible = true;
    let index = 0; // current word
    let phaseStart = performance.now();
    let rebuildTimer = 0;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(root);
    const ro = new ResizeObserver(() => {
      clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(build, 120);
    });
    ro.observe(root);
    build();
    document.fonts?.ready.then(build);
    const onFonts = () => build();
    document.fonts?.addEventListener?.("loadingdone", onFonts);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || !textures.length || !W) return;
      const { hold: hd, duration: du, tearColors: tc, reduced: rm, progress: fixed } = live.current;
      const n = textures.length;
      const tearLen = rm ? Math.min(0.6, du) : du;
      let t = (now - phaseStart) / 1000;
      if (t > hd + tearLen) {
        index = (index + 1) % n;
        phaseStart = now;
        t = 0;
      }
      let p = n < 2 ? 0 : clamp((t - hd) / tearLen, 0, 1);
      if (fixed !== undefined) {
        index = 0;
        p = clamp(fixed, 0, 1);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[index]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[(index + 1) % n]);
      gl.uniform1f(U.P, p);
      gl.uniform1f(U.T, now / 1000);
      // Each tear runs along its own line, near the middle.
      gl.uniform1f(U.Yc, 0.5 + 0.09 * Math.sin(index * 2.4 + 0.6));
      gl.uniform1f(U.Seed, index * 17.3);
      gl.uniform1f(U.Plain, rm ? 1 : 0);
      gl.uniform2f(U.Res, W, H);
      gl.uniform3fv(U.Hot, rgb(tc[0]));
      gl.uniform3fv(U.Warm, rgb(tc[1]));
      gl.uniform3fv(U.Cool, rgb(tc[2]));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rebuildTimer);
      io.disconnect();
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", onFonts);
      for (const t of textures) gl.deleteTexture(t);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey]);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={words.join(", ")}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: String(aspect),
        perspective: tilt ? "900px" : undefined,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          transform: tilt ? `rotateY(${tilt}deg)` : undefined,
          transformOrigin: "50% 50%",
        }}
      />
    </div>
  );
}

/** One word, stretched to fill the box: echo outlines, glowing rim, inner edge, fill. */
function drawWord(
  word: string,
  theme: TearTheme,
  w: number,
  h: number,
  font: { family: string; weight: string },
  echoes: number,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const text = word.toUpperCase();
  ctx.font = `${font.weight} 100px ${font.family}`;
  const m = ctx.measureText(text);
  const tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const asc = m.actualBoundingBoxAscent;
  const desc = m.actualBoundingBoxDescent;
  const echoGap = 0.035; // of font size, per echo
  const fs = (100 * (w * 0.84)) / (tw + 100 * echoGap * echoes);
  const sy = (h * 0.8) / (((asc + desc) * fs) / 100);
  const k = fs / 100;
  // Left edge of the ink, shifted right to leave room for the echoes on the left.
  const x0 = (w - tw * k) / 2 + (fs * echoGap * echoes) / 2 + m.actualBoundingBoxLeft * k;
  const baseY = ((asc - desc) / 2) * k;

  ctx.font = `${font.weight} ${fs}px ${font.family}`;
  ctx.lineJoin = "round";
  ctx.setTransform(1, 0, 0, sy, 0, h / 2);
  const stroke = (px: number) => px / Math.sqrt(sy); // keep strokes even under the stretch

  // Echo outlines trailing left, fading.
  for (let i = echoes; i >= 1; i--) {
    ctx.globalAlpha = 0.18 + 0.5 * (1 - i / (echoes + 1));
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = stroke(fs * 0.016);
    ctx.strokeText(text, x0 - fs * echoGap * i, baseY);
  }
  ctx.globalAlpha = 1;
  // Glowing rim.
  ctx.shadowColor = theme.rim;
  ctx.shadowBlur = fs * 0.06;
  ctx.strokeStyle = theme.rim;
  ctx.lineWidth = stroke(fs * 0.05);
  ctx.strokeText(text, x0, baseY);
  ctx.shadowBlur = 0;
  // Inner edge, then fill.
  ctx.strokeStyle = theme.edge;
  ctx.lineWidth = stroke(fs * 0.028);
  ctx.strokeText(text, x0, baseY);
  ctx.fillStyle = theme.fill;
  ctx.fillText(text, x0, baseY);
  // A soft highlight down the upper half, so the fill isn't dead flat.
  ctx.globalCompositeOperation = "source-atop";
  const g = ctx.createLinearGradient(0, -h / (2 * sy), 0, h / (2 * sy));
  g.addColorStop(0, "rgba(255,255,255,0.18)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, -h / (2 * sy), w, h / sy);
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function program(gl: WebGLRenderingContext, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const v = sh(gl.VERTEX_SHADER, vs);
  const f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function rgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
