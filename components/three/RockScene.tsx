"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import {
  animate,
  type AnimationPlaybackControls,
  type ValueAnimationTransition,
} from "motion/react";
import Cavity, { NO_CAVITY_LAYER } from "./CavityEffect";
import Grass, { GRASS_NAME } from "./Grass";
import RockDecals, { DECAL_NAME } from "./RockDecals";
import Wind from "./Wind";
import SideboardNav, { FrameHint } from "./SideboardNav";
import MonolithTitle from "./MonolithTitle";
import PlankLabels, { PLANK_LABELS } from "./PlankLabels";
import WorksList from "./WorksList";
import Crane from "./Crane";
import {
  CRANE,
  groupSiteProps,
  isBamboo,
  isConstruction,
  isSiteProp,
  propRank,
  sitePart,
  type SitePart,
} from "./siteProps";
import Scaffold from "./Scaffold";
import Builder from "./Builder";
import Sleeper from "./Sleeper";
import { UNDER_CONSTRUCTION } from "@/lib/construction";
import WorkBoard, { WORKBOARD, WORKBOARD_ARM } from "./WorkBoard";
import { WORKS } from "@/lib/works";
import { fadeOutSound, getSound, playSoundAfter, soundVolume } from "@/lib/sounds";
import {
  EDGE_FADE_PARS,
  edgeFadeFromLandscape,
  edgeFadeUniforms,
  type EdgeFade,
} from "./edgeFade";

const ROCK_URL = "/models/rock.glb";
// The clock modelled on the holder rock isn't shown; GLTFLoader strips dots, so "Frame.001" is "Frame001".
const HIDDEN_PARTS = ["Frame001", "Gear001", "Hour", "Minute", "Seconds"];

const useRockScene = () => {
  const { scene } = useGLTF(ROCK_URL);
  HIDDEN_PARTS.forEach((name) => scene.getObjectByName(name)?.removeFromParent());
  // Once construction is over, the whole site is left out of the scene.
  if (!UNDER_CONSTRUCTION) {
    scene.children
      .filter((obj) => isConstruction(obj.name))
      .forEach((obj) => obj.removeFromParent());
  }
  return scene;
};
const ROCK_COLOR = "#fc6f71";
const LANDSCAPE_COLOR = "#ffbd8a";

const PERLIN_URL = "/models/perlin.png";
const ROCK_NOISE_COLOR = "#fa9891";
const LANDSCAPE_NOISE_COLOR = "#f7d0a8";
const NOISE_REPEAT = 1.5;

const GRAIN_ACROSS = new THREE.Vector3(0.6, 8, 8);
const GRAIN_ALONG = new THREE.Vector3(8, 0.6, 8);
const GRAIN_ALONG_WIDE = new THREE.Vector3(1.2, 0.15, 1.2);
const GRAIN_ALONG_PLANK = new THREE.Vector3(8, 8, 0.6);

// Bamboo poles are long in local Y, so the grain runs up them.
const BAMBOO: [color: string, grain: string] = ["#cfae5c", "#b38f42"];

const WOOD_PARTS: Record<string, [color: string, grain: string, direction: THREE.Vector3]> = {
  Frame: ["#d9a066", "#c98f57", GRAIN_ACROSS],
  Sideboard: ["#d9a066", "#c98f57", GRAIN_ALONG_WIDE],
  Holder: ["#8a5a34", "#7d502d", GRAIN_ALONG],
  "Button-Left": ["#86634a", "#7b5a42", GRAIN_ACROSS],
  "Button-Right": ["#86634a", "#7b5a42", GRAIN_ACROSS],
  ...Object.fromEntries(
    Object.keys(PLANK_LABELS).map((name) => [name, ["#8a5a34", "#7d502d", GRAIN_ALONG_PLANK]]),
  ),
  [WORKBOARD]: ["#8a5a34", "#7d502d", GRAIN_ACROSS],
};

const CEMENT: [color: string, noise: string] = ["#b3b0a8", "#9c9990"];
const GOLD: [color: string, noise: string] = ["#d9a84e", "#c99a43"];

type Stripes = { colors: [string, string]; axis: THREE.Vector3; period: number };

// Construction-site paint. Stripes run along each part's own axes: up the posts and cones, and
// at 45° across the barricade boards, which are long in X and tall in Y.
const SITE_LOOK: Record<SitePart, [color: string, noise: string, stripes?: Stripes]> = {
  base: CEMENT,
  holder: [
    "#f4f0e6",
    "#d9d3c4",
    { colors: ["#ec5a2a", "#f4f0e6"], axis: new THREE.Vector3(0, 1, 0), period: 0.36 },
  ],
  zigzag: [
    "#f2c12e",
    "#d9a823",
    {
      colors: ["#1f1d1a", "#f2c12e"],
      axis: new THREE.Vector3(1, 1, 0).normalize(),
      period: 0.26,
    },
  ],
  cone: [
    "#f4661b",
    "#d9551a",
    { colors: ["#f4661b", "#f4f0e6"], axis: new THREE.Vector3(0, 1, 0), period: 0.24 },
  ],
  coneBase: ["#e35a17", "#c74d14"],
};

