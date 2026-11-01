---
name: metallic-glow
description: Creates a "metallic glow" WebGL text effect for React (Next.js/Vite)
  using Motion. Letters look like clear dark glass whose edges burn like molten
  metal. Highlights slide along the curves, crawl along the edges and flare at
  corners, vertices and serifs, with an orange bloom around everything. Use when
  the user asks for glowing glass text, molten/hot metal edges, neon-like edge
  glow, glowing outlines, rim light, a moving edge glow or shine on text, or a
  WebGL text glow that follows the letter outlines.
---

# Metallic Glow

Clear glass letters (dark translucent body, thin cool rim, a second inset
contour for the glass thickness) light up left to right. Their edges then glow
like hot metal. The glow is brightest at corners, vertices, joints and thin
hairlines, highlights slide around bowls and arches as two lights circle the
word, hot patches crawl along the outlines, and a slow band of light sweeps
across. A soft orange bloom follows all of it.

## How to use

1. Copy `assets/MetallicGlow.tsx` into the user's components folder.
2. Install `motion` if missing: `npm i motion`. No other dependencies; it uses raw WebGL2.
3. Use it on a dark background. Size and font come from CSS. High-contrast
   serifs look most like the reference (Playfair Display, Bodoni Moda, DM Serif Display):

```tsx
<MetallicGlow text="glow" className="text-[160px] font-[Playfair_Display]" />
<MetallicGlow
  text="glow"
  colors={["#000814", "#002a5c", "#0057b8", "#1e90ff", "#5cc8ff", "#bfeaff", "#ffffff"]}
  glass="#2a3a4a"
  speed={1.6}
  trigger="inView"
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | string | (required) | single line |
| `colors` | string[] | deep red → orange → peach → white | glow ramp, dim edge → white-hot spot |
| `glass` | string | `#3a404a` | tint of the glass body |
| `speed` | number | 1 | speed of the moving highlights |
| `glow` | number | 0.01 | outer bloom size, em |
| `intensity` | number | 1 | overall brightness |
| `corners` | number | 0.1 | how hot corners/vertices/hairlines burn, 0–2 |
| `duration` | number | 1.6 | s for the ignition sweep |
| `delay` | number | 0.2 | s |
| `live` | boolean | true | keep the highlights moving |
| `trigger` | "load" \| "inView" | "load" | |
| `className` / `style` | | | font, size |

## How it works

- **Layout:** an invisible copy of the text sizes the element. A canvas sits on
  top, extended by `4×glow + 0.15` em on every side for the bloom.
- **Distance field:** the text is drawn white-on-black in the element's computed
  font, then turned into a signed distance field on the CPU (Felzenszwalb EDT,
  the tiny-sdf method, anti-aliasing aware). Capped at 700k pixels; stored as an
  `R16F` texture in canvas px. From it the shader gets, per pixel: distance to
  the outline, outward normal (gradient), and the nearest outline point.
- **Emission** at an outline point (normal `n`):
  - base `0.14`
  - specular: `pow(dot(n, L), 12)` for two lights circling at different speeds.
    As they turn, the highlight slides along every curve.
  - crawl: fbm noise moving over the outline.
  - sweep: a diagonal band crossing the word every ~12 s.
  - cornerness: the 8-sample ring average of the distance field minus the centre
    value. It's ~0 on straight edges and grows at corners, vertices, joints and
    thin strokes. This is what makes the vertices burn.
  - ignition: `smoothstep` wipe left → right driven by Motion progress.
- **Passes (per frame):** emission on a thin band around the outline at half
  res → separable Gaussian (tight, half res) → wider Gaussian (quarter res) →
  final pass at full res: crisp rim line + slight leak inside the glass + both
  blooms → color from the ramp. Glass body, cool rim and inset contour show
  where the glow is weak. Blooming the emission (instead of computing glow from
  the nearest edge per pixel) avoids hard seams between letters.

## Rules

- Keep `"use client"`.
- No WebGL2: falls back to plain text.
- Reduced motion: final look, frozen highlights.
- Accessibility: root is `role="img"` with `aria-label={text}`; the canvas is `aria-hidden`.
- Each instance owns a WebGL context (browsers allow about 16). It's for headlines.

## Tuning

- Calmer, more glass: `intensity` 0.7, `corners` 0.6, `speed` 0.6.
- Hotter, molten: `intensity` 1.3, `glow` 0.28.
- Sharper vertices only: `corners` 1.6, `intensity` 0.8.

## Gotchas

- Needs a dark background; on light backgrounds the glass and bloom wash out.
- The canvas extends past the text box; `overflow: hidden` parents clip the bloom.
- The distance field is rebuilt on resize and font load (a few tens of ms for
  big text), not per frame.
- Never call `WEBGL_lose_context.loseContext()` in cleanup (React StrictMode
  reuses the canvas). Delete textures, framebuffers, buffer, programs instead.
- In headless Chrome, WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader`.
