import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("exhibit hover accent uses the signal token at a readable intensity", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");
  const { SPACE_VISUAL_TOKENS } = await importSourceModule("space/spaceVisualTokens.ts");

  assert.equal(config.EXHIBIT_TARGET.emissiveColor, SPACE_VISUAL_TOKENS.colors.signal);
  assert.equal(SPACE_VISUAL_TOKENS.colors.signal, "#ef8b61");
  assert.ok(
    config.EXHIBIT_TARGET.emissiveIntensity >= 0.2,
    "hover accent must be visible, not a near-invisible tint",
  );
  assert.ok(
    config.EXHIBIT_TARGET.emissiveIntensity <= 0.6,
    "hover accent stays an accent, not a wash",
  );
});
