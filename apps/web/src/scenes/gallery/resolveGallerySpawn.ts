import * as THREE from "three";
import { GALLERY_OUTSIDE_SPAWN_DROP } from "./galleryConfig";

export const EYE_OFFSET = 0.7;
export const PLAYER_CAPSULE_HALF_HEIGHT = 0.65;
export const PLAYER_CAPSULE_RADIUS = 0.25;
export const PLAYER_FOOT_OFFSET = PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS;

const SPAWN_MARGIN = 0.1;
/** Gap between capsule foot and floor top when standing (gameplay / spawn height). */
const STAND_FLOOR_CLEARANCE = 0.02;
/** Extra clearance when testing overlap with COL_inner_* (matches cuboid physics). */
const INNER_SPAWN_INSET = 0.08;
/** Min distance from COL_outer shell faces (wall thickness + clearance). */
const OUTER_WALL_INSET = 0.55;

const SPAWN_INNER_COLS = ["COL_inner_1", "COL_inner_2", "COL_inner_3"] as const;
const SPAWN_OUTER_PREFIX = "COL_outer";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return (obj as THREE.Mesh).isMesh === true;
}

function isWalkableCol(name: string) {
  return (
    name.startsWith("COL_ground") ||
    name.startsWith("COL_floor") ||
    name.startsWith("COL_platform")
  );
}

type ColBox = { name: string; box: THREE.Box3 };

function getBox(root: THREE.Object3D, name: string): THREE.Box3 | null {
  const obj = root.getObjectByName(name);
  if (!obj || !isMesh(obj)) return null;
  return new THREE.Box3().setFromObject(obj);
}

function collectInnerBoxes(root: THREE.Object3D): ColBox[] {
  root.updateMatrixWorld(true);
  const out: ColBox[] = [];
  for (const name of SPAWN_INNER_COLS) {
    const box = getBox(root, name);
    if (box) out.push({ name, box });
  }
  return out;
}

/** COL_outer defines the room shell — inset on X/Z and ceiling; floor stays at outer.min.y. */
function getOuterShell(root: THREE.Object3D): { shell: THREE.Box3; floorY: number } | null {
  root.updateMatrixWorld(true);
  let merged: THREE.Box3 | null = null;

  root.traverse((obj) => {
    if (!isMesh(obj)) return;
    if (!obj.name.startsWith(SPAWN_OUTER_PREFIX)) return;
    const b = new THREE.Box3().setFromObject(obj);
    merged = merged ? merged.union(b) : b.clone();
  });

  if (!merged) return null;

  const bounds = merged as THREE.Box3;
  const floorY = bounds.min.y;
  const shell = bounds.clone();
  shell.min.x += OUTER_WALL_INSET;
  shell.max.x -= OUTER_WALL_INSET;
  shell.min.z += OUTER_WALL_INSET;
  shell.max.z -= OUTER_WALL_INSET;
  shell.max.y -= OUTER_WALL_INSET;

  if (shell.min.x >= shell.max.x || shell.min.z >= shell.max.z) return null;
  return { shell, floorY };
}

function capsuleAabb(px: number, py: number, pz: number) {
  const r = PLAYER_CAPSULE_RADIUS + SPAWN_MARGIN;
  const foot = PLAYER_FOOT_OFFSET + SPAWN_MARGIN;
  const head = PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS + SPAWN_MARGIN;
  return {
    min: new THREE.Vector3(px - r, py - foot, pz - r),
    max: new THREE.Vector3(px + r, py + head, pz + r),
  };
}

function aabbIntersects(a: { min: THREE.Vector3; max: THREE.Vector3 }, box: THREE.Box3): boolean {
  return (
    a.min.x <= box.max.x &&
    a.max.x >= box.min.x &&
    a.min.y <= box.max.y &&
    a.max.y >= box.min.y &&
    a.min.z <= box.max.z &&
    a.max.z >= box.min.z
  );
}

function innerSpawnBox(box: THREE.Box3): THREE.Box3 {
  const inset = INNER_SPAWN_INSET;
  const shrunk = box.clone();
  shrunk.min.x += inset;
  shrunk.min.y += inset;
  shrunk.min.z += inset;
  shrunk.max.x -= inset;
  shrunk.max.y -= inset;
  shrunk.max.z -= inset;
  return shrunk;
}

