---
name: magnify-link
description: Creates a magnifying-glass link preview over a paragraph for React
  (Next.js/Vite) using Motion and three.js. Hovering a link brings up a realistic
  metal magnifier (PBR rim and handle, glass shader with fresnel reflections,
  optional royal gold styling) centered on the cursor, showing a live preview of
  the linked page through a bulging lens; optionally it stays on and magnifies
  plain text too. The container's edges blur out radially and blend into the
  background. Use when the user asks for a magnifying glass, magnifier, loupe or
  lens over text, link preview on hover, peek at links, magnify text on hover,
  or a reading glass / zoom lens effect.
---

# Magnify Link

A paragraph whose links preview through a magnifying glass. By default
(`show="links"`) the glass springs up only while the pointer is on a link. The
lens is centered on the pointer, and the cursor is hidden over links. The glass
pulls focus onto a live preview of the linked page. With `show="always"`, the
glass rests on the text all the time. There, plain text under it shows
magnified and bent by the lens, with slight color fringing at the rim, and over
a link it cross-fades to the preview. A hostname pill
appears, and sliding along the link pans across the page. Clicking opens the
link as usual. The rim and handle are real 3D metal (three.js), the glass
surface has studio reflections, and the handle swings as you move. The
container's edges blur out radially (sharp center, blurrier toward every side
and corner) and fade into the background color.

## How to use

1. Copy `assets/MagnifyGlass.tsx` into the user's components folder.
2. Install: `npm i motion three` (and `npm i -D @types/three` for TypeScript).
3. Wrap any text. Plain `<a href>` elements inside become previewable:

```tsx
<MagnifyGlass className="max-w-2xl p-8 font-['Plus_Jakarta_Sans'] text-xl leading-relaxed">
  <p>
    Read the <a href="https://react.dev">React docs</a> and the{" "}
    <a href="https://github.com/acme" data-preview="/previews/acme.png">repo</a>.
  </p>
</MagnifyGlass>

<MagnifyGlass metal="#c9973f" grip="#5a3420" size={240} previews={{ "/shop": <ShopCard /> }}>
  …
</MagnifyGlass>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | ReactNode | (required) | text; `<a href>` inside get previews |
| `show` | "links" \| "always" | "links" | glass only on links, or always on (magnifies plain text too) |
| `size` | number | 200 | lens diameter, px |
| `zoom` | number | 2 | text magnification (`show="always"`) (the bulge adds ~1.3x at the center) |
| `previewZoom` | number | 3 | 1 = whole page width fits the lens |
| `pageWidth` / `pageHeight` | number | 1280 / 800 | virtual viewport for previews |
| `distort` | number | 0.25 | fish-eye bulge, 0–0.5 |
| `aberration` | number | 0.025 | RGB fringe toward the rim, 0–0.2 |
| `edgeBlur` | number | 12 | strongest blur, px; 0 = off |
| `blurShape` | "radial" \| "edges" | "radial" | elliptical falloff (sharp center → every side and corner), or bands along the four edges |
| `blend` | boolean | true | fade the blurred rim into the background color (auto-detected, or `background`) |
| `edgeSize` | number | 56 | band width, px (`"edges"` only) |
| `metal` | string | "#d5d8de" | rim, collar, end cap (chrome). Brass: `#c9973f` |
| `grip` | string | "#16161a" | lacquered handle. Wood: `#5a3420` |
| `ornate` | boolean | false | royal look: beaded gold rim with a fine raised line, gold-banded velvet grip, crowned pommel. Pair with `metal="#d9a93a"` `grip="#7a0f22"` |
| `previews` | Record<href, node \| string> | | override per link: image URL or JSX |
| `hideCursor` | boolean | true | where the glass shows (links, or the whole text); fine pointers only |
| `background` | string | auto | lens fill behind magnified text; default = nearest opaque ancestor background |
| `className` / `style` | | | on the container (font, padding, width) |

Per-link screenshot: `<a href="…" data-preview="/shot.png">`.

## How it works

- **Magnified text:** the children render a second time inside the lens
  (`inert`), at the same width as the original, scaled by `zoom` and translated
  so the point under the lens center sits at the lens center. It's real DOM text,
  so it stays sharp at any zoom.
