import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

test("collectExhibitAnchors records ANCHOR world transforms", async () => {
  const { collectExhibitAnchors } = await import("../src/scenes/exhibits/exhibitAnchors.ts");

  const root = new THREE.Group();
  root.position.set(1, 2, 3);
  const anchor = new THREE.Object3D();
  anchor.name = "ANCHOR_WORK_001";
  anchor.position.set(4, 5, 6);
  anchor.rotation.y = Math.PI / 2;
  root.add(anchor);
  root.updateMatrixWorld(true);

  const anchors = collectExhibitAnchors(root);

  assert.equal(anchors.size, 1);
  assert.deepEqual(anchors.get("ANCHOR_WORK_001")?.position.toArray(), [5, 7, 9]);
  assert.ok(Math.abs((anchors.get("ANCHOR_WORK_001")?.euler.y ?? 0) - Math.PI / 2) < 0.0001);
});

test("chooseSceneExhibitLod applies thresholds and hysteresis", async () => {
  const { chooseSceneExhibitLod } = await import("../src/scenes/exhibits/exhibitPlacement.ts");
  const load = {
    lod0Distance: 8,
    lod1Distance: 22,
    lod2Distance: 45,
    unloadDistance: 60,
  };

  assert.equal(chooseSceneExhibitLod(6, load, null), "lod0");
  assert.equal(chooseSceneExhibitLod(12, load, null), "lod1");
  assert.equal(chooseSceneExhibitLod(30, load, null), "lod2");
  assert.equal(chooseSceneExhibitLod(62, load, "lod2"), null);
  assert.equal(chooseSceneExhibitLod(9.5, load, "lod0"), "lod0");
  assert.equal(chooseSceneExhibitLod(10.5, load, "lod0"), "lod1");
});

test("resolveExhibitFloorSnap drops exhibit bounding box onto floor hit", async () => {
  const { resolveExhibitFloorSnap } = await import("../src/scenes/exhibits/exhibitPlacement.ts");

  const root = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10));
  floor.name = "COL_floor_test";
  root.add(floor);

  const exhibit = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
  body.position.y = 0;
  exhibit.add(body);
  root.updateMatrixWorld(true);
  exhibit.updateMatrixWorld(true);

  const snap = resolveExhibitFloorSnap({
    root,
    anchorPosition: new THREE.Vector3(0, 0, 0),
    exhibitObject: exhibit,
    heightOffset: 0.2,
  });

  assert.equal(snap.floorName, "COL_floor_test");
  assert.equal(Number(snap.position.y.toFixed(3)), 1.25);
});

test("resolveExhibitFloorSnap aligns the exhibit bbox bottom center to the floor hit point", async () => {
  const { resolveExhibitFloorSnap } = await import("../src/scenes/exhibits/exhibitPlacement.ts");

  const root = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10));
  floor.name = "COL_floor_test";
  root.add(floor);

  const exhibit = new THREE.Group();
  const offsetBody = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2));
  offsetBody.position.set(2, 3, -1.5);
  exhibit.add(offsetBody);
  root.updateMatrixWorld(true);
  exhibit.updateMatrixWorld(true);

  const snap = resolveExhibitFloorSnap({
    root,
    anchorPosition: new THREE.Vector3(1.5, 0, -2),
    exhibitObject: exhibit,
    heightOffset: 0.15,
  });

  exhibit.position.copy(snap.position);
  exhibit.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(exhibit);
  const bottomCenter = new THREE.Vector3(
    (box.min.x + box.max.x) / 2,
    box.min.y,
    (box.min.z + box.max.z) / 2,
  );

  assert.deepEqual(
    bottomCenter.toArray().map((value) => Number(value.toFixed(3))),
    [1.5, 0.2, -2],
  );
});

test("resolveExhibitFloorSnap uses a named platform above a lower floor when available", async () => {
  const { resolveExhibitFloorSnap } = await import("../src/scenes/exhibits/exhibitPlacement.ts");

  const root = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10));
  floor.name = "COL_FLOOR_lower";
  floor.position.y = 0;
  root.add(floor);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 2));
  platform.name = "COL_PLATFORM_treehabitat";
  platform.position.y = 1.35;
  root.add(platform);

  const exhibit = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
  exhibit.add(body);
  root.updateMatrixWorld(true);
  exhibit.updateMatrixWorld(true);

  const snap = resolveExhibitFloorSnap({
    root,
    anchorPosition: new THREE.Vector3(0, 1.8, 0),
    exhibitObject: exhibit,
    heightOffset: 0,
  });

  assert.equal(snap.floorName, "COL_PLATFORM_treehabitat");
  assert.equal(Number(snap.floorY.toFixed(3)), 1.75);
});

test("bindSceneExhibitId marks root and child meshes for raycast bubbling", async () => {
  const { bindSceneExhibitId } = await import("../src/scenes/exhibits/exhibitPlacement.ts");

  const root = new THREE.Group();
  const child = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  root.add(child);

  bindSceneExhibitId(root, "work_001");

  assert.equal(root.userData.exhibitId, "work_001");
  assert.equal(child.userData.exhibitId, "work_001");
});

test("findSceneExhibitRoot returns the whole exhibit root from a child mesh hit", async () => {
  const { bindSceneExhibitId, findSceneExhibitRoot } = await import("../src/scenes/exhibits/exhibitPlacement.ts");

  const exhibit = new THREE.Group();
  const section = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  section.add(leaf);
  exhibit.add(section);

  bindSceneExhibitId(exhibit, "work_001");

  assert.equal(findSceneExhibitRoot(leaf, "work_001"), exhibit);
});

test("normalizeExhibitSceneConfig supplies default placement and load settings", async () => {
  const { normalizeExhibitSceneConfig } = await import("../src/exhibits/manifest.ts");

  const scene = normalizeExhibitSceneConfig({
    anchor: "ANCHOR_WORK_001",
    models: {
      lod0: "/exhibits/work_001/work_001.lod0.glb",
      lod1: "/exhibits/work_001/work_001.lod1.glb",
      lod2: "/exhibits/work_001/work_001.lod2.glb",
    },
  });

  assert.equal(scene.anchor, "ANCHOR_WORK_001");
  assert.equal(scene.scale, 1);
  assert.deepEqual(scene.placement, { snap: "floor", heightOffset: 0, yawOffsetDeg: 0 });
  assert.deepEqual(scene.load, {
    lod0Distance: 8,
    lod1Distance: 22,
    lod2Distance: 45,
    unloadDistance: 60,
  });
});
