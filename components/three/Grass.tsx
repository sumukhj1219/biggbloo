"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EDGE_FADE_PARS, edgeFadeUniforms, type EdgeFade } from "./edgeFade";

export const GRASS_LAYER = 1;
export const GRASS_NAME = "Grass";

const BLADE_COUNT = 14000;
const BLADE_WIDTH = 0.35;
const BLADE_HEIGHT = 0.5;
const BLADE_HEIGHT_VARIATION = 0.16;
const TIP_OFFSET = 0.03;

const PATCH_COUNT = 5;
const PATCH_RADIUS: [number, number] = [0.8, 1.4];
const ROCK_MARGIN = 0.15;
const GRID = 48;
const SEED = 7;

const BASE_COLOR = "#3f7a3c";
const TIP_COLOR = "#b8de74";

const vertexShader = /* glsl */ `
uniform float time;
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vFadePos;

void main() {
  vUv = uv;
  vColor = color;
  vFadePos = position.xz;
  vec3 cpos = position;

  float waveSize = 10.0;
  float tipDistance = 0.085;
  float centerDistance = 0.028;
  float sway = sin(time * 2.0 + uv.x * waveSize);

  if (color.x > 0.6) {
    cpos.x += sway * tipDistance;
  } else if (color.x > 0.0) {
    cpos.x += sway * centerDistance;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(cpos, 1.0);
}
`;

