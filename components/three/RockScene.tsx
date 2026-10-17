"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import { animate, type AnimationPlaybackControls } from "motion/react";
import Cavity, { NO_CAVITY_LAYER } from "./CavityEffect";
import Grass, { GRASS_NAME } from "./Grass";
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

const createNoiseMaterial = (
  color: string,
  noiseColor: string,
  noiseMap: THREE.Texture,
  noiseScale: number,
  // Dithered dissolve towards the edge (landscape only).
  fade?: { edge: EdgeFade; dpr: number },
) => {
  const material = new THREE.MeshLambertMaterial({ color, flatShading: true });
  // Both variants share this onBeforeCompile source, so three would reuse one program.
  material.customProgramCacheKey = () => (fade ? "noise-fade" : "noise");
  material.onBeforeCompile = (shader) => {
    shader.uniforms.noiseMap = { value: noiseMap };
    shader.uniforms.noiseColor = { value: new THREE.Color(noiseColor) };
    shader.uniforms.noiseScale = { value: noiseScale };
    if (fade) Object.assign(shader.uniforms, edgeFadeUniforms(fade.edge, fade.dpr));

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vNoisePos;
        varying vec3 vNoiseNormal;
        ${fade ? "varying vec2 vFadePos;" : ""}`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vNoisePos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vNoiseNormal = normalize(mat3(modelMatrix) * objectNormal);
        ${fade ? "vFadePos = position.xz;" : ""}`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D noiseMap;
        uniform vec3 noiseColor;
        uniform float noiseScale;
        varying vec3 vNoisePos;
        varying vec3 vNoiseNormal;
        ${fade ? EDGE_FADE_PARS : ""}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        ${fade ? "edgeFade();" : ""}
        vec3 blend = pow(abs(normalize(vNoiseNormal)), vec3(4.0));
        blend /= blend.x + blend.y + blend.z;
        vec3 p = vNoisePos * noiseScale;
        float noise = texture2D(noiseMap, p.yz).r * blend.x
                    + texture2D(noiseMap, p.xz).r * blend.y
                    + texture2D(noiseMap, p.xy).r * blend.z;
        diffuseColor.rgb = mix(diffuseColor.rgb, noiseColor, noise);`,
      );
  };
  return material;
};

// Build-up when the scene opens: landscape rises, monolith pushes out of the
// ground, small rocks pop in, holder rocks slide out of the monolith, grass grows.
// Delays/durations in seconds. glTF names lose their dots ("holder-rock.001" ->
// "holder-rock001"), so groups match by prefix.
const BUILD_EASE = [0.22, 1, 0.36, 1] as const;
const BUILD = {
  landscape: { delay: 0, duration: 0.9, drop: 1.5 },
  monolith: { delay: 0.6, duration: 1.1 },
  smallRocks: { delay: 1.5, stagger: 0.1 },
  holderRocks: { delay: 2.3, stagger: 0.12, duration: 0.6 },
  grass: { delay: 2.9, duration: 0.9 },
};

type BuildParts = {
  landscape?: THREE.Object3D;
  monolith?: THREE.Object3D;
  smallRocks: THREE.Object3D[];
  holderRocks: THREE.Object3D[];
  grass?: THREE.Object3D;
};

const findBuildParts = (scene: THREE.Object3D): BuildParts => {
  const parts: BuildParts = { smallRocks: [], holderRocks: [] };
  scene.traverse((obj) => {
    if (obj.name === "Landscape") parts.landscape = obj;
    else if (obj.name === "Monolith") parts.monolith = obj;
    else if (obj.name === GRASS_NAME) parts.grass = obj;
    else if (obj.name.startsWith("small-rock")) parts.smallRocks.push(obj);
    else if (obj.name.startsWith("holder-rock")) parts.holderRocks.push(obj);
  });
  return parts;
};

const allParts = ({ landscape, monolith, smallRocks, holderRocks, grass }: BuildParts) =>
  [landscape, monolith, ...smallRocks, ...holderRocks, grass].filter(
    (obj): obj is THREE.Object3D => obj !== undefined,
  );

// Moves every part to its start pose and animates it into place, revealing each
// one only when its own animation starts. Returns a cleanup that stops everything
// and restores the original transforms (the glTF scene is cached and reused the
// next time the view opens).
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

  const { landscape, monolith, smallRocks, holderRocks, grass } = parts;
  if (landscape) {
    const y = landscape.position.y;
    landscape.position.y = y - BUILD.landscape.drop;
    reveal(landscape, BUILD.landscape.delay);
    controls.push(animate(landscape.position, { y }, { ...ease, ...BUILD.landscape }));
  }
  if (monolith instanceof THREE.Mesh) {
    monolith.geometry.computeBoundingBox();
    const box = monolith.geometry.boundingBox!;
    const height = (box.max.y - box.min.y) * monolith.scale.y;
    const y = monolith.position.y;
    monolith.position.y = y - height;

    // Hide whatever is still underground while it rises (the ground is a thin
    // disc, so it would otherwise show below it). Clips at the glTF's y = 0.
    root.updateWorldMatrix(true, false);
    const groundY = root.localToWorld(new THREE.Vector3()).y;
    const material = monolith.material as THREE.Material;
    material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY)];

    reveal(monolith, BUILD.monolith.delay);
    const rise = animate(monolith.position, { y }, { ...ease, ...BUILD.monolith });
    rise.finished.then(() => (material.clippingPlanes = null));
    controls.push(rise);
  }
  smallRocks.forEach((rock, i) => {
    const { x, y, z } = rock.scale;
    const delay = BUILD.smallRocks.delay + i * BUILD.smallRocks.stagger;
    rock.scale.setScalar(0);
    reveal(rock, delay);
    controls.push(
      animate(rock.scale, { x, y, z }, { type: "spring", bounce: 0.4, duration: 0.7, delay }),
    );
  });
  holderRocks.forEach((holder, i) => {
    const { x, z } = holder.position;
    const delay = BUILD.holderRocks.delay + i * BUILD.holderRocks.stagger;
    // Start on the monolith's axis, i.e. hidden inside it.
    holder.position.x = monolith?.position.x ?? 0;
    holder.position.z = monolith?.position.z ?? 0;
    reveal(holder, delay);
    controls.push(
      animate(holder.position, { x, z }, { ...ease, duration: BUILD.holderRocks.duration, delay }),
    );
  });
  if (grass) {
    grass.scale.y = 0;
    reveal(grass, BUILD.grass.delay);
    controls.push(animate(grass.scale, { y: 1 }, { ...ease, ...BUILD.grass }));
  }

  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    controls.forEach((c) => c.stop());
    if (monolith instanceof THREE.Mesh) (monolith.material as THREE.Material).clippingPlanes = null;
    original.forEach(({ obj, position, scale }) => {
      obj.position.copy(position);
      obj.scale.copy(scale);
      obj.visible = true;
    });
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

const Rock = () => {
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
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name !== GRASS_NAME) {
        obj.material = obj.name === "Landscape" ? landscapeMaterial : material;
        obj.castShadow = true;
        obj.receiveShadow = true;
        // Landscape blends in: no cavity lines or outline on its edges.
        if (obj.name === "Landscape") obj.layers.set(NO_CAVITY_LAYER);
      }
    });
    return () => {
      material.dispose();
      landscapeMaterial.dispose();
    };
  }, [scene, perlin, radius, edge, dpr]);

  // Hide the parts before the first frame; playBuild reveals them one by one.
  useLayoutEffect(() => {
    const objects = allParts(findBuildParts(scene));
    objects.forEach((obj) => (obj.visible = false));
    return () => objects.forEach((obj) => (obj.visible = true));
  }, [scene]);

  // After framing, move parts to their start poses and play the build-up.
  useEffect(() => {
    const parts = findBuildParts(scene);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      allParts(parts).forEach((obj) => (obj.visible = true));
      return;
    }
    return playBuild(parts, scene);
  }, [scene]);

  return (
    <>
      <hemisphereLight args={["#f59587", "#ffb89c", 1.6]} />
      <CameraLight radius={radius} />
      <Center rotateY={Math.PI}>
        <primitive object={scene}>
          <Grass root={scene} noiseMap={perlin} edge={edge} dpr={dpr} />
        </primitive>
      </Center>
    </>
  );
};

// <Bounds> re-measures its children whenever it refits (e.g. once OrbitControls
// registers, or on resize), which would catch the build-up mid-animation. So it
// frames an invisible box the size of the assembled scene instead, and the rock
// (centred on the origin by <Center>) renders outside it.
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

const RockScene = () => (
  <Canvas
    shadows
    camera={{ position: [0, 0, 5], fov: 30 }}
    dpr={[1, 2]}
    onCreated={({ gl }) => {
      // Needed for the monolith's ground clip during the build-up.
      gl.localClippingEnabled = true;
    }}
  >
    <Suspense fallback={null}>
      <Bounds fit clip observe margin={1.2}>
        <FramingProxy />
      </Bounds>
      <Rock />
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
