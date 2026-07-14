# SPACE Architecture V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement approved Solution B: a route-driven, persistent desktop SPACE runtime with truthful WebGPU/WebGL2 profiles and a completely 3D-free mobile terminal.

**Architecture:** `main.tsx` resolves the platform once and lazy-loads either `DesktopApp` or `MobileApp`. Desktop uses React Router as the only URL authority and, after the first visit to `/`, retains one `SpaceCanvasHost`, one Rapier world, and one `SpaceScene` for the document lifetime; renderer profiles alter quality leaves, never runtime structure. Boot, routing, lobby, media loading, and HUD coordination are focused modules around that single runtime.

**Tech Stack:** React 19, React Router DOM 7, TypeScript 6, Vite 8, React Three Fiber 9, Three.js r184 `WebGPURenderer`, Rapier, node:test contract tests.

---

## Approved decisions and protected scope

- Canonical URLs are `/`, `/works/:exhibitId`, `/profile`, and `/devstories`. React Router owns navigation; aliases use `<Navigate replace>`. Do not add custom History API routing.
- `full` means an actually initialized WebGPU backend. WebGPU initialization failure, device-loss recovery, or explicit `forceWebGL` creates `WebGPURenderer({ forceWebGL: true })`, reports WebGL2, and uses `simplified`. WebGL2 is never `full`.
- Both profiles use the same Canvas, Rapier world, interaction rules, `SpaceScene`, assets, and Focus quality tier. Profile flags control only DPR, post-processing, shadows, and named expensive leaf effects.
- A cold content deep link does not import or start Three, R3F, Rapier, GLBs, renderer initialization, or the boot attempt. After `/` has started SPACE, `SpaceHost` remains mounted across same-document route changes.
- A hard refresh may restore only a versioned, validated semantic player pose from `sessionStorage`; renderer/boot/assets/pointer-lock/audio state are never restored.
- Mobile lazy-loads terminal code only. It never imports StartLobby, Three, R3F, Rapier, renderer code, `SpaceHost`, or GLBs.
- Do not create `FullSpaceRuntime`/`SimplifiedSpaceRuntime`, duplicate the main scene, add a state library, or put per-frame position/rotation data in React Context.
- Do not modify the workbook, `apps/web/src/generated/**`, `apps/web/public/exhibits/**`, GLBs, Blender files, or source media/assets. No content regeneration belongs in implementation commits.

## Target file responsibilities

- `apps/web/src/main.tsx`: resolve platform once, mount providers/router, and lazy-load exactly one platform app.
- `apps/web/src/app/DesktopApp.tsx`, `MobileApp.tsx`, `appRoutes.tsx`: platform roots and canonical route tree.
- `apps/web/src/space/SpaceHost.tsx`: document-lifetime start latch and semantic session state.
- `apps/web/src/space/SpaceCanvasHost.tsx`: the only R3F Canvas and renderer ownership.
- `apps/web/src/space/SpaceSession.tsx`: the only Rapier/`SpaceScene` composition.
- `apps/web/src/space/SpaceRouteCoordinator.tsx`: URL-to-overlay/input/pause coordination.
- `apps/web/src/space/SpaceHud.tsx`: DOM HUD, boot/error/progress, and pointer-lock surfaces.
- `apps/web/src/rendering/rendererProfile.ts`, `createWebGPURenderer.ts`: actual backend resolution and quality flags.
- `apps/web/src/boot/spaceBootReducer.ts`, `useSpaceBootController.ts`: pure attempt state and asynchronous effects.
- `apps/web/src/lobby/StartLobby.tsx`: screenshot-grounded 3D word art and the single DOM Enter button.
- `apps/web/src/exhibits/workMediaLoader.ts`: selected-work eager image decode, video metadata, cancellation, and two-work cache.

### Phase 1: Split the platform app shell

**Files:**
- Create: `apps/web/src/app/DesktopApp.tsx`
- Create: `apps/web/src/app/MobileApp.tsx`
- Create: `apps/web/tests/app/platform-shell.contract-test.mjs`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `package.json`

