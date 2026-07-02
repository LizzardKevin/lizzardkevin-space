import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { publicPath } from "../helpers/projectPaths.mjs";
import { readGlbJson } from "../helpers/glb.mjs";

const publicDir = publicPath();
const SCENE_EXHIBIT_IDS = [
  "arch_treehabitat",
  "arch_uabb_exhibit",
  "arch_3d_printing_architecture",
];
const SPACE_TRIANGLE_BUDGET = 50_000;
const FOCUS_TRIANGLE_BUDGET = 150_000;

function countGlbTriangles(filePath) {
  const json = readGlbJson(filePath);
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;
      const count =
        primitive.indices !== undefined
          ? json.accessors[primitive.indices].count
          : json.accessors[primitive.attributes.POSITION].count;
      if (mode === 4) triangles += Math.floor(count / 3);
      else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2);
    }
  }
  return triangles;
}

test("scene exhibit manifest uses authored world coordinates and one SPACE model", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const ids = manifest.exhibits.map((item) => item.exhibitId);

  assert.ok(!ids.includes("demo_box"));
  assert.ok(!ids.includes("demo_bass"));

  for (const exhibitId of SCENE_EXHIBIT_IDS) {
    const exhibit = manifest.exhibits.find((item) => item.exhibitId === exhibitId);
    assert.ok(exhibit?.scene, `${exhibitId} needs scene placement config`);
    assert.equal("anchor" in exhibit.scene, false, `${exhibitId} must not use exhibit anchors`);
    assert.equal("distanceAnchor" in exhibit.scene, false, `${exhibitId} must not use legacy distance anchors`);
    assert.equal("models" in exhibit.scene, false, `${exhibitId} must not declare LOD models`);
    assert.match(exhibit.scene.modelUrl, /^\/exhibits\/.+\/space_.+\.glb$/);
    assert.ok(fs.existsSync(path.join(publicDir, exhibit.scene.modelUrl)), `${exhibit.scene.modelUrl} must exist`);
  }
});

test("Tree Habitat manifest exposes all focus images in natural order", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_treehabitat");
  const imageDir = path.join(publicDir, "exhibits/arch_treehabitat/img");
  const expected = fs
    .readdirSync(imageDir)
    .filter((name) => /\.(avif|gif|jpe?g|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/exhibits/arch_treehabitat/img/${name}`);

  assert.deepEqual(exhibit?.media?.imageUrls, expected);
});

test("Tree Habitat focus images stay below the 2MB loading budget", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_treehabitat");
  const imageUrls = exhibit?.media?.imageUrls ?? [];
  assert.ok(imageUrls.length > 0, "Tree Habitat needs focus images to validate");
  assert.ok(
    imageUrls.every((url) => url.endsWith(".webp")),
    "Tree Habitat focus images should use optimized WebP assets",
  );

  for (const url of imageUrls) {
    const filePath = path.join(publicDir, url.replace(/^\//, ""));
    const size = fs.statSync(filePath).size;
    assert.ok(size < 2 * 1024 * 1024, `${url} should be under 2MB, got ${size} bytes`);
  }
});

test("UABB manifest exposes optimized board images in natural order", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_uabb_exhibit");
  const imageDir = path.join(publicDir, "exhibits/arch_uabb_exhibit/img");
  const expected = fs
    .readdirSync(imageDir)
    .filter((name) => /\.(avif|gif|jpe?g|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/exhibits/arch_uabb_exhibit/img/${name}`);

  assert.deepEqual(exhibit?.media?.imageUrls, expected);
});

test("UABB focus board images stay below the 2MB loading budget", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_uabb_exhibit");
  const imageUrls = exhibit?.media?.imageUrls ?? [];
  assert.ok(imageUrls.length > 0, "UABB needs focus board images to validate");

  for (const url of imageUrls) {
    const filePath = path.join(publicDir, url.replace(/^\//, ""));
    const size = fs.statSync(filePath).size;
    assert.ok(size < 2 * 1024 * 1024, `${url} should be under 2MB, got ${size} bytes`);
  }
});

test("world-coordinate exhibit GLBs keep authored placement without anchors or floor snapping", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  for (const exhibitId of SCENE_EXHIBIT_IDS) {
    const exhibit = manifest.exhibits.find((item) => item.exhibitId === exhibitId);
    assert.equal("anchor" in exhibit.scene, false, `${exhibitId} anchor`);
    assert.equal(exhibit?.scene?.distanceCenter?.length, 3, `${exhibitId} needs a distance center`);
    assert.ok(
      exhibit.scene.distanceCenter.every((value) => typeof value === "number" && Number.isFinite(value)),
      `${exhibitId} distance center should be finite`,
    );
    assert.ok(
      exhibit.scene.distanceCenter.some((value) => Math.abs(value) > 0.001),
      `${exhibitId} distance center should track the authored model bounds, not the world origin`,
    );
    assert.equal(exhibit?.scene?.placement?.snap, "none", `${exhibitId} should keep authored world coordinates`);
    assert.equal(exhibit?.scene?.placement?.heightOffset, 0, `${exhibitId} height offset`);
  }
});

