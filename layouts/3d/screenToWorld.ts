import * as THREE from "three";
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Casts a ray from the camera through a screen position (fx, fy as 0→1
 * fractions) and finds where it crosses the z: targetZ plane — the real,
 * camera-accurate way to turn a screen position into a world position,
 * instead of guessing at a scale factor.
 */
export function screenPointToWorld(
  fx: number,
  fy: number,
  camera: THREE.Camera,
  targetZ: number,
): THREE.Vector3 {
  const ndcX = fx * 2 - 1;
  const ndcY = -(fy * 2 - 1);
  const near = new THREE.Vector3(ndcX, ndcY, -1).unproject(camera);
  const far = new THREE.Vector3(ndcX, ndcY, 1).unproject(camera);
  const direction = far.clone().sub(near);
  const t = (targetZ - near.z) / direction.z;
  return near.clone().add(direction.multiplyScalar(t));
}

/**
 * Projects a DOMRect's center and edges through the camera to get its real
 * world-space position, width and height at z: targetZ — both position AND
 * size come from the camera's actual projection, not a guessed scale
 * factor (a fixed pixels-per-world-unit ratio isn't accurate for a
 * perspective camera).
 */
export function rectToWorldBounds(
  rect: DOMRect,
  camera: THREE.Camera,
  targetZ: number,
): { position: THREE.Vector3; width: number; height: number } {
  const fxCenter = (rect.x + rect.width / 2) / window.innerWidth;
  const fyCenter = (rect.y + rect.height / 2) / window.innerHeight;
  const fxLeft = rect.x / window.innerWidth;
  const fxRight = (rect.x + rect.width) / window.innerWidth;
  const fyTop = rect.y / window.innerHeight;
  const fyBottom = (rect.y + rect.height) / window.innerHeight;

  const position = screenPointToWorld(fxCenter, fyCenter, camera, targetZ);
  const left = screenPointToWorld(fxLeft, fyCenter, camera, targetZ);
  const right = screenPointToWorld(fxRight, fyCenter, camera, targetZ);
  const top = screenPointToWorld(fxCenter, fyTop, camera, targetZ);
  const bottom = screenPointToWorld(fxCenter, fyBottom, camera, targetZ);

  return {
    position,
    width: right.x - left.x,
    height: top.y - bottom.y,
  };
}

/**
 * A camera snapshot frozen at first render, captured before OrbitControls
 * could have moved it via user input. DOM→world conversions (position,
 * not live per-frame rendering) should use this instead of the live
 * camera: OrbitControls mutates the real camera object in place, so any
 * component that only re-renders occasionally (e.g. when a measured DOM
 * rect changes) would otherwise bake in whatever orbit angle happened to
 * be active at that particular re-render, permanently skewing an
 * otherwise-fixed world position.
 */
export function useFrozenCamera(): THREE.Camera {
  // Deliberately captured once on mount, not kept in sync with the live
  // (orbiting) camera.
  const { camera } = useThree();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => camera.clone(), []);
}
