import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule, readSourceFile } from "../helpers/projectPaths.mjs";

test("fits the key light shadow camera tightly to the gallery bounds in light space", async () => {
  const { fitDirectionalShadowCamera } = await importSourceModule("scenes/gallery/galleryShadow.ts");

  const light = new THREE.DirectionalLight("#ffffff", 1);
  light.position.set(-5, 10, 4);
  const bounds = new THREE.Box3(
    new THREE.Vector3(-10, -5, -20),
    new THREE.Vector3(10, 5, 20),
  );
  const margin = 2;
  fitDirectionalShadowCamera(light, bounds, margin);

  const size = bounds.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const center = bounds.getCenter(new THREE.Vector3());

  assert.ok(light.target.position.distanceTo(center) < 1e-6, "target snaps to the bounds center");

  const direction = new THREE.Vector3(-5, 10, 4).normalize();
  const expectedPosition = center.clone().add(direction.multiplyScalar(radius * 2 + margin));
  assert.ok(
    light.position.distanceTo(expectedPosition) < 1e-4,
    `light should sit along its authored direction; got ${light.position.toArray()}`,
  );

  const rotation = new THREE.Matrix4().lookAt(light.position, light.target.position, new THREE.Vector3(0, 1, 0));
  const lightWorld = new THREE.Matrix4()
    .makeTranslation(light.position.x, light.position.y, light.position.z)
    .multiply(rotation);
  const view = lightWorld.invert();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < 8; i++) {
    const corner = new THREE.Vector3(
      i & 1 ? bounds.max.x : bounds.min.x,
      i & 2 ? bounds.max.y : bounds.min.y,
      i & 4 ? bounds.max.z : bounds.min.z,
    ).applyMatrix4(view);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  const camera = light.shadow.camera;
  assert.ok(Math.abs(camera.left - (minX - margin)) < 1e-4, "left hugs the projected bounds");
  assert.ok(Math.abs(camera.right - (maxX + margin)) < 1e-4, "right hugs the projected bounds");
  assert.ok(Math.abs(camera.top - (maxY + margin)) < 1e-4, "top hugs the projected bounds");
  assert.ok(Math.abs(camera.bottom - (minY - margin)) < 1e-4, "bottom hugs the projected bounds");
  assert.ok(Math.abs(camera.far - (-minZ + margin)) < 1e-4, "far hugs the farthest corner");
  assert.ok(camera.near > 0 && camera.far > camera.near, "near/far bracket the bounds");
  assert.ok(
    camera.far - camera.near < radius * 4,
    "light-space depth range must beat the old bounding-sphere span",
  );
  assert.equal(light.shadow.autoUpdate, false, "the fitted key-light shadow stays static");
  assert.equal(light.shadow.needsUpdate, true, "camera fitting requests one fresh shadow render");
});

test("static shadow refresh marks the named key light instead of renderer-global state", async () => {
  const { GALLERY_KEY_LIGHT_NAME, refreshStaticShadowMap } = await importSourceModule(
    "scenes/gallery/galleryShadow.ts",
  );
  const scene = new THREE.Scene();
  const light = new THREE.DirectionalLight("#ffffff", 1);
  light.name = GALLERY_KEY_LIGHT_NAME;
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = false;
  scene.add(light);

  refreshStaticShadowMap(scene);

  assert.equal(light.shadow.needsUpdate, true);
});

test("opaque exhibit meshes cast and receive while glass and emissive meshes stay excluded", async () => {
  const { configureSceneExhibitShadows } = await importSourceModule(
    "scenes/exhibits/sceneExhibitShadows.ts",
  );
  const root = new THREE.Group();
  const opaque = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.5, transmission: 0.4 }),
  );
  const emissive = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ emissive: "#ffffff", emissiveIntensity: 2 }),
  );
  root.add(opaque, glass, emissive);

  configureSceneExhibitShadows(root);

  assert.equal(opaque.castShadow, true);
  assert.equal(opaque.receiveShadow, true);
  assert.equal(glass.castShadow, false);
  assert.equal(glass.receiveShadow, false);
  assert.equal(emissive.castShadow, false);
  assert.equal(emissive.receiveShadow, false);
});

