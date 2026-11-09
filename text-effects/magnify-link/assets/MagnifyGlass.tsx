"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface MagnifyGlassProps {
  /** The text. Plain `<a href>` elements inside become previewable links. */
  children: ReactNode;
  /** Lens diameter, px. */
  size?: number;
  /** Text magnification under the glass. */
  zoom?: number;
  /** Link-preview magnification. 1 = the whole page width fits the lens. */
  previewZoom?: number;
  /** Virtual viewport link previews are laid out at, px. */
  pageWidth?: number;
  pageHeight?: number;
  /** Fish-eye bulge of the glass, 0–0.5. */
  distort?: number;
  /** Color fringing toward the rim, 0–0.2. */
  aberration?: number;
  /** Blur at the container's four edges, px. 0 = off. */
  edgeBlur?: number;
  /** How far the edge blur reaches in, px (`blurShape="edges"`). */
  edgeSize?: number;
  /** "radial": sharp center, blur grows toward every side and corner (elliptical).
   *  "edges": a band along each of the four edges. */
  blurShape?: "radial" | "edges";
  /** Fade the blurred rim into the background color so it blends with the page. */
  blend?: boolean;
  /** Rim, collar and end-cap metal (hex). */
  metal?: string;
  /** Handle grip (hex). */
  grip?: string;
  /** Royal dressing: beaded gold rim, gold-banded velvet grip, crowned pommel. Pairs with a gold `metal` and a deep `grip` color. */
  ornate?: boolean;
  /** Preview overrides by href: image URL or any node. Also: `<a data-preview="/shot.png">`. */
  previews?: Record<string, ReactNode | string>;
  /** "links": the glass appears only while the pointer is on a link (preview).
   *  "always": it rests on the text all the time and magnifies it. */
  show?: "links" | "always";
  /** Hide the cursor where the glass is showing: the lens center is the pointer. */
  hideCursor?: boolean;
  /** Lens fill behind the magnified text. Default: the nearest opaque background. */
  background?: string;
  className?: string;
  style?: CSSProperties;
}

const OS = 2; // the bent layer renders at 2x: smooth edges from a nearest-pixel SVG filter
const BASE_ANGLE = 45; // handle points down-right, degrees (screen)

interface Mounted {
  key: string; // absolute href
  src: ReactNode | string | undefined; // undefined = live iframe
}