/** Names of COL_inner_* volumes the capsule overlaps. */
function findInnerOverlaps(px: number, py: number, pz: number, innerBoxes: ColBox[]): string[] {
  const cap = capsuleAabb(px, py, pz);
  return innerBoxes
    .filter(({ box }) => aabbIntersects(cap, innerSpawnBox(box)))
    .map(({ name }) => name);
}

/** True when capsule overlaps COL_inner_* obstacle volumes. */
function overlapsInner(px: number, py: number, pz: number, innerBoxes: ColBox[]): boolean {
  return findInnerOverlaps(px, py, pz, innerBoxes).length > 0;
}

/** True when capsule crosses COL_outer shell walls/ceiling or falls below room floor. */
function overlapsOuterShell(
  px: number,
  py: number,
  pz: number,
  shell: THREE.Box3,
  floorY: number,
): boolean {
  const cap = capsuleAabb(px, py, pz);
  return (
    cap.min.x < shell.min.x ||
    cap.max.x > shell.max.x ||
    cap.min.z < shell.min.z ||
    cap.max.z > shell.max.z ||
    cap.max.y > shell.max.y ||
    cap.min.y < floorY - SPAWN_MARGIN
  );
}

function collectWalkableFloors(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (!isMesh(obj)) return;
    if (!isWalkableCol(obj.name)) return;
    out.push(obj);
  });
  return out.sort((a, b) => {
    const ba = new THREE.Box3().setFromObject(a);
    const bb = new THREE.Box3().setFromObject(b);
    return bb.getSize(new THREE.Vector3()).lengthSq() - ba.getSize(new THREE.Vector3()).lengthSq();
  });
}

function bodyYOnFloor(floorTopY: number) {
  return floorTopY + PLAYER_FOOT_OFFSET + STAND_FLOOR_CLEARANCE;
}

function intersectFloorWithShell(floor: THREE.Mesh, outerShell: THREE.Box3 | null): THREE.Box3 {
  const floorBox = new THREE.Box3().setFromObject(floor);
  if (!outerShell) return floorBox;
  return floorBox.clone().intersect(outerShell);
}

function sampleCandidates(floor: THREE.Mesh, outerShell: THREE.Box3 | null): THREE.Vector3[] {
  const sampleBox = intersectFloorWithShell(floor, outerShell);
  if (sampleBox.isEmpty()) return [];

  const center = sampleBox.getCenter(new THREE.Vector3());
  const floorTopY = new THREE.Box3().setFromObject(floor).max.y;
  const y = bodyYOnFloor(floorTopY);
  const candidates: THREE.Vector3[] = [];

  const inset = PLAYER_CAPSULE_RADIUS + 0.25;
  const minX = sampleBox.min.x + inset;
  const maxX = sampleBox.max.x - inset;
  const minZ = sampleBox.min.z + inset;
  const maxZ = sampleBox.max.z - inset;
  if (minX >= maxX || minZ >= maxZ) return [];

  const steps = 9;
  for (let ix = 0; ix < steps; ix++) {
    for (let iz = 0; iz < steps; iz++) {
      candidates.push(
        new THREE.Vector3(
          THREE.MathUtils.lerp(minX, maxX, ix / (steps - 1)),
          y,
          THREE.MathUtils.lerp(minZ, maxZ, iz / (steps - 1)),
        ),
      );
    }
  }

  candidates.unshift(new THREE.Vector3(center.x, y, center.z));
  return candidates;
}

export type SpawnCheckResult = {
  ok: boolean;
  overlapsInner: boolean;
  overlapsOuter: boolean;
  /** Which COL_inner_* boxes intersect the player capsule (empty when clear). */
  innerHits: string[];
};

export function checkSpawnPoint(
  root: THREE.Object3D,
  px: number,
  py: number,
  pz: number,
): SpawnCheckResult {
  const innerBoxes = collectInnerBoxes(root);
  const outer = getOuterShell(root);
  const innerHits = findInnerOverlaps(px, py, pz, innerBoxes);
  const overlapsOuterHit = outer
    ? overlapsOuterShell(px, py, pz, outer.shell, outer.floorY)
    : false;
  return {
    ok: innerHits.length === 0 && !overlapsOuterHit,
    overlapsInner: innerHits.length > 0,
    overlapsOuter: overlapsOuterHit,
    innerHits,
  };
}

function isSpawnClear(
  px: number,
  py: number,
  pz: number,
  innerBoxes: ColBox[],
  outer: { shell: THREE.Box3; floorY: number } | null,
): boolean {
  if (overlapsInner(px, py, pz, innerBoxes)) return false;
  if (outer && overlapsOuterShell(px, py, pz, outer.shell, outer.floorY)) return false;
  return true;
}

