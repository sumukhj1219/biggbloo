"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";

export interface MetallicGlowProps {
  text: string;
  /** Glow ramp, coolest (dim edge) → hottest (white-hot spots). */
  colors?: string[];
  /** Tint of the glass letter body. */
  glass?: string;
  /** Speed of the moving highlights (1 = default). */
  speed?: number;
  /** Outer bloom size, em. */
  glow?: number;
  /** Overall brightness multiplier. */
  intensity?: number;
  /** How strongly corners, joints and thin hairlines burn, 0–2. */
  corners?: number;
  /** Seconds for the glow to ignite across the word. */
  duration?: number;
  delay?: number;
  /** Keep the highlights moving after ignition. */
  live?: boolean;
  trigger?: "load" | "inView";
  className?: string;
  style?: CSSProperties;
}

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;  // image coords, y down (matches the distance field)
out vec2 vFb;  // framebuffer coords, y up (for sampling the bloom buffers)
void main() {
  vFb = aPos * 0.5 + 0.5;
  vUv = vec2(vFb.x, 1.0 - vFb.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Shared by the emission pass and the final pass.
const COMMON = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vFb;
out vec4 outColor;
uniform sampler2D uSdf;   // signed distance to the outline, canvas px (negative inside)
uniform vec2 uRes;        // canvas px
uniform float uFs;        // font size, canvas px
uniform float uP;         // ignition progress 0..1
uniform float uTime;
uniform float uIntensity;
uniform float uCorners;

float sdf(vec2 px) { return texture(uSdf, px / uRes).r; }

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
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// How sharply the outline bends around q: the ring average of the distance
// field minus its centre is ~0 on straight edges and grows at corners,
// vertices, joints and hairlines (convex and concave alike).
float cornerness(vec2 q) {
  float h = 0.05 * uFs;
  float c = sdf(q);
  float s = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    s += sdf(q + h * vec2(cos(a), sin(a)));
  }
  float k = abs(s / 8.0 - c) / h;
  return smoothstep(0.08, 0.32, k);
}

// Light given off at edge point q (outward normal n).
float emission(vec2 q, vec2 n) {
  float t = uTime;
  // Metallic sheen: two lights circling the word. As they turn, the
  // highlight slides along every curve (bowls, arches) and flares on
  // straight edges when they face the light.
  float a1 = t * 0.55, a2 = -t * 0.37 + 2.2;
  float spec = pow(max(dot(n, vec2(cos(a1), sin(a1))), 0.0), 12.0)
             + 0.7 * pow(max(dot(n, vec2(cos(a2), sin(a2))), 0.0), 8.0);

  // Hot patches crawling along the edges.
  float flow = smoothstep(0.5, 0.8, fbm(q / uFs * 2.4 + vec2(t * 0.33, -t * 0.21)));

  // A slow band of light sweeping across the word.
  float sx = dot(q / uRes.y, normalize(vec2(1.0, 0.3)));
  float span = uRes.x / uRes.y + 1.4;
  float pos = fract(t * 0.08) * span - 0.7;
  float sweep = exp(-pow((sx - pos) / 0.14, 2.0));

  // Corners and vertices burn hottest and flicker a little.
  float k = cornerness(q) * uCorners;
  float flick = 0.8 + 0.2 * sin(t * 4.0 + q.x * 0.03 + q.y * 0.05);

  // Ignition sweeps left to right.
  float ignite = smoothstep(0.0, 0.3, uP * 1.3 - q.x / uRes.x * 0.3);

  return (0.14 + 0.6 * spec + 0.3 * flow + 0.4 * sweep + 0.8 * k * flick) * uIntensity * ignite;
}

// Distance, outward normal and nearest outline point for pixel p.
float edgeAt(vec2 p, out vec2 n, out vec2 q) {
  float d = sdf(p);
  // Wide-ish step: a 1px difference on the interpolated field is noisy and
  // makes the highlights hairy.
  float e = max(1.5, 0.012 * uFs);
  vec2 g = vec2(sdf(p + vec2(e, 0)) - sdf(p - vec2(e, 0)),
                sdf(p + vec2(0, e)) - sdf(p - vec2(0, e)));
  n = g / max(length(g), 1e-4);
  q = p - n * d;
  return d;
}
`;

// Pass 1 (half res): emission on a thin band around the outline. Blurred
// afterwards into the bloom, so the glow follows the moving hot spots.
const FRAG_EMIT = COMMON + `
void main() {
  vec2 p = vUv * uRes, n, q;
  float d = edgeAt(p, n, q);
  float band = exp(-pow(d / (0.02 * uFs + 1.0), 2.0));
  outColor = vec4(emission(q, n) * band * 0.5, 0.0, 0.0, 1.0);
}`;

// Separable Gaussian, 25 taps spaced sigma/4 apart (covers ±3 sigma).
const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 vFb;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uStep;  // uv between taps
void main() {
  float s = 0.0, wsum = 0.0;
  for (int i = -12; i <= 12; i++) {
    float x = float(i) / 4.0;
    float w = exp(-0.5 * x * x);
    s += texture(uTex, vFb + uStep * float(i)).r * w;
    wsum += w;
  }
  outColor = vec4(s / wsum, 0.0, 0.0, 1.0);
}`;

// Pass 2 (full res): crisp rims, glass body, plus the blurred bloom.
const FRAG = COMMON + `
uniform sampler2D uRamp;
uniform sampler2D uTight;
uniform sampler2D uWide;
uniform vec3 uGlass;

void main() {
  vec2 p = vUv * uRes, n, q;
  float d = edgeAt(p, n, q);
  float fs = uFs;
  float e = emission(q, n);

  float inside = smoothstep(0.7, -0.7, d);
  float rimW = 0.011 * fs + 0.6;
  float rim = exp(-pow((d + rimW * 0.3) / rimW, 2.0));          // bright line on the edge
  float leak = inside * exp(d / (0.03 * fs));                     // light just inside the glass
  float tight = texture(uTight, vFb).r * 2.0;
  float wide = texture(uWide, vFb).r * 2.0;
  // Bloom is dimmer inside the letters so the glass body stays dark.
  float bloom = (0.65 * tight + 1.8 * wide) * (1.0 - 0.55 * inside);
  float heat = e * (1.1 * rim + 0.3 * leak) + bloom;

  // Clear glass: dark translucent body, a cool rim and a second contour
  // inset by the glass thickness. Hidden wherever the glow takes over.
  float th = 0.06 * fs;
  float contour = exp(-pow((d + th) / (0.5 + 0.005 * fs), 2.0));
  float shine = inside * smoothstep(0.3, 0.0, abs(fract(dot(p / fs, vec2(0.6, 1.0)) * 0.5 - uTime * 0.02) - 0.5)) * 0.07;

  vec3 hot = texture(uRamp, vec2(clamp(heat, 0.0, 1.0), 0.5)).rgb;
  float ha = smoothstep(0.04, 0.4, heat);

  vec4 col = vec4(uGlass, 1.0) * inside * 0.3;
  float cool = (rim * 0.6 + contour * 0.3 + shine) * (1.0 - ha);
  col += vec4(vec3(0.86, 0.9, 0.96) * cool, cool);
  col = col * (1.0 - ha) + vec4(hot * ha, ha);
  outColor = vec4(min(col.rgb, vec3(1.0)), clamp(col.a, 0.0, 1.0));
}`;

const INF = 1e20;

// Felzenszwalb–Huttenlocher 1D squared distance transform (as in mapbox tiny-sdf).
function edt1d(grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Uint16Array, z: Float64Array) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

function edt(grid: Float64Array, w: number, h: number, f: Float64Array, v: Uint16Array, z: Float64Array) {
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

/** Signed distance (px, negative inside) from an anti-aliased alpha mask. */
function signedDistance(alpha: Uint8ClampedArray, w: number, h: number) {
  const n = w * h;
  const outer = new Float64Array(n);
  const inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i * 4] / 255;
    if (a >= 1) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const d = 0.5 - a;
      outer[i] = d > 0 ? d * d : 0;
      inner[i] = d < 0 ? d * d : 0;
    }
  }
  const len = Math.max(w, h);
  const f = new Float64Array(len);
  const v = new Uint16Array(len);
  const z = new Float64Array(len + 1);
  edt(outer, w, h, f, v, z);
  edt(inner, w, h, f, v, z);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  return out;
}

