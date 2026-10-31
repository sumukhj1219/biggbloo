---
name: retro-text
description: Creates a retro / vintage poster text effect for React (Next.js/Vite)
  using Motion. Each letter gets a halftone (polka-dot) face, a cream outline and
  a solid 3D extruded drop shadow, and the letters rise up from below one after
  another. Use when the user asks for retro text, vintage or 70s/80s poster
  lettering, halftone or dotted letters, comic/pop-art text, 3D extruded or
  block-shadow text, or letters that pop up one by one with that look.
---

# Retro Text

Any text rendered like a vintage poster letter: dotted halftone face, thin light
outline, and a dark solid extrude toward the bottom right. On play, letters fade
in and rise from below with a slight overshoot, one after another.

## How to use

1. Copy `assets/RetroText.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`.
3. Use it. Size and font come from CSS (heavy condensed display fonts look best):

```tsx
<RetroText text="RETRO" className="text-9xl font-[Anton]" />
<RetroText
  text="GROOVY"
  fillColor="#2ec4b6"
  dotColor="#0b5d57"
  outlineColor="#fff8e7"
  shadowColor="#1b1b3a"
  delay={0.3}
  stagger={0.1}
  trigger="inView"
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | any text; wraps between words only |
| `fillColor` | string | `#f4a81d` | letter face (under the dots) |
| `dotColor` | string | `#b5123f` | halftone dots |
| `outlineColor` | string | `#fdebd3` | border around each letter |
| `shadowColor` | string | `#2b0812` | 3D extrude |
| `dotSize` | number | 0.02 | dot diameter, em |
| `dotSpacing` | number | 0.055 | distance between dots, em |
| `outlineWidth` | number | 0.02 | em |
| `depth` | number | 0.09 | extrude length, em |
| `angle` | number | 45 | extrude direction, degrees (0 = right, 90 = down) |
| `letterGap` | number | 0 | extra space between letters, em (font tracking otherwise) |
| `delay` | number | 0 | seconds before the first letter |
| `stagger` | number | 0.08 | seconds between letters |
| `duration` | number | 0.6 | seconds per letter |
| `rise` | number | 0.6 | start distance below, em |
| `trigger` | "load" \| "inView" | "load" | |
| `once` | boolean | true | inView only |
| `className` / `style` | | | font family, weight, size |

## How it's built

Each letter is a `motion.span` grid with all layers stacked in one cell:

1. **Extrude**: copies of the glyph in `shadowColor`, stroked like the outline,
   each translated a bit further along `angle` (every 0.006em up to `depth`).
   Together they form one solid block.
2. **Outline**: the glyph with `-webkit-text-stroke` of `2 × outlineWidth`. The
   stroke is centered on the edge, so the face covers the inner half.
3. **Face**: transparent text with `background-clip: text`; the background is
   `fillColor` plus two offset `radial-gradient` dot grids, which gives the
   diagonal halftone.

Outline and face are `position: relative` so they paint above the transformed
extrude copies.

## Rules

- Keep `"use client"`.
- Keep everything in em so the effect scales with font-size.
- Reduced motion: letters fade in without moving.
- Accessibility: wrapper is `role="img"` with `aria-label={text}`; letters are `aria-hidden`.

## Tuning

- Classic look: Anton, Bebas Neue, Archivo Black, Oswald 700, in uppercase.
- Chunkier: `depth` 0.14, `outlineWidth` 0.035. Subtler: `depth` 0.05.
- Bigger dots: `dotSize` 0.03, `dotSpacing` 0.07. Keep the size at about 40% of the spacing.
- Snappier entrance: `stagger` 0.05, `duration` 0.45.

## Gotchas

- Don't build the extrude with a `drop-shadow()` filter chain. Each step is
  under 1px, and Chrome rounds sub-pixel shadow offsets to 0, so the extrude
  disappears.
- Transformed elements paint above static siblings. Without `position: relative`
  on the outline and face, the extrude covers them.
- Each letter renders ~17 spans. That's fine for headlines, but avoid it for
  paragraphs.