export function MagnifyGlass({
  children,
  size = 200,
  zoom = 2,
  previewZoom = 3,
  pageWidth = 1280,
  pageHeight = 800,
  distort = 0.25,
  aberration = 0.025,
  edgeBlur = 12,
  edgeSize = 56,
  blurShape = "radial",
  blend = true,
  metal = "#d5d8de",
  grip = "#16161a",
  ornate = false,
  previews,
  show = "links",
  hideCursor = true,
  background,
  className,
  style,
}: MagnifyGlassProps) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const R = size / 2;
  const D = size * OS;
  const geo = useMemo(() => glassGeometry(size, ornate), [size, ornate]);

  // Lens center, in root coordinates.
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const sx = useSpring(tx, { stiffness: 380, damping: 34, mass: 0.7 });
  const sy = useSpring(ty, { stiffness: 380, damping: 34, mass: 0.7 });
  const X = reduced ? tx : sx;
  const Y = reduced ? ty : sy;

  // Where the text box sits inside the root (the clone in the lens copies it).
  const boxL = useMotionValue(0);
  const boxT = useMotionValue(0);
  const [boxW, setBoxW] = useState(0);

  // Link preview state.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spx = useSpring(px, { stiffness: 120, damping: 22 });
  const spy = useSpring(py, { stiffness: 120, damping: 22 });
  const PX = reduced ? px : spx;
  const PY = reduced ? py : spy;
  const mix = useMotionValue(0); // 0 = magnified text, 1 = link preview
  const [mounted, setMounted] = useState<Mounted[]>([]);
  const [shown, setShown] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, true>>({});

  const lensX = useTransform(X, (v) => v - R);
  const lensY = useTransform(Y, (v) => v - R);
  const canvasX = useTransform(X, (v) => v - geo.c);
  const canvasY = useTransform(Y, (v) => v - geo.c);
  const textTransform = useTransform([X, Y, boxL, boxT], ([x, y, l, t]: number[]) => {
    const k = zoom * OS;
    return `translate(${D / 2 - (x - l) * k}px, ${D / 2 - (y - t) * k}px) scale(${k})`;
  });
  const previewTransform = useTransform([PX, PY, mix], ([fx, fy, m]: number[]) => {
    const k = ((previewZoom * size) / pageWidth) * OS * (0.8 + 0.2 * m);
    const ox = clamp(D / 2 - fx * pageWidth * k, D - pageWidth * k, 0);
    const oy = clamp(D / 2 - (0.08 + 0.42 * fy) * pageHeight * k, D - pageHeight * k, 0);
    return `translate(${ox}px, ${oy}px) scale(${k})`;
  });
  const previewBlur = useTransform(mix, (m) => `blur(${(1 - m) * 5 * OS}px)`);

  // Keep the latest values for the frame loop without restarting it.
  const live = useRef({ X, Y, reduced, background, previews, show });
  live.current = { X, Y, reduced, background, previews, show };
  const insideRef = useRef(false);
  // Links mode: the whole glass comes and goes with the preview.
  const appear = useTransform(mix, (m) => (show === "links" ? clamp(m, 0, 1) : 1));
  const glassScale = useTransform(appear, (a) => 0.55 + 0.45 * a);
  const activeRef = useRef<string | null>(null);
  const lastPointer = useRef<string>("mouse");

  function activate(a: HTMLAnchorElement | null) {
    const key = a ? a.href : null;
    if (key === activeRef.current) return;
    const wasIdle = activeRef.current === null;
    activeRef.current = key;
    if (a && key && wasIdle && live.current.show === "links") {
      // Appear right at the pointer instead of sliding in from the last spot.
      sx.jump(tx.get());
      sy.jump(ty.get());
    }
    if (a && key) {
      const raw = a.getAttribute("href") ?? key;
      const p = live.current.previews;
      const src = p?.[raw] ?? p?.[key] ?? a.dataset.preview ?? undefined;
      setMounted((m) => (m.some((e) => e.key === key) ? m : [...m, { key, src }]));
      setShown(key);
    }
    if (live.current.reduced) mix.set(a ? 1 : 0);
    else animate(mix, a ? 1 : 0, a ? { type: "spring", stiffness: 260, damping: 26 } : { duration: 0.22 });
  }

  // Measure the text box; start the glass in the middle of it.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;
    let first = true;
    const measure = () => {
      boxL.set(inner.offsetLeft);
      boxT.set(inner.offsetTop);
      setBoxW(inner.offsetWidth);
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (first) {
        first = false;
        tx.set(inner.offsetLeft + inner.offsetWidth * 0.5);
        ty.set(inner.offsetTop + inner.offsetHeight * 0.5);
        sx.jump(tx.get());
        sy.jump(ty.get());
      } else {
        tx.set(clamp(tx.get(), 0, w));
        ty.set(clamp(ty.get(), 0, h));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(inner);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // three.js: metal rim + handle and the glass surface, plus the frame loop
  // that hit-tests what's under the lens.
  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const scene3 = buildScene(canvas, geo, metal, grip, ornate);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(root);

    let raf = 0;
    let lastT = performance.now();
    let lastX = live.current.X.get();
    let lastY = live.current.Y.get();
    let swing = 0;
    let shiftX = 0;
    let shiftY = 0;
    let offLinkSince = 0;
    let frame = 0;
    let bg = "";

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const dt = Math.max(1, t - lastT) / 1000;
      lastT = t;
      const { X: mx, Y: my, reduced: rm } = live.current;
      const x = mx.get();
      const y = my.get();
      const vx = (x - lastX) / dt;
      const vy = (y - lastY) / dt;
      lastX = x;
      lastY = y;

      // Lens fill: follow the page background (it can change).
      if (frame++ % 30 === 0) {
        const next = live.current.background ?? opaqueBackground(root);
        if (next !== bg) {
          bg = next;
          root.style.setProperty("--mglass-bg", bg); // lens fill + edge blend
        }
      }

      // What's under the lens center (links mode: under the pointer itself)?
      const linksMode = live.current.show === "links";
      const rect = root.getBoundingClientRect();
      const cx = rect.left + (linksMode ? tx.get() : x);
      const cy = rect.top + (linksMode ? ty.get() : y);
      const hit = linksMode && !insideRef.current ? null : document.elementFromPoint(cx, cy);
      const a = hit?.closest?.("a[href]") as HTMLAnchorElement | null;
      const link = a && innerRef.current?.contains(a) ? a : null;
      if (!link && linksMode && !insideRef.current && activeRef.current) activate(null);
      if (link) {
        offLinkSince = 0;
        const rects = Array.from(link.getClientRects());
        const r =
          rects.find((q) => cx >= q.left && cx <= q.right && cy >= q.top && cy <= q.bottom) ?? rects[0];
        if (r) {
          px.set(clamp((cx - r.left) / Math.max(1, r.width), 0, 1));
          py.set(clamp((cy - r.top) / Math.max(1, r.height), 0, 1));
        }
        activate(link);
      } else if (activeRef.current) {
        // Small grace period: gaps between words of a link don't flicker.
        if (!offLinkSince) offLinkSince = t;
        else if (t - offLinkSince > 90) activate(null);
      }

      // The handle swings against the motion; reflections slide a little.
      const target = rm ? 0 : clamp(-vx * 0.012 + vy * 0.006, -12, 12);
      swing += (target - swing) * Math.min(1, dt * 10);
      shiftX += ((rm ? 0 : clamp(vx * 0.00012, -0.08, 0.08)) - shiftX) * Math.min(1, dt * 6);
      shiftY += ((rm ? 0 : clamp(-vy * 0.00012, -0.08, 0.08)) - shiftY) * Math.min(1, dt * 6);
      scene3.update(BASE_ANGLE + swing, shiftX, shiftY);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      scene3.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, metal, grip, ornate]);

  function moveTo(clientX: number, clientY: number) {
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    tx.set(clamp(clientX - r.left, 0, r.width));
    ty.set(clamp(clientY - r.top, 0, r.height));
  }

  const host = shown ? hostname(shown) : "";
  const map = useMemo(() => (distort > 0 ? displacementMap(D, distort) : null), [D, distort]);
  const filterId = `mglass-f-${uid}`;
  const scales = map ? [map.scale, map.scale * (1 + aberration), map.scale * (1 + 2 * aberration)] : [];

  return (
    <div
      ref={rootRef}
      data-mglass={uid}
      className={className}
      style={{ position: "relative", ...style }}
      onPointerEnter={() => (insideRef.current = true)}
      onPointerLeave={() => (insideRef.current = false)}
      onBlurCapture={() => (insideRef.current = false)}
      onPointerMove={(e) => {
        insideRef.current = true;
        lastPointer.current = e.pointerType;
        if (e.pointerType === "touch" && e.buttons === 0) return;
        moveTo(e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        moveTo(e.clientX, e.clientY);
      }}
      onClickCapture={(e) => {
        // Touch: first tap brings the glass to the link, second tap opens it.
        if (lastPointer.current !== "touch") return;
        const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
        if (a && activeRef.current !== a.href) e.preventDefault();
      }}
      onFocusCapture={(e) => {
        const a = e.target as Element;
        if (!(a instanceof HTMLAnchorElement) || !a.matches(":focus-visible")) return;
        const r = a.getBoundingClientRect();
        insideRef.current = true;
        moveTo(r.left + r.width / 2, r.top + r.height / 2);
      }}
    >
      {hideCursor && (
        <style>{show === "links"
            ? `@media (pointer: fine) { [data-mglass="${uid}"] a[href], [data-mglass="${uid}"] a[href] * { cursor: none !important; } }`
            : `@media (pointer: fine) { [data-mglass="${uid}"], [data-mglass="${uid}"] * { cursor: none !important; } }`}</style>
      )}

      <div ref={innerRef} style={{ display: "flow-root" }}>
        {children}
      </div>

      {edgeBlur > 0 && <EdgeBlur blur={edgeBlur} size={edgeSize} shape={blurShape} blend={blend} />}

      {map && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <filter
            id={filterId}
            x="0"
            y="0"
            width={D}
            height={D}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={map.url} x="0" y="0" width={D} height={D} result="map" preserveAspectRatio="none" />
            {scales.map((s, i) => (
              <feDisplacementMap
                key={i}
                in="SourceGraphic"
                in2="map"
                scale={s}
                xChannelSelector="R"
                yChannelSelector="G"
                result={`d${i}`}
              />
            ))}
            <feColorMatrix in="d0" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feColorMatrix in="d1" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="d2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg" />
            <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" />
          </filter>
        </svg>
      )}

      {/* What you see through the glass. */}
      <motion.div
        ref={lensRef}
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          x: lensX,
          y: lensY,
          opacity: appear,
          scale: glassScale,
          transformOrigin: "50% 50%",
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 2,
          background: "var(--mglass-bg, #fff)",
          isolation: "isolate",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: D,
            height: D,
            overflow: "hidden",
            transform: `scale(${1 / OS})`,
            transformOrigin: "0 0",
            filter: map ? `url(#${filterId})` : undefined,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "var(--mglass-bg, #fff)" }} />
          {show === "always" && (
          <motion.div
            inert
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: boxW || undefined,
              display: "flow-root",
              transformOrigin: "0 0",
              transform: textTransform,
            }}
          >
            {children}
          </motion.div>
          )}

          {mounted.map((m) => (
            <motion.div
              key={m.key}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: pageWidth,
                height: pageHeight,
                transformOrigin: "0 0",
                transform: previewTransform,
                filter: previewBlur,
                opacity: m.key === shown ? mix : 0,
                background: "#f4f4f6",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  font: "600 56px/1.2 system-ui, sans-serif",
                  color: "#9a9aa6",
                  background: "repeating-linear-gradient(135deg, #f4f4f6 0 24px, #ececf0 24px 48px)",
                }}
              >
                {loaded[m.key] ? null : hostname(m.key)}
              </div>
              <PreviewBody
                href={m.key}
                src={m.src}
                loaded={!!loaded[m.key]}
                onLoad={() => setLoaded((l) => ({ ...l, [m.key]: true }))}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          style={{
            position: "absolute",
            left: "50%",
            bottom: size * 0.1,
            x: "-50%",
            opacity: mix,
            maxWidth: size * 0.7,
            padding: `${Math.max(2, size * 0.012)}px ${size * 0.045}px`,
            borderRadius: 999,
            background: "rgba(16,16,20,0.72)",
            backdropFilter: "blur(6px)",
            color: "#fff",
            font: `500 ${Math.max(10, size * 0.055)}px/1.5 system-ui, sans-serif`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {host} ↗
        </motion.div>
      </motion.div>

      {/* Metal + glass surface (three.js). */}
      <motion.canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          x: canvasX,
          y: canvasY,
          opacity: appear,
          scale: glassScale,
          transformOrigin: `${geo.c}px ${geo.c}px`,
          width: geo.side,
          height: geo.side,
          pointerEvents: "none",
          zIndex: 3,
          filter: `drop-shadow(0 ${size * 0.05}px ${size * 0.06}px rgba(0,0,0,0.32))`,
        }}
      />
    </div>
  );
}

