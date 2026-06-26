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

  for (const exhibitId of ["arch_treehabitat"]) {
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

test("Tree Habitat uses a plinth height offset until its platform collider is named as a platform", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/manifest.json"), "utf8"),
  );
  const exhibit = manifest.exhibits.find((item) => item.exhibitId === "arch_treehabitat");

  assert.equal(exhibit?.scene?.placement?.heightOffset, 0.8);
});

test("Tree Habitat content sample has portfolio metadata and no pipeline copy", () => {
  const content = JSON.parse(
    fs.readFileSync(path.join(publicDir, "exhibits/arch_treehabitat/content.json"), "utf8"),
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
