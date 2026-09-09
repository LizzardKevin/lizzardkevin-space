import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  INTRO_DURATION_SEC,
  INTRO_HEIGHT_WEIGHT,
  INTRO_RAND_JITTER,
  INTRO_REVEAL_WINDOW,
  introAlpha,
  introPointReveal,
  introRevealThreshold,
  introYellowWeight,
} from "../../src/particles/introReveal.ts";

const particlesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/particles");
const hostPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/pages/works/WorkParticleHost.tsx",
);

const DEPTH_GRID = [-1, 0, 0.25, 0.5, 0.75, 1, 2];
const HEIGHT_GRID = [-1, 0, 0.25, 0.5, 0.75, 1, 2];
const RAND_GRID = [0, 0.13, 0.33, 0.66, 0.99, 1];

test("intro constants: duration ~2.0-2.4s, per-point reveal window ~0.3-0.5s", () => {
  assert.ok(
    INTRO_DURATION_SEC >= 2.0 && INTRO_DURATION_SEC <= 2.4,
    `duration ${INTRO_DURATION_SEC}s outside 2.0-2.4s`,
  );
  const perPointSec = INTRO_REVEAL_WINDOW * INTRO_DURATION_SEC;
  assert.ok(
    perPointSec >= 0.3 && perPointSec <= 0.5,
    `per-point reveal ${perPointSec}s outside 0.3-0.5s`,
  );
  assert.ok(INTRO_REVEAL_WINDOW > 0 && INTRO_REVEAL_WINDOW < 1);
  assert.ok(INTRO_RAND_JITTER >= 0 && INTRO_RAND_JITTER <= 0.5);
  assert.ok(INTRO_HEIGHT_WEIGHT > 0 && INTRO_HEIGHT_WEIGHT < 1);
});

test("intro threshold: deterministic, finite, within [0, 1-window]", () => {
  for (const depthNorm of DEPTH_GRID) {
    for (const heightNorm of HEIGHT_GRID) {
      for (const rand of RAND_GRID) {
        const threshold = introRevealThreshold(depthNorm, heightNorm, rand);
        assert.ok(
          Number.isFinite(threshold),
          `NaN/Inf at depth=${depthNorm} height=${heightNorm} rand=${rand}`,
        );
        assert.ok(threshold >= 0, `threshold ${threshold} < 0`);
        assert.ok(
          threshold <= 1 - INTRO_REVEAL_WINDOW + 1e-9,
          `threshold ${threshold} leaves no reveal window`,
        );
        assert.equal(
          introRevealThreshold(depthNorm, heightNorm, rand),
          threshold,
          "threshold must be deterministic",
        );
      }
    }
  }
});

test("intro ordering: far points reveal before near points (wave sweeps far→near)", () => {
  for (const heightNorm of HEIGHT_GRID) {
    for (const rand of RAND_GRID) {
      const far = introRevealThreshold(1, heightNorm, rand);
      const near = introRevealThreshold(0, heightNorm, rand);
      assert.ok(far < near, `far threshold ${far} must be < near threshold ${near}`);
      // 中场进度:远点 reveal 进度恒大于近点。
      for (const progress of [0.1, 0.35, 0.5, 0.65, 0.9]) {
        assert.ok(
          introPointReveal(progress, far) >= introPointReveal(progress, near),
          `at progress ${progress} far must not lag near`,
        );
      }
    }
  }
  // rand 只打散切片,不颠倒远近量级:最远+最大抖动 仍早于 最近+最小抖动(同高度)。
  assert.ok(
    introRevealThreshold(1, 0.5, 1) < introRevealThreshold(0, 0.5, 0),
    "rand jitter must not invert the far→near sweep",
  );
});