function PreviewBody({
  href,
  src,
  loaded,
  onLoad,
}: {
  href: string;
  src: ReactNode | string | undefined;
  loaded: boolean;
  onLoad: () => void;
}) {
  useEffect(() => {
    if (src !== undefined && typeof src !== "string") onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fade: CSSProperties = { opacity: loaded ? 1 : 0, transition: "opacity 0.25s" };
  if (src === undefined)
    return (
      <iframe
        src={href}
        title=""
        tabIndex={-1}
        loading="eager"
        sandbox="allow-scripts allow-same-origin"
        onLoad={onLoad}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, ...fade }}
      />
    );
  if (typeof src === "string")
    return (
      <img
        src={src}
        alt=""
        onLoad={onLoad}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", ...fade }}
      />
    );
  return <div style={{ position: "absolute", inset: 0 }}>{src}</div>;
}

/** Progressive blur: three backdrop-blur layers, each stronger and masked further out.
 *  "radial" masks are ellipses fit to the container (sharp center, blur rising toward
 *  every side and corner); "edges" masks are bands along the four edges. The layers
 *  reach `m` px past the container and fade out there, so the blur's own sampling
 *  edge never shows as a grey box. */
function EdgeBlur({
  blur,
  size,
  shape,
  blend,
}: {
  blur: number;
  size: number;
  shape: "radial" | "edges";
  blend: boolean;
}) {
  const m = Math.ceil(blur * 2.5);
  // On top of the blur: the background color itself, clear in the middle and
  // solid at the rim, so the blurred text dissolves into the page.
  const fade =
    shape === "radial"
      ? `radial-gradient(closest-side, transparent 46%, color-mix(in srgb, var(--mglass-bg, #fff) 70%, transparent) 74%, var(--mglass-bg, #fff) 94%)`
      : (() => {
          const g = (dir: string) =>
            `linear-gradient(${dir}, var(--mglass-bg, #fff) 0, var(--mglass-bg, #fff) ${m}px, transparent ${m + size}px, transparent calc(100% - ${m + size}px), var(--mglass-bg, #fff) calc(100% - ${m}px), var(--mglass-bg, #fff) 100%)`;
          return `${g("to right")}, ${g("to bottom")}`;
        })();
  return (
    <>
      {[1, 2, 3].map((i) => {
        let mask: CSSProperties;
        if (shape === "radial") {
          // Ellipse fit to the container: the mask tile is the container's size,
          // centered in the (2m larger) layer; outside the tile nothing is blurred.
          const from = [40, 56, 72][i - 1];
          const to = [76, 92, 110][i - 1];
          const img = `radial-gradient(closest-side, transparent ${from}%, #000 ${to}%)`;
          const tile = `calc(100% - ${2 * m}px) calc(100% - ${2 * m}px)`;
          mask = {
            maskImage: img,
            WebkitMaskImage: img,
            maskSize: tile,
            WebkitMaskSize: tile,
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          };
        } else {
          const e = (size * (4 - i)) / 3;
          const g = (dir: string) =>
            `linear-gradient(${dir}, transparent 0, #000 ${m}px, transparent ${m + e}px, transparent calc(100% - ${m + e}px), #000 calc(100% - ${m}px), transparent 100%)`;
          const img = `${g("to right")}, ${g("to bottom")}`;
          mask = { maskImage: img, WebkitMaskImage: img };
        }
        return (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              inset: -m,
              pointerEvents: "none",
              zIndex: 1,
              backdropFilter: `blur(${(blur * i) / 3}px)`,
              WebkitBackdropFilter: `blur(${(blur * i) / 3}px)`,
              ...mask,
            }}
          />
        );
      })}
      {blend && (
        <div
          aria-hidden
          style={{ position: "absolute", inset: -m, pointerEvents: "none", zIndex: 1, background: fade }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- three.js

interface GlassGeometry {
  R: number; // lens radius (inner edge of the rim)
  rimW: number;
  rimD: number;
  Ro: number;
  thick: number; // handle diameter
  collar: number;
  grip: number;
  cap: number;
  side: number; // canvas size, px
  c: number; // lens center inside the canvas, px
}

function glassGeometry(size: number, ornate = false): GlassGeometry {
  const R = size / 2;
  const rimW = Math.max(8, size * 0.07);
  const rimD = rimW * 1.1;
  const Ro = R + rimW;
  const thick = Math.max(12, size * 0.11);
  const collar = size * 0.15;
  const grip = size * 0.6;
  const cap = thick * 0.5;
  const pad = thick * (ornate ? 2.6 : 1) + 12; // ornate: room for the pommel
  const c = Ro + pad;
  const side = Math.ceil(c + Ro + collar + grip + cap + pad);
  return { R, rimW, rimD, Ro, thick, collar, grip, cap, side, c };
}

/** Rounded rectangle in (radius, height), counter-clockwise: lathe normals face out. */
function roundedProfile(x0: number, x1: number, y0: number, y1: number, r: number) {
  const pts: THREE.Vector2[] = [];
  const corners: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = ((a0 + (i / 6) * 90) * Math.PI) / 180;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  pts.push(pts[0].clone());
  return pts;
}

/** Solid of revolution along +x (handle parts), from a radius function over [0, len]. */
function handlePart(len: number, radius: (t: number) => number, at: number, steps = 32) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(Math.max(0.01, radius(t)), t * len));
  }
  pts.push(new THREE.Vector2(0, len));
  const g = new THREE.LatheGeometry(pts, 48);
  g.translate(0, at, 0);
  g.rotateZ(-Math.PI / 2); // lathe axis Y -> +X
  return g;
}

