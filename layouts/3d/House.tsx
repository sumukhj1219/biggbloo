"use client";

import React, { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GridShaders } from "@/components/shaders/GridShaders";
import DomMarkers from "./DomMarkers";
import CurrentMusicModel from "./CurrentMusicModel";
import MusicShelf from "./MusicShelf";
import Gear from "./Gear";
import { WIDTH, HEIGHT } from "./constants";

const DIVISIONS_X = 30;
const DIVISIONS_Y = 30;

const DEPTH = 12;
const DEPTH_STEP = 5;

const Z_COPIES = 4;

const House = () => {
  const [gridGeometry] = useState(() => {
    const points: number[] = [];
    const progress: number[] = [];
    const phase: number[] = [];
    const direction: number[] = [];

    const addLine = (
      x1: number,
      y1: number,
      z1: number,
      x2: number,
      y2: number,
      z2: number,
    ) => {
      points.push(x1, y1, z1, x2, y2, z2);
      progress.push(0, 1);
      const linePhase = Math.random();
      phase.push(linePhase, linePhase);
      const lineDirection = Math.random() < 0.5 ? 1 : -1;
      direction.push(lineDirection, lineDirection);
    };

    for (let c = 0; c < Z_COPIES; c++) {
      const z = Z_COPIES > 1 ? -(c * DEPTH) / (Z_COPIES - 1) : 0;

      for (let i = 0; i <= DIVISIONS_X; i++) {
        const x = -WIDTH / 2 + (i * WIDTH) / DIVISIONS_X;
        addLine(x, -HEIGHT / 2, z, x, HEIGHT / 2, z);
      }

      for (let j = 0; j <= DIVISIONS_Y; j++) {
        const y = -HEIGHT / 2 + (j * HEIGHT) / DIVISIONS_Y;
        addLine(-WIDTH / 2, y, z, WIDTH / 2, y, z);
      }
    }

    for (let i = 0; i <= DIVISIONS_X; i += DEPTH_STEP) {
      const x = -WIDTH / 2 + (i * WIDTH) / DIVISIONS_X;
      for (let j = 0; j <= DIVISIONS_Y; j += DEPTH_STEP) {
        const y = -HEIGHT / 2 + (j * HEIGHT) / DIVISIONS_Y;
        addLine(x, y, 0, x, y, -DEPTH);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    geometry.setAttribute(
      "aProgress",
      new THREE.Float32BufferAttribute(progress, 1),
    );
    geometry.setAttribute(
      "aPhase",
      new THREE.Float32BufferAttribute(phase, 1),
    );
    geometry.setAttribute(
      "aDirection",
      new THREE.Float32BufferAttribute(direction, 1),
    );
    return geometry;
  });

  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <>
      <lineSegments geometry={gridGeometry}>
        <shaderMaterial
          ref={materialRef}
          transparent
          uniforms={{
            uTime: { value: 0 },
            uBeamColor: { value: new THREE.Color("#8e8be8") },
          }}
          vertexShader={GridShaders.vertexShader}
          fragmentShader={GridShaders.fragmentShader}
        />
      </lineSegments>
      <DomMarkers />
      <CurrentMusicModel />
      <MusicShelf />
      <Gear />
    </>
  );
};

export default House;
