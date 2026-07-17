import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("glass opacity config raises clear and frosted panes to readable levels", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.ok(config.GALLERY_GLASS.opacity > 0.32, "clear glass must beat the exported 0.32 alpha");
  assert.ok(config.GALLERY_GLASS.opacity <= 0.7, "clear glass stays glass, not a solid panel");
  assert.ok(config.GALLERY_GLASS.frostedOpacity > 0.42, "frosted glass must beat the exported 0.42 alpha");
  assert.ok(config.GALLERY_GLASS.frostedOpacity <= 0.8);
  assert.ok(config.GALLERY_GLASS.frostedOpacity > config.GALLERY_GLASS.opacity,
    "frosted stays milkier than clear");
});

test("raises exported glass opacity so panes read against shadows", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_GLASS } = await importSourceModule("scenes/gallery/galleryConfig.ts");

  const clear = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.32 });
  clear.name = "mat_glass_clear_soft";
  const clearMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), clear);
  clearMesh.name = "GLASS_BALUSTRADE_001";

  assert.equal(style.applyGalleryPreservedMaterialStyle(clearMesh), true);
  assert.equal(clear.opacity, GALLERY_GLASS.opacity);
  assert.equal(clear.transparent, true, "glass stays in the transparent pass");

  const frosted = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.42 });
  frosted.name = "mat_glass_frosted_soft";
  const frostedMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), frosted);
  frostedMesh.name = "GLASS_RIBBON_002";

  assert.equal(style.applyGalleryPreservedMaterialStyle(frostedMesh), true);
  assert.equal(frosted.opacity, GALLERY_GLASS.frostedOpacity);

  const arrayMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.32 })],
  );
  arrayMesh.name = "GLASS_STRIP_003";
  assert.equal(style.applyGalleryPreservedMaterialStyle(arrayMesh), true);
  assert.equal(arrayMesh.material[0].opacity, 1, "opaque slots are never made transparent");
  assert.equal(arrayMesh.material[1].opacity, GALLERY_GLASS.opacity);
});
