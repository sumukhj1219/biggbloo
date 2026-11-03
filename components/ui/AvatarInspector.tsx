"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// Figma-style inspector around an element: guide lines, live width/height
// measurements, a corner-radius handle, a rotate handle, and a tiny toolbar to
// recolor the element (Fill) or draw on it (Pen).

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
// Where the corner arc crosses the diagonal, as a fraction of the radius.
const ARC = 1 - Math.SQRT1_2;
const GUIDE = "pointer-events-none absolute bg-neutral-300";
const LABEL = "pointer-events-none absolute font-mono text-[10px] leading-none whitespace-nowrap text-neutral-500 tabular-nums";

// null keeps the original image.
const FILLS = [null, "#ef4444", "#f97316", "#eab308", "#22c55e", "#8b5cf6", "#ec4899", "#171717"] as const;
type Fill = (typeof FILLS)[number];

const cursor = (svg: string, x: number, y: number, fallback: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`;
const PEN_CURSOR = cursor(
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"><path d="M3 21l3.5-1 12-12-2.5-2.5-12 12z"/><path d="M14.5 5.5l2.5-2.5 4 4-2.5 2.5"/></svg>',
  2,
  16,
  "crosshair",
);
const ROTATE_CURSOR = cursor(
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4h-4"/></svg>',
  9,
  9,
  "grab",
);

// The color blend keeps the image's luminance, and the avatar's deep blue is
// dark, so the image is brightened toward the fill's own luminance first.
const AVATAR_LUMA = 51;
const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
};
const lift = (fill: Fill) => (fill ? Math.min(Math.max((luma(fill) / AVATAR_LUMA) * 1.15, 0.45), 5) : 1);

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

type Point = { x: number; y: number };

// Freehand points to a smooth path: quadratic curves through the midpoints.
const toPath = (pts: Point[]) => {
  if (pts.length < 2) return pts.length ? `M${pts[0].x} ${pts[0].y}l0.01 0` : "";
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last.x} ${last.y}`;
};

const Icon = ({ d }: { d: string[] }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
    {d.map((p) => (
      <path key={p} d={p} />
    ))}
  </svg>
);
const MOVE_ICON = ["M4 3l7 17 2.5-7.5L21 10z"];
const PEN_ICON = ["M12 19l7-7 3 3-7 7-3-3z", "M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z", "M2 2l7.586 7.586", "M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"];
const RESET_ICON = ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"];

const toolButton =
  "press flex size-6 outline-none focus-visible:ring-2 focus-visible:ring-sky-300 cursor-pointer items-center justify-center rounded-md text-neutral-600 hover:bg-secondary hover:text-foreground aria-pressed:bg-sky-500 aria-pressed:text-white disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent";

type Props = {
  children: ReactNode;
  initialRadius?: number;
  /** Seconds before the guides and measurements draw in. */
  introDelay?: number;
  className?: string;
};