const METAL_PARTS: Record<string, [color: string, noise: string]> = {
  Gear: GOLD,
  "Worm Gear": ["#8d939e", "#7f8590"],
  Worm_Gear: ["#8d939e", "#7f8590"],
  // The crane's winch on top, and the loads it works with.
  [CRANE.gear]: GOLD,
  [CRANE.worm]: GOLD,
  [CRANE.drum]: GOLD,
  [CRANE.carrier]: CEMENT,
  // GLTFLoader strips dots, so Blender's "brick.001" loads as "brick001".
  brick: CEMENT,
  brick001: CEMENT,
};

const isPlank = (name: string) => name in PLANK_LABELS;

const isRotorPart = (name: string) =>
  name === "Rotor" || name === "Gear" || name.startsWith("Worm");

const createNoiseMaterial = (
  color: string,
  noiseColor: string,
  noiseMap: THREE.Texture,
  noiseScale: number,
  fade?: { edge: EdgeFade; dpr: number },
  grain?: THREE.Vector3,
  stripes?: Stripes,
) => {
  const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
  material.customProgramCacheKey = () =>
    `noise${fade ? "-fade" : ""}${grain ? "-grain" : ""}${stripes ? "-stripes" : ""}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.noiseMap = { value: noiseMap };
    shader.uniforms.noiseColor = { value: new THREE.Color(noiseColor) };
    shader.uniforms.noiseScale = { value: noiseScale };
    if (grain) shader.uniforms.grainScale = { value: grain };
    if (stripes) {
      shader.uniforms.stripeA = { value: new THREE.Color(stripes.colors[0]) };
      shader.uniforms.stripeB = { value: new THREE.Color(stripes.colors[1]) };
      shader.uniforms.stripeAxis = { value: stripes.axis };
      shader.uniforms.stripePeriod = { value: stripes.period };
    }
    if (fade) Object.assign(shader.uniforms, edgeFadeUniforms(fade.edge, fade.dpr));

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vNoisePos;
        ${fade ? "varying vec2 vFadePos;" : ""}`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vNoisePos = transformed * vec3(
          length(modelMatrix[0].xyz),
          length(modelMatrix[1].xyz),
          length(modelMatrix[2].xyz)
        );
        ${fade ? "vFadePos = position.xz;" : ""}`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D noiseMap;
        uniform vec3 noiseColor;
        uniform float noiseScale;
        ${grain ? "uniform vec3 grainScale;" : ""}
        ${stripes ? "uniform vec3 stripeA; uniform vec3 stripeB; uniform vec3 stripeAxis; uniform float stripePeriod;" : ""}
        varying vec3 vNoisePos;
        ${fade ? EDGE_FADE_PARS : ""}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        ${fade ? "edgeFade();" : ""}
        vec3 faceNormal = normalize(cross(dFdx(vNoisePos), dFdy(vNoisePos)));
        vec3 blend = pow(abs(faceNormal), vec3(4.0));
        blend /= blend.x + blend.y + blend.z;
        vec3 p = vNoisePos * noiseScale${grain ? " * grainScale" : ""};
        float noise = texture2D(noiseMap, p.yz).r * blend.x
                    + texture2D(noiseMap, p.xz).r * blend.y
                    + texture2D(noiseMap, p.xy).r * blend.z;
        ${grain ? "noise = smoothstep(0.35, 0.85, 0.5 + 0.5 * sin(noise * 40.0)) * 0.8;" : ""}
        ${
          stripes
            ? `float band = step(0.5, fract(dot(vNoisePos, stripeAxis) / stripePeriod));
        diffuseColor.rgb = mix(stripeA, stripeB, band) * (1.0 - noise * 0.12);`
            : "diffuseColor.rgb = mix(diffuseColor.rgb, noiseColor, noise);"
        }`,
      );
  };
  return material;
};

type Axes = Partial<Record<"x" | "y" | "z", number>>;

const tween = (
  vector: THREE.Vector3,
  to: Axes,
  options: ValueAnimationTransition<number>,
) => {
  const from = vector.clone();
  const target = new THREE.Vector3(to.x ?? from.x, to.y ?? from.y, to.z ?? from.z);
  return animate(0, 1, { ...options, onUpdate: (t) => vector.lerpVectors(from, target, t) });
};

const CRANK_DELAY = 0.75;
const CRANK_FADE_MS = 300;
const BG_FADE_IN_MS = 2000;
const BG_FADE_OUT_MS = 1200;

