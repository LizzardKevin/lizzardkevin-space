import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("exhibit hover accent uses the paper token at a readable intensity", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");
  const { SPACE_VISUAL_TOKENS } = await importSourceModule("space/spaceVisualTokens.ts");

  // 用户决定（round 6）：raycast 命中展品的高亮从橙色 signal 改为纸白 paper。
  assert.equal(config.EXHIBIT_TARGET.emissiveColor, SPACE_VISUAL_TOKENS.colors.paper);
  assert.equal(SPACE_VISUAL_TOKENS.colors.paper, "#f3f0e7");
  assert.ok(
    config.EXHIBIT_TARGET.emissiveIntensity >= 0.2,
    "hover accent must be visible, not a near-invisible tint",
  );
  assert.ok(
    config.EXHIBIT_TARGET.emissiveIntensity <= 0.6,
    "hover accent stays an accent, not a wash",
  );
});
