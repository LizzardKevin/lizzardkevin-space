import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const INK = "#17282a";

function displacementFromBoxCorner(boxSize, vertex) {
  const half = boxSize / 2;
  const corner = new THREE.Vector3(
    Math.sign(vertex.x) * half,
    Math.sign(vertex.y) * half,
    Math.sign(vertex.z) * half,
  );
  return new THREE.Vector3(vertex.x, vertex.y, vertex.z).sub(corner).length();
}

test("welds split box vertices and extrudes along smooth normals by the width", async () => {
  const { createInkShellGeometry } = await importSourceModule("scenes/gallery/galleryInkOutline.ts");
  const width = 0.25;
  const shell = createInkShellGeometry(
    [{ geometry: new THREE.BoxGeometry(2, 2, 2), matrixWorld: new THREE.Matrix4() }],
    width,
  );

  assert.ok(shell, "shell geometry should exist");
  const position = shell.getAttribute("position");
  assert.equal(position.count, 8, "a welded box has 8 corner vertices");
  for (let i = 0; i < position.count; i++) {
    const vertex = { x: position.getX(i), y: position.getY(i), z: position.getZ(i) };
    const displacement = displacementFromBoxCorner(2, vertex);
    assert.ok(
      Math.abs(displacement - width) < 1e-6,
      `vertex ${i} should move ${width} along its smooth normal, got ${displacement}`,
    );
    assert.ok(Math.abs(vertex.x) > 1 && Math.abs(vertex.y) > 1 && Math.abs(vertex.z) > 1,
      `vertex ${i} should expand outward`);
  }
});

test("applies the source world matrix before welding and extrusion", async () => {
  const { createInkShellGeometry } = await importSourceModule("scenes/gallery/galleryInkOutline.ts");
  const width = 0.25;
  const shell = createInkShellGeometry(
    [{ geometry: new THREE.BoxGeometry(2, 2, 2), matrixWorld: new THREE.Matrix4().makeTranslation(10, 0, 0) }],
    width,
  );

  assert.ok(shell);
  const position = shell.getAttribute("position");
  let sumX = 0;
  for (let i = 0; i < position.count; i++) sumX += position.getX(i);
  assert.ok(Math.abs(sumX / position.count - 10) < 1e-6, "shell should be centered on the world transform");
  for (let i = 0; i < position.count; i++) {
    const vertex = { x: position.getX(i) - 10, y: position.getY(i), z: position.getZ(i) };
    const displacement = displacementFromBoxCorner(2, vertex);
    assert.ok(Math.abs(displacement - width) < 1e-6, `vertex ${i} displacement`);
  }
});

test("merges multiple sources into a single geometry", async () => {
  const { createInkShellGeometry } = await importSourceModule("scenes/gallery/galleryInkOutline.ts");
  const shell = createInkShellGeometry(
    [
      { geometry: new THREE.BoxGeometry(2, 2, 2), matrixWorld: new THREE.Matrix4() },
      { geometry: new THREE.BoxGeometry(2, 2, 2), matrixWorld: new THREE.Matrix4().makeTranslation(5, 0, 0) },
    ],
    0.25,
  );

  assert.ok(shell);
  assert.equal(shell.getAttribute("position").count, 16);
});

test("returns null when there is nothing to outline", async () => {
  const { createInkShellGeometry } = await importSourceModule("scenes/gallery/galleryInkOutline.ts");
  assert.equal(createInkShellGeometry([], 0.25), null);
});

test("prepareGalleryScene adds one ink shell covering stylized meshes only", async () => {
  const { prepareGalleryScene } = await importSourceModule("scenes/gallery/prepareGalleryScene.ts");
  const { SPACE_INK_OUTLINE_NAME } = await importSourceModule("scenes/gallery/galleryInkOutline.ts");

  const root = new THREE.Group();
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
  arch.name = "ARCH_WALL_001";
  arch.position.set(0, 1, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
  glass.name = "GLASS_CLEAR_001";
  glass.position.set(5, 1, 0);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), new THREE.MeshStandardMaterial());
  floor.name = "STRUCT_FLOOR_001";
  floor.position.set(0, 0, 8);
  const stair = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 2), new THREE.MeshStandardMaterial());
  stair.name = "ARCH_STAIR_001";
  stair.position.set(0, 0, 12);
  const skylightPanel = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
  skylightPanel.name = "ARCH_WALL_PLASTER_WHITE_015";
  skylightPanel.position.set(0, 0, 16);
  root.add(arch, glass, floor, stair, skylightPanel);
  root.updateMatrixWorld(true);

  prepareGalleryScene(root);

  const shell = root.getObjectByName(SPACE_INK_OUTLINE_NAME);
  assert.ok(shell, "ink shell should be attached to the gallery root");
  assert.equal(
    shell.geometry.getAttribute("position").count,
    8,
    "only the ARCH wall box gets a shell; glass, floor, stair and flush skylight panels stay out",
  );
  assert.equal(shell.material.toneMapped, false);
  assert.equal(shell.material.side, THREE.BackSide);
  assert.equal(shell.material.polygonOffset, true, "depth bias tucks marginal hull poke-throughs");
  assert.equal(`#${shell.material.color.getHexString()}`, INK);
  assert.equal(shell.castShadow, false);
});

