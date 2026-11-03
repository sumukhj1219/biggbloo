"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// Figma-style inspector around an element: guide lines, live width/height
// measurements and a corner handle that drags the corner radius.

const EASE = [0.22, 1, 0.36, 1] as const;
// Where the corner arc crosses the diagonal, as a fraction of the radius.
const ARC = 1 - Math.SQRT1_2;
const GUIDE = "pointer-events-none absolute bg-neutral-300";
const LABEL = "pointer-events-none absolute font-mono text-[10px] leading-none whitespace-nowrap text-neutral-500 tabular-nums";

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

type Props = {
  children: ReactNode;
  initialRadius?: number;
  className?: string;
};

const AvatarInspector = ({ children, initialRadius = 4, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [radius, setRadius] = useState(initialRadius);
  const [dragging, setDragging] = useState(false);
  const max = Math.min(size.w, size.h) / 2;
  const r = Math.min(radius, max || radius);
  const pct = size.w ? (r / size.w) * 100 : 0;
  const handle = Math.max(r * ARC, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const drag = (e: PointerEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // Distance travelled along the diagonal from the top-left corner.
    const along = (e.clientX - rect.left + (e.clientY - rect.top)) / 2;
    setRadius(Math.round(Math.min(Math.max(along / ARC, 0), max) * 2) / 2);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 4 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") setRadius(Math.min(r + step, max));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") setRadius(Math.max(r - step, 0));
    else if (e.key === "Home") setRadius(0);
    else if (e.key === "End") setRadius(max);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className={cn("relative shrink-0", className)}
    >
      <motion.div
        className="size-full overflow-hidden"
        animate={{ borderRadius: r }}
        transition={dragging ? { duration: 0 } : { duration: 0.3, ease: EASE }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {size.w > 0 && (
          <motion.div
            key="inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-0 z-10"
          >
            {/* Guide lines running past each edge. */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={cn(GUIDE, "-inset-x-3 top-0 h-px")}
            />
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.04 }}
              className={cn(GUIDE, "-inset-x-3 bottom-0 h-px")}
            />
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.02 }}
              className={cn(GUIDE, "-inset-y-3 left-0 w-px")}
            />
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.06 }}
              className={cn(GUIDE, "-inset-y-3 right-0 w-px")}
            />
            <span className="pointer-events-none absolute inset-0 outline outline-sky-500/70" style={{ borderRadius: r }} />

            {/* Width, below. */}
            <motion.div
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: 0.08 }}
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
              transition={{ duration: 0.3, ease: EASE, delay: 0.1 }}
              className="pointer-events-none absolute inset-y-0 right-full mr-2 flex flex-col items-center"
            >
              <span className="h-px w-2 bg-neutral-400" />
              <span className="w-px flex-1 bg-neutral-400" />
              <span className="h-px w-2 bg-neutral-400" />
              <span
                className={cn(LABEL, "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 bg-background px-1")}
              >
                {fmt(size.h)}px
              </span>
            </motion.div>

            {/* Corner radius: label above, handle on the arc. */}
            <motion.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: 0.12 }}
              className={cn(LABEL, "bottom-full left-0 mb-2.5 -translate-x-1/2", dragging && "text-sky-600")}
            >
              {pct.toFixed(2)}%
            </motion.span>
            <motion.button
              type="button"
              role="slider"
              aria-label="Corner radius"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={r}
              aria-valuetext={`${fmt(r)} pixels, ${pct.toFixed(2)}%`}
              initial={{ scale: 0 }}
              animate={{ scale: dragging ? 1.35 : 1 }}
              whileHover={{ scale: 1.25 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              onDoubleClick={() => setRadius(initialRadius)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(true);
              }}
              onPointerMove={(e) => dragging && drag(e)}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setDragging(false);
              }}
              onKeyDown={onKeyDown}
              className="absolute size-2 -translate-1/2 cursor-nwse-resize touch-none border border-sky-500 bg-white outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              style={{ left: handle, top: handle }}
            >
              {/* Bigger hit area than the dot. */}
              <span className="absolute -inset-2" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AvatarInspector;