- [ ] **Write the failing import-graph contract.** Assert that `main.tsx` calls the existing client-platform resolver once, memoizes that result for the root lifetime, and lazy-imports either `DesktopApp` or `MobileApp`. Walk the `MobileApp` transitive import graph and fail on `three`, `@react-three/fiber`, `@react-three/rapier`, renderer modules, scene modules, GLB URLs, `SpaceHost`, or StartLobby.
- [ ] **Verify red.** Run `node apps/web/tests/app/platform-shell.contract-test.mjs`; expect failure because `App.tsx` and `SpacePage.tsx` currently mix both platforms.
- [ ] **Implement the stable branch.** Keep global providers and the router above the lazy boundary, but choose the platform only once. `DesktopApp` may reach SPACE modules; `MobileApp` may reach only terminal/data modules. Remove the second platform check from `SpacePage` and make `App.tsx` a compatibility-free shell export or delete it if no import remains.
- [ ] **Verify green.** Run `node apps/web/tests/app/platform-shell.contract-test.mjs` and `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`; expect pass.
- [ ] **Commit independently.** Stage only the files above and run `git commit -m "refactor: split desktop and mobile app shells"`.

### Phase 2: Resolve truthful renderer profiles on one runtime

**Files:**
- Create: `apps/web/src/rendering/rendererProfile.ts`
- Create: `apps/web/tests/space/renderer-profile.test.mjs`
- Modify: `apps/web/src/rendering/createWebGPURenderer.ts`
- Modify: `apps/web/src/rendering/GalleryRenderPipeline.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/exhibits/FocusOverlay.tsx`
- Modify: `package.json`

- [ ] **Write failing backend/profile tests.** Cover successful default r184 WebGPU initialization => `full`; failed `init()` => dispose and retry a new forced-WebGL renderer => WebGL2 `simplified`; explicit `forceWebGL` => WebGL2 `simplified`. Assert both profiles retain identical `physics`, `interaction`, `spaceScene`, and Focus settings.
- [ ] **Define the profile contract.** Use one immutable shape:

```ts
type RendererProfile = {
  id: "full" | "simplified";
  backend: "webgpu" | "webgl2";
  maxDpr: number;
  postprocessing: boolean;
  shadows: boolean;
  expensiveLeaves: ReadonlySet<"atmosphere" | "projectorGlow" | "decorativeParticles">;
};
```

- [ ] **Implement backend resolution.** Await `renderer.init()` before returning the profile. On failure, dispose the failed renderer, instantiate `WebGPURenderer({ forceWebGL: true })`, await its `init()`, and return `simplified`; never infer `full` from feature detection alone.
- [ ] **Apply only leaf quality flags.** Use profile values for Canvas DPR, post, shadows, and the named expensive leaves. Keep the same Rapier, controls, interaction registry, `SpaceScene`, assets, and Focus behavior in both modes.
- [ ] **Add the single-runtime contract and verify.** Fail if more than one production owner exists for `<Canvas>`, `<Physics>`, or `<SpaceScene>`, or if names such as `FullSpaceRuntime`/`SimplifiedSpaceRuntime` appear. Run `node --test apps/web/tests/space/renderer-profile.test.mjs` and `npm run build:chunks`; expect pass and no duplicated runtime chunk.
- [ ] **Commit independently.** `git commit -m "feat: add truthful shared renderer profiles"`.

### Phase 3: Make real URLs coexist with a persistent SPACE host