/** All grid spawn candidates on walkable floors (center first). */
export function enumerateSpawnCandidates(root: THREE.Object3D): [number, number, number][] {
  root.updateMatrixWorld(true);
  const outerShell = getOuterShell(root)?.shell ?? null;
  const out: [number, number, number][] = [];

  for (const floor of collectWalkableFloors(root)) {
    for (const c of sampleCandidates(floor, outerShell)) {
      out.push([c.x, c.y, c.z]);
    }
  }
  return out;
}

/** First spawn that clears COL_inner_* and COL_outer bounds. */
export function findClearSpawn(root: THREE.Object3D): [number, number, number] | null {
  root.updateMatrixWorld(true);
  const innerBoxes = collectInnerBoxes(root);
  const outer = getOuterShell(root);

  for (const candidate of enumerateSpawnCandidates(root)) {
    if (isSpawnClear(candidate[0], candidate[1], candidate[2], innerBoxes, outer)) {
      return candidate;
    }
  }
  return null;
}

export function resolveOutsideGallerySpawn(root: THREE.Object3D): [number, number, number] {
  root.updateMatrixWorld(true);

  let outerBounds: THREE.Box3 | null = null;
  root.traverse((obj) => {
    if (!isMesh(obj) || !obj.name.startsWith(SPAWN_OUTER_PREFIX)) return;
    const b = new THREE.Box3().setFromObject(obj);
    outerBounds = outerBounds ? outerBounds.union(b) : b.clone();
  });

  const floors = collectWalkableFloors(root);
  const groundBox =
    floors.length > 0 ? new THREE.Box3().setFromObject(floors[0]!) : null;

  const edgeInset = PLAYER_CAPSULE_RADIUS + 0.3;
  let x = -3;
  let z = -5.35;

  if (outerBounds && groundBox) {
    const bounds = outerBounds as THREE.Box3;
    const center = bounds.getCenter(new THREE.Vector3());
    z = center.z;
    x = bounds.min.x - 1.5;
    if (x < groundBox.min.x + edgeInset) {
      x = groundBox.min.x + edgeInset;
    }
    if (x > bounds.min.x - 0.2) {
      x = bounds.max.x + 1.5;
      if (x > groundBox.max.x - edgeInset) {
        x = groundBox.max.x - edgeInset;
      }
    }
  }

  const floorTopY = floorTopUnder(root, x, z);
  const y = bodyYOnFloor(floorTopY) + GALLERY_OUTSIDE_SPAWN_DROP;
  return [x, y, z];
}

export function resolveGallerySpawn(root: THREE.Object3D): [number, number, number] {
  root.updateMatrixWorld(true);
  const innerBoxes = collectInnerBoxes(root);
  const outer = getOuterShell(root);

  const marker = root.getObjectByName("spawn_player_main");
  if (marker) {
    const p = new THREE.Vector3();
    marker.getWorldPosition(p);
    const floorTopY = floorTopUnder(root, p.x, p.z);
    const y = bodyYOnFloor(floorTopY);
    if (isSpawnClear(p.x, y, p.z, innerBoxes, outer)) return [p.x, y, p.z];
  }

  const fromFloors = findClearSpawn(root);
  if (fromFloors) return fromFloors;

  const box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  const floorTopY = floorTopUnder(root, c.x, c.z);
  return [c.x, bodyYOnFloor(floorTopY), c.z];
}

/** Walkable floor top Y at a world XZ (defaults to 0). */
function floorTopUnder(root: THREE.Object3D, x: number, z: number): number {
  root.updateMatrixWorld(true);
  let best = 0;
  for (const floor of collectWalkableFloors(root)) {
    const box = new THREE.Box3().setFromObject(floor);
    if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z) continue;
    best = Math.max(best, box.max.y);
  }
  return best;
}

export function resolveGallerySafetyGroundY(root: THREE.Object3D, margin = 5): number {
  const box = new THREE.Box3().setFromObject(root);
  return box.min.y - margin;
}

export function resolveGallerySafetyCenter(root: THREE.Object3D): [number, number] {
  const outer = getOuterShell(root);
  if (outer) {
    const c = outer.shell.getCenter(new THREE.Vector3());
    return [c.x, c.z];
  }
  const box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  return [c.x, c.z];
}

export function spawnToCameraPosition(spawn: [number, number, number]): [number, number, number] {
  return [spawn[0], spawn[1] + EYE_OFFSET, spawn[2]];
}
