"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useLayoutStore } from "@/store/useLayoutStore";
import { createGridGeometry } from "./lineGeometry";
import { rectToWorldBounds, useFrozenCamera } from "./screenToWorld";
import type { ChildContent } from "@/hooks/useChildRects";

const MARKER_Z = 1;
const DIVISIONS_X = 4;
const DIVISIONS_Y = 2;

const Z_SLICES = 2;
const THICKNESS = 0.02;
const OVERLAY_Z = MARKER_Z + 0.05;

const CURRENT_MUSIC_X_OFFSET = 0.1;

const DomMarkers = () => {
  const childRects = useLayoutStore((state) => state.childRects);
  const toggleActive = useLayoutStore((state) => state.toggleActive);
  const camera = useFrozenCamera();

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#3268bf" }),
    [],
  );

  const items = useMemo(() => {
    return Object.entries(childRects).flatMap(([name, rects]) =>
      rects
        .filter(
          ({ content }) =>
            !(
              (name === "currentMusic" ||
                name === "work" ||
                name === "selfIntro") &&
              content.kind === "image"
            ),
        )
        .map(({ rect, content, interactive }) => {
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
          const overlayPosition = rectToWorldBounds(
            rect,
            camera,
            OVERLAY_Z,
          ).position;
          if (name === "currentMusic") {
            overlayPosition.x += CURRENT_MUSIC_X_OFFSET;
            position.x += CURRENT_MUSIC_X_OFFSET;
          }
          return {
            position,
            geometry,
            content,
            overlayPosition,
            worldWidth: width,
            worldHeight: height,
            onClick: interactive ? toggleActive : undefined,
          };
        }),
    );
  }, [childRects, camera, toggleActive]);

  return (
    <>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {Array.from({ length: Z_SLICES }, (_, s) => {
            const z = MARKER_Z - (s * THICKNESS) / (Z_SLICES - 1);
            return (
              <lineSegments
                key={s}
                geometry={item.geometry}
                position={[item.position.x, item.position.y, z]}
                material={material}
              />
            );
          })}
          <ChildOverlay
            position={item.overlayPosition}
            content={item.content}
            worldWidth={item.worldWidth}
            worldHeight={item.worldHeight}
            onClick={item.onClick}
          />
        </React.Fragment>
      ))}
    </>
  );
};

const DISTANCE_FACTOR = 4;
const CSS_PX_PER_WORLD_UNIT = 400 / DISTANCE_FACTOR;

const ChildOverlay = ({
  position,
  content,
  worldWidth,
  worldHeight,
  onClick,
}: {
  position: THREE.Vector3;
  content: ChildContent;
  worldWidth: number;
  worldHeight: number;
  onClick?: () => void;
}) => {
  if (content.kind === "text") {
    return (
      <Html
        transform
        distanceFactor={DISTANCE_FACTOR}
        position={[position.x, position.y, position.z]}
        style={{
          color: "white",
          fontSize: `${Math.max(worldHeight * 0.75 * CSS_PX_PER_WORLD_UNIT, 2)}px`,
          fontFamily: "var(--font-figtree), sans-serif",
          whiteSpace: "nowrap",
          pointerEvents: onClick ? "auto" : "none",
        }}
      >
        <span onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined }}>
          {content.text}
        </span>
      </Html>
    );
  }

  if (content.kind === "icon") {
    return (
      <Html
        transform
        distanceFactor={DISTANCE_FACTOR}
        position={[position.x, position.y, position.z]}
        style={{ pointerEvents: onClick ? "auto" : "none" }}
      >
        <svg
          viewBox={content.viewBox}
          width={worldWidth * CSS_PX_PER_WORLD_UNIT}
          height={worldHeight * CSS_PX_PER_WORLD_UNIT}
          style={{ color: "white", cursor: onClick ? "pointer" : undefined }}
          onClick={onClick}
          dangerouslySetInnerHTML={{ __html: content.markup }}
        />
      </Html>
    );
  }

  if (content.kind === "image") {
    return (
      <Html
        transform
        distanceFactor={DISTANCE_FACTOR}
        position={[position.x, position.y, position.z]}
        style={{ pointerEvents: "none" }}
      >
        <img
          src={content.src}
          alt={content.alt}
          style={{
            width: worldWidth * CSS_PX_PER_WORLD_UNIT,
            height: worldHeight * CSS_PX_PER_WORLD_UNIT,
            objectFit: "cover",
            borderRadius: 4,
          }}
        />
      </Html>
    );
  }

  return null;
};

export default DomMarkers;
