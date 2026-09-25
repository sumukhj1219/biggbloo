"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import WireframeModel from "./WireframeModel";

const GEAR_Z = 0.1;
const MODEL_Z = 1.1;
const BEHIND_OFFSET = 0.1;
const ROTATION_SPEED = 1;
const SCALE = 0.5;
// Must match CurrentMusicModel's own Y_OFFSET — the gear rides on the
// turntable's top edge, so both need to move down together.
const Y_OFFSET = 0.05;

const Gear = () => {
  const currentMusicChildRects = useLayoutStore(
    (state) => state.childRects.currentMusic,
  );
  const currentMusicRect = useLayoutStore(
    (state) => state.rects.currentMusic,
  );
  const camera = useFrozenCamera();
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += ROTATION_SPEED * delta;
    }
  });

  const gearHeight = useMemo(() => {
    if (!currentMusicChildRects) return null;
    const words = currentMusicChildRects.filter(
      (item) => item.content.kind === "text",
    );
    if (words.length === 0) return null;

    const left = Math.min(...words.map((w) => w.rect.left));
    const right = Math.max(...words.map((w) => w.rect.right));
    const top = Math.min(...words.map((w) => w.rect.top));
    const bottom = Math.max(...words.map((w) => w.rect.bottom));
    const union = new DOMRect(left, top, right - left, bottom - top);

    return rectToWorldBounds(union, camera, GEAR_Z).height;
  }, [currentMusicChildRects, camera]);

  const modelBounds = useMemo(() => {
    if (!currentMusicRect) return null;
    return rectToWorldBounds(currentMusicRect, camera, MODEL_Z);
  }, [currentMusicRect, camera]);

  if (!gearHeight || !modelBounds) return null;

  const x = modelBounds.position.x - modelBounds.width / 7;
  const y = modelBounds.position.y + modelBounds.height + 0.01 - Y_OFFSET;
  const z = MODEL_Z - BEHIND_OFFSET;

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <WireframeModel
        url="/glb/gear.glb"
        color="skyblue"
        fitHeight={gearHeight * SCALE}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
};

export default Gear;
