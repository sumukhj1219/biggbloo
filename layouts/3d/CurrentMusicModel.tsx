"use client";

import React from "react";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import WireframeModel from "./WireframeModel";

const MODEL_Z = 1;
const Y_OFFSET = 0.05;

const CurrentMusicModel = () => {
  const rect = useLayoutStore((state) => state.rects.currentMusic);
  const camera = useFrozenCamera();

  if (!rect) return null;

  const { position, width, height } = rectToWorldBounds(
    rect,
    camera,
    MODEL_Z,
  );

  return (
    <group position={[position.x - width/4, position.y - Y_OFFSET, MODEL_Z]}>
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
