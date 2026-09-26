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

  return (
    <NoiseImageMesh rect={imageItem.rect} src={imageItem.src} camera={camera} />
  );
};

const NoiseImageMesh = ({
  rect,
  src,
  camera,
}: {
  rect: DOMRect;
  src: string;
  camera: THREE.Camera;
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
    <mesh position={[position.x, position.y, IMAGE_Z]}>
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
