---
name: liquid-morph
description: Creates an interactive "liquid morph" gooey text effect for React
  (Next.js/Vite) using Motion. Letters are soft blobby outlines (or filled
  blobs) that the viewer can drag. Letters that touch fuse like drops of water.
  Pulling them apart stretches a liquid neck that thins and snaps, and pushing
  them together merges them again. Use when the user asks for gooey, liquid,
  blobby, metaball, melting or water-drop text, draggable letters that stick
  together, or text that merges and stretches like liquid.
---

# Liquid Morph

The word renders as one gooey outline, with neighboring letters fused by soft
liquid joints. Every letter can be dragged:

- **Near another letter:** a liquid joint bulges out and fuses them, like two
  drops of water touching.
- **Pulled apart:** a neck of liquid stretches between them, getting thinner
  the farther you pull, and snaps at `maxStretch`.
- **Pushed together:** the letters merge into one blob and join up again.
- **Double-click:** every letter goes home.

## How to use

1. Copy `assets/LiquidMorph.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`.
3. Use it. Heavy, round fonts work best (Poppins 900, Fredoka, Baloo, Inter 900):

```tsx
<LiquidMorph text="FLOAT" className="text-9xl font-black text-white" />
<LiquidMorph text="BLOB" fill="#ff5a8a" color="#fff" maxStretch={1.6} />
<LiquidMorph text="DRIP" fill="#38bdf8" strokeWidth={0} />   {/* solid blobs */}
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | spaces separate letters into unjoined groups |
| `color` | string | `currentColor` | outline color |
| `fill` | string | `"none"` | color inside the outline |
| `strokeWidth` | number | 0.045 | outline, em; 0 with a fill = solid blobs |
| `goo` | number | 0.06 | softness, em: rounder letters and wider joints |
| `tracking` | number | -0.04 | letter gap, em; negative = start fused |
| `neck` | number | 0.32 | neck thickness, em |
| `maxStretch` | number | 1.1 | em of pull before the neck snaps |
| `draggable` | boolean | true | |
| `dragBounds` | ref | | keep letters inside this element |
| `resetOnDoubleClick` | boolean | true | |
| `className` / `style` | | | font, weight, size, color |

## How it works

- **Goo filter** (SVG, applied with CSS `filter: url(#id)` to the letters' row):
  `feGaussianBlur` on `SourceAlpha` → `feColorMatrix` alpha threshold
  (`24a − 8`, so the edge sits at ~33% alpha). Where two blurred shapes come
  close, their alphas add past the threshold, which makes the liquid joint.
  The outline is `goo` minus `feMorphology erode(goo)`, flooded with `color`.
  The fill is `goo` flooded with `fill`. Blur and erode radii are in px, computed
  from the font size, which a ResizeObserver keeps in sync.
- **Filter region** is a huge `userSpaceOnUse` box, so dragged letters aren't clipped.
- **Dragging:** each letter is a `motion.span` with `drag` and its own `x`/`y`
  motion values (`dragMomentum={false}`, so letters stay where dropped).
- **Necks:** a `useAnimationFrame` loop checks every letter pair. Neighbors
  start bonded. A bond breaks when the pair is more than `maxStretch` past
  touching, and forms again when they touch. While a bonded pair is apart, an
  absolutely placed bar (pill) is drawn across just the gap between them (edges
  approximated by an ellipse per letter), with thickness
  `neck × (1 − stretch/maxStretch)^1.2`. The bar goes through the same goo
  filter, so it reads as a liquid neck with smooth fillets at both ends.
- **Reset:** a key change remounts the letters with fresh motion values.

## Rules

- Keep `"use client"`.
- Keep the filter on the row, not on each letter. The merge only happens when
  shapes are blurred together.
- Accessibility: root is `role="img"` with `aria-label={text}`; the row is `aria-hidden`.

## Tuning

- Bubblier, like the reference: heavier font plus `goo` 0.08. Crisper letters: `goo` 0.04.
- Longer, stringier pulls: `maxStretch` 1.8 and `neck` 0.22.
- Thick cartoon outline: `strokeWidth` 0.07.

## Gotchas

- Thin strokes melt: with `goo` above ~0.1em, light weights lose their arms. Use
  weight 800+ or lower `goo`.
- `feMorphology` and the blur work in px. Very large font sizes cost more to
  filter; fine up to ~300px.
- Letters are dragged with pointer events (`touch-action: none`), so a page
  can't be scrolled by swiping on them on touch devices.