/** Royal dressing: beaded rim, banded grip, crowned pommel. */
function addOrnaments(
  assembly: THREE.Group,
  handle: THREE.Group,
  g: GlassGeometry,
  metal: THREE.Material,
  mats: THREE.Material[],
  start: number,
) {
  const front = g.rimD / 2;
  const mid = (g.R + g.Ro) / 2;

  // Beads around the outer edge, skipping where the handle joins (−45°).
  const beadR = g.rimW * 0.2;
  const count = Math.round((Math.PI * 2 * g.Ro) / (beadR * 2.6));
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(beadR, 12, 8), metal, count);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const d = Math.atan2(Math.sin(a + Math.PI / 4), Math.cos(a + Math.PI / 4));
    if (Math.abs(d) < 0.32) continue;
    m4.makeTranslation(Math.cos(a) * (g.Ro + beadR * 0.35), Math.sin(a) * (g.Ro + beadR * 0.35), 0);
    beads.setMatrixAt(n++, m4);
  }
  beads.count = n;
  assembly.add(beads);

  // A fine raised line on the rim face.
  const line = new THREE.Mesh(new THREE.TorusGeometry(g.R + g.rimW * 0.18, g.rimW * 0.1, 8, 160), metal);
  line.position.z = front;
  assembly.add(line);

  // Handle (along +x): gold bands on the grip, crowned pommel.
  const t = g.thick / 2;
  for (const u of [0.08, 0.36, 0.64, 0.92]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(t * 1.02, t * 0.16, 10, 40), metal);
    band.rotation.y = Math.PI / 2; // ring around the handle axis
    band.position.x = start + g.collar + g.grip * u;
    handle.add(band);
  }
  const end = start + g.collar + g.grip;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(t * 0.75, t * 1.0, g.cap * 0.6, 24), metal);
  neck.rotation.z = -Math.PI / 2;
  neck.position.x = end + g.cap * 0.3;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(t * 1.25, 32, 20), metal);
  bulb.position.x = end + g.cap * 0.6 + t * 1.1;
  handle.add(neck, bulb);
  // Crown points around the far end of the pommel.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(t * 0.22, t * 0.7, 10), metal);
    spike.rotation.z = -Math.PI / 2;
    spike.position.set(bulb.position.x + t * 1.2, Math.cos(a) * t * 0.6, Math.sin(a) * t * 0.6);
    handle.add(spike);
  }
}

const glassVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Glass surface over the DOM lens: a domed, polished front face. Fresnel-weighted
// reflections of a studio (softbox + strip light), a ground bevel at the edge
// that darkens and tints green (glass thickness), and a fine lit edge line.
// Output is premultiplied; it never covers the content more than a veil.
const glassFragment = /* glsl */ `
  varying vec2 vUv;
  uniform vec2 uShift;
  uniform float uDome;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  float studio(vec2 q) {
    float key = 1.0 - smoothstep(-0.015, 0.05, sdRoundBox(q - vec2(-0.20, 0.25), vec2(0.15, 0.06), 0.045));
    float strip = 1.0 - smoothstep(-0.01, 0.035, sdRoundBox(q - vec2(0.27, -0.20), vec2(0.025, 0.13), 0.02));
    float fill = 1.0 - smoothstep(0.0, 0.25, length(q - vec2(0.0, 0.42)));
    return key * 0.85 + strip * 0.4 + fill * 0.08;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    vec3 n = normalize(vec3(p * uDome, 1.0));
    float bevel = smoothstep(0.93, 1.0, r);
    n = normalize(mix(n, normalize(vec3(p, 0.6)), bevel * 0.6));

    vec3 v = vec3(0.0, 0.0, 1.0);
    float cosT = max(dot(n, v), 0.0);
    float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
    vec3 rd = reflect(-v, n);
    vec2 q = rd.xy / (1.0 + max(rd.z, 0.0)) + uShift;

    float refl = studio(q) * (0.4 + 1.2 * F) + F * 0.35;
    float lit = 0.5 + 0.5 * dot(p / max(r, 1e-4), normalize(vec2(-1.0, 1.0)));

    // Premultiplied layers, back to front.
    vec4 c = vec4(0.0);
    // Thickness at the edge: darker, faintly green.
    float ea = smoothstep(0.84, 1.0, r) * 0.38;
    c = vec4(vec3(0.04, 0.09, 0.07) * ea, ea);
    // Reflections: a white veil.
    float ra = clamp(refl, 0.0, 0.75);
    c = vec4(vec3(1.0) * ra + c.rgb * (1.0 - ra), ra + c.a * (1.0 - ra));
    // Lit edge line just inside the rim.
    float line = smoothstep(0.95, 0.972, r) * (1.0 - smoothstep(0.972, 0.994, r)) * (0.25 + 0.65 * lit);
    c = vec4(vec3(1.0) * line + c.rgb * (1.0 - line), line + c.a * (1.0 - line));
    // Very faint overall sheen so the glass reads as glass.
    float s = 0.03;
    c = vec4(vec3(0.85, 0.92, 1.0) * s + c.rgb * (1.0 - s), s + c.a * (1.0 - s));

    gl_FragColor = c;
  }
`;

