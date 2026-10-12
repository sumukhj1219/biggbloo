"use client";

import React from "react";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import WireframeModel from "./WireframeModel";

const MODEL_Z = 1;

const FoosballModel = () => {
  const rect = useLayoutStore((state) => state.rects.foosball);
  const camera = useFrozenCamera();

  if (!rect) return null;

  const { position, width, height } = rectToWorldBounds(rect, camera, MODEL_Z);

  return (
    <group position={[position.x, position.y, MODEL_Z - 0.5]}>
      <WireframeModel
        url="/glb/foosball.glb"
        color="skyblue"
        fitWidth={width + 0.5}
        fitHeight={height}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
      />
    </group>
  );
};

export default FoosballModel;
