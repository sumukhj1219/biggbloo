"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { animate } from "motion/react";
import type { Work } from "@/lib/works";
import { placeOnFace } from "./MonolithTitle";

export const WORKBOARD = "Workboard-frame";
export const WORKBOARD_ARM = "work-holder-rock";

const OUT = new THREE.Vector3(1, 0, 0);
const HINGE = new THREE.Vector3(0, 0, 1);
const CLOSED = Math.PI;
const OPEN_SPRING = { type: "spring", bounce: 0.35, duration: 0.6 } as const;
const CLOSE_SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const;
const SCREEN_INSET = 0.12;
const SCREEN_LIFT = 0.005;

type Rig = {
  parts: { obj: THREE.Mesh; home: THREE.Vector3; homeQuat: THREE.Quaternion }[];
  faceX: number;
  pivot: THREE.Vector3;
};

const rigBoard = (scene: THREE.Object3D, monolith: THREE.Mesh): Rig | null => {
  const arm = scene.getObjectByName(WORKBOARD_ARM);
  const parts = [WORKBOARD, WORKBOARD_ARM]
    .map((name) => scene.getObjectByName(name))
    .filter((obj): obj is THREE.Mesh => obj instanceof THREE.Mesh)
    .map((obj) => ({ obj, home: obj.position.clone(), homeQuat: obj.quaternion.clone() }));
  if (!(arm instanceof THREE.Mesh) || parts.length === 0) return null;

  monolith.updateMatrix();
  const toMonolith = new THREE.Matrix4().copy(monolith.matrix).invert();
  const bounds = new THREE.Box3();
  parts.forEach(({ obj }) => {
    obj.updateMatrix();
    obj.geometry.computeBoundingBox();
    bounds.union(
      obj.geometry.boundingBox!.clone().applyMatrix4(obj.matrix).applyMatrix4(toMonolith),
    );
  });
  const faceX = Math.min(
    ...[bounds.min.y, bounds.max.y].map((y) => placeOnFace(monolith, y, OUT).position.x),
  );
  const armCenter = arm.geometry
    .boundingBox!.clone()
    .applyMatrix4(arm.matrix)
    .getCenter(new THREE.Vector3());
  const pivot = new THREE.Vector3(faceX, 0, 0).applyMatrix4(monolith.matrix);
  pivot.set(pivot.x, armCenter.y, armCenter.z);
  return { parts, faceX, pivot };
};

const SWING = new THREE.Quaternion();

const placeBoard = ({ parts, pivot }: Rig, angle: number) => {
  SWING.setFromAxisAngle(HINGE, angle);
  parts.forEach(({ obj, home, homeQuat }) => {
    obj.position.copy(home).sub(pivot).applyQuaternion(SWING).add(pivot);
    obj.quaternion.copy(SWING).multiply(homeQuat);
    obj.visible = angle < CLOSED - 0.01;
  });
};

const createVideo = () => {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { video, texture };
};

const refreshVideo = ({ video, texture }: ReturnType<typeof createVideo>, screenAspect: number) => {
  if (video.readyState < video.HAVE_CURRENT_DATA) return;
  texture.needsUpdate = true;
  const fit = video.videoWidth / video.videoHeight / screenAspect;
  if (fit > 1) texture.repeat.set(1 / fit, 1);
  else texture.repeat.set(1, fit);
  texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
};

const loadVideo = (video: HTMLVideoElement, src: string) => {
  video.src = src;
};

const unloadVideo = (video: HTMLVideoElement) => {
  video.pause();
  video.removeAttribute("src");
  video.load();
};

const useVideoTexture = (src: string) => {
  const clip = useMemo(() => createVideo(), []);
  useEffect(() => {
    loadVideo(clip.video, src);
    return () => unloadVideo(clip.video);
  }, [clip, src]);
  useEffect(() => () => clip.texture.dispose(), [clip]);
  return clip;
};

type WorkBoardProps = {
  scene: THREE.Object3D;
  monolith: THREE.Mesh;
  open: boolean;
  work: Work;
};

const WorkBoard = ({ scene, monolith, open, work }: WorkBoardProps) => {
  const rig = useMemo(() => rigBoard(scene, monolith), [scene, monolith]);
  const board = rig?.parts.find(({ obj }) => obj.name === WORKBOARD)?.obj;
  const clip = useVideoTexture(work.video);
  const { video, texture } = clip;
  const angle = useRef(CLOSED);
  const plane = useMemo(() => new THREE.Plane(), []);
  const screen = useRef<THREE.Mesh>(null);
  const face = useMemo(() => {
    if (!board) return null;
    board.geometry.computeBoundingBox();
    const box = board.geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return {
      position: new THREE.Vector3(center.x, box.max.y + SCREEN_LIFT, center.z),
      width: size.x - SCREEN_INSET * 2,
      height: size.z - SCREEN_INSET * 2,
    };
  }, [board]);

  useLayoutEffect(() => {
    if (!rig) return;
    placeBoard(rig, angle.current);
    return () => placeBoard(rig, 0);
  }, [rig]);

  useEffect(() => {
    if (!rig) return;
    const controls = animate(angle.current, open ? 0 : CLOSED, {
      ...(open ? OPEN_SPRING : CLOSE_SPRING),
      onUpdate: (a) => {
        angle.current = a;
        placeBoard(rig, a);
      },
    });
    return () => controls.stop();
  }, [open, rig]);

  useEffect(() => {
    if (!open) return;
    video.play().catch(() => undefined);
    return () => video.pause();
  }, [open, video, work.video]);

  useFrame(() => {
    if (face) refreshVideo(clip, face.width / face.height);
    if (!rig) return;
    const swinging = Math.abs(angle.current) > 1e-3;
    const point = monolith.localToWorld(OUT.clone().multiplyScalar(rig.faceX));
    const normal = OUT.clone().transformDirection(monolith.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, point);
    const meshes = [...rig.parts.map(({ obj }) => obj), screen.current];
    meshes.forEach((mesh) => {
      if (!mesh) return;
      const material = mesh.material as THREE.Material;
      const planes = swinging ? [plane] : null;
      if (material.clippingPlanes?.[0] !== planes?.[0]) {
        material.clippingPlanes = planes;
        material.needsUpdate = true;
      }
    });
  });

  if (!board || !face) return null;

  return createPortal(
    <mesh
      ref={screen}
      position={face.position}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={{ keepMaterial: true }}
    >
      <planeGeometry args={[face.width, face.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>,
    board,
  );
};

export default WorkBoard;