const BUILD_EASE = [0.22, 1, 0.36, 1] as const;
// The site props rise out of the ground first; the monolith's build follows on after them.
const PROPS_LEAD = UNDER_CONSTRUCTION ? 1.4 : 0;
const BUILD = {
  landscape: { delay: 0, duration: 0.9, drop: 1.5 },
  siteProps: { delay: 0.6, stagger: 0.12, duration: 1.1 },
  rotor: { delay: PROPS_LEAD + 0.6, stagger: 0.2, duration: 0.6 },
  monolith: { delay: PROPS_LEAD + 1.2, duration: 1.1 },
  smallRocks: { delay: PROPS_LEAD + 2.1, stagger: 0.1 },
  switchBox: { delay: PROPS_LEAD + 2.5, stagger: 0.12 },
  planks: { delay: PROPS_LEAD + 2.3, stagger: 0.12 },
  holderRocks: { delay: PROPS_LEAD + 2.9, stagger: 0.12, duration: 0.6 },
  grass: { delay: PROPS_LEAD + 3.5, duration: 0.9 },
};

// The crane's carrier arrives on its own, once everything else is up.
const BUILD_END = BUILD.grass.delay + BUILD.grass.duration;

const ROTOR_ORDER = ["Rotor", "Gear", "Worm"];

const sinkDepth = (obj: THREE.Object3D, y: number) => {
  if (typeof obj.userData.propHeight === "number") return obj.userData.propHeight + 0.05;
  if (!(obj instanceof THREE.Mesh)) return 0;
  obj.geometry.computeBoundingBox();
  const top = y + obj.geometry.boundingBox!.max.y * obj.scale.y;
  return Math.max(0, top + 0.05);
};

const groundClip = (root: THREE.Object3D, objects: THREE.Object3D[]) => {
  root.updateWorldMatrix(true, false);
  const groundY = root.localToWorld(new THREE.Vector3()).y;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY);
  // Groups (the site props) clip every mesh inside them.
  const meshes: THREE.Mesh[] = [];
  objects.forEach((obj) => {
    if (obj instanceof THREE.Mesh) meshes.push(obj);
    else obj.traverse((child) => child instanceof THREE.Mesh && meshes.push(child));
  });
  const materials = new Set(meshes.map((mesh) => mesh.material as THREE.Material));
  materials.forEach((m) => (m.clippingPlanes = [plane]));
  return () => materials.forEach((m) => (m.clippingPlanes = null));
};

const SWITCH_BOX = ["Holder", "Frame", "Button-Left", "Button-Right"];

type BuildParts = {
  landscape?: THREE.Object3D;
  rotor: THREE.Object3D[];
  monolith?: THREE.Object3D;
  smallRocks: THREE.Object3D[];
  holderRocks: THREE.Object3D[];
  switchBox: THREE.Object3D[];
  planks: THREE.Object3D[];
  siteProps: THREE.Object3D[];
  grass?: THREE.Object3D;
};

const findBuildParts = (scene: THREE.Object3D): BuildParts => {
  const parts: BuildParts = {
    rotor: [],
    smallRocks: [],
    holderRocks: [],
    switchBox: [],
    planks: [],
    siteProps: [],
  };
  scene.traverse((obj) => {
    if (obj.name === "Landscape") parts.landscape = obj;
    else if (isRotorPart(obj.name)) parts.rotor.push(obj);
    else if (obj.name === "Monolith") parts.monolith = obj;
    else if (obj.name === GRASS_NAME) parts.grass = obj;
    else if (obj.name.startsWith("small-rock")) parts.smallRocks.push(obj);
    else if (isPlank(obj.name)) parts.planks.push(obj);
    else if (isSiteProp(obj.name) && obj.parent === scene) parts.siteProps.push(obj);
    else if (obj.name.startsWith("holder-rock") || obj.name === "Sideboard") {
      parts.holderRocks.push(obj);
    }
  });
  const order = (obj: THREE.Object3D) =>
    ROTOR_ORDER.findIndex((prefix) => obj.name.startsWith(prefix));
  parts.rotor.sort((a, b) => order(a) - order(b));
  parts.siteProps.sort((a, b) => propRank(a.name) - propRank(b.name));
  parts.switchBox = SWITCH_BOX.map((name) => scene.getObjectByName(name)).filter(
    (obj): obj is THREE.Object3D => obj !== undefined,
  );
  return parts;
};

const allParts = ({
  landscape,
  rotor,
  monolith,
  smallRocks,
  holderRocks,
  switchBox,
  planks,
  siteProps,
  grass,
}: BuildParts) =>
  [
    landscape,
    ...rotor,
    monolith,
    ...smallRocks,
    ...holderRocks,
    ...switchBox,
    ...planks,
    ...siteProps,
    grass,
  ].filter(
    (obj): obj is THREE.Object3D => obj !== undefined,
  );

const SPIN_GROUP = "MonolithGroup";
const SPIN_STEP = Math.PI / 2;
const DEFAULT_SPIN = -SPIN_STEP;
const PRESS_DEPTH = 0.025;
const BUTTON_SPIN: Record<string, number> = { "Button-Left": -1, "Button-Right": 1 };

