import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig";
import type { ExhibitTarget } from "./exhibitTarget";

type MaterialSnapshot = {
  emissive: THREE.Color;
  emissiveIntensity: number;
};

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return (obj as THREE.Mesh).isMesh === true;
}

function snapshotMaterial(material: THREE.Material): MaterialSnapshot | null {
  const m = material as THREE.MeshStandardMaterial;
  if (!("emissive" in m) || !m.emissive) return null;
  return {
    emissive: m.emissive.clone(),
    emissiveIntensity: m.emissiveIntensity ?? 0,
  };
}

function applyHover(material: THREE.Material) {
  const m = material as THREE.MeshStandardMaterial;
  if (!("emissive" in m) || !m.emissive) return;
  m.emissive.set(EXHIBIT_TARGET.emissiveColor);
  m.emissiveIntensity = EXHIBIT_TARGET.emissiveIntensity;
}

function restoreMaterial(material: THREE.Material, snap: MaterialSnapshot) {
  const m = material as THREE.MeshStandardMaterial;
  if (!("emissive" in m) || !m.emissive) return;
  m.emissive.copy(snap.emissive);
  m.emissiveIntensity = snap.emissiveIntensity;
}

/** Subtle emissive boost on the aimed exhibit mesh. */
export function ExhibitHoverHighlight({ target }: { target: ExhibitTarget | null }) {
  const snapshotsRef = useRef<Map<string, MaterialSnapshot>>(new Map());
  const meshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    for (const mesh of meshesRef.current) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const snap = snapshotsRef.current.get(mat.uuid);
        if (snap) restoreMaterial(mat, snap);
      }
    }
    snapshotsRef.current.clear();
    meshesRef.current = [];

    if (!target) return;

    const meshes: THREE.Mesh[] = [];
    target.object.traverse((obj) => {
      if (!isMesh(obj)) return;
      meshes.push(obj);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (snapshotsRef.current.has(mat.uuid)) continue;
        const snap = snapshotMaterial(mat);
        if (!snap) continue;
        snapshotsRef.current.set(mat.uuid, snap);
        applyHover(mat);
      }
    });
    meshesRef.current = meshes;

    return () => {
      for (const mesh of meshesRef.current) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          const snap = snapshotsRef.current.get(mat.uuid);
          if (snap) restoreMaterial(mat, snap);
        }
      }
      snapshotsRef.current.clear();
      meshesRef.current = [];
    };
  }, [target]);

  return null;
}
