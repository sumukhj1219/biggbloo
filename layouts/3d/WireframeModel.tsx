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
  fitWidth?: number;
  fitHeight?: number;
  rotation?: [number, number, number];
}
const WireframeModel = ({
  url,
  color = "blue",
  edgeThreshold = 1,
  edgeThresholdByName = EMPTY_THRESHOLDS,
  fitWidth,
  fitHeight,
  rotation,
}: WireframeModelProps) => {
  const { scene } = useGLTF(url);

  const { wireframeScene, scale } = useMemo(() => {
    const root = scene.clone(true);
    if (rotation) root.rotation.set(...rotation);
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
      const uniform = scaleX ?? scaleY ?? 1;
      scale = [scaleX ?? uniform, scaleY ?? uniform, scaleX ?? scaleY ?? uniform];
    }

    return { wireframeScene: root, scale };
  }, [scene, color, edgeThreshold, edgeThresholdByName, fitWidth, fitHeight, rotation]);

  return <primitive object={wireframeScene} scale={scale} />;
};

export default WireframeModel;
