"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import { NoiseRevealShader } from "@/components/shaders/NoiseRevealShader";

const IMAGE_Z = 1;
const THRESHOLD = 0.25;
const NOISE_URL = "/app/noise.png";

// currentMusic's image sits right where the musicPlayer.glb turntable
// model is (also at Z=1) — nudged right and pushed back a bit so it only
// barely overlaps/peeks from behind the model instead of directly
// coinciding with it.
const CURRENT_MUSIC_X_OFFSET = 0.08;
const CURRENT_MUSIC_Z_OFFSET = 0.15;

interface NoiseImageProps {
  group: string;
}

const NoiseImage = ({ group }: NoiseImageProps) => {
  const groupChildRects = useLayoutStore((state) => state.childRects[group]);
  const camera = useFrozenCamera();

  const imageItem = useMemo(() => {
    if (!groupChildRects) return null;
    const found = groupChildRects.find((r) => r.content.kind === "image");
    if (!found || found.content.kind !== "image") return null;
    return { rect: found.rect, src: found.content.src };
  }, [groupChildRects]);

  if (!imageItem) return null;

  const xOffset = group === "currentMusic" ? CURRENT_MUSIC_X_OFFSET : 0;
  const z = group === "currentMusic" ? IMAGE_Z + CURRENT_MUSIC_Z_OFFSET / 2 : IMAGE_Z;

  return (
    <NoiseImageMesh
      rect={imageItem.rect}
      src={imageItem.src}
      camera={camera}
      xOffset={xOffset}
      z={z}
    />
  );
};

const NoiseImageMesh = ({
  rect,
  src,
  camera,
  xOffset,
  z,
}: {
  rect: DOMRect;
  src: string;
  camera: THREE.Camera;
  xOffset: number;
  z: number;
}) => {
  const [texture, noiseTexture] = useTexture([src, NOISE_URL]);
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

  const { position, width, height } = rectToWorldBounds(
    rect,
    camera,
    IMAGE_Z,
  );

  return (
    <mesh position={[position.x + xOffset, position.y, z]}>
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

export default NoiseImage;
