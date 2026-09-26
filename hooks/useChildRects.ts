"use client";

import { useEffect } from "react";
import { RefObject } from "react";
import { useLayoutStore } from "@/store/useLayoutStore";

export type ChildContent =
  | { kind: "text"; text: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "other" };

export interface ChildRect {
  rect: DOMRect;
  content: ChildContent;
}

function collectLeafRects(node: Node, out: ChildRect[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    const words = text.match(/\S+/g) ?? [];
    let searchFrom = 0;

    for (const word of words) {
      const start = text.indexOf(word, searchFrom);
      if (start === -1) continue;
      const end = start + word.length;
      searchFrom = end;

      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        out.push({ rect, content: { kind: "text", text: word } });
      }
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;

  if (el instanceof SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      out.push({ rect, content: { kind: "other" } });
    }
    return;
  }

  const meaningfulChildren = Array.from(el.childNodes).filter(
    (child) =>
      child.nodeType !== Node.TEXT_NODE || child.textContent?.trim(),
  );

  if (meaningfulChildren.length === 0) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (el instanceof HTMLImageElement) {
        out.push({
          rect,
          content: { kind: "image", src: el.currentSrc || el.src, alt: el.alt },
        });
      } else {
        out.push({ rect, content: { kind: "other" } });
      }
    }
    return;
  }

  meaningfulChildren.forEach((child) => collectLeafRects(child, out));
}

function measureChildren(element: HTMLElement): ChildRect[] {
  const items: ChildRect[] = [];
  Array.from(element.childNodes).forEach((child) =>
    collectLeafRects(child, items),
  );
  return items;
}

export function useChildRects(
  refs: Record<string, RefObject<HTMLElement | null>>,
) {
  const setChildRects = useLayoutStore((state) => state.setChildRects);

  useEffect(() => {
    const measure = () => {
      const next: Record<string, ChildRect[]> = {};
      for (const [name, ref] of Object.entries(refs)) {
        if (ref.current) next[name] = measureChildren(ref.current);
      }
      setChildRects(next);
    };
    measure();
    window.addEventListener("resize", measure);

    const observers = Object.values(refs)
      .map((ref) => ref.current)
      .filter((el): el is HTMLElement => el !== null)
      .map((el) => {
        const observer = new MutationObserver(measure);
        observer.observe(el, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["src"],
        });
        return observer;
      });

    return () => {
      window.removeEventListener("resize", measure);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [refs, setChildRects]);
}