test("3D Printing scene model stays inside the authored walkable gallery envelope", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find(
    (item) => item.exhibitId === "arch_3d_printing_architecture",
  );
  const [x, y, z] = exhibit.scene.distanceCenter;

  assert.ok(x > -30 && x < 30, "3D Printing should not be exported hundreds of meters from the gallery");
  assert.ok(y > 20 && y < 40, "3D Printing should sit near an authored gallery floor level");
  assert.ok(z > -55 && z < 25, "3D Printing should remain inside the active gallery footprint");
});

test("UABB uses generated SPACE model from the named source model", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_uabb_exhibit");
  assert.equal(exhibit?.scene?.modelUrl, "/exhibits/arch_uabb_exhibit/space_arch_uabb_exhibit.glb");

  const source = readGlbJson(path.join(publicDir, "exhibits/arch_uabb_exhibit/arch_uabb_exhibit.source.glb"));
  const namedNodes = (source.nodes ?? []).filter((node) => node.name);
  assert.ok(namedNodes.length > 0, "UABB source GLB should preserve authored mesh/node names");
});

test("scene and focus exhibit models stay within triangle budgets", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );

  for (const exhibitId of SCENE_EXHIBIT_IDS) {
    const exhibit = manifest.exhibits.find((item) => item.exhibitId === exhibitId);
    const spacePath = path.join(publicDir, exhibit.scene.modelUrl);
    const focusPath = path.join(publicDir, exhibit.focusGlbUrl);
    assert.ok(
      countGlbTriangles(spacePath) <= SPACE_TRIANGLE_BUDGET,
      `${exhibitId} SPACE model must be <= ${SPACE_TRIANGLE_BUDGET} triangles`,
    );
    assert.ok(
      countGlbTriangles(focusPath) <= FOCUS_TRIANGLE_BUDGET,
      `${exhibitId} Focus model must be <= ${FOCUS_TRIANGLE_BUDGET} triangles`,
    );
  }
});

test("active exhibit content samples have portfolio metadata and no pipeline copy", () => {
  for (const exhibitId of [
    "arch_treehabitat",
    "arch_uabb_exhibit",
    "arch_3d_printing_architecture",
  ]) {
    const content = JSON.parse(
      fs.readFileSync(path.join(publicDir, `exhibits/${exhibitId}/content.json`), "utf8"),
    );

    assert.equal(typeof content.subtitle, "string");
    assert.match(content.subtitle.trim(), /\S/);
    assert.ok(Array.isArray(content.metadata));
    for (const item of content.metadata) {
      assert.equal(typeof item.label, "string");
      assert.equal(typeof item.value, "string");
      assert.match(item.label.trim(), /\S/);
      assert.match(item.value.trim(), /\S/);
    }
    assert.deepEqual(
      content.metadata.map((item) => item.label),
      ["Year", "Type", "Medium", "Role", "Status"],
    );

    const exhibitCopy = [content.subtitle, content.overview, content.storyHtml].join(" ");
    assert.doesNotMatch(
      exhibitCopy,
      /\b(?:LOD|pipeline|space_main\.glb|anchor|clicked|highlighted|focus flow)\b/i,
    );
  }
});

test("space_main GLB has no exhibit anchors or embedded exhibit meshes", () => {
  const json = readGlbJson(path.join(publicDir, "models/space_main.glb"));
  const names = new Set((json.nodes ?? []).map((node) => node.name).filter(Boolean));

  assert.ok(![...names].some((name) => name.startsWith("ANCHOR_")));
  assert.ok(![...names].some((name) => name.startsWith("exhibit_")));
});

test("space_main GLB does not ship vertex AO color attributes", () => {
  const json = readGlbJson(path.join(publicDir, "models/space_main.glb"));
  const colorPrimitives = [];
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if (primitive.attributes?.COLOR_0 !== undefined) {
        colorPrimitives.push(mesh.name ?? "unnamed mesh");
      }
    }
  }

  assert.deepEqual(colorPrimitives, []);
});