test("intro ordering: low points reveal before high points at equal depth (tall-building wave)", () => {
  // 高瘦建筑场景:同深度时低处先出、顶部最后,顶部不再随远点第一时间闪黄。
  for (const depthNorm of DEPTH_GRID) {
    for (const rand of RAND_GRID) {
      const low = introRevealThreshold(depthNorm, 0, rand);
      const high = introRevealThreshold(depthNorm, 1, rand);
      assert.ok(
        low < high,
        `low threshold ${low} must be < high threshold ${high} at depth ${depthNorm}`,
      );
    }
  }
  // 极端角:同深度、顶部+最大抖动 仍晚于 底部+最小抖动。
  assert.ok(
    introRevealThreshold(0.5, 1, 1) > introRevealThreshold(0.5, 0, 0),
    "rand jitter must not invert the bottom→top sweep",
  );
  // 两轴等权:排序键 = (1−depth)×(1−H) + height×H,两个极端角分别是 远+底 与 近+顶。
  const farLow = introRevealThreshold(1, 0, 0); // 远+底 → 排序键 0
  const nearTop = introRevealThreshold(0, 1, 1); // 近+顶+满抖动 → 排序键 1,触及阈值上限
  assert.equal(farLow, 0, "far+bottom must be the very first threshold");
  assert.ok(
    Math.abs(nearTop - (1 - INTRO_REVEAL_WINDOW)) < 1e-9,
    "near+top must be the very last threshold",
  );
  const half = introRevealThreshold(1, 1, 0); // 远+顶 → 排序键 = 高度权重 H
  const expected = INTRO_HEIGHT_WEIGHT * (1 - INTRO_RAND_JITTER) * (1 - INTRO_REVEAL_WINDOW);
  assert.ok(Math.abs(half - expected) < 1e-9, `mid-order threshold ${half} != ${expected}`);
});

test("intro endpoints: progress 0 = fully hidden, progress 1 = fully revealed", () => {
  for (const depthNorm of DEPTH_GRID) {
    for (const heightNorm of HEIGHT_GRID) {
      for (const rand of RAND_GRID) {
        const threshold = introRevealThreshold(depthNorm, heightNorm, rand);
        const atStart = introPointReveal(0, threshold);
        assert.equal(
          atStart,
          0,
          `progress=0 must be unrevealed (depth=${depthNorm} height=${heightNorm} rand=${rand})`,
        );
        assert.equal(introAlpha(atStart), 0, "progress=0 must be invisible");
        const atEnd = introPointReveal(1, threshold);
        assert.ok(atEnd > 0.9999, `progress=1 must be fully revealed, got ${atEnd}`);
        assert.equal(introAlpha(atEnd), 1, "progress=1 must be fully opaque");
        assert.ok(
          introYellowWeight(atEnd) < 0.001,
          `progress=1 must settle back to grayscale white, yellow weight ${introYellowWeight(atEnd)}`,
        );
      }
    }
  }
});

test("intro color curve: yellow at birth, grayscale white when settled", () => {
  assert.equal(introYellowWeight(0), 1, "newborn point is pure accent yellow");
  assert.equal(introYellowWeight(1), 0, "settled point shows no yellow");
  assert.equal(introAlpha(0), 0);
  assert.equal(introAlpha(1), 1);
  // 淡入(0→0.4)与转白(0.25→1)有重叠但淡入先完成:点一出现就是黄色,
  // 到 revealT=0.4 时已完全不透明且仍接近纯黄,之后才混回灰阶白。
  assert.ok(introAlpha(0.25) > 0.6, "point is mostly visible before the yellow→white blend starts");
  assert.equal(introAlpha(0.4), 1, "fade-in completes at revealT=0.4");
  assert.ok(
    introYellowWeight(0.4) > 0.85,
    "point is still accent yellow right after the fade-in completes",
  );
  for (const t of [-0.5, 0, 0.1, 0.4, 0.7, 1, 1.5]) {
    assert.ok(Number.isFinite(introAlpha(t)) && Number.isFinite(introYellowWeight(t)));
  }
});

const readSource = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

// 截取方法体(起始标记 → 下一个两空格缩进的 doc 注释),做帧循环零分配的文本断言。
const sliceMethod = (source, startMarker) => {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `marker not found: ${startMarker}`);
  const end = source.indexOf("\n  /**", start + startMarker.length);
  assert.notEqual(end, -1, `method body end not found after: ${startMarker}`);
  return source.slice(start, end);
};

