"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { isBamboo, SCAFFOLD_GROUP } from "./siteProps";

const CLOTH = "#2f6fce";
const MUD = "92, 72, 48";
const GRIME = "35, 38, 44";
const FADED = "150, 185, 225";
const DROP = 4.8;
const GROUND_CLEARANCE = 0.4;
const BAY_REACH = 0.5;
const SWAY = 0.12;
const SWAY_SPEED = 1.4;
const SEGMENTS_X = 16;
const SEGMENTS_Y = 10;

const FRAY = { min: 0.05, max: 0.32, step: [0.07, 0.22] };
const RIP = { chance: 0.14, depth: [0.6, 1.4], width: [0.12, 0.3] };
const TEAR_TEXELS = 512;

const UP = new THREE.Vector3(0, 1, 0);

type Pole = { obj: THREE.Mesh; a: THREE.Vector3; b: THREE.Vector3; radius: number };

const toPole = (obj: THREE.Mesh): Pole => {
  obj.updateMatrix();
  obj.geometry.computeBoundingBox();
  const { min, max } = obj.geometry.boundingBox!;
  return {
    obj,
    a: new THREE.Vector3(0, min.y, 0).applyMatrix4(obj.matrix),
    b: new THREE.Vector3(0, max.y, 0).applyMatrix4(obj.matrix),
    radius: max.x,
  };
};

const flat = (v: THREE.Vector3) => new THREE.Vector2(v.x, v.z);

type Panel = { topLeft: THREE.Vector3; topRight: THREE.Vector3; height: number };

const findPanels = (poles: Pole[], groundY: number): Panel[] => {
  const isUpright = (p: Pole) => Math.abs(p.b.clone().sub(p.a).normalize().dot(UP)) > 0.9;
  const uprights = poles.filter(isUpright);
  return poles
    .filter((p) => !isUpright(p))
    .flatMap((bar) => {
      const from = flat(bar.a);
      const along = flat(bar.b).sub(from);
      const length = along.length();
      along.normalize();
      const stops = uprights
        .map((post) => {
          const offset = flat(post.a).sub(from);
          const t = offset.dot(along);
          const off = Math.abs(offset.cross(along));
          return { t, off };
        })
        .filter(({ t, off }) => off < BAY_REACH && t > -BAY_REACH && t < length + BAY_REACH)
        .map(({ t }) => t)
        .sort((x, y) => x - y);
      if (stops.length < 2) return [];
      const at = (t: number) => bar.a.clone().lerp(bar.b, t / length);
      const topLeft = at(stops[0]);
      const topRight = at(stops[stops.length - 1]);
      const top = (topLeft.y + topRight.y) / 2 - bar.radius;
      topLeft.y = top;
      topRight.y = top;
      const height = Math.min(DROP, top - groundY - GROUND_CLEARANCE);
      return height > 0 ? [{ topLeft, topRight, height }] : [];
    });
};

