import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";

const host = readProjectFile("apps/web/src/pages/works/WorkParticleHost.tsx");
const page = readProjectFile("apps/web/src/pages/works/WorkDetailPage.tsx");
const shell = readProjectFile("apps/web/src/scroll/ScrollPageShell.tsx");

// 宿主 canvas 铺满视口但不拦截任何指针事件（光标经 window pointermove 喂 NDC）。
assert.match(host, /pointerEvents:\s*"none"/, "particle host canvas must be pointer-events: none");

// 粒子宿主与作品页都不得引入 R3F <Canvas>（渲染走 ParticlePointsRenderer 的裸 canvas 闭环）。
assert.doesNotMatch(host, /<Canvas\b/, "particle host must use a plain canvas, not R3F <Canvas>");
assert.doesNotMatch(page, /<Canvas\b/, "work detail page must not own an R3F <Canvas>");

// 旧的内嵌 R3F 查看器已下线：文件删除且页面不再引用。
assert.equal(
  existsSync(projectPath("apps/web/src/pages/works/WorkModelViewer.tsx")),
  false,
  "WorkModelViewer.tsx must be deleted",
);
assert.doesNotMatch(page, /WorkModelViewer|OrbitControls/);

// 作品页按展品挂载全页粒子宿主（model3d 且未失败时）。
assert.match(page, /<WorkParticleHost\b/);

// 两段式页面:hero + 单一 #work-media 分节(视频/图集合并在内),无 overview/story/spec。
assert.match(page, /id="work-hero"/, "hero section must stay");
assert.match(page, /id="work-media"/, "media section must exist");
assert.doesNotMatch(page, /id="work-overview"|id="work-story"|id="work-spec"/,
  "overview/story/spec sections must be removed");
assert.doesNotMatch(page, /ark-wnav/, "legacy prev/next nav block must be removed");
// 上一件/下一件由 WorkEdgeNav(固定左右视口边缘、decrypt 揭示)承担。
assert.match(page, /const prevWork = works\.length > 1/, "prevWork computation must stay in the page");
assert.match(page, /const nextWork = works\.length > 1/, "nextWork computation must stay in the page");
assert.match(page, /<WorkEdgeNav\b/, "edge nav must be wired into the page");
assert.match(page, /prev=\{\{ id: prevWork\.exhibitId/, "edge nav prev must get the previous exhibit");
assert.match(page, /next=\{\{ id: nextWork\.exhibitId/, "edge nav next must get the next exhibit");
assert.doesNotMatch(page, /data-prev-work/, "interim data-attribute wiring must be gone");
// 边缘导航不使用玻璃拟态。
const edgeNav = readProjectFile("apps/web/src/pages/works/WorkEdgeNav.tsx");
assert.doesNotMatch(edgeNav, /ArkGlassTile/, "edge nav must not use the glass tile");
// 顶栏锚点:仅保留到媒体段的一个锚点。
assert.match(page, /\{ id: "work-media", label: "MED" \}/, "only the media anchor should remain");

// 滚动解构:锚定 #work-media(无媒体数据退化为页尾 footer),onUpdate 直写 setMorphProgress。
assert.match(host, /setMorphProgress/);
assert.match(host, /getElementById\("work-media"\)/, "morph must anchor to #work-media");
assert.match(host, /\.ark-footer/, "morph anchor must degrade to the page footer when media is absent");
assert.doesNotMatch(host, /work-overview/, "morph must no longer anchor to #work-overview");

// 壳层背景默认保持 dotgrid（Profile/DevStories 行为不变），works 详情页显式关闭。
assert.match(shell, /background\s*=\s*"dotgrid"/, "shell background must default to dotgrid");
assert.match(page, /background="none"/, "work detail page must opt out of the dotgrid background");

console.log("work particle host contract tests passed");
