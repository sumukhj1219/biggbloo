"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import WireframeModel from "./WireframeModel";

const MARKER_Z = 1.15;
const GEAR_Z = MARKER_Z - 0.15;
const ROTATION_SPEED = 1;
const GAP = 0.05;
const SCALE = 0.5;

const SwitchGears = () => {
  const navbarChildRects = useLayoutStore((state) => state.childRects.navbar);
  const camera = useFrozenCamera();
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (leftRef.current) leftRef.current.rotation.z += ROTATION_SPEED * delta;
    if (rightRef.current)
      rightRef.current.rotation.z -= ROTATION_SPEED * delta;
  });

  const bounds = useMemo(() => {
    if (!navbarChildRects) return null;
    const item = navbarChildRects.find(
      (r) => r.content.kind === "text" && r.content.text === "Switch",
    );
    if (!item) return null;
    return rectToWorldBounds(item.rect, camera, GEAR_Z);
  }, [navbarChildRects, camera]);

  if (!bounds) return null;

  const diameter = Math.min((bounds.width - GAP) / 2, bounds.height) * SCALE;
  const offsetX = diameter / 2 + GAP / 2;

  return (
    <>
      <group
        ref={leftRef}
        position={[bounds.position.x - offsetX, bounds.position.y, GEAR_Z]}
      >
        <WireframeModel
          url="/glb/gear.glb"
          color="skyblue"
          fitHeight={diameter * 2}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>
      <group
        ref={rightRef}
        position={[bounds.position.x + offsetX, bounds.position.y, GEAR_Z]}
      >
        <WireframeModel
          url="/glb/gear.glb"
          color="skyblue"
          fitHeight={diameter}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </group>
    </>
  );
};

export default SwitchGears;
