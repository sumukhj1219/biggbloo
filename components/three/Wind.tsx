"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { NO_CAVITY_LAYER } from "./CavityEffect";

const LENGTH = 8;
const WIDTH = 0.07;
const SEGMENTS = 160;
const STREAKS = 1;
const PERIOD = 7;
const START_X: [number, number] = [-6, 1];
const DRIFT = 4;
const HEIGHT: [number, number] = [-1, 4.5];
const DEPTH: [number, number] = [4, 5];
const OPACITY = 0.85;

const vertexShader = `
uniform float time;
uniform float travel;
uniform float seed;
varying float vAlong;

void main() {
  vAlong = uv.x;
  vec3 p = position;
  p.y *= sin(3.14159265 * uv.x);
  float x = p.x + travel;
  p.y += sin(x * 1.1 - time * 1.2 + seed) * 0.2 + sin(x * 0.45 + seed * 2.0) * 0.14;
  p.x = x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = `
uniform float life;
uniform float opacity;
varying float vAlong;

void main() {
  float ends = smoothstep(0.0, 0.25, vAlong) * smoothstep(1.0, 0.75, vAlong);
  gl_FragColor = vec4(vec3(1.0), opacity * ends * life);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

const respawn = (mesh: THREE.Mesh, cycle: number, index: number) => {
  const r = (n: number) => {
    const x = Math.sin((cycle + 1) * 12.9898 + index * 78.233 + n * 37.719) * 43758.5453;
    return x - Math.floor(x);
  };
  const side = r(2) < 0.5 ? -1 : 1;
  mesh.position.set(lerp(START_X, r(4)), lerp(HEIGHT, r(1)), side * lerp(DEPTH, r(5)));
  (mesh.material as THREE.ShaderMaterial).uniforms.seed.value = r(3) * 10;
};

type StreakState = { cycle: number; start: number | null };

const stepStreak = (
  mesh: THREE.Mesh,
  state: StreakState,
  index: number,
  now: number,
  delay: number,
) => {
  state.start ??= now;
  const elapsed = now - state.start - delay;
  const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms;
  if (elapsed < 0) {
    uniforms.life.value = 0;
    return;
  }
  const t = elapsed / PERIOD + index / STREAKS;
  const cycle = Math.floor(t);
  const progress = t - cycle;
  if (cycle !== state.cycle) {
    state.cycle = cycle;
    respawn(mesh, cycle, index);
  }
  uniforms.time.value = elapsed;
  uniforms.travel.value = DRIFT * progress;
  uniforms.life.value = Math.sin(Math.PI * progress) ** 2;
};

type StreakProps = { index: number; geometry: THREE.BufferGeometry; delay: number };

const Streak = ({ index, geometry, delay }: StreakProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const state = useRef<StreakState>({ cycle: -1, start: null });
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      travel: { value: 0 },
      seed: { value: 0 },
      life: { value: 0 },
      opacity: { value: OPACITY },
    }),
    [],
  );

  useEffect(() => {
    meshRef.current?.layers.set(NO_CAVITY_LAYER);
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      stepStreak(meshRef.current, state.current, index, clock.elapsedTime, delay);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const Wind = ({ delay = 0 }: { delay?: number }) => {
  const geometry = useMemo(() => new THREE.PlaneGeometry(LENGTH, WIDTH, SEGMENTS, 1), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return Array.from({ length: STREAKS }, (_, i) => (
    <Streak key={i} index={i} geometry={geometry} delay={delay} />
  ));
};

export default Wind;
