"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import { NoiseRevealShader } from "@/components/shaders/NoiseRevealShader";

const IMAGE_Z = 1;
const GRASS_Z_OFFSET = -0.1;
const THRESHOLD = 0.25;
const NOISE_URL = "/app/noise.png";
const GRASS_URL = "/app/grass-pitch.png";

const FoosballGrassNoise = () => {
  const rect = useLayoutStore((state) => state.rects.foosball);
  const camera = useFrozenCamera();
  const [texture, noiseTexture] = useTexture([GRASS_URL, NOISE_URL]);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.needsUpdate = true;
  }, [noiseTexture]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (!rect) return null;

  const { position, width, height } = rectToWorldBounds(rect, camera, IMAGE_Z);

  return (
    <mesh position={[position.x, position.y, IMAGE_Z + GRASS_Z_OFFSET]}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={{
          uTexture: { value: texture },
          uNoiseTexture: { value: noiseTexture },
          uTime: { value: 0 },
          uThreshold: { value: THRESHOLD },
          uEdgeColor: { value: new THREE.Color("#8e8be8") },
        }}
        vertexShader={NoiseRevealShader.vertexShader}
        fragmentShader={NoiseRevealShader.fragmentShader}
      />
    </mesh>
  );
};

export default FoosballGrassNoise;
