"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { NO_CAVITY_LAYER } from "./CavityEffect";

// GLTFLoader strips dots from node names, so "Frame.001" in Blender loads as "Frame001".
export const CLOCK_FACE = "Frame001";
const FACE = CLOCK_FACE;
const HUB = "Gear001";
const HOLDER = "holder-rock";
const HANDS = ["Hour", "Minute", "Seconds"] as const;
type Hand = (typeof HANDS)[number];

export const CLOCK_PARTS: Record<string, [color: string, noise: string]> = {
  [HUB]: ["#d9a84e", "#c99a43"],
  Hour: ["#3b2a20", "#33241b"],
  Minute: ["#3b2a20", "#33241b"],
  Seconds: ["#c0392b", "#a93226"],
};

// Ransom-note cutouts for 1–12, laid around the dial at their hour positions.
const NUMBER_URLS = Array.from({ length: 12 }, (_, i) => `/ransome/${i + 1}.png`);
const NUMBER_RADIUS = 0.6;
const NUMBER_HEIGHT = 0.19;
const NUMBER_LIFT = 0.003;
// Slight, fixed tilts so the cutouts look hand-glued rather than typeset.
const NUMBER_TILTS = [-6, 4, -3, 7, -5, 3, -8, 5, -2, 6, -4, 2];

// Shrinks the whole clock about its hub, relative to the size modelled in Blender.
const CLOCK_SCALE = 0.8;

// The scene's shadow map is too coarse for the hairline gap between hands and dial, so the
// hands and numbers get soft drop shadows painted onto the face instead.
const SHADOW_OFFSET = 0.05;
const SHADOW_OPACITY = 0.5;
const SHADOW_COLOR = "#2a1a10";
const SHADOW_LIFT = 0.001;

const UP = new THREE.Vector3(0, 1, 0);
const TURN = Math.PI * 2;

type Pivot = {
  pivot: THREE.Object3D;
  shadow: THREE.Object3D;
  base: THREE.Quaternion;
  offset: number;
};
type Rig = {
  hands: Record<Hand, Pivot>;
  // Spans the face plane: local Y is the face normal, `noon` points at 12, `surface` is the
  // face's height along the normal.
  dial: THREE.Object3D;
  noon: THREE.Vector3;
  surface: number;
  // Where shadows fall on the dial: down and to the right of what casts them.
  shadowShift: THREE.Vector3;
};

const signedAngle = (from: THREE.Vector3, to: THREE.Vector3, axis: THREE.Vector3) =>
  Math.atan2(axis.dot(from.clone().cross(to)), from.dot(to));

// Hangs each hand off a pivot at the hub, spinning about the face normal, and parents the
// whole clock to the top holder rock so it rides along with the monolith's build and spin.
// The scene is cached by useGLTF, so this only rigs once and reuses the result after that.
export const rigClock = (scene: THREE.Object3D): Rig | null => {
  const face = scene.getObjectByName(FACE);
  const hub = scene.getObjectByName(HUB);
  const holder = scene.getObjectByName(HOLDER);
  if (!(face instanceof THREE.Mesh) || !hub || !holder) return null;
  if (holder.userData.clockRig) return holder.userData.clockRig as Rig;

  scene.updateMatrixWorld(true);
  const center = hub.getWorldPosition(new THREE.Vector3());
  const normal = UP.clone().applyQuaternion(face.getWorldQuaternion(new THREE.Quaternion()));
  // Point the normal out of the clock face, away from the monolith it hangs on.
  const monolith = scene.getObjectByName("Monolith");
  if (monolith) {
    const out = center.clone().sub(monolith.getWorldPosition(new THREE.Vector3())).setY(0);
    if (normal.dot(out) < 0) normal.negate();
  }
  const noon = UP.clone().projectOnPlane(normal).normalize();
  const baseWorld = new THREE.Quaternion().setFromUnitVectors(UP, normal);

  const pivotAtHub = () => {
    const pivot = new THREE.Group();
    pivot.position.copy(center);
    pivot.quaternion.copy(baseWorld);
    scene.add(pivot);
    pivot.updateMatrixWorld(true);
    return pivot;
  };

  // The face is a thin slab; its outer side is whichever bounding-box side sits further out.
  face.geometry.computeBoundingBox();
  const { min, max } = face.geometry.boundingBox!;
  const surface = Math.max(
    ...[min.y, max.y].map((y) =>
      face.localToWorld(new THREE.Vector3(0, y, 0)).sub(center).dot(normal),
    ),
  );
  const right = noon.clone().cross(normal);
  const shadowWorld = right.sub(noon).normalize().multiplyScalar(SHADOW_OFFSET);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: SHADOW_COLOR,
    transparent: true,
    opacity: SHADOW_OPACITY,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });

  // Everything hangs off one group at the hub, so the clock can be scaled as a unit.
  const clock = pivotAtHub();

  const hands = Object.fromEntries(
    HANDS.map((name) => {
      const hand = scene.getObjectByName(name);
      const pivot = pivotAtHub();
      // A twin pivot, shifted along the dial, carries a copy of the hand squashed flat onto
      // the face; turning both pivots together keeps the shadow in step with the hand.
      const shadow = pivotAtHub();
      shadow.position.add(shadowWorld);
      const flat = new THREE.Group();
      flat.position.y = surface + SHADOW_LIFT;
      flat.scale.y = 1e-3;
      shadow.add(flat);
      let offset = 0;
      if (hand instanceof THREE.Mesh) {
        hand.geometry.computeBoundingBox();
        const tip = hand.geometry.boundingBox!.getCenter(new THREE.Vector3());
        hand.localToWorld(tip);
        offset = signedAngle(noon, tip.sub(center).projectOnPlane(normal), normal);
        pivot.attach(hand);
        const copy = new THREE.Mesh(hand.geometry, shadowMaterial);
        copy.position.copy(hand.position);
        copy.quaternion.copy(hand.quaternion);
        copy.scale.copy(hand.scale);
        copy.userData.keepMaterial = true;
        copy.layers.set(NO_CAVITY_LAYER);
        flat.add(copy);
      }
      clock.attach(pivot);
      clock.attach(shadow);
      const entry: Pivot = { pivot, shadow, base: pivot.quaternion.clone(), offset };
      return [name, entry];
    }),
  ) as Record<Hand, Pivot>;

  const dial = pivotAtHub();
  const rig: Rig = {
    hands,
    dial,
    noon: noon.clone().applyQuaternion(baseWorld.clone().invert()),
    surface,
    shadowShift: shadowWorld.clone().applyQuaternion(baseWorld.clone().invert()),
  };
  clock.attach(dial);
  clock.attach(face);
  clock.attach(hub);
  holder.attach(clock);
  clock.scale.setScalar(CLOCK_SCALE);
  holder.userData.clockRig = rig;
  return rig;
};

