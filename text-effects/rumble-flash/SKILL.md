---
name: rumble-flash
description: Creates a "rumble flash" lyric-video text effect for React (Next.js/Vite).
  Words slam onto a black screen one at a time, fast, each in a different
  hand-drawn lettering style (dry brush, graffiti outlines, fat brush, scrawl,
  broad-nib calligraphy, pencil sketch, spray paint, dripping ink), with white and
  inverted flash frames, RGB split, speed-line bursts, smash zooms, camera shake,
  glitch blocks, ink splats, film grain and scribbled abstract figures between
  words. Use when the user asks for lyric-video text, flashing or strobing words,
  shaky/rumbling text, hand-drawn, graffiti, calligraphy or brush word sequences,
  music-video or trailer-style word-by-word text, or glitchy hand-lettered titles.
---

# Rumble Flash

A black "screen" plays the text word by word (about three a second), like a
hand-made lyric video. Each word lands with a hit: on most words a white flash
frame, often followed by one inverted frame (the word cut out of the white);
then a punch-in, speed lines bursting outward, red/cyan split fringes and a
hard shake that settles to a light rumble. Some words smash-zoom closer
halfway through. Every word is drawn in a different hand-lettered style from
the word before, sometimes with ink splats around it. The drawings
"boil" (re-drawn slightly differently at 12 fps), the frame jitters at 24 fps,
glitch blocks tear through it, and now and then a scribbled figure (ring, eye,
X, lightning, spiral, burst, boxes) flashes up between words. Then it loops,
with a fresh look each time.

## How to use

1. Copy `assets/RumbleFlash.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion` (used for `useInView` / `useReducedMotion`). Canvas 2D, no other dependencies.
3. Use it. It's a block that fills its parent's width at 16:10; set width or
   `aspect-ratio` with `className`/`style`:

```tsx
<RumbleFlash text="CAN YOU HEAR THE SOUND OF THE NIGHT" />
<RumbleFlash
  text="HOLD ON TO THE LIGHT"
  flash={0}
  chroma={0}
  rumble={0.4}
  beat={0.7}
  color="#fdebd3"
  background="#5c0f1f"
  style={{ aspectRatio: "9 / 16", width: 360 }}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | split on spaces, one word per shot |
| `beat` | number | 0.32 | s per word (longer words stay a bit longer), min 0.12 |
| `flash` | number | 0.8 | chance a word lands after a white frame (60% of those add an inverted frame), 0–1. 0 = never. The first word always flashes if > 0 |
| `flashDuration` | number | 50 | ms, rounded to whole frames (at least 1) |
| `flashColor` | string | "#ffffff" | |
| `rumble` | number | 1 | shake, 0–2 |
| `glitch` | number | 0.6 | glitch blocks, 0–1 |
| `chroma` | number | 0.7 | red/cyan split on hits and glitches, 0–1. 0 = pure monochrome |
| `size` | number | 0.65 | lettering and figure size relative to the screen; 1 = fills ~82% of the width |
| `styles` | Style[] | all 8 | `dry` `bubble` `heavy` `scrawl` `nib` `sketch` `spray` `drip` |
| `figures` | boolean | true | scribbled figures between some words |
| `fps` | number | 24 | frame rate; drawings boil at half of it |
| `loop` | boolean | true | false: holds the last word |
| `delay` | number | 0.2 | s |
| `color` / `background` | string | "#fff" / "#000" | ink and screen color |
| `trigger` | "load" \| "inView" | "load" | |
| `className` / `style` | | | size of the screen |

## How it works

- **Letters** are single-stroke glyphs (A–Z, 0–9, `!?.,':-/`) on a 6-unit-tall
  grid, split at sharp corners into separate brush strokes like a letterer
  lifting the brush. Other characters fall back to the CSS font, roughened.
- **Brush:** a stroke is resampled, wobbled sideways by noise, and drawn as
  many thin bristle lines; each bristle skips where sharpened noise drops
  under a "dryness" threshold that rises along the stroke and toward its
  edges, giving dry-brush streaks.
- **Styles:** `dry` (thin streaky chalk brush, like the "HEAR" reference),
  `bubble` (thick blocky stroke hollowed out with square-ended cuts, i.e.
  graffiti outline letters like "THE"; short words stack vertically in tall
  boxes), `heavy` (fat inked brush), `scrawl` (thin, slanted, doubled pen lines),
  `nib` (broad-nib calligraphy: a flat pen at a fixed angle swept as quads,
  thick/thin, italic, dry streaks erased near stroke ends, often a swash
  underline), `sketch` (three loose overshooting pencil passes plus hatched
  shading), `spray` (stacked faint wide passes for haze, gaussian overspray
  speckle, crisp core, runs), `drip` (fat brush with paint drips hanging off
  flat strokes and stroke ends). Words never repeat the previous style. Layout picks one or two rows,
  whichever makes letters bigger.
- **Plates:** each shot is drawn into 3 offscreen canvases (boil variants),
  lazily, then rows are sheared sideways by noise for ragged edges. Ink
  splats (lumpy blob, drops, flung streaks) are seeded per shot so they don't
  boil. Red, cyan and inverted copies are tinted from the plate on demand
  (`source-in`).
- **Timeline:** seeded from the text + loop number, so it's deterministic per
  loop but each loop looks different. A black gap separates loops.
- **Per frame:** flash frames fill `flashColor` (then maybe one inverted
  frame); otherwise speed lines for 2 frames after the hit, then the plate
  with shake (`exp` decay after the hit, plus a constant rumble), punch-in
  scale, red/cyan copies drawn with `lighter` while the hit is fresh or on
  glitch frames (a plain echo when `chroma` is 0), the smash-zoom (1.12×,
  tilted, fresh hit) at 55% of the shot, then glitch slices copied from the
  canvas itself, stray pixel blocks, film grain (3 random pattern tiles), dust
  and a scratch line.

## Rules

- Keep `"use client"`. All randomness lives in the effect (no hydration issues).
- **Photosensitivity:** flash events (white frame + optional inverted frame
  count as one) are rate-limited to at most 3 per second (WCAG 2.3.1) in code,
  even at the fastest `beat`, and never shown under `prefers-reduced-motion`
  (renders plain text instead). Still warn users and offer `flash={0}` for
  content that autoplays.
- Accessibility: root is `role="img"` with `aria-label={text}`; canvas is `aria-hidden`.

## Tuning

- Closer to the reference: defaults, white on black, tall box (`aspectRatio: "3 / 4"`) so short words stack.
- Closer to the reference (monochrome): `chroma={0}`.
- Even faster, harder: `beat` 0.2, `rumble` 1.6, `glitch` 0.9.
- Calm, no strobe: `flash` 0, `chroma` 0, `rumble` 0.3, `glitch` 0.15, `beat` 0.7.
- Graffiti only: `styles={["bubble", "spray", "drip"]}`. Elegant: `styles={["nib", "sketch"]}`.

## Gotchas

- Needs a sized box: it's a block (auto width) with `aspect-ratio: 16 / 10`.
  Inside a shrink-to-fit parent (grid item with `place-items: center`,
  inline-flex) it collapses to 0 wide, so give it a width via `className`.
  Don't hard-code `width` inline in the component: inline styles beat classes.
- Glitch slices use `drawImage(canvas, ...)` from the same canvas; that's allowed and cheap.
- Plates are full-canvas bitmaps (3 per shot); with very large screens at
  dpr 2 that's ~25 MB while a shot is on. dpr is capped at 2.
