"use client";

import { useEffect } from "react";
import { RefObject } from "react";
import { useLayoutStore } from "@/store/useLayoutStore";

export function useElementRect(
  refs: Record<string, RefObject<HTMLElement | null>>,
) {
  const setRects = useLayoutStore((state) => state.setRects);

  useEffect(() => {
    const measure = () => {
      const next: Record<string, DOMRect> = {};
      for (const [name, ref] of Object.entries(refs)) {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) next[name] = rect;
      }
      setRects(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [refs, setRects]);
}
