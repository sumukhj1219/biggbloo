import { create } from "zustand";

interface LayoutState {
  // Keyed by name (e.g. "selfIntro", "currentMusic") instead of array
  // position — consumers need to reliably ask "where is CurrentMusic",
  // not "whatever happens to be at index 1".
  rects: Record<string, DOMRect>;
  setRects: (rects: Record<string, DOMRect>) => void;

  // One rect per DIRECT CHILD of a measured element (text runs via Range,
  // element children directly) — e.g. each word/line-fragment of a
  // paragraph, rather than one box for the whole thing.
  childRects: Record<string, DOMRect[]>;
  setChildRects: (childRects: Record<string, DOMRect[]>) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  rects: {},
  setRects: (rects) => set({ rects }),

  childRects: {},
  setChildRects: (childRects) => set({ childRects }),
}));