- **Lens optics (SVG):** a canvas-generated radial map drives three
  `feDisplacementMap`s (R, G, B at slightly different strengths): a fish-eye
  bulge, `r' = r(1 − k(1 − r²))`, with chromatic aberration toward the edge. The
  filter samples nearest-pixel, so it runs on a 2x layer that is scaled down.
- **Link detection:** each frame, `elementFromPoint` at the pointer (`links`) or the lens center (`always`) (glass
  layers are `pointer-events: none`). Inside an `<a href>`, the preview
  activates: a spring cross-fade with a zoom and blur focus pull. A 90 ms grace
  period stops flicker between words. Previews mount on first visit and stay
  mounted.
- **three.js:** an orthographic scene aligned 1 px = 1 unit with the DOM lens.
  - **Rim:** a rounded band made with `LatheGeometry`.
  - **Handle:** a lathe-profiled flared collar with a bead, a swelling grip with
    two grooves, and a domed end cap.
  - **Materials:** `MeshPhysicalMaterial` (metalness 1, roughness 0.17,
    clearcoat) lit by a PMREM `RoomEnvironment` plus key and rim lights, with
    ACES tone mapping.
  - **Glass face:** a premultiplied-alpha `ShaderMaterial`. It uses a domed
    normal, Schlick fresnel and a procedural studio environment (softbox, strip
    light) for reflections, plus a ground bevel at the edge, a darker green
    thickness tint and a lit edge line.
  - **Motion:** velocity swings the handle (±12°) and slides the reflections
    (`environmentRotation` + shader shift).
  - **`ornate` (royal):** an instanced ring of gold beads around the outer rim
    (skipping the handle joint) and a fine raised torus line on the rim face.
    The grip becomes velvet (`MeshPhysicalMaterial` with `sheen`), wrapped in
    four gold torus bands. The end cap is replaced by a neck, a gold ball
    pommel and a ring of six small crown points.
- **Edge blur:** three stacked `backdrop-filter` layers (blur/3, 2/3, full) for
  a progressive blur. `radial`: each is masked by an ellipse fit to the
  container (`radial-gradient(closest-side, …)`, sized with `mask-size`, since
  Chrome rejects `calc()` radii), clear further out for each stronger layer.
  The layers extend 2.5 × blur past the container, so the blur's own sampling
  edge never shows as a grey box.
  With `blend`, a last layer paints the background color itself (clear in the
  middle, solid at the rim, reaching past the container), so the blurred text
  dissolves into the page instead of leaving a grey haze. The color is the
  `--mglass-bg` variable, set on the container from the nearest opaque ancestor.
- **"Text continues past the edges" look:** give the children a fixed-height
  `overflow: hidden` window around a longer paragraph with negative side
  margins, justified, and a soft radial `mask-image` fade (see the playground's
  `.magnify-window`). Grey text: `color: color-mix(in srgb, currentColor 58%, transparent)`.
  The playground's links use a handwritten italic instead of an underline:
  `font-family: "Caveat"; font-style: italic; font-weight: 700; font-size: 1.3em; text-decoration: none`.
  Caveat has no true italic, so the browser slants it.

## Rules

- Keep `"use client"`.
- Reduced motion: no lag, swing or focus pull; the glass jumps to the pointer and previews swap instantly.
- Touch: tapping moves the glass. The first tap on a link previews it, the second opens it.
- Keyboard: focusing a link (`:focus-visible`) moves the glass onto it.
- The glass, its canvas and the text clone are `aria-hidden` / `inert`; the real text and links stay accessible.
- The render loop pauses when the container is offscreen or the tab is hidden.

## Gotchas

- **Many sites refuse to be framed** (GitHub, Google, MDN, NASA, most socials).
  The lens then shows the browser's "refused to connect" page, and this can't be
  detected. Use `data-preview` / `previews` with a screenshot or JSX for those.
  Wikipedia, react.dev, motion.dev and vite.dev frame fine.
- Each live preview is a real page load on first visit.
- The handle and shadow overhang the container by up to ~1.1 × `size` down and to the right (a bit more with `ornate`, for the pommel); give it room, or avoid tight `overflow: hidden` parents.
- Children render twice. Keep side effects out of them, and don't use ids inside (the clone duplicates them).
- One WebGL context per glass; don't put dozens on one page.
