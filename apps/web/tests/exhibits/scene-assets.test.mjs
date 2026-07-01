import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { publicPath } from "../helpers/projectPaths.mjs";
import { readGlbJson } from "../helpers/glb.mjs";

const publicDir = publicPath();

test("scene exhibit manifest points active exhibits at anchors and three LOD models", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const ids = manifest.exhibits.map((item) => item.exhibitId);

  assert.ok(!ids.includes("demo_box"));
  assert.ok(!ids.includes("demo_bass"));

  for (const exhibitId of [
    "arch_treehabitat",
    "arch_uabb_exhibit",
    "arch_3d_printing_architecture",
  ]) {
    const exhibit = manifest.exhibits.find((item) => item.exhibitId === exhibitId);
    assert.ok(exhibit?.scene, `${exhibitId} needs scene placement config`);
    assert.match(exhibit.scene.anchor, /^ANCHOR_/);
    assert.deepEqual(Object.keys(exhibit.scene.models).sort(), ["lod0", "lod1", "lod2"]);
    for (const url of Object.values(exhibit.scene.models)) {
      assert.ok(fs.existsSync(path.join(publicDir, url)), `${url} must exist`);
    }
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

  for (const url of imageUrls) {
    const filePath = path.join(publicDir, url.replace(/^\//, ""));
    const size = fs.statSync(filePath).size;
    assert.ok(size < 2 * 1024 * 1024, `${url} should be under 2MB, got ${size} bytes`);
  }
});

test("world-coordinate exhibit GLBs use the runtime world-origin anchor without floor snapping", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const ids = ["arch_treehabitat", "arch_uabb_exhibit", "arch_3d_printing_architecture"];

  for (const exhibitId of ids) {
    const exhibit = manifest.exhibits.find((item) => item.exhibitId === exhibitId);
    assert.equal(exhibit?.scene?.anchor, "ANCHOR_WORLD_ORIGIN", `${exhibitId} anchor`);
    assert.deepEqual(exhibit?.scene?.distanceAnchor?.length, 3, `${exhibitId} needs a LOD distance anchor`);
    assert.ok(
      exhibit.scene.distanceAnchor.some((value) => Math.abs(value) > 0.001),
      `${exhibitId} distance anchor should track the authored model bounds, not the world origin`,
    );
    assert.equal(exhibit?.scene?.placement?.snap, "none", `${exhibitId} should keep authored world coordinates`);
    assert.equal(exhibit?.scene?.placement?.heightOffset, 0, `${exhibitId} height offset`);
  }
});

test("UABB uses generated LOD levels from the named source model", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_uabb_exhibit");
  const models = exhibit?.scene?.models ?? {};

  assert.deepEqual(models, {
    lod0: "/exhibits/arch_uabb_exhibit/arch_uabb_exhibit.lod0.glb",
    lod1: "/exhibits/arch_uabb_exhibit/arch_uabb_exhibit.lod1.glb",
    lod2: "/exhibits/arch_uabb_exhibit/arch_uabb_exhibit.lod2.glb",
  });

  const source = readGlbJson(path.join(publicDir, "exhibits/arch_uabb_exhibit/arch_uabb_exhibit.source.glb"));
  const namedNodes = (source.nodes ?? []).filter((node) => node.name);
  assert.ok(namedNodes.length > 0, "UABB source GLB should preserve authored mesh/node names");
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

test("space_main GLB includes production exhibit anchors and no embedded exhibit meshes", () => {
  const json = readGlbJson(path.join(publicDir, "models/space_main.glb"));
  const names = new Set((json.nodes ?? []).map((node) => node.name).filter(Boolean));

  assert.ok(names.has("ANCHOR_ARCH_TREEHABITAT"));
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
