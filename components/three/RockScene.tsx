"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
import SideboardNav, { FrameHint, INK } from "./SideboardNav";
import MonolithTitle from "./MonolithTitle";
import Clock, { CLOCK_FACE, CLOCK_PARTS } from "./Clock";
import { fadeOutSound, getSound, playSoundAfter, soundVolume } from "@/lib/sounds";
import {
  EDGE_FADE_PARS,
  edgeFadeFromLandscape,
  edgeFadeUniforms,
  type EdgeFade,
} from "./edgeFade";

const ROCK_URL = "/models/rock.glb";
const ROCK_COLOR = "#fc6f71";
const LANDSCAPE_COLOR = "#ffbd8a";

const PERLIN_URL = "/models/perlin.png";
const ROCK_NOISE_COLOR = "#fa9891";
const LANDSCAPE_NOISE_COLOR = "#f7d0a8";
const NOISE_REPEAT = 1.5;

const GRAIN_ACROSS = new THREE.Vector3(0.6, 8, 8);
const GRAIN_ALONG = new THREE.Vector3(8, 0.6, 8);
const GRAIN_ALONG_WIDE = new THREE.Vector3(1.2, 0.15, 1.2);

const WOOD_PARTS: Record<string, [color: string, grain: string, direction: THREE.Vector3]> = {
  Frame: ["#d9a066", "#c98f57", GRAIN_ACROSS],
  Sideboard: ["#d9a066", "#c98f57", GRAIN_ALONG_WIDE],
  Holder: ["#8a5a34", "#7d502d", GRAIN_ALONG],
  "Button-Left": ["#86634a", "#7b5a42", GRAIN_ACROSS],
  "Button-Right": ["#86634a", "#7b5a42", GRAIN_ACROSS],
  [CLOCK_FACE]: ["#f0dcba", "#e6cfa8", GRAIN_ALONG_WIDE],
};

const METAL_PARTS: Record<string, [color: string, noise: string]> = {
  Gear: ["#d9a84e", "#c99a43"],
  "Worm Gear": ["#8d939e", "#7f8590"],
  Worm_Gear: ["#8d939e", "#7f8590"],
  ...CLOCK_PARTS,
};

const isRotorPart = (name: string) =>
  name === "Rotor" || name === "Gear" || name.startsWith("Worm");

const createNoiseMaterial = (
  color: string,
  noiseColor: string,
  noiseMap: THREE.Texture,
  noiseScale: number,
  fade?: { edge: EdgeFade; dpr: number },
  grain?: THREE.Vector3,
) => {
  const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
  material.customProgramCacheKey = () => `noise${fade ? "-fade" : ""}${grain ? "-grain" : ""}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.noiseMap = { value: noiseMap };
    shader.uniforms.noiseColor = { value: new THREE.Color(noiseColor) };
    shader.uniforms.noiseScale = { value: noiseScale };
    if (grain) shader.uniforms.grainScale = { value: grain };
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
        diffuseColor.rgb = mix(diffuseColor.rgb, noiseColor, noise);`,
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
const BUILD = {
  landscape: { delay: 0, duration: 0.9, drop: 1.5 },
  rotor: { delay: 0.6, stagger: 0.2, duration: 0.6 },
  monolith: { delay: 1.2, duration: 1.1 },
  smallRocks: { delay: 2.1, stagger: 0.1 },
  switchBox: { delay: 2.5, stagger: 0.12 },
  holderRocks: { delay: 2.9, stagger: 0.12, duration: 0.6 },
  grass: { delay: 3.5, duration: 0.9 },
};

const ROTOR_ORDER = ["Rotor", "Gear", "Worm"];

const sinkDepth = (obj: THREE.Object3D, y: number) => {
  if (!(obj instanceof THREE.Mesh)) return 0;
  obj.geometry.computeBoundingBox();
  const top = y + obj.geometry.boundingBox!.max.y * obj.scale.y;
  return Math.max(0, top + 0.05);
};

const groundClip = (root: THREE.Object3D, objects: THREE.Object3D[]) => {
  root.updateWorldMatrix(true, false);
  const groundY = root.localToWorld(new THREE.Vector3()).y;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY);
  const materials = new Set(
    objects.flatMap((obj) =>
      obj instanceof THREE.Mesh ? [obj.material as THREE.Material] : [],
    ),
  );
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
  grass?: THREE.Object3D;
};

const findBuildParts = (scene: THREE.Object3D): BuildParts => {
  const parts: BuildParts = { rotor: [], smallRocks: [], holderRocks: [], switchBox: [] };
  scene.traverse((obj) => {
    if (obj.name === "Landscape") parts.landscape = obj;
    else if (isRotorPart(obj.name)) parts.rotor.push(obj);
    else if (obj.name === "Monolith") parts.monolith = obj;
    else if (obj.name === GRASS_NAME) parts.grass = obj;
    else if (obj.name.startsWith("small-rock")) parts.smallRocks.push(obj);
    else if (obj.name.startsWith("holder-rock") || obj.name === "Sideboard") {
      parts.holderRocks.push(obj);
    }
  });
  const order = (obj: THREE.Object3D) =>
    ROTOR_ORDER.findIndex((prefix) => obj.name.startsWith(prefix));
  parts.rotor.sort((a, b) => order(a) - order(b));
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
  grass,
}: BuildParts) =>
  [landscape, ...rotor, monolith, ...smallRocks, ...holderRocks, ...switchBox, grass].filter(
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
      obj.name.startsWith("holder-rock"),
  );
  members.forEach((obj) => group.attach(obj));
  return group;
};