const AvatarInspector = ({ children, initialRadius = 4, introDelay = 0, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [radius, setRadius] = useState(initialRadius);
  const [angle, setAngle] = useState(0);
  const [fill, setFill] = useState<Fill>(null);
  const [tool, setTool] = useState<"move" | "pen">("move");
  const [strokes, setStrokes] = useState<string[]>([]);
  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drag, setDrag] = useState<null | "radius" | "rotate">(null);
  const rotateFrom = useRef({ pointer: 0, angle: 0 });
  // The handles' intro waits for introDelay; later scale changes (drag, hover) must not.
  const [settled, setSettled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Touch has no hover: a tap pins the toolbar until a tap elsewhere.
  const [pinned, setPinned] = useState(false);

  const max = Math.min(size.w, size.h) / 2;
  const r = Math.min(radius, max || radius);
  const pct = size.w ? (r / size.w) * 100 : 0;
  const handle = Math.max(r * ARC, 0);
  // The toolbar shows on hover, and stays while it's in use.
  const showTools = hovered || focused || pinned || paletteOpen || tool === "pen" || drag !== null;
  const pristine = r === initialRadius && angle === 0 && fill === null && strokes.length === 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPinned(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [pinned]);

  // Escape leaves the pen / closes the palette; a click outside closes the palette.
  useEffect(() => {
    if (tool === "move" && !paletteOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPaletteOpen(false);
      setTool("move");
    };
    const onDown = (e: globalThis.PointerEvent) => {
      if (!paletteRef.current?.contains(e.target as Node)) setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    if (paletteOpen) window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [tool, paletteOpen]);

  // Pointer position in the element's own (unrotated) coordinates.
  const toLocal = (clientX: number, clientY: number): Point => {
    const rect = ref.current!.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const a = (-angle * Math.PI) / 180;
    return {
      x: dx * Math.cos(a) - dy * Math.sin(a) + size.w / 2,
      y: dx * Math.sin(a) + dy * Math.cos(a) + size.h / 2,
    };
  };

  const pointerAngle = (e: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
  };

  const capture = (e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag === "radius") {
      // Distance travelled along the diagonal from the top-left corner.
      const { x, y } = toLocal(e.clientX, e.clientY);
      setRadius(Math.round(Math.min(Math.max((x + y) / 2 / ARC, 0), max) * 2) / 2);
    } else if (drag === "rotate") {
      let a = rotateFrom.current.angle + pointerAngle(e) - rotateFrom.current.pointer;
      a = ((((a + 180) % 360) + 360) % 360) - 180;
      setAngle(e.shiftKey ? Math.round(a / 15) * 15 : Math.round(a));
    }
  };

  const endDrag = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDrag(null);
  };

  const onRadiusKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 4 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") setRadius(Math.min(r + step, max));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") setRadius(Math.max(r - step, 0));
    else if (e.key === "Home") setRadius(0);
    else if (e.key === "End") setRadius(max);
    else return;
    e.preventDefault();
  };

  const onRotateKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 15 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") setAngle((a) => Math.min(a + step, 180));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") setAngle((a) => Math.max(a - step, -180));
    else if (e.key === "Home") setAngle(0);
    else return;
    e.preventDefault();
  };

  const reset = () => {
    setRadius(initialRadius);
    setAngle(0);
    setFill(null);
    setStrokes([]);
    setTool("move");
  };

  const handleIntro = (extra: number) => ({
    initial: { scale: 0 },
    transition: { ...SPRING, delay: settled ? 0 : introDelay + extra },
  });

  return (
    <div
      ref={ref}
      className={cn("relative shrink-0", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onPointerDown={(e) => e.pointerType !== "mouse" && setPinned(true)}
      // Keyboard focus only: a mouse click shouldn't pin it open after the pointer leaves.
      onFocus={(e) => e.target.matches(":focus-visible") && setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
    >
      {/* Guides sit under the element and stay axis-aligned while it rotates. */}
      <AnimatePresence>
        {size.w > 0 && (
          <motion.div
            key="inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE, delay: introDelay }}
            className="pointer-events-none absolute inset-0"
          >
            {/* Guide lines running past each edge. */}
            {(
              [
                ["-inset-x-3 top-0 h-px", "scaleX", 0],
                ["-inset-x-3 bottom-0 h-px", "scaleX", 0.04],
                ["-inset-y-3 left-0 w-px", "scaleY", 0.02],
                ["-inset-y-3 right-0 w-px", "scaleY", 0.06],
              ] as const
            ).map(([pos, axis, delay]) => (
              <motion.span
                key={pos}
                initial={{ [axis]: 0 }}
                animate={{ [axis]: 1 }}
                transition={{ duration: 0.35, ease: EASE, delay: introDelay + delay }}
                className={cn(GUIDE, pos)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Everything that rotates with the element: image, fill, ink, outline and handles. */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: angle }}
        transition={drag === "rotate" ? { duration: 0 } : SPRING}
      >
        <motion.div
          className="relative isolate size-full overflow-hidden"
          animate={{ borderRadius: r }}
          transition={drag === "radius" ? { duration: 0 } : { duration: 0.3, ease: EASE }}
        >
          <motion.div
            className="size-full"
            initial={false}
            animate={{ filter: `brightness(${lift(fill)})` }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {children}
          </motion.div>
          {/* Fill: a color blend keeps the image's light and dark, so the S stays white. */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-color"
            initial={false}
            animate={{ backgroundColor: fill ?? "#ffffff", opacity: fill ? 1 : 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          />
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
            {[...strokes, ...(drawing ? [toPath(drawing)] : [])].map((d, i) => (
              <path key={i} d={d} fill="none" stroke="white" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        </motion.div>

        {size.w > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: EASE, delay: introDelay }}
            className="absolute inset-0"
          >
            <span className="pointer-events-none absolute inset-0 outline outline-sky-500/70" style={{ borderRadius: r }} />

            {tool === "pen" ? (
              // Drawing surface. Handles hide while the pen is out, like in Figma.
              <span
                className="absolute inset-0 touch-none"
                style={{ cursor: PEN_CURSOR }}
                onPointerDown={(e) => {
                  capture(e);
                  setDrawing([toLocal(e.clientX, e.clientY)]);
                }}
                onPointerMove={(e) => drawing && setDrawing([...drawing, toLocal(e.clientX, e.clientY)])}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  if (drawing) setStrokes((s) => [...s, toPath(drawing)]);
                  setDrawing(null);
                }}
              />
            ) : (
              <>
                <motion.button
                  type="button"
                  role="slider"
                  aria-label="Corner radius"
                  aria-valuemin={0}
                  aria-valuemax={max}
                  aria-valuenow={r}
                  aria-valuetext={`${fmt(r)} pixels, ${pct.toFixed(2)}%`}
                  {...handleIntro(0.14)}
                  animate={{ scale: drag === "radius" ? 1.35 : 1 }}
                  whileHover={{ scale: 1.25 }}
                  onAnimationComplete={() => setSettled(true)}
                  onDoubleClick={() => setRadius(initialRadius)}
                  onPointerDown={(e) => {
                    capture(e);
                    setDrag("radius");
                  }}
                  onPointerMove={onHandleMove}
                  onPointerUp={endDrag}
                  onKeyDown={onRadiusKey}
                  className="absolute size-2 -translate-1/2 cursor-nwse-resize touch-none border border-sky-500 bg-white outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  style={{ left: handle, top: handle }}
                >
                  {/* Bigger hit area than the dot. */}
                  <span className="absolute -inset-2" />
                </motion.button>

                {/* Rotate: a small knob just off the top-right corner. */}
                <motion.button
                  type="button"
                  role="slider"
                  aria-label="Rotation"
                  aria-valuemin={-180}
                  aria-valuemax={180}
                  aria-valuenow={angle}
                  aria-valuetext={`${angle} degrees`}
                  {...handleIntro(0.18)}
                  animate={{ scale: drag === "rotate" ? 1.3 : 1 }}
                  whileHover={{ scale: 1.2 }}
                  onDoubleClick={() => setAngle(0)}
                  onPointerDown={(e) => {
                    capture(e);
                    rotateFrom.current = { pointer: pointerAngle(e), angle };
                    setDrag("rotate");
                  }}
                  onPointerMove={onHandleMove}
                  onPointerUp={endDrag}
                  onKeyDown={onRotateKey}
                  className="absolute size-[7px] -translate-1/2 touch-none rounded-full border border-sky-500 bg-white outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  style={{ left: size.w + 7, top: -7, cursor: ROTATE_CURSOR }}
                >
                  <span className="absolute -inset-2" />
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </motion.div>

      {size.w > 0 && (
        <>
          {/* Width, below. */}
          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: introDelay + 0.08 }}
            className="pointer-events-none absolute inset-x-0 top-full mt-2 flex items-center"
          >
            <span className="h-2 w-px bg-neutral-400" />
            <span className="h-px flex-1 bg-neutral-400" />
            <span className="h-2 w-px bg-neutral-400" />
            <span className={cn(LABEL, "left-1/2 -translate-x-1/2 bg-background px-1")}>{fmt(size.w)}px</span>
          </motion.div>

          {/* Height, on the left, reading bottom to top. */}
          <motion.div
            initial={{ opacity: 0, x: 3 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: introDelay + 0.1 }}
            className="pointer-events-none absolute inset-y-0 right-full mr-2 flex flex-col items-center"
          >
            <span className="h-px w-2 bg-neutral-400" />
            <span className="w-px flex-1 bg-neutral-400" />
            <span className="h-px w-2 bg-neutral-400" />
            <span className={cn(LABEL, "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 bg-background px-1")}>
              {fmt(size.h)}px
            </span>
          </motion.div>

          {/* Corner radius, above the top-left corner. */}
          <motion.span
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: introDelay + 0.12 }}
            className={cn(LABEL, "bottom-full left-0 mb-2.5 -translate-x-1/2", drag === "radius" && "text-sky-600")}
          >
            {pct.toFixed(2)}%
          </motion.span>

          {/* Rotation readout, beside the rotate knob once it's turned. */}
          <AnimatePresence>
            {(angle !== 0 || drag === "rotate") && (
              <motion.span
                initial={{ opacity: 0, x: -3 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -3 }}
                transition={{ duration: 0.18, ease: EASE }}
                className={cn(LABEL, "bottom-full left-full mb-2.5 ml-2 flex items-center gap-1", drag === "rotate" && "text-sky-600")}
              >
                <span className="inline-block size-2 border-t border-l border-current" style={{ rotate: `${angle}deg` }} />
                {angle}°
              </motion.span>
            )}
          </AnimatePresence>

          {/* Toolbar: move, pen, fill, reset. Appears on hover. */}
          <AnimatePresence>
          {showTools && (
          <motion.div
            key="toolbar"
            role="toolbar"
            aria-label="Avatar tools"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute bottom-full left-0 mb-8 flex origin-bottom-left items-center gap-0.5 rounded-lg bg-background p-0.5 ring-1 ring-neutral-200"
          >
            {/* Invisible bridge over the gap, so moving up from the avatar keeps it open. */}
            <span aria-hidden="true" className="absolute inset-x-0 top-full h-8" />
            <button type="button" title="Move (Esc)" aria-label="Move" aria-pressed={tool === "move"} onClick={() => setTool("move")} className={toolButton}>
              <Icon d={MOVE_ICON} />
            </button>
            <button type="button" title="Pen" aria-label="Pen" aria-pressed={tool === "pen"} onClick={() => setTool((t) => (t === "pen" ? "move" : "pen"))} className={toolButton}>
              <Icon d={PEN_ICON} />
            </button>
            <span className="mx-0.5 h-4 w-px bg-neutral-200" />

            <div ref={paletteRef} className="relative">
              <button
                type="button"
                aria-label="Fill"
                aria-haspopup="true"
                aria-expanded={paletteOpen}
                onClick={() => setPaletteOpen((o) => !o)}
                className="press flex h-6 cursor-pointer items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded-md px-1.5 font-mono text-[10px] text-neutral-600 uppercase tabular-nums hover:bg-secondary hover:text-foreground"
              >
                <motion.span
                  className="size-3 rounded-[3px] ring-1 ring-black/10"
                  animate={{ backgroundColor: fill ?? "#1d1fd1" }}
                  transition={{ duration: 0.25 }}
                  style={fill ? undefined : { backgroundImage: "linear-gradient(135deg, #1d1fd1 50%, #ffffff 50%)" }}
                />
                {fill ?? "Image"}
              </button>
              <AnimatePresence>
                {paletteOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 2 }}
                    transition={{ duration: 0.16, ease: EASE }}
                    className="absolute bottom-full left-0 z-20 mb-1.5 flex origin-bottom-left gap-1 rounded-lg bg-background p-1 ring-1 ring-neutral-200"
                  >
                    {FILLS.map((c) => (
                      <button
                        key={c ?? "image"}
                        type="button"
                        title={c ?? "Original image"}
                        aria-label={c ? `Fill ${c}` : "Original image"}
                        aria-pressed={fill === c}
                        onClick={() => {
                          setFill(c);
                          setPaletteOpen(false);
                        }}
                        className="size-4 cursor-pointer rounded-[4px] ring-1 ring-black/10 transition-transform duration-150 ease-out hover:scale-110 active:scale-95 aria-pressed:ring-2 aria-pressed:ring-sky-500 aria-pressed:ring-offset-1"
                        style={c ? { backgroundColor: c } : { backgroundImage: "linear-gradient(135deg, #1d1fd1 50%, #ffffff 50%)" }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button type="button" title="Reset" aria-label="Reset avatar" disabled={pristine} onClick={reset} className={toolButton}>
              <Icon d={RESET_ICON} />
            </button>
          </motion.div>
          )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default AvatarInspector;
