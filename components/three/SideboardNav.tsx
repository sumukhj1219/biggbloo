"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { createPortal, type ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";

export const FONT_URL = "/fonts/AmaticSC-Bold.ttf";
export const INK = "#f0dcba";
const INK_HOVER = "#fff6e6";
const FONT_SIZE = 0.62;
const LINE_GAP = 0.85;

export const NAV_ITEMS = ["Works", "Games", "Interests"];

type SideboardNavProps = {
  board: THREE.Mesh;
  onSelect: (index: number) => void;
};

const SideboardNav = ({ board, onSelect }: SideboardNavProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const face = useMemo(() => {
    board.geometry.computeBoundingBox();
    const box = board.geometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(box.max.x + 0.005, center.y, center.z);
  }, [board]);

  const hover = (index: number | null) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(index);
    document.body.style.cursor = index === null ? "" : "pointer";
  };

  return createPortal(
    <group position={face} rotation={[0, Math.PI / 2, 0]}>
      {NAV_ITEMS.map((label, i) => (
        <Text
          key={label}
          font={FONT_URL}
          fontSize={FONT_SIZE}
          position={[0, (1 - i) * LINE_GAP, 0]}
          anchorX="center"
          anchorY="middle"
          color={hovered === i ? INK_HOVER : INK}
          userData={{ keepMaterial: true }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(i);
          }}
          onPointerOver={hover(i)}
          onPointerOut={hover(null)}
        >
          {label}
        </Text>
      ))}
    </group>,
    board,
  );
};

const HINT_SIZE = 0.32;
const HINT_LIFT = 0.24;

export const FrameHint = ({ frame }: { frame: THREE.Mesh }) => {
  const position = useMemo(() => {
    frame.geometry.computeBoundingBox();
    const box = frame.geometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(center.x, center.y + HINT_LIFT, box.max.z + 0.005);
  }, [frame]);

  return createPortal(
    <Text
      font={FONT_URL}
      fontSize={HINT_SIZE}
      position={position}
      anchorX="center"
      anchorY="middle"
      color={INK}
      userData={{ keepMaterial: true }}
    >
      Controls
    </Text>,
    frame,
  );
};

export default SideboardNav;
