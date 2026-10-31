"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { animate, useInView, useMotionValue, useReducedMotion } from "motion/react";

export interface AcidBlurProps {
  text: string;
  /** Heat-map ramp, coolest (faint haze) → hottest (letter cores). */
  colors?: string[];
  /** Text color before the effect kicks in. Defaults to the CSS color. */
  color?: string;
  /** Seconds from plain text to the full effect. */
  duration?: number;
  delay?: number;
  /** Length of the smoky trail, em. */
  smear?: number;
  /** Trail direction, degrees (0 = right, 90 = down, 225 = up-left). */
  angle?: number;
  /** Glow size, em. */
  glow?: number;
  /** Grain amount, 0–1. */
  grain?: number;
  /** Keep the grain and smoke drifting after the effect has arrived. */
  live?: boolean;
  trigger?: "load" | "inView";
  className?: string;
  style?: CSSProperties;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSharp;
// The text blurred at four radii (glow × 0.35, 0.8, 1.8, 3.6). The shader
// blends between them to get any blur radius in that range.
uniform sampler2D uB1;
uniform sampler2D uB2;
uniform sampler2D uB3;
uniform sampler2D uB4;
uniform sampler2D uRamp;
uniform vec2 uSmear;      // full trail offset, uv
uniform vec3 uColor;      // plain text color
uniform float uP;         // progress 0..1
uniform float uTime;
uniform float uGrain;
uniform vec2 uRes;

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

// Text blurred by a continuous "level": 0 = sharp, 1..4 = the blur textures.
float blurAt(vec2 uv, float level) {
  float s0 = texture2D(uSharp, uv).r;
  float s1 = texture2D(uB1, uv).r;
  if (level <= 1.0) return mix(s0, s1, level);
  float s2 = texture2D(uB2, uv).r;
  if (level <= 2.0) return mix(s1, s2, level - 1.0);
  float s3 = texture2D(uB3, uv).r;
  if (level <= 3.0) return mix(s2, s3, level - 2.0);
  return mix(s3, texture2D(uB4, uv).r, clamp(level - 3.0, 0.0, 1.0));
}

void main() {
  float p = uP;
  float sharp = texture2D(uSharp, vUv).r;
  // Heat spreads like diffusion: the spread radius grows with sqrt(time).
  float spread = sqrt(p);

  // 1. The letters themselves defocus: their edges soften to ~glow×0.3, enough
  //    to read as out of focus while staying legible.
  float core = blurAt(vUv, 0.9 * spread);
  // 2. Halo all around each letter (top, sides and bottom alike).
  float halo = texture2D(uB3, vUv).r;
  // 3. Wide, faint haze.
  float haze = texture2D(uB4, vUv).r;

  // 4. Smoke: heat carried off along the trail direction, sampled from ever
  //    wider blurs the farther it travels, bent into wisps by noise stretched
  //    along the direction, drifting over time.
  vec2 dir = normalize(uSmear + 1e-6);
  vec2 perp = vec2(-dir.y, dir.x);
  float along = dot(vUv * uRes, dir) / uRes.y;
  float across = dot(vUv * uRes, perp) / uRes.y;
  float streak = fbm(vec2(across * 16.0, along * 1.5 - uTime * 0.12));
  float smear = 0.0;
  float total = 0.0;
  for (int i = 1; i <= 20; i++) {
    float t = float(i) / 20.0;
    vec2 warp = perp * (streak - 0.5) * 0.09 * t
              + (vec2(fbm(vUv * 2.5 + uTime * 0.04), fbm(vUv * 2.5 - uTime * 0.03 + 5.1)) - 0.5) * 0.05 * t;
    float w = pow(1.0 - t, 1.1);
    smear += blurAt(vUv - uSmear * t * p + warp * p, 2.0 + 2.0 * t) * w;
    total += w;
  }
  smear = smear / total * (0.25 + 1.5 * streak);

  // Heat: letter cores hottest (mint), their soft edges fall through
  // peach/orange/pink, the halo is magenta/purple, haze and smoke are teal.
  float heat = core * mix(1.0, 0.9, p) + p * (halo * 0.32 + haze * 0.16 + smear * 0.5);

  // Film grain. It scales with the heat, so empty background stays clean
  // while the glow and the letters get gritty.
  float g = hash(gl_FragCoord.xy + fract(uTime * 0.37) * 517.0) - 0.5;
  // Gentler in the hottest cores so they read as a solid glow, like a real
  // thermal image; grittiest in the falloff.
  heat *= 1.0 + g * uGrain * p * 1.4 * (1.0 - 0.75 * smoothstep(0.75, 1.05, heat));
  heat = clamp(heat, 0.0, 1.0);

  vec3 ramp = texture2D(uRamp, vec2(heat, 0.5)).rgb;
  float alpha = smoothstep(0.03, 0.25, heat);
  vec4 acid = vec4(ramp * alpha, alpha);
  vec4 plain = vec4(uColor * sharp, sharp);
  gl_FragColor = mix(plain, acid, smoothstep(0.0, 0.55, p));
}`;

function parseColor(css: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

export function AcidBlur({
  text,
  colors = ["#0b2a33", "#1d6b74", "#5b2aa0", "#c42aa8", "#ff4f9a", "#ff8a3d", "#f7c27a", "#a3f0b2"],
  color,
  duration = 3,
  delay = 0.3,
  smear = 5,
  angle = 250,
  glow = 0.14,
  grain = 0.45,
  live = true,
  trigger = "load",
  className,
  style,
}: AcidBlurProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useMotionValue(0);
  const inView = useInView(rootRef, { once: true, amount: 0.3 });
  const started = trigger === "load" || inView;
  const [failed, setFailed] = useState(false);

  // Room around the text for the glow and trail, em.
  const pad = smear + glow * 3 + 0.2;

  useEffect(() => {
    if (!started) return;
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, 1, { duration, delay, ease: [0.4, 0, 0.2, 1] });
    return () => controls.stop();
  }, [started, reduceMotion, duration, delay, progress]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
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
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);

    const textures = [0, 1, 2, 3, 4, 5].map((unit) => {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    });
    ["uSharp", "uB1", "uB2", "uB3", "uB4", "uRamp"].forEach((name, i) => gl.uniform1i(u(name), i));
    const upload = (unit: number, source: HTMLCanvasElement) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    };

    // Heat ramp as a 256×1 gradient texture.
    const ramp = document.createElement("canvas");
    ramp.width = 256;
    ramp.height = 1;
    const rctx = ramp.getContext("2d")!;
    const grad = rctx.createLinearGradient(0, 0, 256, 0);
    colors.forEach((c, i) => grad.addColorStop(i / Math.max(colors.length - 1, 1), c));
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, 256, 1);
    upload(5, ramp);

    // Draw the text mask (white on black) in the element's font, plus two
    // blurred copies. Redone whenever the size or font changes.
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
      gl.viewport(0, 0, w, h);

      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const m = mask.getContext("2d")!;
      m.fillStyle = "#000";
      m.fillRect(0, 0, w, h);
      m.fillStyle = "#fff";
      m.font = `${cs.fontStyle} ${cs.fontWeight} ${fs * dpr}px ${cs.fontFamily}`;
      if ("letterSpacing" in m && cs.letterSpacing !== "normal") {
        (m as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${parseFloat(cs.letterSpacing) * dpr}px`;
      }
      m.textAlign = "center";
      m.textBaseline = "middle";
      m.fillText(text, w / 2, h / 2);
      upload(0, mask);

      const blurred = (radiusPx: number) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const b = c.getContext("2d")!;
        b.fillStyle = "#000";
        b.fillRect(0, 0, w, h);
        if (typeof (b as { filter?: string }).filter === "string") {
          b.filter = `blur(${radiusPx}px)`;
          b.drawImage(mask, 0, 0);
        } else {
          // No canvas filter: downscale then upscale with smoothing.
          const k = Math.max(1, Math.round(radiusPx / 2));
          const small = document.createElement("canvas");
          small.width = Math.max(1, Math.round(w / k));
          small.height = Math.max(1, Math.round(h / k));
          small.getContext("2d")!.drawImage(mask, 0, 0, small.width, small.height);
          b.imageSmoothingQuality = "high";
          b.drawImage(small, 0, 0, w, h);
        }
        return c;
      };
      [0.35, 0.8, 1.8, 3.6].forEach((k, i) => upload(i + 1, blurred(glow * k * fs * dpr)));

      const rad = (angle * Math.PI) / 180;
      gl.uniform2f(u("uSmear"), (Math.cos(rad) * smear * fs * dpr) / w, (Math.sin(rad) * smear * fs * dpr) / h);
      gl.uniform2f(u("uRes"), w, h);
      gl.uniform3fv(u("uColor"), parseColor(color ?? cs.color));
      gl.uniform1f(u("uGrain"), grain);
      dirty = true;
    };
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
      // Once settled, only keep drawing if the grain/smoke should stay alive.
      if (!dirty && p === last && (!live || reduceMotion || p === 0)) return;
      last = p;
      dirty = false;
      gl.uniform1f(u("uP"), p);
      gl.uniform1f(u("uTime"), reduceMotion ? 0 : (now - start) / 1000);
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
      gl.deleteProgram(prog);
    };
  }, [text, colors.join(), color, smear, angle, glow, grain, live, pad, reduceMotion, progress]);

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
