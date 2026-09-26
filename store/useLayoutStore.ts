import { create } from "zustand";
import type { ChildRect } from "@/hooks/useChildRects";

export const FADE_DURATION_S = 0.6;

interface LayoutState {
  rects: Record<string, DOMRect>;
  setRects: (rects: Record<string, DOMRect>) => void;

  childRects: Record<string, ChildRect[]>;
  setChildRects: (childRects: Record<string, ChildRect[]>) => void;

  active: boolean;
  fading: boolean;
  toggleActive: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  rects: {},
  setRects: (rects) => set((state) => ({ rects: { ...state.rects, ...rects } })),

  childRects: {},
  setChildRects: (childRects) =>
    set((state) => ({ childRects: { ...state.childRects, ...childRects } })),

  active: false,
  fading: false,
  toggleActive: () => {
    set({ fading: true });
    setTimeout(() => {
      set((state) => ({ active: !state.active, fading: false }));
    }, FADE_DURATION_S * 1000);
  },
}));
