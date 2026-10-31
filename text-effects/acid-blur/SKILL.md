---
name: acid-blur
description: Creates an "acid blur" WebGL text effect for React (Next.js/Vite)
  using Motion. Plain text slowly melts into a grainy heat-map glow (mint
  cores, orange/pink fringe, magenta glow, teal smoke) with wispy smoky trails
  drifting in one direction, then stays alive with moving grain and smoke. Use
  when the user asks for acid, heat-map, thermal, infrared or psychedelic text,
  grainy/noisy glow, a blurry neon smear, a smoky text trail, or a WebGL shader
  text effect that blurs in.
---

# Acid Blur

Normal text (in the CSS color) gradually turns into a thermal-camera image of
itself. The heat spreads out of the letters like diffusion: the letters go
soft and out of focus, cores glow mint, the edges burn orange and pink, a
magenta glow wraps every side, and teal smoke trails off in streaks. Film grain runs through
all of it. After the transition, the grain and smoke keep drifting (`live`).

## How to use

1. Copy `assets/AcidBlur.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`. No other dependencies; it uses raw WebGL.
3. Use it. Size and font come from CSS. Tall condensed fonts look best (Bebas
   Neue, Anton, Oswald) on a dark background:

```tsx
<AcidBlur text="BLUR" className="text-9xl font-[Bebas_Neue] text-white" />
<AcidBlur
  text="FROST"
  colors={["#06142e", "#0b3d91", "#2563eb", "#22d3ee", "#a5f3fc", "#ffffff"]}
  angle={-15}
  duration={4.5}
  trigger="inView"
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | single line |
| `colors` | string[] | teal → purple → magenta → pink → orange → peach → mint | heat ramp, cool (faint haze) → hot (letter cores) |
| `color` | string | CSS color | plain text color before the effect |
| `duration` | number | 3 | s from plain text to the full effect |
| `delay` | number | 0.3 | s |
| `smear` | number | 1.1 | trail length, em |
| `angle` | number | 205 | trail direction, degrees (0 = right, 90 = down, 180–225 = left/up-left) |
| `glow` | number | 0.14 | glow size, em |
| `grain` | number | 0.45 | 0–1 |
| `live` | boolean | true | keep the grain and smoke moving after the transition |
| `trigger` | "load" \| "inView" | "load" | |
| `className` / `style` | | | font, size, color |

## How it works

- **Layout:** an invisible copy of the text sizes the element. A canvas sits on
  top, extended by `smear + 3×glow + 0.2` em on every side for the glow.
- **Textures:** the text is drawn white-on-black into a canvas in the element's
  computed font (DPR-aware, capped at 2). Four blurred copies are made with
  canvas `filter: blur()` (with a downscale/upscale fallback), at
  `glow × 0.35, 0.8, 1.8, 3.6`. The shader's `blurAt(uv, level)` blends between
  them for any blur radius. The ramp is a 256×1 gradient texture.
- **Fragment shader:** the heat spreads like diffusion, where the spread radius
  grows with `√p`. Per pixel:
  - `core = blurAt(uv, 0.9·√p)`: the letters themselves defocus, softening
    their edges while staying legible.
  - `halo` (blur 3) and `haze` (blur 4): glow on every side of each letter,
    bottom included.
  - `smear`: 20 samples back along the trail direction, from ever wider blurs
    (levels 2 → 4) as they go farther out. They're displaced by fbm noise
    stretched along the direction, and the result is scaled by that noise too,
    which makes the wispy streaks. Time moves the noise, so the smoke drifts.
  - `heat = 0.9·core + p·(0.32·halo + 0.16·haze + 0.5·smear)`.
  - Grain multiplies the heat (`× (1 + noise·grain·1.4)`), so empty background
    stays clean. It's damped in the hottest cores, so they read as a solid
    glow, like a real thermal image.
  - Color = `ramp(heat)`, alpha = `smoothstep(0.03, 0.25, heat)` (premultiplied,
    transparent background).
  - It crossfades from plain text (`color × mask`) as `p` goes 0 → 1.
- **Progress** `p` is a Motion value animated 0 → 1 (ease `[0.4, 0, 0.2, 1]`). A
  rAF loop redraws while `p` changes and keeps drawing if `live`.
- Textures are rebuilt on resize and when web fonts finish loading.

## Rules

- Keep `"use client"`.
- No WebGL: falls back to showing the plain text.
- Reduced motion: jumps to the final look with frozen grain and smoke.
- Accessibility: root is `role="img"` with `aria-label={text}`; the canvas is `aria-hidden`.
- Each instance owns a WebGL context (browsers allow about 16). Don't render
  dozens at once; it's for headlines.

## Tuning

- Closer to the reference: Bebas Neue, uppercase, dark background, defaults.
- More smoke: `smear` 1.6, `glow` 0.18. Tighter, punchier: `smear` 0.6, `glow` 0.1.
- Cleaner: `grain` 0.2. Gritty film: `grain` 0.7.
- Slow burn: `duration` 6.

## Gotchas

- The canvas extends past the text box. Leave space around it, or the glow is
  clipped by `overflow: hidden` parents.
- Text is single-line (drawn with `fillText`).
- Never call `WEBGL_lose_context.loseContext()` in cleanup. React StrictMode
  mounts, cleans up and mounts again on the same canvas, and a lost context
  stays dead, so nothing renders. Delete the textures, buffer and program instead.
- In headless Chrome, WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader`.
