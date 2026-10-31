---
name: announcement-text
description: Creates an "announcement text" kinetic typography effect for React
  (Next.js/Vite) using Motion. Two stacked lines are made of letter cards (each
  letter in its own colored tile); the cards scale in a three-phase sequence:
  center-out (middle biggest, edges shrink), edges-in (corners biggest, middle
  shrinks), then alternating (every other card up, the rest down). The seam
  between the lines never moves. Use when the user asks for announcement text,
  letter tiles/cards that grow and shrink, a bouncing letter-block headline,
  scaling letter boxes, or a stacked two-line title with per-letter scaling.
---

# Announcement Text

Two lines of text, each letter on its own card (e.g. black letters on blue tiles
over a pink page). One animation runs three phases back to back on both lines:

1. **Center out:** the middle card grows most, then its two neighbours grow a
   little less (together), and the outermost cards scale *down*.
2. **Edges in:** the reverse. Corner cards grow most, the next ones less, and
   the middle cards scale down.
3. **Alternate:** every other card grows while the cards between them shrink,
   all at the same time.

Then all cards settle back to rest. With `trigger="auto"` it loops; with
`"hover"` it plays while hovered and settles when the pointer leaves.

**The seam is fixed:** the top line's cards grow upward from their bottom edge
and the bottom line's cards grow downward from their top edge. The block
reserves its maximum height, so nothing around it moves vertically. Cards push
their neighbours sideways, so the lines get wider and narrower.

## How to use

1. Copy `assets/AnnouncementText.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`.
3. Use it:

```tsx
<AnnouncementText
  lines={["Shuka", "Design"]}
  cardColor="#2346e0"
  textColor="#0b0b0f"
  className="text-7xl font-black"   // font + base size come from CSS
/>

<AnnouncementText lines={["Big", "News"]} trigger="hover" cardColor={["#ff5a4e", "#ffd23f"]} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `lines` | [string, string] | (required) | top and bottom line; spaces become a gap, not a card |
| `trigger` | "auto" \| "hover" | "auto" | auto plays on mount; hover plays while hovered |
| `loop` | boolean | true | auto mode: repeat the sequence |
| `cardColor` | string \| string[] | "#2346e0" | one color, or a list cycled card by card |
| `textColor` | string | "currentColor" | letter color |
| `maxScale` | number | 1.5 | biggest card scale |
| `minScale` | number | 0.7 | smallest (scaled-down) card scale |
| `duration` | number | 0.35 | seconds per card scale change |
| `stagger` | number | 0 | delay between distance groups (center → neighbours → edges); 0 = all cards move together, ~0.1 = ripple |
| `hold` | number | 0.5 | pause after each phase |
| `pause` | number | 0.8 | pause before the next loop |
| `cardWidth` | number | 0.78 | card width in em |
| `cardHeight` | number | 0.95 | card height in em |
| `gap` | number | 0.05 | space between cards and between the lines, in em |
| `radius` | number | 0 | card corner radius in em |
| `className` | string | | on the wrapper; set font family/weight/size here |

## How it works

- One motion value per card (1 = rest). Each card's `font-size` is `scale em`,
  and its width/height are in em of that font-size. One number scales card +
  letter together, and neighbours reflow instead of overlapping.
- Rows have fixed height `cardHeight × maxScale`. Top row `align-items:
  flex-end`, bottom row `flex-start`, which pins the seam.
- Phase targets come from each card's distance to the line's center. Equal
  distances share a rank (so a 6-letter line's two middle cards move together),
  and the scale is interpolated from `maxScale` (rank 0) to `minScale` (last rank).
  Delay = rank × `stagger` (phase 2 uses the reversed rank).
- The sequence is an async loop of Motion `animate()` calls; hover-out or unmount
  cancels it, stops running animations and eases every card back to 1.
- Each letter is centered on its own ink, both axes: canvas `measureText` gives
  the glyph's ink box and the font's ascent/descent; the letter sits in a
  `line-height: 0` box (at a known spot relative to the baseline) and is
  translated so its ink middle lands on the card middle. Lowercase, capitals
  and descenders (g, y, p) all look centered. Re-measured after renders and on
  font load, so changing the font through CSS works.

## Rules

- Keep `"use client"`.
- Exactly two lines. The seam logic assumes top + bottom.
- Reduced motion: no animation, cards stay at rest.
- Accessibility: wrapper is `role="img"` with `aria-label` = both lines; cards are `aria-hidden`.

## Tuning

- Punchier: `maxScale` 1.8, `minScale` 0.55.
- Rippling instead of simultaneous: `stagger` 0.1 (center → edges in phase 1, edges → center in phase 2).
- Calmer: `maxScale` 1.25, `minScale` 0.85, `duration` 0.5.
- The default ease overshoots slightly for a bouncy, poster-like feel.
- Heavy, wide fonts (Archivo Black, Anton, Unbounded) look closest to the
  classic card-letter style.

## Gotchas

- Very wide letters (W, M) can be wider than `cardWidth`; raise it to ~0.9 for
  wide fonts.
- Long lines get wide at `maxScale`; 4–8 letters per line is the sweet spot.
