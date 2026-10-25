import * as THREE from "three";

const PART_NAME = /^([bc])(\d+)-(base|ho|zig|cone)/i;
export const SITE_PROP_GROUP = "site-";

export type SitePart = "base" | "holder" | "zigzag" | "cone" | "coneBase";

const parse = (name: string) => {
  const match = PART_NAME.exec(name);
  if (!match) return null;
  const [, family, id, kind] = match;
  return { family: family.toLowerCase(), id: family.toLowerCase() + id, kind: kind.toLowerCase() };
};

export const sitePart = (name: string): SitePart | null => {
  const part = parse(name);
  if (!part) return null;
  if (part.family === "c") return part.kind === "cone" ? "cone" : "coneBase";
  if (part.kind === "base") return "base";
  if (part.kind === "ho") return "holder";
  if (part.kind === "zig") return "zigzag";
  return null;
};

export const isSiteProp = (name: string) => name.startsWith(SITE_PROP_GROUP);

const PROP_ORDER = ["crane", "scaffold", "barricade", "cone", "brick", "builder"];
export const propRank = (groupName: string) =>
  PROP_ORDER.findIndex((kind) => groupName.startsWith(SITE_PROP_GROUP + kind));

export const CRANE = {
  tower: "crane",
  drum: "armature",
  gear: "crane-gear",
  worm: "crane-worm-gear",
  carrier: "carrier",
} as const;
export const CRANE_GROUP = "site-crane";

export const isBamboo = (name: string) => name.startsWith("bamboo");
export const SCAFFOLD_GROUP = "site-scaffold";

const isBrick = (name: string) => name.startsWith("brick");

const isSpriteMarker = (name: string) => name.startsWith("sprite");
const BUILDER_MARKER = "sprite1";
export const BUILDER_GROUP = "site-builder";
export const SLEEPER_MARKER = "sprite1001";

export const isConstruction = (name: string) =>
  sitePart(name) !== null ||
  isBamboo(name) ||
  isBrick(name) ||
  isSpriteMarker(name) ||
  (Object.values(CRANE) as string[]).includes(name);

const STACK_RADIUS = 0.3;

const footprint = (obj: THREE.Object3D) =>
  new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()).setY(0);

const gatherProps = (parts: THREE.Object3D[]) => {
  const props = new Map<string, THREE.Object3D[]>();
  const add = (key: string, obj: THREE.Object3D) =>
    props.set(key, [...(props.get(key) ?? []), obj]);
  const cones = parts.filter((obj) => sitePart(obj.name) === "cone");
  parts.forEach((obj) => {
    const part = sitePart(obj.name);
    if (part === "cone") return add(`cone-${obj.name}`, obj);
    if (part === "coneBase") {
      const spot = footprint(obj);
      const cone = cones.find((c) => footprint(c).distanceTo(spot) < STACK_RADIUS);
      return add(`cone-${cone?.name ?? obj.name}`, obj);
    }
    add(`barricade-${parse(obj.name)!.id}`, obj);
  });
  return props;
};

export const groupSiteProps = (scene: THREE.Object3D) => {
  scene.updateMatrixWorld(true);
  const parts = scene.children.filter((obj) => sitePart(obj.name) !== null);
  const props = gatherProps(parts);
  const crane = Object.values(CRANE)
    .map((name) => scene.getObjectByName(name))
    .filter((obj): obj is THREE.Object3D => obj?.parent === scene);
  if (crane.length > 0) props.set("crane", crane);
  const monolith = scene.getObjectByName("Monolith");
  const sleeper = scene.children.find((obj) => obj.name === SLEEPER_MARKER);
  if (sleeper && monolith) {
    sleeper.visible = false;
    monolith.attach(sleeper);
  }
  scene.children
    .filter((obj) => isSpriteMarker(obj.name) && obj.name !== BUILDER_MARKER)
    .forEach((obj) => obj.removeFromParent());
  const marker = scene.children.find((obj) => obj.name === BUILDER_MARKER);
  if (marker) {
    marker.visible = false;
    props.set("builder", [marker]);
  }
  const bamboo = scene.children.filter((obj) => isBamboo(obj.name));
  if (bamboo.length > 0) props.set("scaffold", bamboo);
  scene.children
    .filter((obj) => isBrick(obj.name))
    .forEach((brick) => props.set(`brick-${brick.name}`, [brick]));
  props.forEach((members, key) => {
    const box = new THREE.Box3();
    members.forEach((obj) => box.expandByObject(obj));
    const group = new THREE.Group();
    group.name = SITE_PROP_GROUP + key;
    group.position.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
    group.userData.propHeight = box.max.y - box.min.y;
    scene.add(group);
    members.forEach((obj) => group.attach(obj));
  });
};
