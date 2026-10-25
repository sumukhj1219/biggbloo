"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createPortal } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { FONT_URL, INK } from "./SideboardNav";

export const PLANK_LABELS: Record<string, string> = {
  "Works-Plank": "Works",
  "Intrests-Plank": "Interests",
  "Games-Plank": "Games",
};

const FONT_SIZE = 0.5;
const FACE_LIFT = 0.005;
const UP = new THREE.Vector3(0, 1, 0);

const placeOnPlank = (plank: THREE.Mesh, monolith: THREE.Object3D) => {
  plank.geometry.computeBoundingBox();
  const box = plank.geometry.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());

  const plankPos = plank.getWorldPosition(new THREE.Vector3());
  const out = plankPos.sub(monolith.getWorldPosition(new THREE.Vector3())).setY(0);
  const worldQuat = plank.getWorldQuaternion(new THREE.Quaternion());
  const sign = UP.clone().applyQuaternion(worldQuat).dot(out) >= 0 ? 1 : -1;
  const normal = new THREE.Vector3(0, sign, 0);

  const up = UP.clone().applyQuaternion(worldQuat.invert()).projectOnPlane(normal).normalize();
  const right = up.clone().cross(normal);
  return {
    position: new THREE.Vector3(
      center.x,
      sign > 0 ? box.max.y + FACE_LIFT : box.min.y - FACE_LIFT,
      center.z,
    ),
    quaternion: new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(right, up, normal),
    ),
  };
};

const PlankLabel = ({ plank, monolith }: { plank: THREE.Mesh; monolith: THREE.Object3D }) => {
  const { position, quaternion } = useMemo(() => placeOnPlank(plank, monolith), [plank, monolith]);
  return createPortal(
    <Text
      font={FONT_URL}
      fontSize={FONT_SIZE}
      position={position}
      quaternion={quaternion}
      anchorX="center"
      anchorY="middle"
      color={INK}
      userData={{ keepMaterial: true }}
    >
      {PLANK_LABELS[plank.name]}
    </Text>,
    plank,
  );
};

const PlankLabels = ({ scene, monolith }: { scene: THREE.Object3D; monolith: THREE.Object3D }) => {
  const planks = useMemo(
    () =>
      Object.keys(PLANK_LABELS)
        .map((name) => scene.getObjectByName(name))
        .filter((obj): obj is THREE.Mesh => obj instanceof THREE.Mesh),
    [scene],
  );
  return planks.map((plank) => <PlankLabel key={plank.name} plank={plank} monolith={monolith} />);
};

export default PlankLabels;