test("renderer frame loop: no per-frame heap allocation in update/updateCameraPose", () => {
  const renderer = readSource(resolve(particlesDir, "ParticlePointsRenderer.ts"));
  const allocation = /new\s+(?:Spherical|Vector[234]|Matrix[34]|Color|PerspectiveCamera)\b/;
  for (const marker of ["  update(dt: number): void {", "  private updateCameraPose(): void {"]) {
    assert.doesNotMatch(sliceMethod(renderer, marker), allocation, `${marker} must not allocate`);
  }
  // Spherical 只许存在一次:实例级复用对象的字段初始化。
  assert.equal(
    renderer.match(/new\s+Spherical\(/g)?.length,
    1,
    "Spherical must be allocated exactly once (reused instance field)",
  );
});

test("intro wiring: uniforms in material, reveal driven by morph-后 depth+height, CPU only writes introProgress", () => {
  const material = readSource(resolve(particlesDir, "particlePointsMaterial.ts"));
  assert.match(material, /introProgress:\s*uniform\(1\)/, "introProgress defaults to 1 (revealed)");
  assert.match(material, /introColor:\s*uniform\(new Color\(0xe8d44d\)\)/, "accent yellow intro color");
  // reveal 深度基于 morph 后位置(finalPos),高度取 finalPos.y 按 introYMin/Max 归一化,
  // 每点 rand 参与阈值,深度/高度双轴按 INTRO_HEIGHT_WEIGHT 混合。
  assert.match(material, /modelViewMatrix\.mul\(vec4\(finalPos,\s*1\.0\)\)/);
  assert.match(material, /introYMin:\s*uniform\(/, "introYMin uniform must exist");
  assert.match(material, /introYMax:\s*uniform\(/, "introYMax uniform must exist");
  assert.match(material, /finalPos\.y[\s\S]*?uniforms\.introYMin[\s\S]*?uniforms\.introYMax/,
    "height norm must consume finalPos.y and the introY bounds");
  assert.match(material, /INTRO_HEIGHT_WEIGHT/, "height weight must flow from introReveal.ts");
  assert.match(material, /instanceRand\.mul\(float\(INTRO_RAND_JITTER\)\)/);
  // 单点 reveal 经 varying 进 fragment,透明度与颜色都消费它。
  assert.match(material, /varying\([\s\S]*?"v_particleIntroT"/, "intro reveal must pass through a varying");

  const renderer = readSource(resolve(particlesDir, "ParticlePointsRenderer.ts"));
  assert.match(renderer, /startIntro\(/, "renderer must expose startIntro()");
  // renderer 统一算好含地面的 y 区间并写 uniform(地面 y = 模型最低点 −0.01)。
  assert.match(renderer, /uniforms\.introYMin\.value/, "renderer must write introYMin");
  assert.match(renderer, /uniforms\.introYMax\.value/, "renderer must write introYMax");
  const introBlock = sliceMethod(renderer, "    // 入场揭示:CPU 每帧只写 introProgress");
  assert.match(introBlock, /uniforms\.introProgress\.value/, "update() advances introProgress only");

  const host = readSource(hostPath);
  const session = readSource(resolve(particlesDir, "../pages/works/WorkParticleSession.ts"));
  assert.match(session, /await this\.renderer\.prepareTransition\(data\)[\s\S]*?this\.renderer\.startIntro\(\)/, "session starts intro after material compilation and generation validation");
  assert.match(host, /renderer\.setIntroProgress\(/, "host must keep the wpIntro freeze-frame hook");
  assert.match(host, /wpPerf/, "host must keep the dev-only frame-time logging hook");
});

test("scatter-state opacity: circle mask stays separate from global alpha", () => {
  const material = readSource(resolve(particlesDir, "particlePointsMaterial.ts"));
  // 散开态 50%:opacityNode = 圆 mask × mix(1, 0.5, morphProgress) × 入场淡入。
  assert.match(
    material,
    /opacityNode\s*=\s*smoothstep\(float\(0\.32\),\s*float\(0\.5\)[\s\S]*?\.oneMinus\(\)[\s\S]*?\.mul\(mix\(float\(1\.0\),\s*float\(0\.5\),\s*uniforms\.morphProgress\)\)/,
    "opacityNode must multiply the circle mask by mix(1, 0.5, morphProgress)",
  );
  assert.match(material, /alphaToCoverage\s*=\s*true/, "MSAA coverage dithering must stay enabled");
});

console.log("intro reveal tests passed");