function buildScene(
  canvas: HTMLCanvasElement,
  g: GlassGeometry,
  metalHex: string,
  gripHex: string,
  ornate: boolean,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(g.side, g.side, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.03);
  scene.environment = envRT.texture;
  room.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-1, 1.3, 1.6);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xcfe0ff, 0.7);
  rimLight.position.set(1.2, -0.6, 0.8);
  scene.add(rimLight);

  const half = g.side / 2;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, -2000, 2000);
  camera.position.set(0, 0, 1000);

  const metal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(metalHex),
    metalness: 1,
    roughness: 0.17,
    clearcoat: 0.6,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  });
  const gripMat = ornate
    ? new THREE.MeshPhysicalMaterial({
        // Velvet: rough base with a bright sheen at grazing angles.
        color: new THREE.Color(gripHex),
        metalness: 0,
        roughness: 0.75,
        sheen: 1,
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color(gripHex).lerp(new THREE.Color("#ffffff"), 0.45),
        envMapIntensity: 1,
      })
    : new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(gripHex),
        metalness: 0,
        roughness: 0.36,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1,
      });
  const extraMats: THREE.Material[] = [];

  const assembly = new THREE.Group();
  assembly.position.set(g.c - half, half - g.c, 0);
  scene.add(assembly);

  // Rim: a rounded band, revolved.
  const rimGeo = new THREE.LatheGeometry(
    roundedProfile(g.R - 1, g.Ro, -g.rimD / 2, g.rimD / 2, Math.min(g.rimW, g.rimD) * 0.45),
    192,
  );
  rimGeo.rotateX(Math.PI / 2); // lathe axis Y -> toward the camera
  const rim = new THREE.Mesh(rimGeo, metal);
  assembly.add(rim);

  // Handle: collar (flared ferrule), grip (lacquered, slight swell, two grooves), end cap.
  const handle = new THREE.Group();
  const t = g.thick / 2;
  const start = g.Ro - g.rimW * 0.45;
  const collarGeo = handlePart(
    g.collar,
    (u) => {
      const flare = t * (0.62 + 0.42 * smooth(0, 0.7, u));
      const bead = u > 0.78 && u < 0.92 ? t * 0.1 * Math.sin(((u - 0.78) / 0.14) * Math.PI) : 0;
      return u > 0.95 ? t * 0.98 : flare + bead;
    },
    start,
  );
  const gripGeo = handlePart(
    g.grip,
    (u) => {
      const swell = t * (0.95 + 0.1 * Math.sin(u * Math.PI));
      const groove = (Math.abs(u - 0.12) < 0.02 || Math.abs(u - 0.88) < 0.02) ? -t * 0.08 : 0;
      return swell + groove;
    },
    start + g.collar,
    64,
  );
  const capGeo = handlePart(
    g.cap,
    (u) => t * 0.98 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, u - 0.25) / 0.75, 2))),
    start + g.collar + g.grip,
  );
  handle.add(new THREE.Mesh(collarGeo, metal), new THREE.Mesh(gripGeo, gripMat));
  if (!ornate) handle.add(new THREE.Mesh(capGeo, metal));
  assembly.add(handle);
  if (ornate) addOrnaments(assembly, handle, g, metal, extraMats, start);

  // Glass face.
  const glassMat = new THREE.ShaderMaterial({
    vertexShader: glassVertex,
    fragmentShader: glassFragment,
    uniforms: { uShift: { value: new THREE.Vector2() }, uDome: { value: 0.32 } },
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const glass = new THREE.Mesh(new THREE.CircleGeometry(g.R, 128), glassMat);
  glass.position.z = 0;
  glass.renderOrder = 1;
  assembly.add(glass);

  return {
    update(angleDeg: number, shiftX: number, shiftY: number) {
      handle.rotation.z = (-angleDeg * Math.PI) / 180;
      glassMat.uniforms.uShift.value.set(shiftX, shiftY);
      scene.environmentRotation.set(shiftY * 2, shiftX * 3, 0);
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      metal.dispose();
      gripMat.dispose();
      for (const m of extraMats) m.dispose();
      glassMat.dispose();
      envRT.dispose();
      renderer.dispose();
    },
  };
}

// ---------------------------------------------------------------- helpers

/** Fish-eye map for feDisplacementMap: center samples closer in (magnified), the edge squeezes. */
function displacementMap(size: number, k: number) {
  if (typeof document === "undefined") return null;
  const n = Math.max(32, Math.min(512, Math.round(size)));
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(n, n);
  // Largest offset is ≈ 0.385 k radius; fit the 8-bit channel to that (plus room for aberration).
  const scale = Math.max(1, 2 * 0.42 * k * (size / 2));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = ((i + 0.5) / n) * 2 - 1;
      const dy = ((j + 0.5) / n) * 2 - 1;
      const r2 = Math.min(1, dx * dx + dy * dy);
      const f = -k * (1 - r2); // source radius r' = r (1 - k (1 - r²))
      const o = (j * n + i) * 4;
      img.data[o] = Math.round(clamp(0.5 + (f * dx * (size / 2)) / scale, 0, 1) * 255);
      img.data[o + 1] = Math.round(clamp(0.5 + (f * dy * (size / 2)) / scale, 0, 1) * 255);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { url: c.toDataURL(), scale };
}

function opaqueBackground(el: HTMLElement | null): string {
  for (let e = el; e; e = e.parentElement) {
    const c = getComputedStyle(e).backgroundColor;
    if (c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c)) return c;
  }
  return "#ffffff";
}

function hostname(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function smooth(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

