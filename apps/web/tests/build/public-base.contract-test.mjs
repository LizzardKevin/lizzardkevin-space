import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("public asset helper preserves root-hosted paths by default", async () => {
  const { publicAssetUrl } = await importSourceModule("platform/publicAssets.ts");

  assert.equal(publicAssetUrl("/models/space_main.glb"), "/models/space_main.glb");
  assert.equal(publicAssetUrl("/audio/footstep_01.wav"), "/audio/footstep_01.wav");
  assert.equal(publicAssetUrl("https://cdn.example.com/model.glb"), "https://cdn.example.com/model.glb");
});

test("public asset helper prefixes project pages base paths", async () => {
  const { withPublicAssetBase } = await importSourceModule("platform/publicAssets.ts");

  assert.equal(
    withPublicAssetBase("/models/space_main.glb?v=20260701", "/lizzardkevin-space/"),
    "/lizzardkevin-space/models/space_main.glb?v=20260701",
  );
  assert.equal(
    withPublicAssetBase("/exhibits/manifest.json", "/lizzardkevin-space/"),
    "/lizzardkevin-space/exhibits/manifest.json",
  );
  assert.equal(withPublicAssetBase("/draco/", "/lizzardkevin-space/"), "/lizzardkevin-space/draco/");
  assert.equal(
    withPublicAssetBase("/lizzardkevin-space/media/work_001.mp3", "/lizzardkevin-space/"),
    "/lizzardkevin-space/media/work_001.mp3",
  );
});