function parseColor(css: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

// Distance field resolution cap (pixels). Linear filtering keeps edges crisp
// even when the field is a bit coarser than the canvas.
const MAX_SDF_PIXELS = 700_000;

export function MetallicGlow({
  text,
  colors = ["#1a0300", "#6e1200", "#c42d00", "#ff5a00", "#ff8a1f", "#ffc27a", "#fff1dc", "#ffffff"],
  glass = "#3a404a",
  speed = 1,
  glow = 0.01,
  intensity = 1,
  corners = 0.1,
  duration = 1.6,
  delay = 0.2,
  live = true,
  trigger = "load",
  className,
  style,
}: MetallicGlowProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useMotionValue(0);
  const inView = useInView(rootRef, { once: true, amount: 0.3 });
  const started = trigger === "load" || inView;
  const [failed, setFailed] = useState(false);

  // Room around the text for the bloom, em.
  const pad = glow * 4 + 0.15;

  useEffect(() => {
    if (!started) return;
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, 1, { duration, delay, ease: [0.3, 0, 0.2, 1] });
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

    const shaders: WebGLShader[] = [];
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      shaders.push(sh);
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const link = (frag: string) => {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
      const loc = new Map<string, WebGLUniformLocation | null>();
      const u = (name: string) => {
        if (!loc.has(name)) loc.set(name, gl.getUniformLocation(prog, name));
        return loc.get(name)!;
      };
      return { prog, u };
    };
    const emit = link(FRAG_EMIT);
    const blur = link(FRAG_BLUR);
    const comp = link(FRAG);
    const programs = [emit, blur, comp];

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const newTexture = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    const sdfTex = newTexture();
    const rampTex = newTexture();

    // Glow ramp as a 256×1 gradient texture.
    const ramp = document.createElement("canvas");
    ramp.width = 256;
    ramp.height = 1;
    const rctx = ramp.getContext("2d")!;
    const grad = rctx.createLinearGradient(0, 0, 256, 0);
    colors.forEach((c, i) => grad.addColorStop(i / Math.max(colors.length - 1, 1), c));
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, 256, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ramp);

    // Bloom buffers: A/B at half res (tight glow), C/D at quarter res (wide glow).
    const targets = [0, 1, 2, 3].map(() => ({ tex: newTexture(), fbo: gl.createFramebuffer()!, w: 1, h: 1 }));
    const sizeTarget = (t: (typeof targets)[number], w: number, h: number) => {
      t.w = w;
      t.h = h;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    };
    const [A, B, C, D] = targets;

    let fontPx = 16;
    let W = 1;
    let H = 1;
    const shared = () => {
      for (const { prog, u } of [emit, comp]) {
        gl.useProgram(prog);
        gl.uniform1i(u("uSdf"), 0);
        gl.uniform2f(u("uRes"), W, H);
        gl.uniform1f(u("uFs"), fontPx);
        gl.uniform1f(u("uIntensity"), intensity);
        gl.uniform1f(u("uCorners"), corners);
      }
      gl.useProgram(comp.prog);
      gl.uniform1i(comp.u("uRamp"), 1);
      gl.uniform1i(comp.u("uTight"), 2);
      gl.uniform1i(comp.u("uWide"), 3);
      gl.uniform3fv(comp.u("uGlass"), parseColor(glass));
      gl.useProgram(blur.prog);
      gl.uniform1i(blur.u("uTex"), 4);
    };

    // Draw the text and turn it into a signed distance field. Redone when the
    // size or font changes.
    let dirty = true;
    const build = () => {
      const cs = getComputedStyle(root);
      const fs = parseFloat(cs.fontSize) || 16;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = root.getBoundingClientRect();
      const w = Math.max(1, Math.round((rect.width + pad * 2 * fs) * dpr));
      const h = Math.max(1, Math.round((rect.height + pad * 2 * fs) * dpr));
      canvas.width = w;
      canvas.height = h;
      W = w;
      H = h;
      fontPx = fs * dpr;

      const s = Math.min(1, Math.sqrt(MAX_SDF_PIXELS / (w * h)));
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
      m.fillText(text, sw / 2, sh / 2);
      const field = signedDistance(m.getImageData(0, 0, sw, sh).data, sw, sh);
      // Store distances in canvas px so the shader doesn't care about `s`.
      for (let i = 0; i < field.length; i++) field[i] /= s;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sdfTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, sw, sh, 0, gl.RED, gl.FLOAT, field);

      const hw = Math.max(1, Math.round(w / 2));
      const hh = Math.max(1, Math.round(h / 2));
      const qw = Math.max(1, Math.round(w / 4));
      const qh = Math.max(1, Math.round(h / 4));
      sizeTarget(A, hw, hh);
      sizeTarget(B, hw, hh);
      sizeTarget(C, qw, qh);
      sizeTarget(D, qw, qh);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      shared();
      dirty = true;
    };
    build();
    const observer = new ResizeObserver(build);
    observer.observe(root);
    document.fonts?.addEventListener("loadingdone", build);

    const quad = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const into = (t: (typeof targets)[number] | null) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
      gl.viewport(0, 0, t ? t.w : W, t ? t.h : H);
    };
    // Blur `src` along one axis into `dst`; sigma in `dst` pixels.
    const blurPass = (src: (typeof targets)[number], dst: (typeof targets)[number], sigma: number, horizontal: boolean) => {
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      into(dst);
      const stepPx = sigma / 4;
      gl.uniform2f(blur.u("uStep"), horizontal ? stepPx / dst.w : 0, horizontal ? 0 : stepPx / dst.h);
      quad();
    };

    let frame = 0;
    let last = -1;
    const start = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const p = progress.get();
      if (!dirty && p === last && (!live || reduceMotion)) return;
      last = p;
      dirty = false;
      const time = reduceMotion ? 3 : 3 + ((now - start) / 1000) * speed;

      // 1. Edge emission at half res.
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sdfTex);
      gl.useProgram(emit.prog);
      gl.uniform1f(emit.u("uP"), p);
      gl.uniform1f(emit.u("uTime"), time);
      into(A);
      quad();
      // 2. Tight bloom (A), then wide bloom from it at quarter res (D).
      gl.useProgram(blur.prog);
      const tight = (0.035 * fontPx) / 2;
      blurPass(A, B, tight, true);
      blurPass(B, A, tight, false);
      const wide = (glow * fontPx) / 4;
      blurPass(A, C, wide, true);
      blurPass(C, D, wide, false);
      // 3. Composite on screen.
      gl.useProgram(comp.prog);
      gl.uniform1f(comp.u("uP"), p);
      gl.uniform1f(comp.u("uTime"), time);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, rampTex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, A.tex);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, D.tex);
      into(null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      quad();
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", build);
      // Free GPU resources but keep the context: React StrictMode (and fast
      // remounts) reuse the same canvas, and a lost context can't come back.
      [sdfTex, rampTex, ...targets.map((t) => t.tex)].forEach((t) => gl.deleteTexture(t));
      targets.forEach((t) => gl.deleteFramebuffer(t.fbo));
      gl.deleteBuffer(buf);
      programs.forEach(({ prog }) => gl.deleteProgram(prog));
      shaders.forEach((sh) => gl.deleteShader(sh));
    };
  }, [text, colors.join(), glass, speed, glow, intensity, corners, live, pad, reduceMotion, progress]);

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
