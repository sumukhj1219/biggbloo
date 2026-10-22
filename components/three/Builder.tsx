"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import { BUILDER_GROUP } from "./siteProps";

// A strip of square pixel-art frames, played on a loop.
const SHEET_URL = "/sprites/builder.png";
const FRAMES = 4;
const FPS = 6;
// About as tall as the barricade, feet on the ground.
const HEIGHT = 1.3;

// The group is only as tall as the tiny marker; sink the whole sprite when it rises in.
const sinkWholeSprite = (group: THREE.Object3D, feet: THREE.Vector3) => {
  group.userData.propHeight = feet.y + HEIGHT;
};

const showFrame = (sheet: THREE.Texture, frame: number) => {
  sheet.offset.x = frame / FRAMES;
};

// The builder lives on a placeholder cube in the model; it stands where the cube's centre is,
// always turned to the camera, and rises out of the ground with the rest of the site.
const Builder = ({ scene }: { scene: THREE.Object3D }) => {
  const sheet = useTexture(SHEET_URL, (loaded) => {
    const t = Array.isArray(loaded) ? loaded[0] : loaded;
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.repeat.set(1 / FRAMES, 1);
  });
  const spot = useMemo(() => {
    const group = scene.getObjectByName(BUILDER_GROUP);
    const marker = group?.children[0];
    return group && marker ? { group, feet: marker.position.clone() } : null;
  }, [scene]);

  useLayoutEffect(() => {
    if (spot) sinkWholeSprite(spot.group, spot.feet);
  }, [spot]);

  useFrame(({ clock }) => showFrame(sheet, Math.floor(clock.elapsedTime * FPS) % FRAMES));

  if (!spot) return null;

  return createPortal(
    <Billboard lockX lockZ position={[spot.feet.x, spot.feet.y + HEIGHT / 2, spot.feet.z]}>
      <mesh userData={{ keepMaterial: true }}>
        <planeGeometry args={[HEIGHT, HEIGHT]} />
        <meshBasicMaterial map={sheet} alphaTest={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </Billboard>,
    spot.group,
  );
};

useTexture.preload(SHEET_URL);

export default Builder;
