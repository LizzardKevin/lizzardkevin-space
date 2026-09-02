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

// 滚动解构：overview 进入视口驱动 setMorphProgress（onUpdate 直写，无 scrub 迟滞）。
assert.match(host, /setMorphProgress/);
assert.match(host, /trigger:\s*["']#work-overview["']/);

// 壳层背景默认保持 dotgrid（Profile/DevStories 行为不变），works 详情页显式关闭。
assert.match(shell, /background\s*=\s*"dotgrid"/, "shell background must default to dotgrid");
assert.match(page, /background="none"/, "work detail page must opt out of the dotgrid background");

console.log("work particle host contract tests passed");