**Files:**
- Create: `apps/web/src/app/appRoutes.tsx`
- Create: `apps/web/src/space/SpaceHost.tsx`
- Create: `apps/web/src/space/SpaceRouteCoordinator.tsx`
- Create: `apps/web/tests/app/router.contract-test.mjs`
- Create: `apps/web/tests/space/persistent-host.contract-test.mjs`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/app/DesktopApp.tsx`
- Modify: `apps/web/src/app/MobileApp.tsx`
- Modify: `apps/web/src/desktop/DesktopChrome.tsx`
- Modify: `package.json`

- [ ] **Write failing router tests.** Assert `BrowserRouter basename={import.meta.env.BASE_URL}`, canonical routes `/`, `/works/:exhibitId`, `/profile`, `/devstories`, and every existing legacy alias mapped with `<Navigate replace>`. Assert route UI uses `Link`/`NavLink`/`useNavigate`/`useParams`; forbid application `pushState`, `popstate`, and mirrored pathname state.
- [ ] **Write failing lifecycle tests.** A cold content route must not import or mount `SpaceHost`. Visiting `/` latches `spaceStarted=true`; later route changes preserve the same host key, Canvas node, renderer, Rapier world, loaded GLBs, and live pose. Back/Forward must change overlays without reconstructing SPACE.
- [ ] **Implement the route tree and host latch.** `DesktopApp` owns the routes and a document-lifetime start latch. Lazy-import `SpaceHost` only after `/` is visited, never reset the latch, and place routed content above it. `SpaceRouteCoordinator` pauses input/releases pointer lock when an overlay route opens and resumes eligible controls on return.
- [ ] **Implement refresh semantics.** Persist only `{ version, position:[x,y,z], yaw, pitch }`; reject non-finite/out-of-bounds values. Read it only on a new SPACE session after hard refresh, never on same-document navigation, and never serialize boot/backend/resources/audio/pointer lock.
- [ ] **Map mobile canonical routes.** Each URL renders deterministic terminal content or terminal not-found content without entering the desktop import graph.
- [ ] **Verify and commit.** Run both new tests, `npm run test:contracts`, and TypeScript; expect aliases to replace, cold routes to remain 3D-free, and host identity to persist. Commit with `git commit -m "feat: add persistent route-driven SPACE host"`.

### Phase 4: Add the attempt-scoped Boot Controller

**Files:**
- Create: `apps/web/src/boot/spaceBootReducer.ts`
- Create: `apps/web/src/boot/useSpaceBootController.ts`
- Create: `apps/web/tests/boot/space-boot-reducer.test.mjs`
- Modify: `apps/web/src/space/SpaceHost.tsx`
- Modify: `package.json`

- [ ] **Write reducer tests first.** Cover `idle -> booting -> running`, monotonically increasing `attemptId`, real milestones (`renderer`, `environment`, `gallery`, `physics`, `exhibits`), real item `{loaded,total}`, failure, manual retry, stale-action rejection, and one device-loss fallback.
- [ ] **Use a pure reducer boundary.** Every async action includes `attemptId`; stale actions return the identical state. Milestone/item actions received in `running` also return the identical state. The reducer performs no I/O and stores no renderer/resource objects.
- [ ] **Wire only real progress.** Dispatch renderer completion after `init()`, asset items from actual loader completion, Physics readiness from the mounted boundary, and exhibit readiness from actual manifest/asset completion. Derive the UI ratio from those events; do not use fake percentages, intervals, animation-frame dispatch, or progress timers.
- [ ] **Recover once from device loss.** Dispose the lost WebGPU renderer and resources, increment `attemptId`, and retry once with `forceWebGL=true`. A failure/loss after that enters `failed` and waits for an explicit user retry. Cleanup listeners for superseded attempts.
- [ ] **Prove quiescence and commit.** A source/runtime test must show no recurring timer or dispatch after `running`. Run `node --test apps/web/tests/boot/space-boot-reducer.test.mjs` and `npm run test:unit`; commit with `git commit -m "feat: add attempt-scoped SPACE boot controller"`.

### Phase 5: Replace the splash with the captured StartLobby

**Files:**
- Capture evidence before edits: current deployed-site screenshot and approved Messenger screenshot
- Create: `apps/web/src/lobby/StartLobby.tsx`
- Create: `apps/web/src/space/SpaceCanvasHost.tsx`
- Create: `apps/web/src/space/SpaceHud.tsx`
- Create: `apps/web/tests/lobby/start-lobby.contract-test.mjs`
- Delete: `apps/web/src/components/entry/EntrySplash.tsx`
- Delete: `apps/web/src/hooks/useEntryTransition.ts`
- Modify: `apps/web/src/styles/global.css`
- Modify: `package.json`

- [ ] **Capture both references before implementation.** Successfully load the current deployed entry and the approved Messenger reference at the same viewport/device scale. Save screenshots and record viewport, timestamp, type scale, spacing, camera, lighting, and interaction observations in execution evidence. If either capture fails, stop this phase.
- [ ] **Write failing visual/interaction contracts.** Require interactive 3D `LizzardKevin SPACE` word art and exactly one DOM interactive element: Enter. Require mouse and touch/pointer response, keyboard activation, visible focus, `frameloop="demand"` before entry, and a static reduced-motion path. Forbid lobby links, blank-page click targets, secret/easter-egg handlers, and legacy splash imports.
- [ ] **Implement inside the one Canvas.** Extract the existing Canvas into `SpaceCanvasHost`, the sole Canvas owner. It renders the lobby title before Enter, then the existing SPACE session subtree after successful boot; Phase 6 extracts that subtree into `SpaceSession` without changing its identity. In demand mode, invalidate only for pointer/touch changes and finite entrance frames; reduced motion skips automatic movement.
- [ ] **Make Enter the only DOM action.** The trusted gesture unlocks audio and starts/resumes the boot attempt. Show reducer-derived milestone and `loaded/total`; request pointer lock only after Enter and scene readiness. Do not add profile, devstories, archive, retry, or hidden controls while idle; a real failure may replace Enter with one retry action.
- [ ] **Remove legacy entry behavior.** Delete `EntrySplash` and `useEntryTransition`, then remove blank-click, empty-page, click-secret, and easter-egg paths. Mobile bypasses this module entirely.
- [ ] **Verify and commit.** Compare against both screenshots, then run the lobby contract, `npm run lint`, and the mobile import-graph contract. Commit with `git commit -m "feat: replace splash with screenshot-grounded StartLobby"`.

### Phase 6: Split runtime responsibilities without duplicating runtime state

**Files:**
- Create: `apps/web/src/space/SpaceSession.tsx`
- Create: `apps/web/tests/space/runtime-boundaries.contract-test.mjs`
- Modify: `apps/web/src/space/SpaceCanvasHost.tsx`
- Modify: `apps/web/src/space/SpaceHud.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/space/SpaceHost.tsx`
- Modify: `package.json`

- [ ] **Write failing ownership contracts.** Assert responsibilities: `SpaceCanvasHost` owns renderer/Canvas; `SpaceSession` owns the only Physics/scene composition; `SpaceRouteCoordinator` owns route-to-pause/input effects; `SpaceHud` owns DOM status/controls; `SpaceHost` owns session lifecycle and low-frequency semantic state.
- [ ] **Extract one responsibility at a time.** Move existing behavior without cloning it. Preserve one interaction registry, one scene graph, one audio/playback integration, and one Focus tier. Delete obsolete ownership from `SpaceDesktopExperience` as each extraction lands.
- [ ] **Keep frame data out of React Context.** Player transform, raycast samples, and frame-loop values remain in R3F refs/store or imperative adapters. React state/context may carry only low-frequency semantic events such as selected exhibit, route-blocked, boot phase, and renderer profile.
- [ ] **Forbid architectural regressions.** Contract tests reject a second Canvas/Physics/`SpaceScene`, `FullSpaceRuntime`, `SimplifiedSpaceRuntime`, conditional Rapier removal, and new state-library dependencies.
- [ ] **Verify and commit.** Run `node apps/web/tests/space/runtime-boundaries.contract-test.mjs`, existing SPACE interaction/pointer-lock tests, TypeScript, and `npm run build:chunks`; commit with `git commit -m "refactor: separate SPACE runtime responsibilities"`.

### Phase 7: Eagerly prepare every selected-work image

**Files:**
- Create: `apps/web/src/exhibits/workMediaLoader.ts`
- Create: `apps/web/tests/exhibits/work-media-loader.test.mjs`
- Modify: `apps/web/src/exhibits/FocusOverlay.tsx`
- Modify: `apps/web/src/space/SpaceRouteCoordinator.tsx`
- Modify: `package.json`

- [ ] **Write failing loader tests.** For a selected work with several images and videos, assert all unique images begin `request + decode()` immediately, not only the next slide. Assert truthful image `{loaded,total}`, metadata-only video preparation, stale-selection isolation, abort where supported, and cache retention of exactly current plus last work.
- [ ] **Implement selection-scoped loading.** Normalize/deduplicate image URLs, launch all fetch/decode promises together, and count each settled image once. Attach a selection/attempt token to every completion; abort fetches on selection change and ignore non-abortable stale decode callbacks.
- [ ] **Prepare videos without eager bodies.** Use `preload="metadata"`/metadata events; video completion is tracked separately and does not falsify the image `loaded/total` ratio.
- [ ] **Use a bounded two-work cache.** Promote the selected work to current, retain only the immediately previous work, and release object URLs/owned decoded references on eviction. Selection must immediately display `loaded/total`, including partial failures, and render every successfully decoded image in manifest order.
- [ ] **Verify and commit.** Run `node --test apps/web/tests/exhibits/work-media-loader.test.mjs`, existing Focus tests, and `npm run content:check`; expect generated/workbook/source assets unchanged. Commit with `git commit -m "feat: eagerly decode selected work media"`.

### Phase 8: Release gates and ordered independent review

**Files:**
- Modify only implementation/tests named by a confirmed failing gate or review finding.

- [ ] **Run automated release gates.** Run `npm run verify:quick`, `npm run build:chunks`, and `npm run build:github-pages:chunks`; all must pass.
- [ ] **Prove protected scope.** Run `git diff --check` and compare the implementation range against the baseline for the workbook, `apps/web/src/generated/**`, `apps/web/public/exhibits/**`, GLBs, Blender files, and source assets; expect no changes.
- [ ] **Run desktop route/lifecycle QA.** Test cold canonical deep links, valid/invalid works, aliases, Back/Forward, returning to `/`, stable Canvas/Rapier/scene identity, pointer-lock release/resume, and hard-refresh semantic pose restoration. Confirm cold content requests contain no 3D/runtime assets.
- [ ] **Run both renderer profiles and recovery QA.** Verify actual WebGPU => full; initialization fallback/forced WebGL => WebGL2 simplified; shared Rapier/interaction/Focus behavior; exactly one device-loss forced-WebGL retry; no ongoing dispatch/timer after running.
- [ ] **Run lobby, mobile, performance, and memory QA.** Compare both captured references; test mouse/touch/keyboard/reduced motion and demand frames. Test every canonical mobile route with no 3D import/request. Record FPS/frame budget, DPR/profile behavior, route pause, renderer/GLB reuse, listener cleanup, media-cache bound, and memory before/after repeated route/work cycles.
- [ ] **Request requirements review first.** A fresh independent reviewer receives the approved decisions, plan, diff, and gate evidence and returns PASS or file/line findings. Fix confirmed findings and rerun all affected gates.
- [ ] **Request quality review second.** Only after requirements PASS, a different independent reviewer checks reducer purity, stale async work, renderer/device disposal, route lifecycle, accessibility, performance/memory, cache cleanup, and test strength. Fix confirmed findings and rerun all affected gates.
- [ ] **Commit review fixes independently.** Keep each phase commit auditable; use a focused review-fix commit rather than squashing.

## Plan self-review checklist

- [ ] Platform is chosen once; mobile's transitive graph is 3D-free.
- [ ] WebGPU alone is full; every WebGL2 path is simplified.
- [ ] One Canvas, one Rapier world, one `SpaceScene`, one interaction model, and one Focus tier serve both profiles.
- [ ] React Router plus `BASE_URL` basename is the only URL authority; cold content routes do not start 3D; a started host persists.
- [ ] Boot progress comes only from real attempt-scoped events and device loss retries once.
- [ ] StartLobby is based on two successful captures, has only 3D title plus one DOM Enter, and deletes every old entry path.
- [ ] Runtime modules have narrow ownership; per-frame data never enters React Context; no state library is added.
- [ ] A selected work requests and decodes all images immediately, handles stale work, prepares video metadata, and caches current plus last.
- [ ] Required builds, route/pointer/profile/mobile/performance/memory QA, then requirements and quality reviews, all pass.
- [ ] Workbook, generated output, GLBs, Blender files, and source assets remain untouched.
