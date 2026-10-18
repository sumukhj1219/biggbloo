"use client";

import { Fragment, useMemo } from "react";
import * as THREE from "three";
import { createPortal } from "@react-three/fiber";
import { Decal, useTexture } from "@react-three/drei";
import { NO_CAVITY_LAYER } from "./CavityEffect";

export const DECAL_NAME = "Decal";

const DECAL_URLS = ["/decals/threejs-1.svg"];
const DECAL_FILL = 0.65;
const MIN_FACING = 0.4;
const MAX_SLOPE = 0.6;
const MIN_SCORE = 0.2;
const EXCLUDED = ["Landscape", "Grass", DECAL_NAME];

type Placement = {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  size: number;
};

const isUniform = (s: THREE.Vector3) =>
  Math.abs(s.x - s.y) < 1e-3 && Math.abs(s.y - s.z) < 1e-3;

type Face = { normal: THREE.Vector3; area: number; centroid: THREE.Vector3 };

const visibleFaces = (
  mesh: THREE.Mesh,
  camera: THREE.Vector3,
  accept: (face: Face) => boolean,
) => {
  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  const count = index ? index.count : position.count;
  const vertex = (i: number) =>
    new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i);

  const faces: Face[] = [];
  for (let i = 0; i < count; i += 3) {
    const a = vertex(i);
    const b = vertex(i + 1);
    const c = vertex(i + 2);
    const cross = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const area = cross.length() / 2;
    if (area < 1e-6) continue;
    const normal = cross.normalize();
    const centroid = a.add(b).add(c).divideScalar(3);
    const face = faces.find((f) => f.normal.dot(normal) > 0.995);
    if (face) {
      face.centroid.multiplyScalar(face.area).addScaledVector(centroid, area);
      face.area += area;
      face.centroid.divideScalar(face.area);
    } else {
      faces.push({ normal, area, centroid });
    }
  }

  const toLocal = mesh.matrix.clone().invert();
  const cameraLocal = camera.clone().applyMatrix4(toLocal);
  return faces.flatMap((face) => {
    const facing = face.normal.dot(cameraLocal.clone().sub(face.centroid).normalize());
    if (facing < MIN_FACING || !accept(face)) return [];
    return [{ ...face, score: face.area * facing }];
  });
};

const findPlacements = (root: THREE.Object3D, count: number) => {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const camera = center.clone().add(new THREE.Vector3(0, 0, radius * 3));
  const cameraWorld = root.localToWorld(camera.clone());

  const occluders: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !EXCLUDED.includes(obj.name)) occluders.push(obj);
  });
  const raycaster = new THREE.Raycaster();
  const unblocked = (mesh: THREE.Mesh, point: THREE.Vector3) => {
    const target = mesh.localToWorld(point.clone());
    const dir = target.clone().sub(cameraWorld);
    const distance = dir.length();
    raycaster.set(cameraWorld, dir.normalize());
    const [hit] = raycaster.intersectObjects(occluders, false);
    return hit?.object === mesh && Math.abs(hit.distance - distance) < radius * 0.02;
  };

  const candidates: (Placement & { score: number })[] = [];
  root.children.forEach((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.name.startsWith("small-rock")) return;
    if (!isUniform(obj.scale)) return;
    const toRoot = obj.quaternion;
    const faces = visibleFaces(
      obj,
      camera,
      (f) =>
        Math.abs(f.normal.clone().applyQuaternion(toRoot).y) < MAX_SLOPE &&
        unblocked(obj, f.centroid),
    );
    faces.forEach((face) => {
      const orient = new THREE.Object3D();
      orient.up.set(0, 1, 0).applyQuaternion(obj.quaternion.clone().invert());
      orient.position.copy(face.centroid);
      orient.lookAt(face.centroid.clone().add(face.normal));
      orient.rotateZ(Math.PI);
      orient.rotateY(Math.PI);

      candidates.push({
        mesh: obj,
        position: face.centroid,
        rotation: orient.rotation.clone(),
        size: Math.sqrt(face.area) * DECAL_FILL,
        score: face.score,
      });
    });
  });
  const ranked = candidates
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
  const rank = new Map<THREE.Mesh, number>();
  const spread = ranked
    .map((c) => {
      const n = rank.get(c.mesh) ?? 0;
      rank.set(c.mesh, n + 1);
      return { c, n };
    })
    .sort((a, b) => a.n - b.n || b.c.score - a.c.score)
    .map(({ c }) => c);
  return spread.slice(0, count);
};

const RockDecals = ({ root }: { root: THREE.Object3D }) => {
  const textures = useTexture(DECAL_URLS, (loaded) => {
    (Array.isArray(loaded) ? loaded : [loaded]).forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
  });
  const placements = useMemo(() => findPlacements(root, DECAL_URLS.length), [root]);

  return placements.map(({ mesh, position, rotation, size }, i) => {
    const map = textures[i];
    const image = map.image as { width: number; height: number };
    const aspect = image.width / image.height;
    const scale: [number, number, number] = [
      size * Math.min(1, aspect),
      size * Math.min(1, 1 / aspect),
      size,
    ];
    return (
      <Fragment key={`${mesh.uuid}-${i}`}>
        {createPortal(
          <Decal
            name={DECAL_NAME}
            position={position}
            rotation={rotation}
            scale={scale}
            receiveShadow
            onUpdate={(self: THREE.Object3D) => self.layers.set(NO_CAVITY_LAYER)}
          >
            <meshLambertMaterial
              map={map}
              transparent
              depthTest
              polygonOffset
              polygonOffsetFactor={-10}
            />
          </Decal>,
          mesh,
        )}
      </Fragment>
    );
  });
};

useTexture.preload(DECAL_URLS);

export default RockDecals;