const groupMonolith = (scene: THREE.Object3D) => {
  const existing = scene.getObjectByName(SPIN_GROUP);
  if (existing) return existing;
  const group = new THREE.Group();
  group.name = SPIN_GROUP;
  scene.add(group);
  const members = scene.children.filter(
    (obj) =>
      obj.name === "Monolith" ||
      isRotorPart(obj.name) ||
      obj.name === "Sideboard" ||
      obj.name.startsWith("holder-rock") ||
      isPlank(obj.name) ||
      obj.name === WORKBOARD ||
      obj.name === WORKBOARD_ARM,
  );
  members.forEach((obj) => group.attach(obj));
  return group;
};

type Spin = {
  target: number | null;
  controls: AnimationPlaybackControls | null;
  sound: number | null;
  jam: number | null;
};

const GEAR_FADE_MS = 250;

// Each turn restarts the gear grind; it fades out once the monolith settles.
const startGear = (spin: Spin) => {
  const gear = getSound("gear");
  if (spin.sound !== null) gear.stop(spin.sound);
  spin.sound = gear.play();
};

const stopGear = (spin: Spin, fade = GEAR_FADE_MS) => {
  if (spin.sound === null) return;
  fadeOutSound("gear", spin.sound, fade);
  spin.sound = null;
};

// While the site is under construction the monolith is locked: the controls still grind, but
// only for a moment, and nothing turns.
const JAM_MS = 350;

const jamGear = (spin: Spin) => {
  if (spin.jam !== null) window.clearTimeout(spin.jam);
  startGear(spin);
  spin.jam = window.setTimeout(() => {
    spin.jam = null;
    stopGear(spin);
  }, JAM_MS);
};

const resetSpin = (group: THREE.Object3D) => {
  group.rotation.y = DEFAULT_SPIN;
};

const NAV_TURNS = [1, 2, 3];
const TURN = Math.PI * 2;
const WORKS_SPIN = DEFAULT_SPIN + NAV_TURNS[0] * SPIN_STEP;

const facesWorks = (angle: number | null) =>
  angle !== null && Math.abs(angle - WORKS_SPIN - TURN * Math.round((angle - WORKS_SPIN) / TURN)) < 0.1;

const spinTo = (group: THREE.Object3D, spin: Spin, angle: number) => {
  const current = spin.target ?? group.rotation.y;
  animateSpin(group, spin, angle + TURN * Math.round((current - angle) / TURN));
};

const snapSpin = (group: THREE.Object3D, spin: Spin, dir: number) => {
  const current = spin.target ?? Math.round(group.rotation.y / SPIN_STEP) * SPIN_STEP;
  animateSpin(group, spin, current + dir * SPIN_STEP);
};

const animateSpin = (group: THREE.Object3D, spin: Spin, target: number) => {
  spin.target = target;
  spin.controls?.stop();
  startGear(spin);
  const controls = animate(group.rotation.y, spin.target, {
    type: "spring",
    bounce: 0.25,
    duration: 0.7,
    onUpdate: (y) => (group.rotation.y = y),
  });
  spin.controls = controls;
  controls.finished.then(() => {
    if (spin.controls === controls) stopGear(spin);
  });
};

const pressButton = (button: THREE.Object3D, frame: THREE.Object3D | undefined, down: boolean) => {
  const rest = (button.userData.rest ??= button.position.clone()) as THREE.Vector3;
  const target = rest.clone();
  if (down && frame) target.z += Math.sign(frame.position.z - rest.z) * PRESS_DEPTH;
  return tween(button.position, { x: target.x, y: target.y, z: target.z }, { duration: 0.12 });
};

