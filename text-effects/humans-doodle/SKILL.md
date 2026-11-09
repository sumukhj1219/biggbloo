---
name: humans-doodle
description: Creates animated sketched doodle people for React (Next.js/Vite),
  no dependencies. Basic shapes painted with a brush look (ragged ink lines
  that swell thick and thin, streaky paint grain, hand-drawn line boil). One
  person as SVG, or a crowd of any size (1 to thousands) seen from the front,
  drawn on a canvas as an irregular blob, with every
  gender, skin tone, hairstyle, outfit and color, many holding something
  (coffee, phone, book, flower, ice cream, bag, balloon, umbrella). New people
  rise up as the count grows. Use when the user asks for doodle humans,
  sketched or hand-drawn people, a crowd, audience or population counter,
  diverse people illustrations, animated avatars or mascots, or a
  people-count slider or dial.
---

# Humans Doodle

Simple hand-drawn people. They breathe, blink, tilt their heads and sway
their arms; people holding something keep the forearm bent up in front, and
balloons bob. The edges re-wobble a few times a second, like a flipbook.

`HumansDoodle` turns a number into a crowd: an irregular, lumpy blob growing
from the front center, rows getting smaller toward the back. The
first 12 people are all different; after that the cast repeats in a mixed
order, half mirrored. Raising the count makes new people rise up and fade in
(back rows a beat later); lowering it sinks them away. The crowd rescales to
fit its box.

## How to use

1. Copy `assets/HumanDoodle.tsx` and `assets/HumansDoodle.tsx` into the
   user's components folder (the crowd imports the single person).
2. No installs needed.
3. Use it:

```tsx
<HumanDoodle />                                   // one person (SVG)
<HumanDoodle size={320} person={{ hairStyle: "bob", topColor: "#2d6be8", prop: "coffee" }} />

<div style={{ width: 900, height: 560 }}>
  <HumansDoodle count={count} />                  // a crowd (canvas), fills the box
</div>
<CountDial value={count} onChange={setCount} max={5000} />
```

`CountDial` is a compact count control: the pointer and the number stay in
the middle, the ruler scrolls under them. Hovering left of the pointer counts
down, right counts up, faster further out (dead zone in the middle). The scale
is exponential, so 1→20 is as easy to hit as 1,000→5,000. Arrow keys nudge.

## Person

| Field | Values |
|---|---|
| `skin`, `hair`, `topColor`, `bottomColor`, `shoes`, `accent` | colors (`hair` is the hat for a beanie; `accent` colors the prop) |
| `hairStyle` | spiky, short, long, bob, bun, ponytail, afro, beanie, bald |
| `top` | hoodie, tee, sweater, jacket, dress |
| `bottom` | pants, shorts, skirt (ignored with a dress) |
| `face` | grin, smile, open |
| `glasses` / `beard` | boolean / beard color |
| `prop` + `propHand` | coffee, book, phone, flower, icecream (held up front); bag, balloon, umbrella (hanging); "l" or "r" |
| `height` | multiplier, ~0.9–1.05 |

`PEOPLE` is the built-in cast of 12.

## Props

HumanDoodle: `person`, `size` (px height, width = 3/5), `speed`, `ink`,
`roughness` (0 = clean), `boil`, `shadow`, `seed`, `delay`, `frozenAt`
(seconds into the 3.6 s loop; renders that still frame).

HumansDoodle:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `count` | number | (required) | any size; thousands stay smooth |
| `people` | Person[] | PEOPLE | the cast |
| `personHeight` | number | 120 | front-row height cap, px; shrinks to fit |
| `speed` / `roughness` / `ink` | | 1 / 1 / "#1b1a1a" | |
| `shapeSeed` | number | 1 | changes the crowd's outline |
| `className` / `style` | | | the canvas fills 100% of its box |

## Rules

- Keep `"use client"` at the top of both files.
- Basic shapes only; the hand-made look comes from the `brush` filter
  (displacement wobble + ragged edge + multiplied bristle-streak noise) and
  the ink-then-offset-color painting (`DX`/`DY`) that makes lines thick/thin.
- Joints are nested `<g>`s with `transform-box: view-box`; 0° hangs straight
  down. Limbs are drawn twice (ink, then paint) sharing joint classes.
- Holding arms swing out (`--hd-lift`), bend up (`--hd-hold`) and are drawn
  foreshortened so the hand lands mid-chest; the prop counter-rotates.
- Crowd sprites: each cast member is baked at 16 frames of the loop
  (`frozenAt` + paused CSS animations), rasterised from an SVG data URL with
  the filter, and halved into mip levels; the seed changes every other frame
  for the boil. Frame 0 of everyone is baked first.
- Crowd layout (`crowdSlots`): candidate spots on staggered rows with
  perspective (`PERSPECTIVE`, `ROW_DEPTH`), ranked by an elliptical distance
  (`WIDE` times wider than deep) divided by a lumpy outline (noise over the
  angle). The first n are the crowd; spots never move as it grows.
- CountDial dial props: `value`, `onChange`, `min`, `max`, `width` (200),
  `sweep` (seconds for the full range at full tilt), `accent`.
- Everything random is hashed from the index, so it is stable across renders.
- Reduced motion: no idle loop, no boil, no rise-in.

## Gotchas

- `flushSync` can't render inside an effect: yield (`setTimeout 0`) before
  baking each sprite, or the first bake throws and nothing draws.
- Downscaling a 240 px sprite straight to 10 px shimmers; pick the mip level
  just above the target size.
- A full-length forearm bent across the body put the hand under the other
  arm. Foreshorten it instead.
