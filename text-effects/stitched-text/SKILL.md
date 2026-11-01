---
name: stitched-text
description: Creates an embroidered "stitched" text effect for React (Next.js/Vite)
  using Motion and Canvas 2D. Any text in any font becomes an embroidered patch -
  satin-stitch fill whose threads run across each stroke and turn with the curves,
  a puffy satin border, dark creases, sheen on every thread and a soft shadow -
  and an embroidery machine sews it in, stitch by stitch. Use when the user asks
  for embroidered, stitched, sewn, patch, varsity-letter, chenille-like, thread or
  satin-stitch text, letterman-jacket lettering, or text that gets sewn on.
---

# Stitched Text

Turns text into an embroidered patch. Each letter is filled with satin
stitches that run across the stroke at a slant and follow it around curves.
Around it sits a raised satin border with stitches perpendicular to the edge.
A dark crease separates fill from border, the fill puffs up from its edge, and
every thread has its own shading and sheen. On load a needle sews it in at
machine speed: the border first, then the fill, letter by letter.

## How to use

1. Copy `assets/StitchedText.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`. No other dependencies.
3. Use it. Font, size and thread color come from CSS. Bold, round fonts
   stitch best (Playfair Display 900, Poppins 800, Pacifico, Cooper, Anton):

```tsx
<StitchedText text="Varsity" className="text-8xl font-black text-blue-800" />
<StitchedText
  text="Sunday"
  color="#e5322d"
  borderColor="#ffd23f"
  slant={40}
  trigger="inView"
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | single line |
| `color` | string | CSS color | fill thread |
| `colors` | string[] | | fill threads cycled per letter (spaces skipped), e.g. `["#004d98", "#a50044"]`; overrides `color` |
| `borderColor` | string | "#f4f1e8" | off-white border thread |
| `border` | number | 0.07 | border width, em. 0 = fill only |
| `thread` | number | 0.013 | thread thickness / spacing, em |
| `slant` | number | 28 | fill stitch slant, degrees from straight across |
| `duration` | number | 3.2 | s to sew everything; 0 = appears finished |
| `delay` | number | 0.2 | s |
| `needle` | boolean | true | needle on the last stitch while sewing |
| `shadow` | boolean | true | soft patch shadow |
| `trigger` | "load" \| "inView" | "load" | |
| `className` / `style` | | | font, size, color |

## How it works

All CPU, once per text/size/font; the animation only draws new stitches.

- **Distance field:** the text is drawn into a mask; an exact Euclidean
  distance transform (Felzenszwalb) inside and outside gives a signed
  distance field (anti-aliased pixels refined from coverage).
- **Stitch direction:** the distance gradient points across each stroke. It's
  stored as a doubled angle (`cos 2θ, sin 2θ`) so both sides of a stroke
  agree, box-blurred to bend smoothly through joins, then rotated by `slant`.
- **Fill threads:** seeds every `thread` em along the letter outline (marching
  squares contours, sorted left to right). From each seed a thread is traced
  through the direction field (RK2, 1 px steps) until it leaves the letter.
  A coverage grid skips seeds where a thread already lies, so threads never
  pile up. Threads longer than 0.32em are split into staggered stitches.
- **Border:** pass 1 shoots straight stitches out from just under the letter
  edge, perpendicular to it, stopping at the border's outer edge or at the
  ridge where they meet stitches from the other side (tight counters, gaps
  between letters: clean fishbone seams). Pass 2 comes in from the outer edge
  only where pass 1 left gaps (convex corners).
- **Each stitch:** underlay stroke (closes gaps), dark rim, body, then a thin
  highlight along its middle 64%, nudged toward the light (top-left).
- **Layers:** border and fill are sewn on separate canvases, each clipped to
  its anti-aliased shape (`destination-in`) for clean edges. Then a precomputed
  lighting layer goes on with `source-atop`: the fill puffs up from its edge,
  the border is a rounded tube, with dark creases at the fill/border seam and
  the outer edge. The shadow is drawn behind with `destination-over`.

## Rules

- Keep `"use client"`.
- Reduced motion or `duration` 0: drawn finished, no needle.
- Accessibility: root is `role="img"` with `aria-label={text}`; canvas is `aria-hidden`.
- Building costs ~50–250 ms for a big headline (distance transforms + tracing);
  rebuilds on resize (debounced) and font load. For headlines, not body text.

## Tuning

- Closer to the reference: navy fill, off-white border, Playfair Display 900 or a blackletter font, `slant` 30.
- Chunkier, more visible thread: `thread` 0.018. Finer, more "real": 0.009.
- Straight-across satin: `slant` 0. Strong twill look: `slant` 45.
- Bold patch outline: `border` 0.1. Fill only: `border` 0.

## Gotchas

- The canvas sticks out `border + 0.14` em on every side; avoid `overflow: hidden` parents that are tight.
- Thin fonts give very short stitches; the effect wants weight 700+.
- Round ball terminals and dots get radial stitches (threads converge to a point), which is also how real satin handles them.
- Canvas pixel count is capped (2.4M); very large text gets slightly softer threads.
