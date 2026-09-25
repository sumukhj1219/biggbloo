"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useLayoutStore } from "@/store/useLayoutStore";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import { WIDTH } from "./constants";

const SHELF_Z = 1;
const SHELF_HEIGHT = 0.15;
const SHELF_DEPTH = 0.3;
// Gap between the shelf's top and the music model's bottom edge.
const GAP = 0.3;

/**
 * A thin horizontal bar spanning the wall's full width, sitting just below
 * wherever CurrentMusicModel actually is. Its Y position is derived from
 * the same measured currentMusic rect (not a fixed number), so it stays
 * correctly placed under the model even if the real page layout shifts.
 */
const MusicShelf = () => {
  const rect = useLayoutStore((state) => state.rects.currentMusic);
  const camera = useFrozenCamera();

  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(WIDTH, SHELF_HEIGHT, SHELF_DEPTH);
    return new THREE.EdgesGeometry(box);
  }, []);

  if (!rect) return null;

  const { position, height } = rectToWorldBounds(rect, camera, SHELF_Z);
  const y = position.y - height / 2 - GAP;

  return (
    <lineSegments geometry={geometry} position={[0, y, SHELF_Z]}>
      <lineBasicMaterial color="#8e8be8" />
    </lineSegments>
  );
};

export default MusicShelf;