const SPIN = new THREE.Quaternion();

const ClockNumbers = ({ rig }: { rig: Rig }) => {
  const textures = useTexture(NUMBER_URLS, (loaded) => {
    (Array.isArray(loaded) ? loaded : [loaded]).forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
  });
  const placements = useMemo(
    () =>
      NUMBER_URLS.map((_, i) => {
        const hour = i + 1;
        const up = rig.noon.clone().applyAxisAngle(UP, (-hour / 12) * TURN);
        const position = up
          .clone()
          .multiplyScalar(NUMBER_RADIUS)
          .addScaledVector(UP, rig.surface + NUMBER_LIFT);
        // Upright cutouts: the image's up follows the dial's 12 o'clock, facing out along the normal.
        const right = rig.noon.clone().cross(UP);
        const quaternion = new THREE.Quaternion()
          .setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, rig.noon, UP))
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              THREE.MathUtils.degToRad(NUMBER_TILTS[i]),
            ),
          );
        const shadowPosition = position
          .clone()
          .add(rig.shadowShift)
          .setY(rig.surface + SHADOW_LIFT);
        return { position, quaternion, shadowPosition };
      }),
    [rig],
  );

  return createPortal(
    <>
      {placements.map(({ position, quaternion, shadowPosition }, i) => {
        const image = textures[i].image as { width: number; height: number };
        const width = NUMBER_HEIGHT * (image.width / image.height);
        return (
          <group key={NUMBER_URLS[i]}>
            <mesh
              position={shadowPosition}
              quaternion={quaternion}
              userData={{ keepMaterial: true }}
              onUpdate={(self) => self.layers.set(NO_CAVITY_LAYER)}
            >
              <planeGeometry args={[width, NUMBER_HEIGHT]} />
              <meshBasicMaterial
                color={SHADOW_COLOR}
                alphaMap={textures[i]}
                transparent
                opacity={SHADOW_OPACITY}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-4}
              />
            </mesh>
            <mesh
              position={position}
              quaternion={quaternion}
              receiveShadow
              userData={{ keepMaterial: true }}
              onUpdate={(self) => self.layers.set(NO_CAVITY_LAYER)}
            >
              <planeGeometry args={[width, NUMBER_HEIGHT]} />
              <meshLambertMaterial map={textures[i]} transparent alphaTest={0.05} />
            </mesh>
          </group>
        );
      })}
    </>,
    rig.dial,
  );
};

const Clock = ({ scene }: { scene: THREE.Object3D }) => {
  const rig = useMemo(() => rigClock(scene), [scene]);

  useFrame(() => {
    if (!rig) return;
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    // Seconds tick; minute and hour hands sweep. Clockwise seen from the front is a negative turn.
    const turns: Record<Hand, number> = {
      Hour: hours / 12,
      Minute: minutes / 60,
      Seconds: seconds / 60,
    };
    HANDS.forEach((name) => {
      const { pivot, shadow, base, offset } = rig.hands[name];
      SPIN.setFromAxisAngle(UP, -turns[name] * TURN - offset);
      pivot.quaternion.copy(base).multiply(SPIN);
      shadow.quaternion.copy(pivot.quaternion);
    });
  });

  return rig && <ClockNumbers rig={rig} />;
};

useTexture.preload(NUMBER_URLS);

export default Clock;
