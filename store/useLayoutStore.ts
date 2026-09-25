import { create } from "zustand";
import type { ChildRect } from "@/hooks/useChildRects";

// Shared by every screen that fades in sync with the 3D scene toggle
// (HomePage's own sections, Navbar, the 3D canvas wrapper) — they all need
// to agree on how long toggleActive's fade-out phase lasts.
export const FADE_DURATION_S = 0.6;

interface LayoutState {
  rects: Record<string, DOMRect>;
  setRects: (rects: Record<string, DOMRect>) => void;

  // One entry per leaf (word, image, icon) found inside a measured element
  // — see useChildRects for how these get built.
  childRects: Record<string, ChildRect[]>;
  setChildRects: (childRects: Record<string, ChildRect[]>) => void;

  // Whether the 3D scene is showing, and whether a toggle is mid-fade.
  // Lives here (not local state) because Navbar — which needs to fade in
  // sync with it — is rendered from the root layout, outside HomePage's
  // own component tree.
  active: boolean;
  fading: boolean;
  toggleActive: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  rects: {},
  // Merged, not replaced: useElementRect/useChildRects are called from
  // multiple independent components (e.g. Navbar, HomePage), each only
  // knowing about its own keys — a wholesale replace would let whichever
  // one measures last wipe out every other component's entries.
  setRects: (rects) => set((state) => ({ rects: { ...state.rects, ...rects } })),

  childRects: {},
  setChildRects: (childRects) =>
    set((state) => ({ childRects: { ...state.childRects, ...childRects } })),

  active: false,
  fading: false,
  // Whichever screen is currently showing fades out first, and only once
  // that finishes does the actual swap happen — never an instant cut.
  toggleActive: () => {
    set({ fading: true });
    setTimeout(() => {
      set((state) => ({ active: !state.active, fading: false }));
    }, FADE_DURATION_S * 1000);
  },
}));
