import * as THREE from "three";

// Dithered dissolve towards the landscape's edge, so the ground reads as carrying
// on into the distance instead of ending in a hard rim. Pixels are discarded with
// the same 8x8 Bayer pattern and dot size as the DitherBackground sky, and the
// boundary is broken up with perlin noise so it isn't a perfect circle.
// Used by the landscape and the grass on it, both in the rock glTF's root space.

// Fade from this fraction of the landscape radius out to its rim.
const FADE_START = 0.65;
const FADE_END = 1.0;
// How far (fraction of radius) the noise pushes the boundary in/out.
const FADE_NOISE = 0.25;
// Perlin repeats per landscape radius.
const FADE_NOISE_REPEAT = 0.6;
// Matches DitherBackground's PIXEL (CSS px per dither dot).
const DITHER_PIXEL = 3;

export type EdgeFade = { center: THREE.Vector2; radius: number };

export const edgeFadeFromLandscape = (landscape: THREE.Mesh): EdgeFade => {
  landscape.geometry.computeBoundingBox();
  const box = landscape.geometry.boundingBox!;
  return {
    center: new THREE.Vector2((box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2),
    radius: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2,
  };
};

// Expects a `noiseMap` sampler and `vFadePos` (root-space xz) in the shader.
export const EDGE_FADE_PARS = /* glsl */ `
uniform vec2 fadeCenter;
uniform vec2 fadeRange;
uniform float fadeNoise;
uniform float fadeNoiseScale;
uniform float ditherPixel;
varying vec2 vFadePos;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer8(vec2 a) {
  return (bayer2(0.25 * a) * 0.25 + bayer2(0.5 * a)) * 0.25 + bayer2(a);
}
void edgeFade() {
  float n = texture2D(noiseMap, vFadePos * fadeNoiseScale).r - 0.5;
  float d = length(vFadePos - fadeCenter) + n * fadeNoise;
  float fade = smoothstep(fadeRange.x, fadeRange.y, d);
  if (fade > bayer8(gl_FragCoord.xy / ditherPixel)) discard;
}
`;

export const edgeFadeUniforms = ({ center, radius }: EdgeFade, dpr: number) => ({
  fadeCenter: { value: center },
  fadeRange: { value: new THREE.Vector2(radius * FADE_START, radius * FADE_END) },
  fadeNoise: { value: radius * FADE_NOISE },
  fadeNoiseScale: { value: FADE_NOISE_REPEAT / radius },
  ditherPixel: { value: DITHER_PIXEL * dpr },
});
