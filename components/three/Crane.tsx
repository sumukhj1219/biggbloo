"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { CRANE, CRANE_GROUP } from "./siteProps";

const STEEL = "#f2b51f";
const ROPE = "#2a2420";
const POST_RADIUS = 0.045;
const BRACE_RADIUS = 0.022;
const ROPE_RADIUS = 0.03;
const PANEL_HEIGHT = 0.9;

const WAIT_SECONDS = 1.6;
const TRAVEL_SECONDS = 4;
const CYCLE_SECONDS = 2 * (WAIT_SECONDS + TRAVEL_SECONDS);
const TOP_GAP = 1.2;
const ARRIVE_SECONDS = 1.1;
const arriveEase = (x: number) => 1 - (1 - x) ** 4;
const WORM_RATIO = 4;

const UP = new THREE.Vector3(0, 1, 0);

type Member = [THREE.Vector3, THREE.Vector3, number];

const latticeMembers = (half: THREE.Vector3): Member[] => {
  const panels = Math.max(1, Math.round((half.z * 2) / PANEL_HEIGHT));
  const corners = [
    [-half.x, -half.y],
    [half.x, -half.y],
    [half.x, half.y],
    [-half.x, half.y],
  ];
  const at = ([x, y]: number[], level: number) =>
    new THREE.Vector3(x, y, -half.z + (level / panels) * half.z * 2);
  const members: Member[] = corners.map((c) => [at(c, 0), at(c, panels), POST_RADIUS]);
  for (let level = 0; level <= panels; level++) {
    corners.forEach((c, i) =>
      members.push([at(c, level), at(corners[(i + 1) % 4], level), BRACE_RADIUS]),
    );
  }
  for (let level = 0; level < panels; level++) {
    corners.forEach((c, i) => {
      const next = corners[(i + 1) % 4];
      const [from, to] = level % 2 === 0 ? [c, next] : [next, c];
      members.push([at(from, level), at(to, level + 1), BRACE_RADIUS]);
    });
  }
  return members;
};

const placeMember = (matrix: THREE.Matrix4, [a, b, radius]: Member) => {
  const dir = b.clone().sub(a);
  matrix.compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
    new THREE.Vector3(radius, dir.length(), radius),
  );
  return matrix;
};

const liftAt = (seconds: number) => {
  const t = seconds % CYCLE_SECONDS;
  const ease = (x: number) => x * x * (3 - 2 * x);
  if (t < WAIT_SECONDS) return 0;
  if (t < WAIT_SECONDS + TRAVEL_SECONDS) return ease((t - WAIT_SECONDS) / TRAVEL_SECONDS);
  if (t < 2 * WAIT_SECONDS + TRAVEL_SECONDS) return 1;
  return 1 - ease((t - 2 * WAIT_SECONDS - TRAVEL_SECONDS) / TRAVEL_SECONDS);
};

const rigCrane = (scene: THREE.Object3D) => {
  const group = scene.getObjectByName(CRANE_GROUP);
  const get = (name: string) => group?.getObjectByName(name);
  const tower = get(CRANE.tower);
  const drum = get(CRANE.drum);
  const carrier = get(CRANE.carrier);
  if (!group || !(tower instanceof THREE.Mesh) || !(drum instanceof THREE.Mesh) || !carrier) {
    return null;
  }
  tower.geometry.computeBoundingBox();
  const half = tower.geometry.boundingBox!.getSize(new THREE.Vector3()).multiplyScalar(0.5);

  drum.geometry.computeBoundingBox();
  const drumBox = drum.geometry.boundingBox!;
  const drumRadius = (drumBox.max.x - drumBox.min.x) / 2;
  carrier.updateMatrix();
  const carrierGeometry = carrier instanceof THREE.Mesh ? carrier.geometry : null;
  carrierGeometry?.computeBoundingBox();
  const carrierTop = carrierGeometry
    ? carrierGeometry.boundingBox!.clone().applyMatrix4(carrier.matrix).max.y - carrier.position.y
    : 0;
  const homeY = carrier.position.y;
  const ropeTop = drum.position.y;
  const sink = homeY + carrierTop + group.position.y + 0.05;

  const spinners = [
    { obj: drum, ratio: 1 },
    { obj: get(CRANE.gear), ratio: 1 },
    { obj: get(CRANE.worm), ratio: WORM_RATIO },
  ]
    .filter((s): s is { obj: THREE.Object3D; ratio: number } => s.obj !== undefined)
    .map((s) => ({ ...s, home: s.obj.quaternion.clone() }));

  return {
    group,
    tower,
    half,
    carrier,
    homeY,
    carrierTop,
    sink,
    rise: Math.max(0, ropeTop - drumRadius - TOP_GAP - (homeY + carrierTop)),
    ropeTop,
    ropeTopPoint: new THREE.Vector3(drum.position.x - drumRadius, ropeTop, carrier.position.z),
    ropeX: carrier.position.x,
    ropeZ: carrier.position.z,
    drumRadius,
    spinners,
    clipped: false,
  };
};

