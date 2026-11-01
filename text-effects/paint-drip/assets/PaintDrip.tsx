"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";

export interface PaintDripProps {
  text: string;
  /** Paint colors, from the color right under the letters to the color at the drip tips. */
  colors?: string[];
  /** Letter color. Defaults to the CSS color. */
  color?: string;
  /** Longest drip, em. */
  length?: number;
  /** How much the colors swirl and marble together, 0–2. */
  turbulence?: number;
  /** How far the paint stays the letter color before turning into `colors`, em. */
  melt?: number;
  /** Seconds for the drips to run down. */
  duration?: number;
  delay?: number;
  /** Speed of the paint flowing inside the drips. */
  speed?: number;
  /** Keep the paint flowing after the drips have run. */
  live?: boolean;
  trigger?: "load" | "inView";
  className?: string;
  style?: CSSProperties;
}

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
// r: px below the lowest letter pixel in this column (0 inside letters; huge
//    above the column's lowest letter pixel, so counters and gaps stay clean)
// b: letter coverage (anti-aliased)
uniform sampler2D uField;
uniform sampler2D uRamp;
uniform vec2 uRes;      // canvas px
uniform float uFs;      // font size, canvas px
uniform float uP;       // drip progress 0..1
uniform float uTime;
uniform float uLen;     // em
uniform float uTurb;
uniform float uMelt;    // em
uniform float uMid;     // canvas px, vertical centre of the text
uniform vec3 uColor;

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
float noise1(float x) { return noise(vec2(x, 0.37)); }
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; }
  return v;
}
vec4 field(vec2 px) { return texture(uField, px / uRes); }