const playBuild = (parts: BuildParts, root: THREE.Object3D) => {
  const objects = allParts(parts);
  const original = objects.map((obj) => ({
    obj,
    position: obj.position.clone(),
    scale: obj.scale.clone(),
  }));
  const controls: AnimationPlaybackControls[] = [];
  const timers: number[] = [];
  const ease = { ease: BUILD_EASE };
  const reveal = (obj: THREE.Object3D, delay: number) => {
    timers.push(window.setTimeout(() => (obj.visible = true), delay * 1000));
  };

  const {
    landscape,
    rotor,
    monolith,
    smallRocks,
    holderRocks,
    switchBox,
    planks,
    siteProps,
    grass,
  } = parts;
  if (landscape) {
    const y = landscape.position.y;
    landscape.position.y = y - BUILD.landscape.drop;
    reveal(landscape, BUILD.landscape.delay);
    controls.push(tween(landscape.position, { y }, { ...ease, ...BUILD.landscape }));
  }

  // The crank grinds from shortly after the build starts until everything is fully up.
  const stopCrank = playSoundAfter("crank", CRANK_DELAY);
  const unclipProps = groundClip(root, siteProps);
  const propRises = siteProps.map((prop, i) => {
    const y = prop.position.y;
    const delay = BUILD.siteProps.delay + i * BUILD.siteProps.stagger;
    prop.position.y = y - sinkDepth(prop, y);
    reveal(prop, delay);
    const rise = tween(prop.position, { y }, { ...ease, duration: BUILD.siteProps.duration, delay });
    controls.push(rise);
    return rise.finished;
  });
  Promise.all(propRises).then(unclipProps);

  const underground = monolith ? [...rotor, monolith] : rotor;
  const unclipUnderground = groundClip(root, underground);
  const unclip = () => {
    unclipProps();
    unclipUnderground();
  };
  const rises = underground.map((obj) => {
    const index = rotor.indexOf(obj);
    const step =
      index === -1
        ? BUILD.monolith
        : { duration: BUILD.rotor.duration, delay: BUILD.rotor.delay + index * BUILD.rotor.stagger };
    const y = obj.position.y;
    obj.position.y = y - sinkDepth(obj, y);
    reveal(obj, step.delay);
    const rise = tween(obj.position, { y }, { ...ease, ...step });
    controls.push(rise);
    return rise.finished;
  });
  Promise.all(rises).then(() => {
    unclipUnderground();
    stopCrank(CRANK_FADE_MS);
  });
  smallRocks.forEach((rock, i) => {
    const { x, y, z } = rock.scale;
    const delay = BUILD.smallRocks.delay + i * BUILD.smallRocks.stagger;
    rock.scale.setScalar(0);
    reveal(rock, delay);
    controls.push(
      tween(rock.scale, { x, y, z }, { type: "spring", bounce: 0.4, duration: 0.7, delay }),
    );
  });
  holderRocks.forEach((holder, i) => {
    const { x, z } = holder.position;
    const delay = BUILD.holderRocks.delay + i * BUILD.holderRocks.stagger;
    holder.position.x = monolith?.position.x ?? 0;
    holder.position.z = monolith?.position.z ?? 0;
    reveal(holder, delay);
    controls.push(
      tween(holder.position, { x, z }, { ...ease, duration: BUILD.holderRocks.duration, delay }),
    );
  });
  const pop = (objects: THREE.Object3D[], step: { delay: number; stagger: number }) =>
    objects.forEach((obj, i) => {
      const { x, y, z } = obj.scale;
      const delay = step.delay + i * step.stagger;
      obj.scale.setScalar(0);
      reveal(obj, delay);
      controls.push(
        tween(obj.scale, { x, y, z }, { type: "spring", bounce: 0.4, duration: 0.6, delay }),
      );
    });
  pop(switchBox, BUILD.switchBox);
  pop(planks, BUILD.planks);
  if (grass) {
    grass.scale.y = 0;
    reveal(grass, BUILD.grass.delay);
    controls.push(tween(grass.scale, { y: 1 }, { ...ease, ...BUILD.grass }));
  }

  const stop = () => {
    timers.forEach((t) => window.clearTimeout(t));
    controls.forEach((c) => c.stop());
    stopCrank(0);
  };
  const restore = () => {
    stop();
    unclip();
    original.forEach(({ obj, position, scale }) => {
      obj.position.copy(position);
      obj.scale.copy(scale);
      obj.visible = true;
    });
  };
  const home = new Map(original.map(({ obj, position }) => [obj, position]));
  return { stop, restore, home };
};

type Build = ReturnType<typeof playBuild>;

const TEARDOWN_EASE = [0.55, 0, 1, 0.45] as const;
// Same order as the build: the site props sink away first, then the monolith comes down.
const PROPS_TAIL = UNDER_CONSTRUCTION ? 0.8 : 0;
const TEARDOWN = {
  siteProps: { delay: 0, stagger: 0.1, duration: 0.6 },
  grass: { delay: PROPS_TAIL, duration: 0.5 },
  holderRocks: { delay: PROPS_TAIL + 0.3, stagger: 0.08, duration: 0.45 },
  switchBox: { delay: PROPS_TAIL + 0.55, stagger: 0.08, duration: 0.3 },
  planks: { delay: PROPS_TAIL + 0.2, stagger: 0.08, duration: 0.3 },
  smallRocks: { delay: PROPS_TAIL + 0.75, stagger: 0.06, duration: 0.3 },
  monolith: { delay: PROPS_TAIL + 1.2, duration: 0.8 },
  rotor: { delay: PROPS_TAIL + 1.9, stagger: 0.12, duration: 0.45 },
  landscape: { delay: PROPS_TAIL + 2.5, duration: 0.6 },
};

