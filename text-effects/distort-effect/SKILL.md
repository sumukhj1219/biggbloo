---
name: distort-effect
description: Creates a skewed perspective text effect for React (Next.js/Vite)
  using Motion. The whole word is tilted in 3D so one side is tall and the other
  short (e.g. in DISTORT, the D side is biggest and the T side smallest), with the
  top and bottom edges forming straight slanted lines; on hover it swings the
  other way so the opposite side grows. Use when the user asks for distorted text,
  a distort effect, skewed/perspective/slanted text, text that grows on one side,
  or a hover effect where the word tilts toward the viewer.
---

# Distort Effect

The word is skewed in perspective: one side is big, the other small, and both
the top edge and bottom edge are straight slanted lines (not steps). On hover
the word swings so the other side becomes the big one.

## How to use

1. Copy `assets/DistortEffect.tsx` into the user's components folder
   (e.g. `components/` or `src/components/`).
2. Install `motion` if it isn't in package.json: `npm i motion`.
3. Use it:

```tsx
<DistortEffect as="h1" text="DISTORT" className="text-6xl font-extrabold" />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | |
| `from` | "left" \| "right" | "left" | which side is big at rest |
| `ratio` | number | 2.2 | big side height / small side height (1–2.9) |
| `anchor` | "center" \| "baseline" \| "top" | "center" | which horizontal line stays flat: center = both edges slant, baseline = flat bottom, top = flat top |
| `tight` | boolean | false | trim to ink + cap height and cancel drift; used by `DistortStack` |
| `duration` | number | 0.4 | seconds for the hover swing |
| `active` | boolean | (uncontrolled) | pass to drive the swing from a parent instead of the word's own hover |
| `as` | "h1".."h6" \| "p" \| "span" \| "div" | "span" | wrapper element |
| `className` | string | | applied to the wrapper; set font size/weight here |

## Stacked lines (opposite directions)

Use the `DistortStack` export (same file) for two or more lines under each
other:

```tsx
import { DistortStack } from "@/components/DistortEffect";

<DistortStack lines={["DISTORT", "EFFECT"]} className="text-6xl font-extrabold" />
```

What it does:
- Alternates `from` per line and swings all lines together on hover of the block.
- Scales each line's font size so every line has the same ink width: left and
  right edges line up exactly, with no gap.
- Stacks lines with a small vertical gap (`gap` prop in em, default 0.12; 0 = flush), each line trimmed to
  cap height → baseline.
- Keeps the seams flat: first line pivots on its baseline, last line on its
  cap height, middle lines on their center. Lines have different cap heights
  after scaling, and two slants of different heights can't sit flush.
- Props: `lines`, `ratio`, `duration`, `gap`, `as` (default "div"), `className`.

It relies on `tight` mode of `DistortEffect` (also usable directly):
- trims the box to the ink (canvas `measureText` side bearings, `text-box: trim-both cap alphabetic`),
- cancels the perspective drift with `translateX(c·s / (4 − s²))` and keeps the
  average height constant with `scaleY((4 − s²) / 4)`, so edges stay aligned
  through the whole swing, not just at rest.

For full manual control, `active` lets a parent drive any `DistortEffect`.

## How it works

- The word is one `inline-block` rotated with `rotateY` inside a parent with
  `perspective`. That's what makes the edges straight lines. The whole word
  swings as one piece.
- Perspective distance is set to the word's measured width, so `ratio` looks the
  same at any font size. The angle comes from `ratio`:
  `angle = asin(2(r-1)/(r+1))`.
- `anchor="baseline"` puts `perspective-origin` on the text baseline (measured
  with a zero-size inline-block marker), so the baseline doesn't move.
- Hover is detected on the parent, not on the rotating word, so the hit area
  doesn't shift mid-animation and cause flicker.
- Rejected approaches: per-letter `fontSize` (gives stepped tops) and a
  per-letter staggered ripple (the user preferred the whole word swinging
  together).

## Rules

- Keep `"use client"` at the top of the component.
- Triggered by `whileHover` + `whileTap` (tap covers touch screens).
- Reduced motion: shows the static skew, with no hover swing.
- Accessibility: wrapper has `aria-label={text}`; the rotated word is `aria-hidden`.
- Single line only (`white-space: nowrap`).

## Tuning

- Stronger skew: raise `ratio` (max 2.9; past 3 the near side would pass the
  camera).
- Subtle: `ratio` 1.4.
- Slower swing: raise `duration` (0.8–1.2 feels smooth and deliberate).
- Works best on short, uppercase words in a heavy weight.

## Gotchas

- In perspective the near side expands outward, so the word visually drifts
  toward its big side. Leave some horizontal room around it (or use `tight`).
- `text-box` trimming needs Chrome 133+ / Safari 18.2+; elsewhere it falls back
  to `line-height: 0.75`, which is close but font-dependent.
- Before measurement (SSR / first paint) perspective is estimated as
  `letters × 0.6em`; it corrects itself in a layout effect before paint on the
  client.
