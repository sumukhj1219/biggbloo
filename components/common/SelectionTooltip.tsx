"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
  addHighlight,
  highlightRoot,
  loadHighlights,
  recolorHighlight,
  removeHighlight,
} from "@/lib/highlights";
import DitherBackground from "@/components/ui/DitherBackground";

type Rect = { left: number; top: number; width: number; height: number };
type Selected = {
  text: string;
  lines: Rect[];
  x: number;
  y: number;
  highlightable: boolean;
};
type MarkTarget = { id: string; color: HighlightColor; x: number; y: number };

const MAX_QUERY = 300;
const EASE = [0.22, 1, 0.36, 1] as const;
const HIDDEN = { opacity: 0, y: 6, scale: 0.92, filter: "blur(4px)" };
const SHOWN = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };

const toLines = (range: Range): Rect[] => {
  const lines: Rect[] = [];
  const rects = [...range.getClientRects()]
    .filter((r) => r.width > 0 && r.height > 0)
    .sort((a, b) => a.top - b.top || a.left - b.left);
  for (const r of rects) {
    const line = lines.find((l) => Math.abs(l.top - r.top) < r.height / 2);
    if (!line) {
      lines.push({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
      continue;
    }
    const right = Math.max(line.left + line.width, r.right);
    const bottom = Math.max(line.top + line.height, r.bottom);
    line.left = Math.min(line.left, r.left);
    line.top = Math.min(line.top, r.top);
    line.width = right - line.left;
    line.height = bottom - line.top;
  }
  return lines;
};

const readSelection = (): Selected | null => {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";
  if (!selection || selection.isCollapsed || !text || !selection.rangeCount)
    return null;
  if (
    selection.anchorNode?.parentElement?.closest(
      "input, textarea, [contenteditable]",
    )
  )
    return null;
  const range = selection.getRangeAt(0);
  const box = range.getBoundingClientRect();
  return {
    text,
    lines: toLines(range),
    x: box.left + box.width / 2,
    y: box.top,
    highlightable: !!highlightRoot(range.commonAncestorContainer),
  };
};

const HighlighterIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5"
    aria-hidden="true"
  >
    <path d="m9 11-6 6v3h9l3-3" />
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5"
    aria-hidden="true"
  >
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

const SWATCH_SHADES: Record<HighlightColor, string[]> = {
  yellow: ["#fbbf24", "#fcd34d"],
  green: ["#4ade80", "#86efac"],
  pink: ["#f472b6", "#f9a8d4"],
  blue: ["#38bdf8", "#7dd3fc"],
  violet: ["#a78bfa", "#c4b5fd"],
};

const Swatches = ({
  current,
  onPick,
}: {
  current?: HighlightColor;
  onPick: (c: HighlightColor) => void;
}) => (
  <motion.span
    className="-my-1 flex items-center gap-x-1 overflow-hidden px-1 py-1"
    initial={{ width: 0, opacity: 0 }}
    animate={{ width: "auto", opacity: 1 }}
    exit={{ width: 0, opacity: 0 }}
    transition={{ duration: 0.2, ease: EASE }}
  >
    {HIGHLIGHT_COLORS.map(({ name, value }) => (
      <button
        key={name}
        type="button"
        onClick={() => onPick(name)}
        aria-label={`Highlight ${name}`}
        title={name}
        className="relative isolate size-5 shrink-0 cursor-pointer overflow-hidden rounded-full transition-transform hover:scale-110 data-[current]:ring-2 data-[current]:ring-neutral-300 data-[current]:ring-offset-1"
        data-current={current === name || undefined}
      >
        <DitherBackground
          palette={[...SWATCH_SHADES[name], value]}
          pixel={2}
          className="absolute inset-0 size-full rounded-full"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
        />
      </button>
    ))}
  </motion.span>
);

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className="size-3.5"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const SelectionTooltip = () => {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readSelection();
        setSelected(next);
        if (!next) setOpen(false);
      });
    };
    const onUp = (e: Event) => {
      if (barRef.current?.contains(e.target as Node)) return;
      const mark = (e.target as Element | null)?.closest?.<HTMLElement>(
        "mark[data-hl]",
      );
      requestAnimationFrame(() => {
        const sel = readSelection();
        setCopied(false);
        setPicking(false);
        setOpen(!!sel);
        if (!sel && mark?.dataset.hl) {
          const rect = mark.getBoundingClientRect();
          const saved = loadHighlights().find((h) => h.id === mark.dataset.hl);
          setMarkTarget({
            id: mark.dataset.hl,
            color: saved?.color ?? (mark.dataset.color as HighlightColor),
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
        } else {
          setMarkTarget(null);
        }
      });
    };
    const closeMarkBar = () => setMarkTarget(null);

    document.addEventListener("selectionchange", sync);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("keyup", onUp);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", closeMarkBar, { passive: true });
    return () => {
      window.removeEventListener("scroll", closeMarkBar);
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", sync);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("keyup", onUp);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const search = () => {
    if (!selected) return;
    const q = encodeURIComponent(selected.text.slice(0, MAX_QUERY));
    window.open(
      `https://www.google.com/search?q=${q}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const copy = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.text).catch(() => undefined);
    setCopied(true);
  };
  const highlight = (color: HighlightColor) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    addHighlight(selection.getRangeAt(0), color);
    selection.removeAllRanges();
  };
  const recolor = (color: HighlightColor) => {
    if (!markTarget) return;
    recolorHighlight(markTarget.id, color);
    setMarkTarget({ ...markTarget, color });
  };
  const remove = () => {
    if (!markTarget) return;
    removeHighlight(markTarget.id);
    setMarkTarget(null);
  };

  const barClass =
    "fixed z-45 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-x-0.5 rounded-full bg-background p-1 text-xs text-muted-foreground shadow-[0_2px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]";
  const iconButton =
    "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-secondary hover:text-foreground data-[active]:bg-secondary data-[active]:text-foreground";

  return (
    <>
      {selected?.lines.map((line, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none fixed -z-10 bg-neutral-200 shadow-[inset_0_0_6px_0px_var(--color-background)]"
          style={{
            left: line.left - 2,
            top: line.top,
            width: line.width + 4,
            height: line.height,
          }}
        />
      ))}

      <AnimatePresence>
        {open && selected && (
          <motion.div
            ref={barRef}
            role="toolbar"
            aria-label="Selection actions"
            initial={HIDDEN}
            animate={SHOWN}
            exit={HIDDEN}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ left: selected.x, top: selected.y }}
            onPointerDown={(e) => e.preventDefault()}
            className={barClass}
          >
            <button
              type="button"
              onClick={search}
              aria-label="Search Google"
              title="Search Google"
              className={iconButton}
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              onClick={copy}
              className="h-7 cursor-pointer overflow-hidden rounded-full px-3 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? "copied" : "copy"}
                  className="block"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: EASE }}
                >
                  {copied ? "Copied" : "Copy"}
                </motion.span>
              </AnimatePresence>
            </button>
            {selected.highlightable && (
              <>
                <button
                  type="button"
                  onClick={() => setPicking((p) => !p)}
                  aria-label="Highlight"
                  aria-expanded={picking}
                  title="Highlight"
                  className={iconButton}
                  data-active={picking || undefined}
                >
                  <HighlighterIcon />
                </button>
                <AnimatePresence initial={false}>
                  {picking && <Swatches onPick={highlight} />}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {markTarget && !open && (
          <motion.div
            ref={barRef}
            role="toolbar"
            aria-label="Highlight actions"
            initial={HIDDEN}
            animate={SHOWN}
            exit={HIDDEN}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ left: markTarget.x, top: markTarget.y }}
            onPointerDown={(e) => e.preventDefault()}
            className={barClass}
          >
            <Swatches current={markTarget.color} onPick={recolor} />
            <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={remove}
              aria-label="Remove highlight"
              title="Remove highlight"
              className={iconButton}
            >
              <TrashIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SelectionTooltip;
