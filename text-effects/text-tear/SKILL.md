---
name: text-tear
description: Creates a looping "text tear" transition for React (Next.js/Vite)
  with WebGL - a big condensed word with glowing neon outlines rips open along a
  hot pink/orange tear that runs across it; the letters around the rip get pulled
  and smeared into it, the next word shows through and the tear opens until the
  next word fills in, then that one tears, forever. Use when the user asks for
  text that rips, tears, splits or breaks open to reveal the next word, a glitch
  word swap, word-to-word transition loop, torn text, or music-video / poster
  style rotating words.
---

# Text Tear

A loop over a list of words. Each word is set huge, stretched to fill the box.
It has a fill color, a glowing outer rim, a thin inner edge and echo outlines
trailing to the left, all slightly turned in perspective. Each word rests, then:

1. A hairline crack streaks across it along a horizontal line.
2. It unzips: a ">" tip runs left to right. Behind it the two lips spread apart
   in straight lines, with small teeth. The old word's halves aren't cut away:
   they're pushed apart, bending around the ">" with a shadowed fold at each torn
   edge, bunch up toward the top and bottom, and only leave once squeezed off. The lips
   glow hot pink and orange with scan streaks, and cyan just outside.
3. The next word bubbles up right behind the tip. At the lips it starts small
   and bright, overshoots, and settles, so it's there as soon as the tip has
   passed.
4. When the tip leaves the right side, the zip is fully open and the next word
   fills the box. Then that word unzips in turn.

## How to use

1. Copy `assets/TextTear.tsx` into the user's components folder.
2. Install `motion` if missing (only `useReducedMotion` is used). No other dependencies.
3. Set the font with CSS. Tall condensed fonts look best (Anton, Bebas Neue, Oswald 700, Impact):

```tsx
<div style={{ background: "#151517", fontFamily: "Anton", width: 480 }}>
  <TextTear words={["MISTAKES", "LESSONS", "PROGRESS"]} />
</div>

<TextTear
  words={["BREAK", "THROUGH"]}
  tilt={0}
  themes={[{ fill: "#fff", rim: "#ff3d7f", edge: "#7a5cff" }]}
  tearColors={["#7a5cff", "#ff3d7f", "#d7ff3a"]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `words` | string[] | (required) | uppercased; one word per slide |
| `themes` | `{fill, rim, edge}[]` | yellow / pink-white / orange | cycled per word |
| `tearColors` | [hot, warm, cool] | pink, amber, cyan | the tear's core, streaks and outer rim |
| `hold` | number | 0.1 | s each word rests before the next tear; 0 = tears back to back |
| `duration` | number | 1.8 | s per tear |
| `aspect` | number | 1.05 | box width / height; the letters stretch to fill it |
| `tilt` | number | 18 | perspective turn, degrees (left side closer); 0 = flat |
| `echoes` | number | 3 | echo outlines trailing left |
| `progress` | number | | controlled 0–1: freezes the tear from word 1 to word 2 (e.g. scroll-driven); omit for the loop |
| `className` / `style` | | | font goes here |

## How it works

- **Words → textures:** each word is drawn once on a 2D canvas at the box size.
  It is measured by its ink bounds, sized to 84% width, then scaled vertically
  to 80% height. Stroke widths are divided by √(stretch) so outlines stay even.
  Draw order: echo strokes offset left, the glowing rim stroke (`shadowBlur`),
  the inner edge, the fill, then a faint top-to-bottom sheen. Uploaded as
  premultiplied textures.
- **Shader** (one fullscreen quad, current word A, next word B, progress `p`):
  - **Zipper:** the tip runs from x = −0.02 to 2.0 (so the zip is fully open at the end). Half-height of the opening
    = `behind · 0.62`: straight lips, a sharp ">" tip, wide open behind. Plus
    triangle teeth (`fract(x·46)`, offset half a tooth between the upper and
    lower lip) and a slight noise wobble. The mask is a narrow `smoothstep`, so
    the lips are clean but anti-aliased.
  - **Torn halves (nothing is cut away):** outside the opening, A is sampled
    from `src = (|dy| − h) · bunch`, where `h` is the opening's half-height and
    `bunch = mix(1, room / (room − h), 0.6)`. Each half is pushed away from the
    line by the opening and compressed against the box edge. The letters bend
    around the ">" and stay visible as flaps. They thin out as they're squeezed
    and only leave at the top and bottom.
  - **Fold:** within a few px of each torn edge, A darkens (the edge rolling
    under), gets a thin lit ridge right at the lip, and drags slightly toward
    the tip with a short smear.
  - **Bubble:** with `age` = distance behind the tip, B is scaled by
    `1 − 0.28·e^(−16·age) + 0.07·sin(26·age)·e^(−9·age)`: small at the lip,
    overshooting, then settling. It is brightened by `e^(−12·age)` for a pop of
    light.
  - **Glow:** an exponential falloff from the lip. Inside it's hot (pink→amber,
    with `sin(dy · res)` scan stripes), outside it's cool cyan, plus a hairline
    crack ahead of the tip. It's weighted by letter coverage, screened on (never
    blows out to white), and faded in and out over `p`.
- **Loop:** a requestAnimationFrame clock: hold, tear, swap (A ← B), repeat.
  Each tear runs along a slightly different line. The loop pauses offscreen
  and when the tab is hidden.

## Rules

- Keep `"use client"`.
- Reduced motion: no tear, just a short cross-fade between words.
- Accessibility: root is `role="img"` with `aria-label` listing the words; the canvas is `aria-hidden`.
- Textures rebuild on resize (debounced) and when fonts finish loading.

## Tuning

- Calmer: `duration` 2.6, `hold` 1.5. Frantic: `duration` 1.1, `hold` 0.
- Zip angle: `slope` in the shader (0.62). Higher = a blunter, faster-opening ">".
- Flat graphic look: `tilt` 0, `echoes` 0.
- Wider poster: `aspect` 1.6 (letters get less stretched).

## Gotchas

- The perspective `tilt` needs some room around the box; very tight `overflow: hidden` parents clip the near side.
- Long words get thin when stretched to fill; 4–9 letters look best.
- WebGL1 GLSL: `half` is a reserved word, so don't name a variable that.
