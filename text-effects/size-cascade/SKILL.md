---
name: size-cascade
description: Creates a "size cascade" kinetic typography loop for React
  (Next.js/Vite) using Motion. One word repeats in a stack of rows with sizes
  stepping from small to big (e.g. MONDAY ×9), and the stack smoothly cycles
  through four states: ascending sizes aligned left → descending aligned left →
  ascending aligned right (mirror) → descending aligned right → back. Use when the
  user asks for repeated stacked words that grow and shrink, a typographic size
  ladder/staircase, a word stack that flips sizes and alignment, or smooth
  editorial kinetic type with one repeated word.
---

# Size Cascade

A single word repeated in rows (default 9). Rows step linearly from small to the
full size. The animation walks a four-state cycle with an ease-out between each:

| State | Sizes (top → bottom) | Aligned |
|---|---|---|
| start | small → big | left |
| 1 | big → small | left |
| 2 | small → big | right (mirror of start) |
| 3 | big → small | right |
| 4 = start | small → big | left |

Each transition continues from exactly where the previous one ended.

## How to use

1. Copy `assets/SizeCascade.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`.
3. Use it. The wrapper's font-size is the size of the biggest row:

```tsx
<SizeCascade text="MONDAY" className="text-8xl font-normal tracking-tight" />
<SizeCascade text="FRIDAY" rows={7} minScale={0.4} trigger="hover" />
```

Color and font come from CSS on the component or a parent.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | the repeated word (single line) |
| `rows` | number | 9 | how many rows |
| `minScale` | number | 0.3 | smallest row as a fraction of the biggest |
| `gap` | number | 0.06 | space under each row, in em of that row |
| `duration` | number | 1 | seconds per transition |
| `hold` | number | 0.6 | pause on each state |
| `ease` | cubic-bezier tuple | [0.33, 1, 0.68, 1] | ease-out cubic |
| `trigger` | "auto" \| "hover" | "auto" | auto loops; hover plays one full cycle per hover |
| `loop` | boolean | true | auto mode: keep cycling |
| `className` | string | | font family/weight/size, color |

## How it works (why it's smooth)

- **One driver.** A single motion value `phase` animates 0 → 1 → 2 → 3 → 4.
  Every row's size and position is computed from it in one pass, so rows can't
  drift out of sync, and each transition starts exactly where the last ended.
  At 4 it is reset to 0, which is the identical state, so the loop has no seam.
- **Constant block size.** The states only permute the same set of sizes, and
  all rows interpolate with the same progress, so the total stack height is
  identical at every frame. The block never resizes and nothing around it moves.
  Width is the biggest row's ink width.
- **Absolute rows, no reflow.** Rows are absolutely positioned spans driven by
  `fontSize`, `x` and `y` motion values. The stack is computed manually
  (`top += (inkAscent + inkDescent + gap) × size`).
- **Ink-exact edges.** Canvas `measureText` gives the word's ink box, so the
  left/right edges line up on the actual letters, not the font's side bearings.
  Vertical placement uses a `line-height: 0` box, whose position relative to the
  baseline is known from the font ascent/descent.
- **Alignment slides.** `x = align × (boxWidth − rowInkWidth)`, with `align`
  interpolated 0 ↔ 1 by the same driver, so switching sides is one continuous glide.
- Re-measures after renders and on `document.fonts` `loadingdone`.

## Rules

- Keep `"use client"`.
- Keep the single-driver design. Don't animate rows independently; that's what
  makes it clean.
- Reduced motion: static start state.
- Accessibility: wrapper is `role="img"` with `aria-label={text}`; rows are `aria-hidden`.

## Tuning

- More dramatic: `minScale` 0.2, `rows` 11.
- Calmer: `duration` 1.4, `hold` 1.
- Softer stop: `ease` [0.25, 1, 0.5, 1] (ease-out quart). Avoid very steep
  ease-outs like [0.16, 1, 0.3, 1]; they jump noticeably in the first frame.
- Looks best with a neutral grotesk at regular weight (Inter, Helvetica-style)
  in tight tracking, like the editorial reference.

## Gotchas

- One word / one line per row; long text makes the block very wide.
- The block is hidden until fonts are measured (one frame), to avoid a flash of
  unpositioned rows.
