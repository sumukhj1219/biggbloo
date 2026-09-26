import * as THREE from "three";
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";

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

export function useFrozenCamera(): THREE.Camera {
  const { camera } = useThree();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => camera.clone(), []);
}
