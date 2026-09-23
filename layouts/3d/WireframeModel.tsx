"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

const EMPTY_THRESHOLDS: Record<string, number> = {};

interface WireframeModelProps {
  url: string;
  color?: string;
  edgeThreshold?: number;

  edgeThresholdByName?: Record<string, number>;
  /**
   * If given, the model is scaled so its own bounding box matches this
   * world-space width/height — its natural export scale (whatever Blender
   * happened to save) is irrelevant once these are set. Give both to match
   * an exact target size (non-uniform if the model's own proportions don't
   * match); give one to scale uniformly by that axis alone.
   */
  fitWidth?: number;
  fitHeight?: number;
}
const WireframeModel = ({
  url,
  color = "blue",
  edgeThreshold = 1,
  edgeThresholdByName = EMPTY_THRESHOLDS,
  fitWidth,
  fitHeight,
}: WireframeModelProps) => {
  const { scene } = useGLTF(url);

  const { wireframeScene, scale } = useMemo(() => {
    const root = scene.clone(true);
    const material = new THREE.LineBasicMaterial({ color });

    const meshes: THREE.Mesh[] = [];
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    meshes.forEach((mesh) => {
      const threshold = edgeThresholdByName[mesh.name] ?? edgeThreshold;
      const edges = new THREE.EdgesGeometry(mesh.geometry, threshold);
      const lineSegments = new THREE.LineSegments(edges, material);
      mesh.parent?.add(lineSegments);
      mesh.parent?.remove(mesh);
    });

    let scale: [number, number, number] = [1, 1, 1];
    if (fitWidth != null || fitHeight != null) {
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scaleX = fitWidth != null && size.x > 0 ? fitWidth / size.x : null;
      const scaleY =
        fitHeight != null && size.y > 0 ? fitHeight / size.y : null;
      // Only one dimension given → scale uniformly by that one, rather than
      // stretching the other axis by a default of 1 (its raw export size).
      const uniform = scaleX ?? scaleY ?? 1;
      scale = [scaleX ?? uniform, scaleY ?? uniform, scaleX ?? scaleY ?? uniform];
    }

    return { wireframeScene: root, scale };
  }, [scene, color, edgeThreshold, edgeThresholdByName, fitWidth, fitHeight]);

  return <primitive object={wireframeScene} scale={scale} />;
};

export default WireframeModel;
