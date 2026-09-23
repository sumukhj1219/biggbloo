"use client";

import React from "react";
import { useThree } from "@react-three/fiber";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds } from "./screenToWorld";
import WireframeModel from "./WireframeModel";

const MODEL_Z = 1;

/**
 * Renders musicPlayer.glb exactly where — and at the same size as — the
 * real CurrentMusic DOM element. Position and size both come from
 * projecting that element's measured rect through the camera (see
 * screenToWorld.ts), not fixed numbers.
 */
const CurrentMusicModel = () => {
  const rect = useLayoutStore((state) => state.rects.currentMusic);
  const { camera } = useThree();

  if (!rect) return null;

  const { position, width, height } = rectToWorldBounds(
    rect,
    camera,
    MODEL_Z,
  );

  return (
    <group position={[position.x - width/4, position.y, MODEL_Z]}>
      <WireframeModel
        url="/glb/musicPlayer.glb"
        color="skyblue"
        fitWidth={width / 2}
        fitHeight={height}
      />
    </group>
  );
};

export default CurrentMusicModel;
