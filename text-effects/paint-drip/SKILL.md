---
name: paint-drip
description: Creates a "paint drip" WebGL text effect for React (Next.js/Vite)
  using Motion. Thick paint slowly drips down from the letters in the user's
  colors, and the colors swirl and marble together inside the drips while they
  keep flowing. Use when the user asks for dripping text, melting text, paint
  or liquid running off letters, marbled/fluid color mixing under text, wet
  paint, slime or lava drips, or text that bleeds colors downward.
---

# Paint Drip

Solid text. The letters start to melt: paint in the letters' own color runs
off their bottom edges in uneven drips (long fingers, short stubs, merging into
a curtain). Farther down, that paint gradually turns into the given colors:
first color nearest the letters, last at the tips, all swirled and marbled
together, with streaks of letter-colored paint reaching down into them and
bright ribbons where the paint folds. Black text drips black paint that turns
into the colors; white text drips white. After the drips have run, the paint
keeps flowing inside them (`live`).

## How to use

1. Copy `assets/PaintDrip.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`. No other dependencies; it uses raw WebGL2.
3. Use it. Size and font come from CSS. Heavy fonts on a dark background look
   best (Poppins 800, Anton, Archivo Black). Leave about `length` em of space
   below it, since the drips hang out of the box:

```tsx
<PaintDrip text="euphoria" className="text-8xl font-extrabold text-white" />
<PaintDrip
  text="SWEET"
  colors={["#ffd1f0", "#ff9ad8", "#ff6ec7", "#b14dff", "#4dd2ff", "#2a6bff"]}
  turbulence={0.6}
  length={2}
  trigger="inView"
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | single line |
| `colors` | string[] | yellow → orange → red → purple → navy | under the letters → drip tips |
| `color` | string | CSS color | letter color, also the color of the paint as it leaves the letters |
| `length` | number | 4.6 | longest drip, em |
| `turbulence` | number | 1 | how much colors swirl and drips wander, 0–2 |
| `melt` | number | 0.85 | how far the paint stays the letter color before turning into `colors`, em |
| `duration` | number | 10 | s for the drips to run |
| `delay` | number | 1 | s |
| `speed` | number | 1 | flow speed inside the drips |
| `live` | boolean | true | keep the paint flowing |
| `trigger` | "load" \| "inView" | "load" | |
| `className` / `style` | | | font, size, color |

## How it works

- **Layout:** an invisible copy of the text sizes the element. A canvas sits on
  top: 0.4em wider each side, 0.15em above, `length + 0.3` em below.
- **Field texture (CPU, RGBA16F):** the text is drawn into a mask, then per
  column: `r` = px below the column's lowest letter pixel (0 inside letters,
  huge above that pixel, so counters and the gaps between letters stay clean),
  `b` = coverage. Rebuilt on resize and font load only.
- **Drips (shader):** a pixel is paint if `r < L(x)`, where
  `L(x) = length × profile(x) × progress` and the profile mixes a slow wave
  with narrow, sharpened noise "fingers". Columns are warped sideways by fbm
  noise (more the lower down), and `r` is a min over ±spread so neighbouring
  drips merge into a curtain (sideways spread only below the text's middle).
- **Colors:** ramp index = depth down the drip + domain-warped fbm (flowing
  down over time) × turbulence + vertical streak noise. Thin bright veins
  where the warped noise crosses a level, slight darkening at the drip edges.
  Then the letter color is mixed in: `m = r / melt + swirl + streaks`, fully
  letter-colored for `m < 0.55`, fully palette by `1.15`. Since `r = 0` at the
  letter's bottom edge, the drips join the letters seamlessly, and short
  drips early in the animation are all letter color.
- **Letters** are drawn on top, solid, in `color`.
- **Progress** is a Motion value 0 → 1 (ease `[0.55, 0, 0.35, 1]`, a slow start
  like paint gathering weight). A rAF loop redraws while it changes and keeps
  drawing while `live`.

## Rules

- Keep `"use client"`.
- No WebGL2: falls back to plain text.
- Reduced motion: final drips, frozen flow.
- Accessibility: root is `role="img"` with `aria-label={text}`; the canvas is `aria-hidden`.
- Each instance owns a WebGL context (browsers allow about 16). It's for headlines.

## Tuning

- Closer to the reference: defaults, Poppins 800 lowercase, black background.
- Calm, glossy pour: `turbulence` 0.5, `speed` 0.5.
- Chaotic lava: `turbulence` 1.6, `length` 2.
- Two-tone: pass just two colors, e.g. `["#ffffff", "#ff0055"]`.
- Letters melt further before the colors show: `melt` 0.8. Colors almost
  straight away: `melt` 0.2.

## Gotchas

- The canvas hangs `length + 0.3` em below the text box. Give it room (margin
  below) and avoid `overflow: hidden` parents.
- Text is single-line (drawn with `fillText`).
- Never call `WEBGL_lose_context.loseContext()` in cleanup (React StrictMode
  reuses the canvas). Delete textures, buffer, program instead.
- In headless Chrome, WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader`.
