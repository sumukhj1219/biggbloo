"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useLayoutStore } from "@/store/useLayoutStore";
import { createGridGeometry } from "./lineGeometry";
import { rectToWorldBounds } from "./screenToWorld";

const MARKER_Z = 1;
// Lower than before — these panels are per text-chunk now (a word, a short
// phrase), not one panel for a whole paragraph, so the same divisions used
// for the big version would look far too dense at this size.
const DIVISIONS_X = 4;
const DIVISIONS_Y = 2;

const Z_SLICES = 2;
const THICKNESS = 0.02;

const DomMarkers = () => {
  const childRects = useLayoutStore((state) => state.childRects);
  const { camera } = useThree();

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: "skyblue" }),
    [],
  );

  const markers = useMemo(() => {
    return Object.values(childRects)
      .flat()
      .map((rect) => {
        const { position, width, height } = rectToWorldBounds(
          rect,
          camera,
          MARKER_Z,
        );
        const geometry = createGridGeometry(
          width,
          height,
          DIVISIONS_X,
          DIVISIONS_Y,
        );
        return { position, geometry };
      });
  }, [childRects, camera]);

  return (
    <>
      {markers.map((marker, i) =>
        Array.from({ length: Z_SLICES }, (_, s) => {
          const z = MARKER_Z - (s * THICKNESS) / (Z_SLICES - 1);
          return (
            <lineSegments
              key={`${i}-${s}`}
              geometry={marker.geometry}
              position={[marker.position.x, marker.position.y, z]}
              material={material}
            />
          );
        }),
      )}
    </>
  );
};

export default DomMarkers;
