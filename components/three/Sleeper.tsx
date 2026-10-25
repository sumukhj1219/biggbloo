"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import { SLEEPER_MARKER } from "./siteProps";

const SHEET_URL = "/sprites/sleep.png";
const FRAMES = 6;
const FPS = 4;
const HEIGHT = 1.3;

const showFrame = (sheet: THREE.Texture, frame: number) => {
  sheet.offset.x = frame / FRAMES;
};

const Sleeper = ({ monolith }: { monolith: THREE.Object3D }) => {
  const sheet = useTexture(SHEET_URL, (loaded) => {
    const t = Array.isArray(loaded) ? loaded[0] : loaded;
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.repeat.set(1 / FRAMES, 1);
  });
  const feet = useMemo(
    () => monolith.getObjectByName(SLEEPER_MARKER)?.position.clone() ?? null,
    [monolith],
  );

  useFrame(({ clock }) => showFrame(sheet, Math.floor(clock.elapsedTime * FPS) % FRAMES));

  if (!feet) return null;

  return createPortal(
    <Billboard lockX lockZ position={[feet.x, feet.y + HEIGHT / 2, feet.z]}>
      <mesh userData={{ keepMaterial: true }}>
        <planeGeometry args={[HEIGHT, HEIGHT]} />
        <meshBasicMaterial map={sheet} alphaTest={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </Billboard>,
    monolith,
  );
};

useTexture.preload(SHEET_URL);

export default Sleeper;