type Spin = {
  target: number | null;
  controls: AnimationPlaybackControls | null;
  sound: number | null;
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

const resetSpin = (group: THREE.Object3D) => {
  group.rotation.y = DEFAULT_SPIN;
};

const NAV_TURNS = [1, 2, 3];

const spinTo = (group: THREE.Object3D, spin: Spin, angle: number) => {
  const current = spin.target ?? group.rotation.y;
  const turn = Math.PI * 2;
  animateSpin(group, spin, angle + turn * Math.round((current - angle) / turn));
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

  const { landscape, rotor, monolith, smallRocks, holderRocks, switchBox, grass } = parts;
  if (landscape) {
    const y = landscape.position.y;
    landscape.position.y = y - BUILD.landscape.drop;
    reveal(landscape, BUILD.landscape.delay);
    controls.push(tween(landscape.position, { y }, { ...ease, ...BUILD.landscape }));
  }

  const underground = monolith ? [...rotor, monolith] : rotor;
  const unclip = groundClip(root, underground);
  // The crank grinds from shortly after the build starts until the monolith is fully up.
  const stopCrank = playSoundAfter("crank", CRANK_DELAY);
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
    unclip();
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
  switchBox.forEach((obj, i) => {
    const { x, y, z } = obj.scale;
    const delay = BUILD.switchBox.delay + i * BUILD.switchBox.stagger;
    obj.scale.setScalar(0);
    reveal(obj, delay);
    controls.push(
      tween(obj.scale, { x, y, z }, { type: "spring", bounce: 0.4, duration: 0.6, delay }),
    );
  });
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
const TEARDOWN = {
  grass: { delay: 0, duration: 0.5 },
  holderRocks: { delay: 0.3, stagger: 0.08, duration: 0.45 },
  switchBox: { delay: 0.55, stagger: 0.08, duration: 0.3 },
  smallRocks: { delay: 0.75, stagger: 0.06, duration: 0.3 },
  monolith: { delay: 1.2, duration: 0.8 },
  rotor: { delay: 1.9, stagger: 0.12, duration: 0.45 },
  landscape: { delay: 2.5, duration: 0.6 },
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

  const { landscape, rotor, monolith, smallRocks, holderRocks, switchBox, grass } = parts;
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
  shrink(switchBox, TEARDOWN.switchBox);
  shrink(smallRocks, TEARDOWN.smallRocks);
  const unclip = groundClip(root, monolith ? [...rotor, monolith] : rotor);
  const stopCrank = playSoundAfter("crank", CRANK_DELAY);
  const sinks: Promise<unknown>[] = [];
  const sink = (obj: THREE.Object3D, step: { delay: number; duration: number }) => {
    const home = homeOf(obj).y;
    const c = tween(obj.position, { y: home - sinkDepth(obj, home) }, { ...ease, ...step });
    hideAfter(obj, c);
    sinks.push(c.finished);
  };
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
  const { scene } = useGLTF(ROCK_URL);
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
    ]);
    // The clock is built from flat cards, so every part needs both sides to show from behind.
    [CLOCK_FACE, ...Object.keys(CLOCK_PARTS)].forEach(
      (name) => (partMaterials[name].side = THREE.DoubleSide),
    );
    // The pink-tinted lights warm everything they touch; a little self-glow in the sign ink
    // keeps the dial reading as the same cream as the 3D text, which is unlit.
    (partMaterials[CLOCK_FACE] as THREE.MeshLambertMaterial).emissive.set(INK).multiplyScalar(0.35);
    scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.name !== GRASS_NAME &&
        obj.name !== DECAL_NAME &&
        !obj.userData.keepMaterial
      ) {
        obj.material =
          obj.name === "Landscape" ? landscapeMaterial : (partMaterials[obj.name] ?? material);
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.name === "Landscape") obj.layers.set(NO_CAVITY_LAYER);
      }
    });
    return () => {
      material.dispose();
      landscapeMaterial.dispose();
      Object.values(partMaterials).forEach((m) => m.dispose());
    };
  }, [scene, perlin, radius, edge, dpr]);

  const spinGroup = useMemo(() => groupMonolith(scene), [scene]);
  const spin = useRef<Spin>({ target: null, controls: null, sound: null });

  useLayoutEffect(() => resetSpin(spinGroup), [spinGroup]);

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
  const onNavigate = (index: number) =>
    spinTo(spinGroup, spin.current, DEFAULT_SPIN + NAV_TURNS[index] * SPIN_STEP);

  useEffect(() => {
    const current = spin.current;
    return () => {
      current.controls?.stop();
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
    snapSpin(spinGroup, spin.current, dir);
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
          <Clock scene={scene} />
        </primitive>
      </Center>
      {!reducedMotion && !closing && <Wind delay={BUILD.grass.delay + BUILD.grass.duration} />}
    </>
  );
};

const FramingProxy = () => {
  const { scene } = useGLTF(ROCK_URL);
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