type Rig = NonNullable<ReturnType<typeof rigCrane>>;

const SPIN = new THREE.Quaternion();

const winch = (rig: Rig, lifted: number, rope: THREE.Object3D | null) => {
  rig.carrier.position.y = rig.homeY + lifted;
  const angle = -lifted / rig.drumRadius;
  rig.spinners.forEach(({ obj, home, ratio }) => {
    SPIN.setFromAxisAngle(UP, angle * ratio);
    obj.quaternion.copy(home).multiply(SPIN);
  });
  if (rope) hangRope(rig, rope);
};

const hangRope = (rig: Rig, rope: THREE.Object3D) => {
  const hook = new THREE.Vector3(rig.ropeX, rig.carrier.position.y + rig.carrierTop, rig.ropeZ);
  placeMember(rope.matrix, [hook, rig.ropeTopPoint, ROPE_RADIUS]).decompose(
    rope.position,
    rope.quaternion,
    rope.scale,
  );
};

const GROUND = new THREE.Plane();
const ORIGIN = new THREE.Vector3();

const stepCarrier = (rig: Rig, since: number, appearAt: number, rope: THREE.Object3D | null) => {
  const arrived = since - appearAt;
  const carrier = rig.carrier;
  const material = carrier instanceof THREE.Mesh ? (carrier.material as THREE.Material) : null;
  carrier.visible = arrived >= 0;
  if (rope) rope.visible = arrived >= 0;
  if (arrived < 0) return;
  if (arrived < ARRIVE_SECONDS) {
    carrier.position.y = rig.homeY - rig.sink * (1 - arriveEase(arrived / ARRIVE_SECONDS));
    if (material) {
      const groundY = rig.group.parent?.localToWorld(ORIGIN.set(0, 0, 0)).y ?? 0;
      GROUND.set(UP, -groundY);
      material.clippingPlanes = [GROUND];
      rig.clipped = true;
    }
    if (rope) hangRope(rig, rope);
    return;
  }
  if (rig.clipped && material) material.clippingPlanes = null;
  rig.clipped = false;
  winch(rig, liftAt(arrived - ARRIVE_SECONDS) * rig.rise, rope);
};

const resetCarrier = (rig: Rig) => {
  rig.carrier.visible = true;
  if (rig.clipped && rig.carrier instanceof THREE.Mesh) {
    (rig.carrier.material as THREE.Material).clippingPlanes = null;
  }
  rig.clipped = false;
  winch(rig, 0, null);
};

const showTower = (rig: Rig, solid: boolean) => {
  rig.tower.visible = solid;
};

const fillLattice = (mesh: THREE.InstancedMesh, members: Member[]) => {
  const matrix = new THREE.Matrix4();
  members.forEach((m, i) => mesh.setMatrixAt(i, placeMember(matrix, m)));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
};

const Crane = ({ scene, appearAt }: { scene: THREE.Object3D; appearAt: number }) => {
  const rig = useMemo(() => rigCrane(scene), [scene]);

  const members = useMemo(() => (rig ? latticeMembers(rig.half) : []), [rig]);
  const lattice = useRef<THREE.InstancedMesh>(null);
  const rope = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    if (!rig) return;
    showTower(rig, false);
    if (lattice.current) fillLattice(lattice.current, members);
    return () => {
      showTower(rig, true);
      resetCarrier(rig);
    };
  }, [rig, members]);

  const openedAt = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!rig) return;
    openedAt.current ??= clock.elapsedTime;
    stepCarrier(rig, clock.elapsedTime - openedAt.current, appearAt, rope.current);
  });

  if (!rig) return null;

  return createPortal(
    <>
      <instancedMesh
        ref={lattice}
        args={[undefined, undefined, members.length]}
        position={rig.tower.position}
        quaternion={rig.tower.quaternion}
        castShadow
        receiveShadow
        userData={{ keepMaterial: true }}
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshLambertMaterial color={STEEL} flatShading />
      </instancedMesh>
      <mesh ref={rope} castShadow userData={{ keepMaterial: true }}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshLambertMaterial color={ROPE} />
      </mesh>
    </>,
    rig.group,
  );
};

export default Crane;
