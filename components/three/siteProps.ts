import * as THREE from "three";

// Construction-site props, exported as loose parts named "<id>-<part>": barricades (b1-Base,
// b1-Hoder, b1-Zigzag…) and cones (c1-Cone, c1-Base…). Each prop is gathered into its own group,
// apart from the monolith, so it builds as one piece.
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

// Build order: the crane goes up first, then the scaffold, barricades, cones and loose bricks.
const PROP_ORDER = ["crane", "scaffold", "barricade", "cone", "brick", "builder"];
export const propRank = (groupName: string) =>
  PROP_ORDER.findIndex((kind) => groupName.startsWith(SITE_PROP_GROUP + kind));

// The crane beside the monolith: a tower with a drum and gears on top that winch the carrier.
export const CRANE = {
  tower: "crane",
  drum: "armature",
  gear: "crane-gear",
  worm: "crane-worm-gear",
  carrier: "carrier",
} as const;
export const CRANE_GROUP = "site-crane";

// Bamboo poles, upright and crosswise, lashed into one scaffold.
export const isBamboo = (name: string) => name.startsWith("bamboo");
export const SCAFFOLD_GROUP = "site-scaffold";

const isBrick = (name: string) => name.startsWith("brick");

// Placeholder cubes marking where sprites stand; they're never drawn themselves. The first one
// is where the builder works.
const isSpriteMarker = (name: string) => name.startsWith("sprite");
const BUILDER_MARKER = "sprite1";
export const BUILDER_GROUP = "site-builder";
// GLTFLoader strips dots, so Blender's "sprite1.001" loads as "sprite1001". It marks a ledge on
// top of the monolith, so it rides on the monolith instead of standing with the ground props.
export const SLEEPER_MARKER = "sprite1001";

// Every part of the construction site, by its name in the model.
export const isConstruction = (name: string) =>
  sitePart(name) !== null ||
  isBamboo(name) ||
  isBrick(name) ||
  isSpriteMarker(name) ||
  (Object.values(CRANE) as string[]).includes(name);

// How close a cone and a base must stand, across the ground, to count as one stacked cone.
const STACK_RADIUS = 0.3;

const footprint = (obj: THREE.Object3D) =>
  new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()).setY(0);

// Barricades go by their id. Cones go by stacking instead, each cone with the base under it,
// so a cone exported under the wrong id still pops up in its own spot.
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

// Each group sits at the bottom centre of its parts, so scaling it up grows it from the ground.
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
    // How far it has to sink to be fully underground, for rising out of the ground.
    group.userData.propHeight = box.max.y - box.min.y;
    scene.add(group);
    members.forEach((obj) => group.attach(obj));
  });
};