const fragmentShader = (fade: boolean) => /* glsl */ `
uniform vec3 baseColor;
uniform vec3 tipColor;
uniform sampler2D noiseMap;
varying vec2 vUv;
varying vec3 vColor;
${fade ? EDGE_FADE_PARS : ""}

void main() {
  ${fade ? "edgeFade();" : ""}
  vec3 color = mix(baseColor, tipColor, vColor.x);
  // Static perlin variation across the field (the demo's cloud texture).
  color *= 0.85 + 0.3 * texture2D(noiseMap, vUv * 3.0).r;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const matrixToRoot = (mesh: THREE.Object3D, root: THREE.Object3D) => {
  const matrix = new THREE.Matrix4();
  for (let o: THREE.Object3D | null = mesh; o && o !== root; o = o.parent) {
    o.updateMatrix();
    matrix.premultiply(o.matrix);
  }
  return matrix;
};

const vertices = (mesh: THREE.Mesh, root: THREE.Object3D) => {
  const matrix = matrixToRoot(mesh, root);
  const position = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  return Array.from({ length: position.count }, (_, i) =>
    v.fromBufferAttribute(position, i).applyMatrix4(matrix).clone(),
  );
};

const buildGrass = (root: THREE.Object3D) => {
  let landscape: THREE.Mesh | undefined;
  const rocks: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || obj.name === GRASS_NAME) return;
    if (obj.name === "Landscape") landscape = obj;
    else rocks.push(obj);
  });
  if (!landscape) return null;

  const ground = vertices(landscape, root);
  const box = new THREE.Box3().setFromPoints(ground);
  const sizeX = box.max.x - box.min.x;
  const sizeZ = box.max.z - box.min.z;
  const sum = new Float32Array(GRID * GRID);
  const count = new Uint16Array(GRID * GRID);
  const cellOf = (x: number, z: number) => {
    const cx = Math.floor(((x - box.min.x) / sizeX) * GRID);
    const cz = Math.floor(((z - box.min.z) / sizeZ) * GRID);
    return [Math.min(GRID - 1, cx), Math.min(GRID - 1, cz)];
  };
  for (const p of ground) {
    const [cx, cz] = cellOf(p.x, p.z);
    sum[cz * GRID + cx] += p.y;
    count[cz * GRID + cx]++;
  }
  const filled = (cx: number, cz: number) =>
    cx >= 0 && cz >= 0 && cx < GRID && cz < GRID && count[cz * GRID + cx] > 0;
  const heightAt = (x: number, z: number) => {
    const [cx, cz] = cellOf(x, z);
    if (
      !filled(cx, cz) ||
      !filled(cx - 1, cz) ||
      !filled(cx + 1, cz) ||
      !filled(cx, cz - 1) ||
      !filled(cx, cz + 1)
    ) {
      return null;
    }
    return sum[cz * GRID + cx] / count[cz * GRID + cx];
  };

  const obstacles = rocks
    .map((rock) => new THREE.Box3().setFromPoints(vertices(rock, root)))
    .filter((b) => b.min.y < box.max.y + 0.6)
    .map((b) => b.expandByVector(new THREE.Vector3(ROCK_MARGIN, 0, ROCK_MARGIN)));
  const blocked = (x: number, z: number) =>
    obstacles.some((b) => x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z);
  const open = (x: number, z: number) => !blocked(x, z) && heightAt(x, z) !== null;

  const r = rng(SEED);
  const patches: { x: number; z: number; radius: number }[] = [];
  for (let tries = 0; tries < 400 && patches.length < PATCH_COUNT; tries++) {
    const x = box.min.x + r() * sizeX;
    const z = box.min.z + r() * sizeZ;
    const radius = PATCH_RADIUS[0] + r() * (PATCH_RADIUS[1] - PATCH_RADIUS[0]);
    const spaced = patches.every((p) => Math.hypot(p.x - x, p.z - z) > p.radius + radius * 0.6);
    if (open(x, z) && spaced) patches.push({ x, z, radius });
  }
  const totalArea = patches.reduce((a, p) => a + p.radius * p.radius, 0);

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let blades = 0;

  const addBlade = (x: number, y: number, z: number) => {
    const height = BLADE_HEIGHT + r() * BLADE_HEIGHT_VARIATION;
    const yaw = r() * Math.PI * 2;
    const bend = r() * Math.PI * 2;
    const yx = Math.sin(yaw);
    const yz = -Math.cos(yaw);
    const half = BLADE_WIDTH / 2;
    const mid = BLADE_WIDTH / 4;
    const u = (x - box.min.x) / sizeX;
    const v = (z - box.min.z) / sizeZ;
    const offset = blades * 5;

    const verts: [number, number, number, number][] = [
      [x + yx * half, y, z + yz * half, 0],
      [x - yx * half, y, z - yz * half, 0],
      [x - yx * mid, y + height / 2, z - yz * mid, 0.5],
      [x + yx * mid, y + height / 2, z + yz * mid, 0.5],
      [x + Math.sin(bend) * TIP_OFFSET, y + height, z - Math.cos(bend) * TIP_OFFSET, 1],
    ];
    for (const [px, py, pz, c] of verts) {
      positions.push(px, py, pz);
      uvs.push(u, v);
      colors.push(c, c, c);
    }
    indices.push(offset, offset + 1, offset + 2, offset + 2, offset + 4, offset + 3, offset + 3, offset, offset + 2);
    blades++;
  };

  for (const patch of patches) {
    const target = Math.round((BLADE_COUNT * patch.radius * patch.radius) / totalArea);
    for (let n = 0, tries = 0; n < target && tries < target * 4; tries++) {
      const dist = patch.radius * Math.sqrt(r());
      if (r() > 1 - Math.pow(dist / patch.radius, 3)) continue;
      const angle = r() * Math.PI * 2;
      const x = patch.x + dist * Math.cos(angle);
      const z = patch.z + dist * Math.sin(angle);
      const y = heightAt(x, z);
      if (y === null || blocked(x, z)) continue;
      addBlade(x, y - 0.01, z);
      n++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

type GrassProps = {
  root: THREE.Object3D;
  noiseMap: THREE.Texture;
  edge?: EdgeFade;
  dpr: number;
};

const Grass = ({ root, noiseMap, edge, dpr }: GrassProps) => {
  const camera = useThree((state) => state.camera);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => buildGrass(root), [root]);
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      baseColor: { value: new THREE.Color(BASE_COLOR) },
      tipColor: { value: new THREE.Color(TIP_COLOR) },
      noiseMap: { value: noiseMap },
      ...(edge ? edgeFadeUniforms(edge, dpr) : {}),
    }),
    [noiseMap, edge, dpr],
  );

  useLayoutEffect(() => {
    meshRef.current?.layers.set(GRASS_LAYER);
    camera.layers.enable(GRASS_LAYER);
    return () => camera.layers.disable(GRASS_LAYER);
  }, [camera]);

  useLayoutEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.time.value = clock.elapsedTime;
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} name={GRASS_NAME} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader(Boolean(edge))}
        vertexColors
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default Grass;