const playTeardown = (
  parts: BuildParts,
  root: THREE.Object3D,
  home: Build["home"],
  onDone: () => void,
) => {
  const controls: AnimationPlaybackControls[] = [];
  const ease = { ease: TEARDOWN_EASE };
  const hideAfter = (obj: THREE.Object3D, c: AnimationPlaybackControls) => {
    c.finished.then(() => (obj.visible = false));
    controls.push(c);
  };
  const homeOf = (obj: THREE.Object3D) => home.get(obj) ?? obj.position;

  const {
    landscape,
    rotor,
    monolith,
    smallRocks,
    holderRocks,
    switchBox,
    planks,
    siteProps,
    grass,
  } = parts;
  if (grass) hideAfter(grass, tween(grass.scale, { y: 0 }, { ...ease, ...TEARDOWN.grass }));
  [...holderRocks].reverse().forEach((holder, i) => {
    const axis = monolith ? homeOf(monolith) : new THREE.Vector3();
    const delay = TEARDOWN.holderRocks.delay + i * TEARDOWN.holderRocks.stagger;
    hideAfter(
      holder,
      tween(
        holder.position,
        { x: axis.x, z: axis.z },
        { ...ease, duration: TEARDOWN.holderRocks.duration, delay },
      ),
    );
  });
  const shrink = (objects: THREE.Object3D[], step: { delay: number; stagger: number; duration: number }) =>
    [...objects].reverse().forEach((obj, i) => {
      const delay = step.delay + i * step.stagger;
      hideAfter(obj, tween(obj.scale, { x: 0, y: 0, z: 0 }, { ...ease, duration: step.duration, delay }));
    });
  shrink(planks, TEARDOWN.planks);
  shrink(switchBox, TEARDOWN.switchBox);
  shrink(smallRocks, TEARDOWN.smallRocks);
  const unclip = groundClip(root, [...siteProps, ...(monolith ? [...rotor, monolith] : rotor)]);
  const stopCrank = playSoundAfter("crank", CRANK_DELAY);
  const sinks: Promise<unknown>[] = [];
  const sink = (obj: THREE.Object3D, step: { delay: number; duration: number }) => {
    const home = homeOf(obj).y;
    const c = tween(obj.position, { y: home - sinkDepth(obj, home) }, { ...ease, ...step });
    hideAfter(obj, c);
    sinks.push(c.finished);
  };
  siteProps.forEach((prop, i) =>
    sink(prop, {
      delay: TEARDOWN.siteProps.delay + i * TEARDOWN.siteProps.stagger,
      duration: TEARDOWN.siteProps.duration,
    }),
  );
  if (monolith) sink(monolith, TEARDOWN.monolith);
  [...rotor].reverse().forEach((obj, i) =>
    sink(obj, {
      delay: TEARDOWN.rotor.delay + i * TEARDOWN.rotor.stagger,
      duration: TEARDOWN.rotor.duration,
    }),
  );
  if (landscape) {
    hideAfter(
      landscape,
      tween(landscape.scale, { x: 0, y: 0, z: 0 }, { ...ease, ...TEARDOWN.landscape }),
    );
  }

  let cancelled = false;
  Promise.all(sinks).then(() => !cancelled && stopCrank(CRANK_FADE_MS));
  Promise.all(controls.map((c) => c.finished)).then(() => !cancelled && onDone());
  return () => {
    cancelled = true;
    controls.forEach((c) => c.stop());
    stopCrank(0);
    unclip();
  };
};

const LIGHT_DIR_VIEW = new THREE.Vector3(-0.5, 0.6, 0.7).normalize();

const CameraLight = ({ radius }: { radius: number }) => {
  const ref = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const light = ref.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = cam.bottom = -radius * 1.1;
    cam.right = cam.top = radius * 1.1;
    cam.near = radius * 0.1;
    cam.far = radius * 4;
    cam.updateProjectionMatrix();
    light.shadow.normalBias = radius * 0.005;
  }, [radius]);

  useFrame(({ camera }) => {
    ref.current?.position
      .copy(LIGHT_DIR_VIEW)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(radius * 2);
  });

  return (
    <directionalLight ref={ref} castShadow intensity={2.2} shadow-mapSize={[2048, 2048]} />
  );
};

type RockProps = { closing: boolean; onClosed: () => void };