void main() {
  vec2 p = vUv * uRes;
  float fs = uFs;
  float t = uTime;
  vec4 f0 = field(p);
  float grow = uP;

  // Paint wanders sideways more the farther below the text it has run.
  float below = p.y - uMid;
  float amp = (0.05 + 0.13 * uTurb) * fs * smoothstep(0.1 * fs, 0.8 * fs, below);
  float wx = (fbm(vec2(p.x / fs * 2.6, p.y / fs * 1.1 - t * 0.18)) - 0.5) * 2.0 * amp;
  vec2 pw = p + vec2(wx, 0.0);
  // Paint spreads a little sideways as it runs, merging neighbouring drips
  // into a curtain.
  float spread = 0.1 * fs * smoothstep(0.1 * fs, 0.6 * fs, below);
  float d = min(field(pw).r,
            min(field(pw + vec2(spread, 0.0)).r, field(pw - vec2(spread, 0.0)).r) + 0.25 * spread);

  // Drip length per column: a long, slow wave plus narrow fingers.
  float u = pw.x / fs;
  float prof = 0.4 + 0.3 * noise1(u * 1.4 + 3.0) + 0.4 * pow(noise1(u * 4.8 + 11.0), 2.0)
             + 0.25 * pow(noise1(u * 10.0 + 2.0), 3.0) - 0.1 * noise1(u * 17.0 + 5.0);
  prof = clamp(prof, 0.0, 1.0);
  float L = uLen * fs * prof * grow * (1.0 + 0.03 * sin(t * 0.6 + u * 3.0));
  float paint = (1.0 - smoothstep(L - 1.5, L + 0.5, d)) * step(0.001, grow);

  // Colors: the ramp runs down the drips, marbled by domain-warped noise that
  // flows downward, with vertical streaks.
  float fr = d / (uLen * fs);
  vec2 q = vec2(p.x / fs * 3.0, p.y / fs * 0.9 - t * 0.22);
  vec2 w = vec2(fbm(q), fbm(q + vec2(5.2, 1.3)));
  float s = fbm(q + 2.4 * uTurb * w + vec2(0.0, -t * 0.08));
  float streak = noise(vec2(p.x / fs * 13.0, p.y / fs * 0.7 - t * 0.3));
  float idx = fr * 0.95 + 0.12 + (s - 0.5) * 1.6 * uTurb + (streak - 0.5) * 0.35;
  vec3 col = texture(uRamp, vec2(clamp(idx, 0.0, 1.0), 0.5)).rgb;

  // Bright ribbons where the swirl folds (like streaks of the top color).
  float vein = 1.0 - smoothstep(0.0, 0.018, abs(s - 0.58));
  col = mix(col, texture(uRamp, vec2(0.18, 0.5)).rgb, vein * 0.75 * smoothstep(0.05, 0.25, fr));
  // Wet shading: slightly darker toward the drip edges, a soft sheen.
  float edge = smoothstep(L - 0.08 * fs, L, d);
  col *= 1.0 - 0.3 * edge;
  col += 0.08 * smoothstep(0.55, 0.8, streak) * (1.0 - edge);

  // The paint leaving the letters is the letter color itself; farther down
  // it gradually turns into the palette, along a marbled, flowing boundary
  // (streaks of letter-colored paint reach down into the colors).
  float m = d / (uMelt * fs) + (s - 0.5) * 1.2 * uTurb + (streak - 0.5) * 0.5;
  float own = 1.0 - smoothstep(0.55, 1.15, m);
  col = mix(col, uColor * (1.0 - 0.15 * edge), own);

  vec4 outPaint = vec4(col * paint, paint);

  // Letters stay solid.
  vec3 letter = uColor;
  float a = f0.b;
  outColor = outPaint * (1.0 - a) + vec4(letter * a, a);
}`;

function parseColor(css: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

// Field resolution cap (pixels); linear filtering covers the rest.
const MAX_FIELD_PIXELS = 900_000;
const FAR = 30000;

export function PaintDrip({
  text,
  colors = ["#fff3a0", "#ffcc1a", "#ff8c00", "#ff4500", "#e0112b", "#8a1a7a", "#3a1f8a", "#1a1660"],
  color,
  length = 4.6,
  turbulence = 1,
  melt = 0.85,
  duration = 10,
  delay = 1,
  speed = 1,
  live = true,
  trigger = "load",
  className,
  style,
}: PaintDripProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useMotionValue(0);
  const inView = useInView(rootRef, { once: true, amount: 0.3 });
  const started = trigger === "load" || inView;
  const [failed, setFailed] = useState(false);

  // Room around the text, em: the drips need space below.
  const padX = 0.4;
  const padTop = 0.15;
  const padBottom = length + 0.3;

  useEffect(() => {
    if (!started) return;
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    // Slow start, like paint gathering weight, then easing out as it runs.
    const controls = animate(progress, 1, { duration, delay, ease: [0.55, 0, 0.35, 1] });
    return () => controls.stop();
  }, [started, reduceMotion, duration, delay, progress]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true });
    if (!gl) {
      setFailed(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fsh = compile(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);

    const textures = [0, 1].map((unit) => {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    });
    gl.uniform1i(u("uField"), 0);
    gl.uniform1i(u("uRamp"), 1);

    // Paint ramp as a 256×1 gradient texture.
    const ramp = document.createElement("canvas");
    ramp.width = 256;
    ramp.height = 1;
    const rctx = ramp.getContext("2d")!;
    const grad = rctx.createLinearGradient(0, 0, 256, 0);
    colors.forEach((c, i) => grad.addColorStop(i / Math.max(colors.length - 1, 1), c));
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, 256, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ramp);

    // Draw the text, then per column measure how far each pixel is below the
    // letters (where paint runs) and, inside letters, how far to their bottom.
    let dirty = true;
    const build = () => {
      const cs = getComputedStyle(root);
      const fs = parseFloat(cs.fontSize) || 16;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = root.getBoundingClientRect();
      const w = Math.max(1, Math.round((rect.width + padX * 2 * fs) * dpr));
      const h = Math.max(1, Math.round((rect.height + (padTop + padBottom) * fs) * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);

      const s = Math.min(1, Math.sqrt(MAX_FIELD_PIXELS / (w * h)));
      const sw = Math.max(1, Math.round(w * s));
      const sh = Math.max(1, Math.round(h * s));
      const mask = document.createElement("canvas");
      mask.width = sw;
      mask.height = sh;
      const m = mask.getContext("2d", { willReadFrequently: true })!;
      m.fillStyle = "#000";
      m.fillRect(0, 0, sw, sh);
      m.fillStyle = "#fff";
      m.font = `${cs.fontStyle} ${cs.fontWeight} ${fs * dpr * s}px ${cs.fontFamily}`;
      if ("letterSpacing" in m && cs.letterSpacing !== "normal") {
        (m as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${parseFloat(cs.letterSpacing) * dpr * s}px`;
      }
      m.textAlign = "center";
      m.textBaseline = "middle";
      // Text box centre sits padTop em below the canvas top + half the box.
      m.fillText(text, sw / 2, (padTop * fs + rect.height / 2) * dpr * s);
      const px = m.getImageData(0, 0, sw, sh).data;

      const data = new Float32Array(sw * sh * 4);
      for (let x = 0; x < sw; x++) {
        // Paint only leaves from the lowest letter pixel in each column.
        let lowest = -1;
        for (let y = sh - 1; y >= 0; y--) {
          if (px[(y * sw + x) * 4] >= 128) {
            lowest = y;
            break;
          }
        }
        for (let y = 0; y < sh; y++) {
          const i = y * sw + x;
          const a = px[i * 4] / 255;
          data[i * 4] = a >= 0.5 ? 0 : lowest >= 0 && y > lowest ? (y - lowest) / s : FAR;
          data[i * 4 + 2] = a;
        }
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, sw, sh, 0, gl.RGBA, gl.FLOAT, data);

      gl.uniform2f(u("uRes"), w, h);
      gl.uniform1f(u("uFs"), fs * dpr);
      gl.uniform1f(u("uMid"), (padTop * fs + rect.height / 2) * dpr);
      gl.uniform3fv(u("uColor"), parseColor(color ?? cs.color));
      dirty = true;
    };
    gl.uniform1f(u("uLen"), length);
    gl.uniform1f(u("uTurb"), turbulence);
    gl.uniform1f(u("uMelt"), melt);
    build();
    const observer = new ResizeObserver(build);
    observer.observe(root);
    document.fonts?.addEventListener("loadingdone", build);

    let frame = 0;
    let last = -1;
    const start = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const p = progress.get();
      // Paint only flows once it's out (p > 0).
      if (!dirty && p === last && (!live || reduceMotion || p === 0)) return;
      last = p;
      dirty = false;
      gl.uniform1f(u("uP"), p);
      gl.uniform1f(u("uTime"), reduceMotion ? 0 : ((now - start) / 1000) * speed);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", build);
      // Free GPU resources but keep the context: React StrictMode (and fast
      // remounts) reuse the same canvas, and a lost context can't come back.
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteShader(vs);
      gl.deleteShader(fsh);
      gl.deleteProgram(prog);
    };
  }, [text, colors.join(), color, length, turbulence, melt, speed, live, padBottom, reduceMotion, progress]);

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
            left: `${-padX}em`,
            top: `${-padTop}em`,
            width: `calc(100% + ${padX * 2}em)`,
            height: `calc(100% + ${padTop + padBottom}em)`,
            pointerEvents: "none",
          }}
        />
      )}
    </span>
  );
}