const clothGeometry = () => {
  const geometry = new THREE.PlaneGeometry(1, 1, SEGMENTS_X, SEGMENTS_Y);
  const uv = geometry.attributes.uv;
  const sheet = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) {
    sheet[i * 2] = uv.getX(i);
    sheet[i * 2 + 1] = 1 - uv.getY(i);
  }
  geometry.setAttribute("sheet", new THREE.BufferAttribute(sheet, 2));
  return geometry;
};

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const tearMask = (panel: Panel, seed: number) => {
  const random = seeded(seed);
  const between = ([lo, hi]: number[]) => lo + random() * (hi - lo);
  const width = panel.topLeft.distanceTo(panel.topRight);
  const canvas = document.createElement("canvas");
  canvas.width = TEAR_TEXELS;
  canvas.height = Math.max(64, Math.round((TEAR_TEXELS * panel.height) / width));
  const toX = (x: number) => (x / width) * canvas.width;
  const toY = (depth: number) => canvas.height * (1 - depth / panel.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  let x = 0;
  let fray = between([FRAY.min, FRAY.max]);
  while (x < width) {
    ctx.lineTo(toX(x), toY(fray));
    if (random() < RIP.chance && x > 0.3 && x < width - 0.3) {
      const half = between(RIP.width) / 2;
      ctx.lineTo(toX(x + half), toY(between(RIP.depth)));
      x += half * 2;
      ctx.lineTo(toX(x), toY(fray));
    }
    x += between(FRAY.step);
    fray = Math.min(FRAY.max, Math.max(FRAY.min, fray + (random() - 0.5) * 0.18));
  }
  ctx.lineTo(canvas.width, toY(fray));
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
};

const dirtMap = (panel: Panel, seed: number) => {
  const random = seeded(seed * 7919);
  const width = panel.topLeft.distanceTo(panel.topRight);
  const canvas = document.createElement("canvas");
  canvas.width = TEAR_TEXELS;
  canvas.height = Math.max(64, Math.round((TEAR_TEXELS * panel.height) / width));
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = CLOTH;
  ctx.fillRect(0, 0, w, h);

  const blot = (x: number, y: number, r: number, rgb: string, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  for (let i = 0; i < 4; i++) {
    blot(random() * w, random() * h * 0.7, (0.2 + random() * 0.25) * w, FADED, 0.18);
  }

  const mud = ctx.createLinearGradient(0, h * 0.55, 0, h);
  mud.addColorStop(0, `rgba(${MUD}, 0)`);
  mud.addColorStop(1, `rgba(${MUD}, 0.55)`);
  ctx.fillStyle = mud;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const y = h * (1 - random() ** 2 * 0.55);
    blot(random() * w, y, (0.02 + random() * 0.08) * w, MUD, 0.2 + random() * 0.3);
  }

  ctx.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const x = random() * w;
    const length = h * (0.15 + random() * 0.55);
    const streak = ctx.createLinearGradient(0, 0, 0, length);
    streak.addColorStop(0, `rgba(${GRIME}, ${0.18 + random() * 0.2})`);
    streak.addColorStop(1, `rgba(${GRIME}, 0)`);
    ctx.strokeStyle = streak;
    ctx.lineWidth = 1.5 + random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (random() - 0.5) * 8, length);
    ctx.stroke();
  }

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${GRIME}, ${random() * 0.18})`;
    ctx.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const POINT = new THREE.Vector3();

const drapeCloth = (geometry: THREE.BufferGeometry, panel: Panel, time: number) => {
  const { topLeft, topRight, height } = panel;
  const across = topRight.clone().sub(topLeft);
  const normal = across.clone().cross(UP).normalize();
  const sheet = geometry.attributes.sheet;
  const position = geometry.attributes.position;
  const width = across.length();
  for (let i = 0; i < position.count; i++) {
    const u = sheet.getX(i);
    const v = sheet.getY(i);
    const ripple =
      Math.sin(time * SWAY_SPEED + u * width * 1.3 + v * 2.1) * 0.7 +
      Math.sin(time * SWAY_SPEED * 0.6 - u * width * 0.7) * 0.3;
    POINT.copy(topLeft)
      .addScaledVector(across, u)
      .addScaledVector(UP, -height * v)
      .addScaledVector(normal, ripple * SWAY * v);
    position.setXYZ(i, POINT.x, POINT.y, POINT.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
};

const Scaffold = ({ scene }: { scene: THREE.Object3D }) => {
  const rig = useMemo(() => {
    const group = scene.getObjectByName(SCAFFOLD_GROUP);
    if (!group) return null;
    const poles = group.children
      .filter((obj): obj is THREE.Mesh => obj instanceof THREE.Mesh && isBamboo(obj.name))
      .map(toPole);
    const panels = findPanels(poles, -group.position.y);
    const cloths = panels.map((panel, i) => {
      const tear = tearMask(panel, i + 1);
      const depth = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        alphaMap: tear,
        alphaTest: 0.5,
      });
      return { panel, geometry: clothGeometry(), tear, depth, dirt: dirtMap(panel, i + 1) };
    });
    return { group, cloths };
  }, [scene]);

  useLayoutEffect(() => {
    rig?.cloths.forEach(({ panel, geometry }) => drapeCloth(geometry, panel, 0));
    return () =>
      rig?.cloths.forEach(({ geometry, tear, depth, dirt }) => {
        geometry.dispose();
        tear.dispose();
        dirt.dispose();
        depth.dispose();
      });
  }, [rig]);

  useFrame(({ clock }) => {
    rig?.cloths.forEach(({ panel, geometry }) => drapeCloth(geometry, panel, clock.elapsedTime));
  });

  if (!rig) return null;

  return createPortal(
    <>
      {rig.cloths.map(({ geometry, tear, depth, dirt }, i) => (
        <mesh
          key={i}
          geometry={geometry}
          customDepthMaterial={depth}
          castShadow
          receiveShadow
          userData={{ keepMaterial: true }}
        >
          <meshLambertMaterial map={dirt} side={THREE.DoubleSide} alphaMap={tear} alphaTest={0.5} />
        </mesh>
      ))}
    </>,
    rig.group,
  );
};

export default Scaffold;