const Rock = ({ closing, onClosed }: RockProps) => {
  const scene = useRockScene();
  const perlin = useTexture(PERLIN_URL, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  });
  const radius = useMemo(
    () => new THREE.Box3().setFromObject(scene).getBoundingSphere(new THREE.Sphere()).radius,
    [scene],
  );
  const dpr = useThree((state) => state.viewport.dpr);
  const edge = useMemo(() => {
    let landscape: THREE.Mesh | undefined;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name === "Landscape") landscape = obj;
    });
    return landscape ? edgeFadeFromLandscape(landscape) : undefined;
  }, [scene]);

  useLayoutEffect(() => {
    const noiseScale = NOISE_REPEAT / radius;
    const material = createNoiseMaterial(ROCK_COLOR, ROCK_NOISE_COLOR, perlin, noiseScale);
    const landscapeMaterial = createNoiseMaterial(
      LANDSCAPE_COLOR,
      LANDSCAPE_NOISE_COLOR,
      perlin,
      noiseScale,
      edge && { edge, dpr },
    );
    const partMaterials: Record<string, THREE.Material> = Object.fromEntries([
      ...Object.entries(WOOD_PARTS).map(([name, [color, grain, direction]]) => [
        name,
        createNoiseMaterial(color, grain, perlin, noiseScale, undefined, direction),
      ]),
      ...Object.entries(METAL_PARTS).map(([name, [color, noise]]) => [
        name,
        createNoiseMaterial(color, noise, perlin, noiseScale),
      ]),
      // Its own copy of the rock, so clipping it while it slides out leaves the monolith alone.
      [WORKBOARD_ARM, createNoiseMaterial(ROCK_COLOR, ROCK_NOISE_COLOR, perlin, noiseScale)],
    ]);
    const siteMaterial = (part: SitePart) => {
      const [color, noise, stripes] = SITE_LOOK[part];
      return createNoiseMaterial(color, noise, perlin, noiseScale, undefined, undefined, stripes);
    };
    const siteMaterials: Record<SitePart, THREE.Material> = {
      base: siteMaterial("base"),
      holder: siteMaterial("holder"),
      zigzag: siteMaterial("zigzag"),
      cone: siteMaterial("cone"),
      coneBase: siteMaterial("coneBase"),
    };
    const bambooMaterial = createNoiseMaterial(
      BAMBOO[0],
      BAMBOO[1],
      perlin,
      noiseScale,
      undefined,
      GRAIN_ALONG,
    );
    scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.name !== GRASS_NAME &&
        obj.name !== DECAL_NAME &&
        !obj.userData.keepMaterial
      ) {
        const site = sitePart(obj.name);
        obj.material =
          obj.name === "Landscape"
            ? landscapeMaterial
            : (partMaterials[obj.name] ??
              (site ? siteMaterials[site] : isBamboo(obj.name) ? bambooMaterial : material));
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.name === "Landscape") obj.layers.set(NO_CAVITY_LAYER);
      }
    });
    return () => {
      material.dispose();
      landscapeMaterial.dispose();
      Object.values(partMaterials).forEach((m) => m.dispose());
      Object.values(siteMaterials).forEach((m) => m.dispose());
      bambooMaterial.dispose();
    };
  }, [scene, perlin, radius, edge, dpr]);

  const spinGroup = useMemo(() => groupMonolith(scene), [scene]);
  useMemo(() => groupSiteProps(scene), [scene]);
  const spin = useRef<Spin>({ target: null, controls: null, sound: null, jam: null });

  useLayoutEffect(() => resetSpin(spinGroup), [spinGroup]);

  const [worksOpen, setWorksOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState(0);
  const syncWorks = () => setWorksOpen(facesWorks(spin.current.target));

  const sideboard = useMemo(() => {
    const board = scene.getObjectByName("Sideboard");
    return board instanceof THREE.Mesh ? board : null;
  }, [scene]);
  const frame = useMemo(() => {
    const mesh = scene.getObjectByName("Frame");
    return mesh instanceof THREE.Mesh ? mesh : null;
  }, [scene]);
  const monolithMesh = useMemo(() => {
    const mesh = scene.getObjectByName("Monolith");
    return mesh instanceof THREE.Mesh ? mesh : null;
  }, [scene]);
  const onNavigate = (index: number) => {
    if (UNDER_CONSTRUCTION) return jamGear(spin.current);
    spinTo(spinGroup, spin.current, DEFAULT_SPIN + NAV_TURNS[index] * SPIN_STEP);
    syncWorks();
  };

  useEffect(() => {
    const current = spin.current;
    return () => {
      current.controls?.stop();
      if (current.jam !== null) window.clearTimeout(current.jam);
      stopGear(current, 0);
    };
  }, []);

  useEffect(() => {
    const release = () => {
      SWITCH_BOX.forEach((name) => {
        const button = scene.getObjectByName(name);
        if (button && name in BUTTON_SPIN && button.userData.rest) pressButton(button, undefined, false);
      });
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.body.style.cursor = "";
    };
  }, [scene]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const dir = BUTTON_SPIN[e.object.name];
    if (dir === undefined) return;
    e.stopPropagation();
    if (UNDER_CONSTRUCTION) jamGear(spin.current);
    else {
      snapSpin(spinGroup, spin.current, dir);
      syncWorks();
    }
    pressButton(e.object, scene.getObjectByName("Frame"), true);
  };
  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.name in BUTTON_SPIN) document.body.style.cursor = "pointer";
  };
  const onPointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.name in BUTTON_SPIN) document.body.style.cursor = "";
  };

  useLayoutEffect(() => {
    const objects = allParts(findBuildParts(scene));
    objects.forEach((obj) => (obj.visible = false));
    return () => objects.forEach((obj) => (obj.visible = true));
  }, [scene]);

  const build = useRef<Build | null>(null);

  // Load the clips while the model is still fetching so the first crank isn't late.
  useEffect(() => {
    getSound("crank");
    getSound("gear");
  }, []);

  const bgSound = useRef<number | null>(null);

  // Quiet looping ambience that eases in with the scene and drifts out when it closes.
  // It only starts once loaded, so an unmount before then has nothing queued to undo.
  useEffect(() => {
    const bg = getSound("cozyBg");
    let id: number | null = null;
    const start = () => {
      id = bg.play();
      bg.fade(0, soundVolume("cozyBg"), BG_FADE_IN_MS, id);
      bgSound.current = id;
    };
    if (bg.state() === "loaded") start();
    else bg.once("load", start);
    return () => {
      bg.off("load", start);
      bgSound.current = null;
      if (id !== null) fadeOutSound("cozyBg", id, 0);
    };
  }, []);

  useEffect(() => {
    if (closing && bgSound.current !== null) fadeOutSound("cozyBg", bgSound.current, BG_FADE_OUT_MS);
  }, [closing]);
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const parts = findBuildParts(scene);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      allParts(parts).forEach((obj) => (obj.visible = true));
      return;
    }
    const current = playBuild(parts, scene);
    build.current = current;
    return () => {
      build.current = null;
      current.restore();
    };
  }, [scene]);

  useEffect(() => {
    if (!closing) return;
    const current = build.current;
    if (!current) {
      onClosed();
      return;
    }
    current.stop();
    return playTeardown(findBuildParts(scene), scene, current.home, onClosed);
  }, [closing, scene, onClosed]);

  return (
    <>
      <hemisphereLight args={["#f59587", "#ffbd8a", 1.6]} />
      <CameraLight radius={radius} />
      <Center rotateY={Math.PI}>
        <primitive
          object={scene}
          onPointerDown={onPointerDown}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <Grass root={scene} noiseMap={perlin} edge={edge} dpr={dpr} />
          <RockDecals root={scene} />
          {sideboard && <SideboardNav board={sideboard} onSelect={onNavigate} />}
          {frame && <FrameHint frame={frame} />}
          {monolithMesh && <MonolithTitle monolith={monolithMesh} />}
          {monolithMesh && <PlankLabels scene={scene} monolith={monolithMesh} />}
          <Scaffold scene={scene} />
          <Builder scene={scene} />
          {monolithMesh && <Sleeper monolith={monolithMesh} />}
          <Crane scene={scene} appearAt={reducedMotion ? 0 : BUILD_END} />
          {monolithMesh && (
            <WorksList monolith={monolithMesh} selected={selectedWork} onSelect={setSelectedWork} />
          )}
          {monolithMesh && (
            <WorkBoard
              scene={scene}
              monolith={monolithMesh}
              open={worksOpen && !closing}
              work={WORKS[selectedWork]}
            />
          )}
        </primitive>
      </Center>
      {!reducedMotion && !closing && <Wind delay={BUILD.grass.delay + BUILD.grass.duration} />}
    </>
  );
};

