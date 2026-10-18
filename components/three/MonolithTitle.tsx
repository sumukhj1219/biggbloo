"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createPortal } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { FONT_URL, INK } from "./SideboardNav";

const FACE = new THREE.Vector3(1, 0, 0);
const TOP_GAP = 3.4;
const LINES = [
  { text: "Yo, I'm", size: 0.45, drop: 0 },
  { text: "Sumukh", size: 0.5, drop: 0.65 },
];

const placeOnFace = (mesh: THREE.Mesh, y: number) => {
  const box = mesh.geometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  const probe = new THREE.Mesh(mesh.geometry);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(box.max.x + 1, y, center.z),
    FACE.clone().negate(),
  );
  const [hit] = raycaster.intersectObject(probe, false);
  const normal = hit?.face?.normal.clone() ?? FACE.clone();
  const point = hit?.point ?? new THREE.Vector3(box.max.x, y, center.z);
  return {
    position: point.addScaledVector(normal, 0.01),
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
  };
};

const MonolithTitle = ({ monolith }: { monolith: THREE.Mesh }) => {
  const placements = useMemo(() => {
    monolith.geometry.computeBoundingBox();
    const top = monolith.geometry.boundingBox!.max.y - TOP_GAP;
    return LINES.map((line) => ({ ...line, ...placeOnFace(monolith, top - line.drop) }));
  }, [monolith]);

  return createPortal(
    <>
      {placements.map(({ text, size, position, quaternion }) => (
        <Text
          key={text}
          font={FONT_URL}
          fontSize={size}
          position={position}
          quaternion={quaternion}
          anchorX="center"
          anchorY="middle"
          color={INK}
          userData={{ keepMaterial: true }}
        >
          {text}
        </Text>
      ))}
    </>,
    monolith,
  );
};

export default MonolithTitle;