test("repeated preparation keeps exactly one ink shell", async () => {
  const { prepareGalleryScene } = await importSourceModule("scenes/gallery/prepareGalleryScene.ts");
  const { SPACE_INK_OUTLINE_NAME } = await importSourceModule("scenes/gallery/galleryInkOutline.ts");

  const root = new THREE.Group();
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
  arch.name = "ARCH_WALL_001";
  root.add(arch);
  root.updateMatrixWorld(true);

  prepareGalleryScene(root);
  prepareGalleryScene(root);

  let count = 0;
  root.traverse((object) => {
    if (object.name === SPACE_INK_OUTLINE_NAME) count += 1;
  });
  assert.equal(count, 1);
});

test("ink outline config and token use the approved ink role", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");
  const { SPACE_VISUAL_TOKENS } = await importSourceModule("space/spaceVisualTokens.ts");

  assert.equal(config.ENABLE_GALLERY_INK_OUTLINES, true);
  assert.equal(config.GALLERY_INK.width, 0.035);
  assert.equal(config.GALLERY_INK.color, INK);
  assert.equal(SPACE_VISUAL_TOKENS.colors.inkOutline, INK);
  assert.ok(Array.isArray(config.GALLERY_INK.exemptPatterns));
  assert.ok(
    config.GALLERY_INK.exemptPatterns.some((pattern) =>
      pattern.test("ARCH_WALL_PLASTER_WHITE_015"),
    ),
    "flush-mounted skylight plaster panels are exempt from ink shells",
  );
  assert.ok(
    !config.GALLERY_INK.exemptPatterns.some((pattern) => pattern.test("ARCH_WALL_001")),
    "ordinary walls keep their outlines",
  );
});

test("builds exhibit shells in root-local space so the shell follows the exhibit", async () => {
  const { addExhibitInkOutline, EXHIBIT_INK_OUTLINE_SUFFIX } = await importSourceModule(
    "scenes/gallery/galleryInkOutline.ts",
  );

  const root = new THREE.Group();
  root.name = "arch_treehabitat";
  root.position.set(5, 0, 0);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
  mesh.name = "trunk_001";
  mesh.position.set(0, 1, 0);
  root.add(mesh);
  root.updateMatrixWorld(true);

  const shell = addExhibitInkOutline(root);

  assert.ok(shell, "exhibit shell should exist");
  assert.equal(shell.parent, root, "shell rides inside the exhibit group");
  assert.ok(shell.name.endsWith(EXHIBIT_INK_OUTLINE_SUFFIX));
  assert.equal(shell.raycast instanceof Function, true);
  const position = shell.geometry.getAttribute("position");
  assert.equal(position.count, 8);
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < position.count; i++) {
    sumX += position.getX(i);
    sumY += position.getY(i);
    const displacement = displacementFromBoxCorner(2, {
      x: position.getX(i),
      y: position.getY(i) - 1,
      z: position.getZ(i),
    });
    assert.ok(Math.abs(displacement - 0.035) < 1e-6, `vertex ${i} should use the default ink width`);
  }
  assert.ok(Math.abs(sumX / position.count) < 1e-6, "shell stays in root-local x, not world x=5");
  assert.ok(Math.abs(sumY / position.count - 1) < 1e-6, "shell centers on the child mesh");
});

test("exhibit shell attach is idempotent and disposable", async () => {
  const { addExhibitInkOutline, disposeExhibitInkOutline, EXHIBIT_INK_OUTLINE_SUFFIX } =
    await importSourceModule("scenes/gallery/galleryInkOutline.ts");

  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  mesh.name = "panel_001";
  root.add(mesh);
  root.updateMatrixWorld(true);

  addExhibitInkOutline(root);
  addExhibitInkOutline(root);

  let count = 0;
  root.traverse((object) => {
    if (object.name.endsWith(EXHIBIT_INK_OUTLINE_SUFFIX)) count += 1;
  });
  assert.equal(count, 1, "re-attaching replaces the previous shell");

  disposeExhibitInkOutline(root);
  count = 0;
  root.traverse((object) => {
    if (object.name.endsWith(EXHIBIT_INK_OUTLINE_SUFFIX)) count += 1;
  });
  assert.equal(count, 0, "dispose removes the shell from the exhibit");
  assert.equal(root.userData[EXHIBIT_INK_OUTLINE_SUFFIX], undefined);
});
