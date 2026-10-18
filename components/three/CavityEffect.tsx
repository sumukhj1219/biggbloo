"use client";

import { useContext, useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Color, Uniform, type Texture } from "three";
import {
  BlendFunction,
  Effect,
  EffectAttribute,
  Selection,
  type NormalPass,
  type RenderPass,
} from "postprocessing";
import { EffectComposerContext } from "@react-three/postprocessing";

const fragmentShader =  `
uniform sampler2D normalBuffer;
uniform float ridge;
uniform vec3 ridgeColor;
uniform float valley;
uniform float radius;
uniform vec3 outlineColor;
uniform float outlineWidth;

bool isSolid(const in vec2 uv) {
  return texture2D(normalBuffer, uv).a > 0.5;
}

vec3 readNormal(const in vec2 uv, const in vec3 fallback) {
  if (!isSolid(uv)) return fallback;
  return normalize(texture2D(normalBuffer, uv).xyz * 2.0 - 1.0);
}

float outlineCoverage(const in vec2 uv) {
  vec2 o = texelSize * outlineWidth;
  vec2 g = texelSize * (outlineWidth + 1.5);
  float coverage = 0.0;
  bool near = false;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5235988;
    vec2 dir = vec2(cos(a), sin(a));
    coverage = max(coverage, texture2D(inputBuffer, uv + dir * o).a);
    near = near || isSolid(uv + dir * g);
  }
  return near ? coverage : 0.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  bool bg = depth >= 0.9999;

  if (bg && isSolid(uv)) {
    outputColor = inputColor;
    return;
  }

  if (inputColor.a < 0.999) {
    float c = outlineCoverage(uv);
    outputColor = inputColor + vec4(outlineColor * c, c) * (1.0 - inputColor.a);
    return;
  }

  if (bg || !isSolid(uv)) {
    outputColor = inputColor;
    return;
  }

  vec3 n = normalize(texture2D(normalBuffer, uv).xyz * 2.0 - 1.0);
  vec2 d = texelSize * radius;
  vec3 nR = readNormal(uv + vec2(d.x, 0.0), n);
  vec3 nL = readNormal(uv - vec2(d.x, 0.0), n);
  vec3 nU = readNormal(uv + vec2(0.0, d.y), n);
  vec3 nD = readNormal(uv - vec2(0.0, d.y), n);
  float curvature = clamp((nR.x - nL.x) + (nU.y - nD.y), -1.0, 1.0);

  vec3 color = inputColor.rgb;
  if (curvature > 0.0) color = mix(color, ridgeColor, curvature * ridge);
  else color *= 1.0 + curvature * valley;

  outputColor = vec4(color, inputColor.a);
}
`;

type CavityOptions = {
  ridge?: number;
  ridgeColor?: string;
  valley?: number;
  radius?: number;
  outlineColor?: string;
  outlineWidth?: number;
};

class CavityEffectImpl extends Effect {
  constructor(normalBuffer: Texture | null, {
    ridge = 0.3,
    ridgeColor = "#ffffff",
    valley = 0.5,
    radius = 1,
    outlineColor = "#913a60",
    outlineWidth = 1,
  }: CavityOptions = {}) {
    super("CavityEffect", fragmentShader, {
      blendFunction: BlendFunction.SRC,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["normalBuffer", new Uniform(normalBuffer)],
        ["ridge", new Uniform(ridge)],
        ["ridgeColor", new Uniform(new Color(ridgeColor))],
        ["valley", new Uniform(valley)],
        ["radius", new Uniform(radius)],
        ["outlineColor", new Uniform(new Color(outlineColor))],
        ["outlineWidth", new Uniform(outlineWidth)],
      ]),
    });
  }
}

export const NO_CAVITY_LAYER = 1;

const setNormalPassLayer = (normalPass: NormalPass, layer: number | null) => {
  const { renderPass } = normalPass as unknown as { renderPass: RenderPass };
  renderPass.getClearPass().overrideClearAlpha = layer === null ? 1 : 0;
  if (layer === null) {
    renderPass.selection = null as unknown as Selection;
    return;
  }
  const selection = new Selection();
  selection.layer = layer;
  renderPass.selection = selection;
};

const Cavity = (props: CavityOptions) => {
  const { normalPass } = useContext(EffectComposerContext);
  const camera = useThree((state) => state.camera);
  const { ridge, ridgeColor, valley, radius, outlineColor, outlineWidth } = props;
  const normalBuffer = normalPass?.texture ?? null;
  const effect = useMemo(
    () =>
      new CavityEffectImpl(normalBuffer, {
        ridge,
        ridgeColor,
        valley,
        radius,
        outlineColor,
        outlineWidth,
      }),
    [normalBuffer, ridge, ridgeColor, valley, radius, outlineColor, outlineWidth],
  );

  useEffect(() => () => effect.dispose(), [effect]);

  useLayoutEffect(() => {
    camera.layers.enable(NO_CAVITY_LAYER);
    return () => camera.layers.disable(NO_CAVITY_LAYER);
  }, [camera]);

  useEffect(() => {
    if (!normalPass) return;
    setNormalPassLayer(normalPass, 0);
    return () => setNormalPassLayer(normalPass, null);
  }, [normalPass]);

  return <primitive object={effect} />;
};

export default Cavity;
