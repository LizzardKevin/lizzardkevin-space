import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  WORK_GALLERY_FLOW_SPEED_PX_S,
  resolveGalleryCopyCount,
  wrapGalleryScrollLeft,
} from "../../src/pages/works/workGalleryFlow.ts";

test("wrapGalleryScrollLeft wraps both directions into [0, period)", () => {
  const period = 1000;
  assert.equal(wrapGalleryScrollLeft(0, period), 0);
  assert.equal(wrapGalleryScrollLeft(320, period), 320);
  assert.equal(wrapGalleryScrollLeft(1000, period), 0, "exact period wraps to origin");
  assert.equal(wrapGalleryScrollLeft(1030, period), 30, "forward overflow wraps by one period");
  assert.equal(wrapGalleryScrollLeft(-30, period), 970, "backward overflow wraps to the tail");
  assert.equal(wrapGalleryScrollLeft(2530, period), 530, "multi-period overflow wraps by modulo");
  assert.equal(wrapGalleryScrollLeft(-2530, period), 470, "negative multi-period wraps by modulo");
});

test("wrapGalleryScrollLeft passes values through when the period is unknown", () => {
  assert.equal(wrapGalleryScrollLeft(500, 0), 500);
  assert.equal(wrapGalleryScrollLeft(-5, 0), -5);
  assert.equal(wrapGalleryScrollLeft(500, -1), 500);
});

test("resolveGalleryCopyCount keeps the wrap landing spot scrollable", () => {
  // 不变量:maxScroll = copies * setWidth - clientWidth >= setWidth
  assert.equal(resolveGalleryCopyCount(1000, 0), 2, "unmeasured period falls back to two copies");
  assert.equal(resolveGalleryCopyCount(1200, 15000), 2, "a long set needs only two copies");
  assert.equal(resolveGalleryCopyCount(1000, 1000), 2, "set exactly one viewport wide still fits");
  assert.equal(resolveGalleryCopyCount(1010, 1000), 3, "just over one viewport wide needs a third copy");
  assert.equal(resolveGalleryCopyCount(2300, 1000), 4, "ultra-wide viewports scale copies accordingly");
  for (const [clientWidth, setWidth] of [[1700, 1772], [2560, 1772], [800, 1200]]) {
    const copies = resolveGalleryCopyCount(clientWidth, setWidth);
    assert.ok(
      copies * setWidth - clientWidth >= setWidth,
      `copies=${copies} must keep maxScroll >= setWidth for ${clientWidth}/${setWidth}`,
    );
  }
});

test("auto-flow speed stays slow, constant and inside the 24-40px/s budget", () => {
  assert.ok(WORK_GALLERY_FLOW_SPEED_PX_S >= 24);
  assert.ok(WORK_GALLERY_FLOW_SPEED_PX_S <= 40);
});

test("work detail page wires the auto-flow without breaking drag or lightbox semantics", () => {
  const page = readFileSync(
    new URL("../../src/pages/works/WorkDetailPage.tsx", import.meta.url),
    "utf8",
  );
  // 自动流 hook 接入轨道与拖拽状态,lightbox 打开时经 paused 暂停
  assert.match(page, /useGalleryAutoFlow\(\{/);
  assert.match(page, /trackRef: galleryRef/);
  assert.match(page, /interaction: galleryInteraction/);
  assert.match(page, /paused: selectedImage !== null/);
  // 内容按份复制实现无缝循环,复制份对辅助技术隐藏
  assert.match(page, /Array\.from\(\{ length: galleryCopies \}/);
  assert.match(page, /aria-hidden=\{copyIndex > 0 \|\| undefined\}/);
  // 拖拽 hook 拿到环绕周期;点击开 lightbox 的逻辑保留
  assert.match(page, /getWrapPeriod: \(\) => galleryWrapPeriodRef\.current/);
  assert.match(page, /setSelectedImage\(\{ src: url/);

  const flow = readFileSync(
    new URL("../../src/pages/works/useGalleryAutoFlow.ts", import.meta.url),
    "utf8",
  );
  // 暂停条件:hover(仅精确指针)/拖拽/惯性/页面不可见/paused;reduced-motion 与 dev 钩子关闭
  assert.match(flow, /interaction\.dragging/);
  assert.match(flow, /interaction\.momentum/);
  assert.match(flow, /document\.hidden/);
  assert.match(flow, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(flow, /prefersReducedMotion/);
  assert.match(flow, /wpGalleryFlow/);

  const drag = readFileSync(
    new URL("../../src/pages/works/useDragScroll.ts", import.meta.url),
    "utf8",
  );
  // 拖拽/惯性写入都过环绕;吞 click 与延迟 capture 的语义保留
  assert.match(drag, /wrapGalleryScrollLeft/);
  assert.match(drag, /suppressClickUntil = Date\.now\(\) \+ 350/);
  assert.match(drag, /Math\.abs\(dx\) > 4 && !moved/);
});
