"use client";

import { useEffect } from "react";
import { RefObject } from "react";
import { useLayoutStore } from "@/store/useLayoutStore";

/**
 * Recursively finds every "leaf" inside a node and measures it — a leaf is
 * either a run of text (Range-measured, one rect PER VISUAL LINE it spans —
 * getBoundingClientRect() on the same range would instead return one box
 * spanning every line it wraps across) or an element with no meaningful
 * content of its own to recurse into (an <img>, an icon).
 *
 * The rule is one and the same at every level: does this node have real
 * content inside it? If yes, recurse into each piece instead of measuring
 * the wrapper as one box — this is what turns a whole paragraph into one
 * rect per word/phrase, and separately turns an "avatar + name" row into
 * one rect for the image and one for each piece of text, without treating
 * either case specially.
 */
function collectLeafRects(node: Node, out: DOMRect[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return; // whitespace-only (e.g. JSX's {" "}) — not real content

    const range = document.createRange();
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach((rect) => {
      if (rect.width > 0 && rect.height > 0) out.push(rect);
    });
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;

  // Icons: one atomic leaf, not decomposed into their internal <path>s etc.
  if (el instanceof SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) out.push(rect);
    return;
  }

  const meaningfulChildren = Array.from(el.childNodes).filter(
    (child) =>
      child.nodeType !== Node.TEXT_NODE || child.textContent?.trim(),
  );

  if (meaningfulChildren.length === 0) {
    // A true leaf element (e.g. <img>) — nothing to recurse into.
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) out.push(rect);
    return;
  }

  meaningfulChildren.forEach((child) => collectLeafRects(child, out));
}

function measureChildren(element: HTMLElement): DOMRect[] {
  const rects: DOMRect[] = [];
  Array.from(element.childNodes).forEach((child) =>
    collectLeafRects(child, rects),
  );
  return rects;
}

export function useChildRects(
  refs: Record<string, RefObject<HTMLElement | null>>,
) {
  const setChildRects = useLayoutStore((state) => state.setChildRects);

  useEffect(() => {
    const measure = () => {
      const next: Record<string, DOMRect[]> = {};
      for (const [name, ref] of Object.entries(refs)) {
        if (ref.current) next[name] = measureChildren(ref.current);
      }
      setChildRects(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [refs, setChildRects]);
}
