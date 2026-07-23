import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const tilePath = join(root, "src/components/ArkGlassTile.tsx");
const srcRoot = join(root, "src");

function read(path) {
  return readFileSync(path, "utf8");
}

function collectSourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "generated") continue;
      collectSourceFiles(full, out);
      continue;
    }
    if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(full);
  }
  return out;
}

describe("ArkGlassTile contract", () => {
  it("exists and locks restrained industrial presets", () => {
    const src = read(tilePath);
    assert.match(src, /from ["']@khvicha\/react-liquid-glass["']/);
    assert.match(src, /enableClickAnimation=\{false\}/);
    assert.match(src, /parallaxMovement=\{0\}/);
    assert.match(src, /borderRadius=\{0\}/);
    assert.match(src, /enableShadow=\{false\}/);
    assert.match(src, /enableBorderAnimation=\{false\}/);
    assert.match(src, /blur=\{1\}/);
    assert.match(src, /enableGlassEffect=\{false\}/);
    assert.match(src, /displacementScale=\{0\}/);
    assert.match(src, /POINTER_LERP = 0\.2/);
    assert.match(src, /--ark-glass-edge-t/);
    assert.match(src, /ark-glass-tile__glow/);
    assert.match(src, /contentClassName="ark-glass-tile__pad"/);
  });

  it("scroll-pages CSS pads content inside the frame and proximity edge lights", () => {
    const css = read(join(root, "src/styles/scroll-pages.css"));
    assert.match(css, /\.ark-glass-tile__pad/);
    assert.match(css, /\.ark-dentry__panel \.ark-glass-tile__pad[\s\S]*?padding:\s*32px 36px 36px/);
    assert.match(css, /\.ark-glass-tile__edge--t/);
    assert.match(css, /--ark-glass-edge-t/);
    assert.match(css, /\.ark-glass-tile__glow/);
    assert.match(css, /overflow:\s*hidden/);
    assert.match(css, /\.ark-glass-tile \.liquidGlass-shine[\s\S]*?opacity:\s*0\s*!important/);
    assert.doesNotMatch(
      css,
      /\.ark-glass-tile__fx \{[\s\S]*?box-shadow:\s*[\s\S]*?inset 0 1px 0/,
    );
  });

  it("is the only apps/web/src consumer of @khvicha/react-liquid-glass", () => {
    const hits = collectSourceFiles(srcRoot).filter((file) => {
      if (file === tilePath) return false;
      return read(file).includes("@khvicha/react-liquid-glass");
    });
    assert.deepEqual(
      hits.map((f) => relative(srcRoot, f)),
      [],
      "call sites must import ArkGlassTile, not the raw package",
    );
  });
});