const FramingProxy = () => {
  const scene = useRockScene();
  const size = useMemo(
    () => new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()),
    [scene],
  );
  return (
    <mesh visible={false}>
      <boxGeometry args={[size.x, size.y, size.z]} />
    </mesh>
  );
};

const FRAME_MARGIN = 1.2;
const MIN_PORTRAIT_SCALE = 0.55;

const Framing = () => {
  const aspect = useThree((state) => state.size.width / state.size.height);
  const margin = FRAME_MARGIN * Math.min(1, Math.max(aspect, MIN_PORTRAIT_SCALE));
  return (
    <Bounds fit clip observe margin={margin}>
      <FramingProxy />
    </Bounds>
  );
};

const CloseWhileLoading = ({ closing, onClosed }: RockProps) => {
  useEffect(() => {
    if (closing) onClosed();
  }, [closing, onClosed]);
  return null;
};

const RockScene = ({ closing = false, onClosed = () => {} }: Partial<RockProps>) => (
  <Canvas
    shadows
    camera={{ position: [0, 0, 5], fov: 30 }}
    dpr={[1, 2]}
    onCreated={({ gl }) => {
      gl.localClippingEnabled = true;
    }}
  >
    <Suspense fallback={<CloseWhileLoading closing={closing} onClosed={onClosed} />}>
      <Framing />
      <Rock closing={closing} onClosed={onClosed} />
    </Suspense>
    <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} makeDefault />
    <EffectComposer enableNormalPass multisampling={4}>
      <Cavity ridgeColor="#913a60" />
    </EffectComposer>
  </Canvas>
);

useGLTF.preload(ROCK_URL);
useTexture.preload(PERLIN_URL);

export default RockScene;
