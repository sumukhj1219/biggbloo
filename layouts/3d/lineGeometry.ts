import * as THREE from "three";

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function createGridGeometry(
  width: number,
  height: number,
  divisionsX: number,
  divisionsY: number,
): THREE.BufferGeometry {
  const points: number[] = [];
  const progress: number[] = [];
  const phase: number[] = [];
  const direction: number[] = [];
  let seed = 0;

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
    const linePhase = pseudoRandom(seed);
    const lineDirection = pseudoRandom(seed + 1000) < 0.5 ? 1 : -1;
    seed += 1;
    phase.push(linePhase, linePhase);
    direction.push(lineDirection, lineDirection);
  };

  for (let i = 0; i <= divisionsX; i++) {
    const x = -width / 2 + (i * width) / divisionsX;
    addLine(x, -height / 2, 0, x, height / 2, 0);
  }

  for (let j = 0; j <= divisionsY; j++) {
    const y = -height / 2 + (j * height) / divisionsY;
    addLine(-width / 2, y, 0, width / 2, y, 0);
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
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
  geometry.setAttribute(
    "aDirection",
    new THREE.Float32BufferAttribute(direction, 1),
  );
  return geometry;
}
