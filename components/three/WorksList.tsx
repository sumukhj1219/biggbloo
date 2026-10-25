"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createPortal, type ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { WORKS } from "@/lib/works";
import { placeOnFace } from "./MonolithTitle";
import { FONT_URL, INK, INK_HOVER } from "./SideboardNav";

const WORKS_FACE = new THREE.Vector3(0, 0, 1);
const TOP_GAP = 2;
const FONT_SIZE = 0.38;
const LINE_GAP = 0.55;

const facesViewer = (e: ThreeEvent<MouseEvent>) => {
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
    e.object.getWorldQuaternion(new THREE.Quaternion()),
  );
  return normal.dot(e.ray.direction) < 0;
};

type WorksListProps = {
  monolith: THREE.Mesh;
  selected: number;
  onSelect: (index: number) => void;
};

const WorksList = ({ monolith, selected, onSelect }: WorksListProps) => {
  const lines = useMemo(() => {
    monolith.geometry.computeBoundingBox();
    const top = monolith.geometry.boundingBox!.max.y - TOP_GAP;
    return WORKS.map((_, i) => placeOnFace(monolith, top - i * LINE_GAP, WORKS_FACE));
  }, [monolith]);

  const select = (index: number) => (e: ThreeEvent<MouseEvent>) => {
    if (!facesViewer(e)) return;
    e.stopPropagation();
    onSelect(index);
  };
  const hover = (index: number) => (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === "mouse") select(index)(e);
  };

  return createPortal(
    <>
      {WORKS.map((work, i) => (
        <Text
          key={work.title}
          font={FONT_URL}
          fontSize={FONT_SIZE}
          position={lines[i].position}
          quaternion={lines[i].quaternion}
          anchorX="center"
          anchorY="middle"
          color={selected === i ? INK_HOVER : INK}
          userData={{ keepMaterial: true }}
          onPointerOver={hover(i)}
          onClick={select(i)}
        >
          {work.title}
        </Text>
      ))}
    </>,
    monolith,
  );
};

export default WorksList;
