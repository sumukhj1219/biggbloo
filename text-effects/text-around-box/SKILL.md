---
name: text-around-box
description: Creates a kinetic typography "text around box" / text tunnel effect
  for React (Next.js/Vite) using Motion and CSS 3D. A phrase repeats in rows on
  all four inner walls of a square box seen head-on, so the text is huge at the
  edges and shrinks toward the center; scrolling (or a loop) flies forward
  through the box while new rows fade in from the center. Use when the user asks
  for text around a box, a text tunnel, text on box walls/faces, an infinite
  typography corridor, a 3D text tunnel on scroll, or kinetic typography where
  text recedes into the center.
---

# Text Around Box

A square tunnel viewed straight down its axis. Each wall is lined with rows of
the same phrase. Letter tops point toward the viewer, so the top wall reads
normally, the right wall reads top to bottom, the bottom wall is upside down and
the left wall reads bottom to top. Near rows are huge and clipped by the
viewport; far rows get small and fade into the background. Scrolling moves the
camera forward: rows rush outward and new ones appear from the center.

## How to use

1. Copy `assets/TextAroundBox.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`.
3. Use it:

```tsx
// Scroll-driven: 300vh of scroll track with a sticky full-screen tunnel.
<TextAroundBox text="JUST GO AHEAD" className="bg-blue-700 text-white font-black" />

// Autoplay loop in a fixed-size box.
<div className="h-[500px]">
  <TextAroundBox text="JUST GO AHEAD" mode="loop" height="100%" />
</div>
```

Colors and font come from CSS (`color`, `font-family`, `font-weight`) on the
component or a parent. The background shows through, and faded rows blend into it.

Color bands, with each ring taking the next color:

```tsx
<TextAroundBox text="JUST GO AHEAD" colors={["#ffffff", "#ffd23f", "#ff5a8a"]} />
<TextAroundBox text="JUST GO AHEAD" bands={2} />                       // 2 shades of the text color
<TextAroundBox text="JUST GO AHEAD" colors={["#fff", "#0ff"]} rowsPerBand={3} />  // thick stripes
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | the phrase on every row; short, uppercase works best |
| `mode` | "scroll" \| "loop" | "scroll" | scroll-driven or autoplay |
| `speed` | number | 24 (scroll) / 3 (loop) | rows travelled per full scroll / per second |
| `scrollLength` | string | "300vh" | scroll mode: height of the scroll track |
| `height` | string \| number | "100vh" | viewport height (scroll mode); loop mode fills `height` |
| `perspective` | number | 0.5 | camera distance as a fraction of box size; smaller = deeper, more dramatic |
| `depth` | number | 2.5 | how deep the tunnel goes (in box sizes) before rows fully fade |
| `rowGap` | number | 0.85 | row spacing in em of the row font; lower = denser |
| `rotateAfter` | number \| null | 3 | seconds before the tunnel starts spinning around its axis; `null` = never |
| `rotateSpeed` | number | 30 | spin speed in degrees per second; negative = counterclockwise |
| `colors` | string[] | shades of the text color | colors cycled ring by ring (any CSS color) |
| `bands` | number | 3 | how many colors are used: the first `bands` of `colors`, or that many shades by default |
| `rowsPerBand` | number | 1 | consecutive rings that share a color |
| `scrollContainer` | RefObject | page | scroll inside an element instead of the page |
| `className` | string | | on the outer track |

## How it works

- The box side `S` = the viewport's longer side; perspective = `S × perspective`.
- Each row is a `div` of width `S`, font-sized so the phrase's ink spans exactly
  `S` (canvas `measureText`). Transform per row:
  `rotateZ(wall × 90°) translate3d(0, −S/2, −depth) rotateX(−90°)`
  i.e. lay it flat on the top wall with letter tops toward the viewer, push it
  back, then rotate around the tunnel axis onto its wall.
- Endless travel: all rows are identical, so the group only translates in Z by
  `offset mod rowSpacing` and wraps. A fixed set of rows makes an infinite tunnel.
- Fog: one opacity motion value per depth slot (shared by the 4 walls), computed
  from each row's actual depth: 1 near, fading to 0 at `S × depth`. It follows the
  wrap, so there's no popping.
- Scroll mode: `useScroll` on a tall track with a sticky viewport,
  `offset = progress × speed × rowSpacing`.
- Color bands: each depth slot has a color motion value. Slot `i` shows absolute
  row `i + floor(offset / rowSpacing)`, so a ring keeps its color while it travels
  and doesn't jump when the group wraps. Color = `palette[floor(row / rowsPerBand) mod palette.length]`.
  Default palette = `bands` tones of `currentColor` (100% → 35% via `color-mix`).
- Spin: `rotateZ` on the same group, driven by `useAnimationFrame`. It starts
  after `rotateAfter` seconds (time-based in both modes) and eases to full speed
  over 1s.
- A spinning square exposes the viewport corners (√2 × further out than the
  walls at 45°), so extra rows are placed in front of the mouth, up to
  `0.3 × camera distance`, to keep them covered.

## Rules

- Keep `"use client"`.
- Re-measure on resize and `document.fonts` `loadingdone` (the font changes the
  row width).
- Reduced motion: tunnel renders static, with no travel and no spin.
- Accessibility: viewport is `role="img"` with `aria-label={text}`; rows are `aria-hidden`.
- Row count is `ceil(S × depth / spacing) + 2` per wall. Keep `depth` ≤ 3 and
  `rowGap` ≥ 0.7 so the element count stays reasonable (~100–150).

## Tuning

- Closer to the classic poster look: square viewport, heavy condensed or black
  font (Archivo Black, Anton, Bebas Neue), white on saturated blue.
- More dramatic depth: `perspective` 0.35. Flatter: 0.8.
- Faster fly-through on scroll: raise `speed` or shorten `scrollLength`.

## Gotchas

- Long phrases make each row thin; 1–4 words is the sweet spot.
- In wide viewports the top/bottom walls start outside the frame and only come
  into view deeper in the tunnel. That's expected for a square tunnel.
- Inside a custom scroll container, `height` must be a real length (px), not
  `100vh`, so the sticky viewport matches the container.