test("shadow config uses the approved sharp preset", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.equal(config.ENABLE_GALLERY_RUNTIME_SHADOWS, true);
  assert.equal(config.GALLERY_SHADOW.mapSize, 4096);
  assert.ok(
    config.GALLERY_SHADOW.normalBias >= 0.04 && config.GALLERY_SHADOW.normalBias <= 0.1,
    "normalBias kills wall acne without opening corner seams (0.2 showed shadow offsets at corners)",
  );
  assert.ok(
    config.GALLERY_SHADOW.bias < 0 && config.GALLERY_SHADOW.bias > -0.001,
    "a small constant bias pushes along the light direction without normal-dependent seams",
  );
  assert.ok(config.GALLERY_SHADOW.margin >= 1);
});

test("key light casts shadows only for the full profile with a fitted camera", () => {
  const session = readSourceFile("space/SpaceSession.tsx");
  const model = readSourceFile("scenes/gallery/GalleryModel.tsx");

  assert.match(session, /GALLERY_KEY_LIGHT_NAME/, "key light is named for the gallery fit pass");
  assert.match(
    session,
    /castShadow=\{profile\.shadows/,
    "key light castShadow stays profile-gated so simplified never mounts shadow maps",
  );
  assert.match(model, /fitDirectionalShadowCamera/, "GalleryModel fits the shadow camera to the GLB bounds");
});

test("canvas requests filtered shadow edges and a static update policy", () => {
  const host = readSourceFile("space/SpaceCanvasHost.tsx");
  const session = readSourceFile("space/SpaceSession.tsx");

  assert.match(host, /PCFShadowMap/, "full canvas asks for filtered (non-jaggy) shadow edges");
  assert.match(session, /shadow-autoUpdate=\{false\}/, "the key light shadow renders on demand");
  assert.doesNotMatch(
    host,
    /shadowMap\.(?:autoUpdate|needsUpdate)/,
    "WebGPURenderer has no renderer-global static shadow update flags",
  );
});

test("exhibit mount and unmount refresh the static shadow map", () => {
  const placement = readSourceFile("scenes/exhibits/SceneExhibitPlacement.tsx");

  assert.match(
    placement,
    /refreshStaticShadowMap/,
    "exhibit LOD changes must re-render the shadow map once",
  );
});

test("glass and emissive light meshes neither cast nor receive shadows", async () => {
  const { prepareGalleryScene } = await importSourceModule("scenes/gallery/prepareGalleryScene.ts");

  const root = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  wall.name = "ARCH_WALL_001";
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  glass.name = "GLASS_CLEAR_001";
  const lightMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  lightMesh.name = "LIGHT_GENERIC_LIGHT_PANEL_001";
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  bulb.name = "bulb_001";
  root.add(wall, glass, lightMesh, bulb);
  root.updateMatrixWorld(true);

  prepareGalleryScene(root);

  assert.equal(wall.castShadow, true);
  assert.equal(wall.receiveShadow, true);
  assert.equal(glass.castShadow, false, "glass stays out of the shadow pass");
  assert.equal(glass.receiveShadow, false, "transparent glass must not show shadows on its surface");
  assert.equal(lightMesh.castShadow, false, "emissive panels stay out of the shadow pass");
  assert.equal(lightMesh.receiveShadow, false, "emissive panels must not be darkened by shadows");
  assert.equal(bulb.castShadow, false, "bulb meshes stay out of the shadow pass");
  assert.equal(bulb.receiveShadow, false);
});

test("bulb point lights stay out of the shadow pass", () => {
  const model = readSourceFile("scenes/gallery/GalleryModel.tsx");

  assert.match(
    model,
    /castShadow=\{false\}/,
    "eight point-light cube shadow maps are too expensive; bulbs never cast",
  );
});
