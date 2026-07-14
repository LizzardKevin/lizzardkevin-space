# SPACE Architecture V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement approved Solution B: one stable platform split, real URLs, and a persistent desktop SPACE runtime with truthful WebGPU/WebGL2 profiles; add two dependency-isolated entry experiences (a temporary desktop 3D StartLobby and a pure DOM/CSS MobileStartMenu); establish measured asset/performance budgets and a SPACE-owned gallery visual system; keep selected-work media truthful and on demand.

**Architecture:** `main.tsx` resolves the platform once and lazy-loads either `DesktopApp` or `MobileApp`. `DesktopApp` alone owns the document-lifetime `spaceStarted` latch; before Enter it may run only a disposable lightweight WebGL2/R3F lobby Canvas, which is destroyed before Boot mounts the one main `SpaceCanvasHost`, Rapier world, and `SpaceScene`. `MobileApp` owns a separate DOM/CSS-only `mobileStarted` latch and never imports the desktop lobby or any 3D runtime. A started desktop session persists across same-document routes. Renderer profiles alter quality leaves rather than runtime structure. Asset and visual changes are constrained by measured budgets, screenshot evidence, and explicit source-asset authorization.

**Tech Stack:** React 19, React Router DOM 7, TypeScript 6, Vite 8, React Three Fiber 9, Three.js r184 `WebGPURenderer`, Rapier, node:test contract tests.

---

## Approved decisions and protected scope

- Canonical URLs are `/`, `/works/:exhibitId`, `/profile`, and `/devstories`. React Router owns navigation; aliases use `<Navigate replace>`. Do not add custom History API routing.
- `full` means an actually initialized WebGPU backend. The first default Three r184 `WebGPURenderer` instance owns its native WebGPU-to-WebGL2 backend selection; an actual WebGL2 backend reports `simplified`. Explicit simplified/device-loss recovery creates one `WebGPURenderer({ forceWebGL: true })`. Application code never performs a second duplicate WebGL retry. WebGL2 is never `full`.
- Both profiles use the same main Canvas, Rapier world, interaction rules, `SpaceScene`, assets, and Focus quality tier. Profile flags control only DPR, post-processing, shadows, and named expensive leaf effects. `FocusOverlay` may retain its local viewer Canvas, but it consumes the resolved profile and handles viewer renderer failure locally without downgrading/restarting the main runtime.
- Both profiles retain inexpensive spatial fog, the base color/material hierarchy, basic depth/outline separation, and readable HUD styling. `simplified` first disables high DPR, dynamic shadows, Bloom/glow, and high-cost post/effects; it must not become a flat gray scene.
- A cold content deep link does not import `SpaceHost` or start Three, R3F, Rapier, GLBs, renderer initialization, or the boot attempt. `DesktopApp` alone latches `spaceStarted` at the trusted Enter handoff; `SpaceHost` owns only the already-started session lifecycle and remains mounted across later same-document route changes.
- The lobby Canvas is a temporary WebGL2/R3F context, not the main Canvas. Lobby and main contexts never coexist: Enter locks the lobby behind opaque loading, disposes/unmounts it, then starts Boot and mounts the main Canvas. The Focus viewer is the only additional Canvas exception and cannot mount during lobby or Boot.
- A hard refresh may restore only a versioned, validated semantic player pose from `sessionStorage`; renderer/boot/assets/pointer-lock/audio state are never restored.
- Mobile lazy-loads terminal code only. It never imports StartLobby, Three, R3F, Rapier, renderer code, `SpaceHost`, or GLBs.
- Desktop StartLobby and MobileStartMenu are separate implementations, not responsive variants. They share no Canvas, Three/R3F/Rapier, renderer, GLB, or desktop-lobby dependency.
- After Boot reaches `running`, an optional one-shot cancellable idle task may prefetch only the lightweight Profile and DevStories route chunks. It must not use recurring timers or prefetch works media, Focus GLBs, or all exhibits. A selected work alone triggers its full-image request/decode pipeline and truthful `{loaded,total,failed}` progress.
- Asset-budget work begins read-only. KTX2, Meshopt/Draco, merging, instancing, LOD, collision simplification, cache policy, and deploy exclusions may be assessed, but moving, deleting, recompressing, or re-exporting any asset requires separate user approval.
- Do not create `FullSpaceRuntime`/`SimplifiedSpaceRuntime`, duplicate the main scene, add a state library, or put per-frame position/rotation data in React Context.
- Do not modify the workbook, `apps/web/src/generated/**`, `apps/web/public/exhibits/**`, GLBs, Blender files, or source media/assets. No content regeneration belongs in implementation commits.

## Target file responsibilities

- `apps/web/src/main.tsx`: resolve platform once, mount providers/router, and lazy-load exactly one platform app.
- `apps/web/src/app/DesktopApp.tsx`, `MobileApp.tsx`, `appRoutes.tsx`: platform roots and canonical route tree.
- `apps/web/src/app/DesktopApp.tsx`: the sole owner of the document-lifetime `spaceStarted` latch.
- `apps/web/src/space/SpaceHost.tsx`: already-started session lifecycle and semantic session state; never imported by a cold content deep link.
- `apps/web/src/space/SpaceCanvasHost.tsx`: the only main SPACE Canvas and renderer ownership.
- `apps/web/src/space/SpaceSession.tsx`: the only Rapier/`SpaceScene` composition.
- `apps/web/src/space/SpaceRouteCoordinator.tsx`: URL-to-overlay/input/pause coordination.
- `apps/web/src/space/SpaceHud.tsx`: DOM HUD, boot/error/progress, and pointer-lock surfaces.
- `apps/web/src/rendering/rendererProfile.ts`, `createWebGPURenderer.ts`: actual backend resolution and quality flags.
- `apps/web/src/boot/spaceBootReducer.ts`, `useSpaceBootController.ts`: pure attempt state and asynchronous effects.
- `apps/web/src/lobby/StartLobby.tsx`: screenshot-grounded 3D word art, its disposable WebGL2/R3F Canvas, and the single DOM Enter button.
- `apps/web/src/mobile/MobileStartMenu.tsx`: pure DOM/CSS mobile brand title, bounded pointer/touch feedback, and the single Enter button; no desktop or 3D dependency.
- `apps/web/src/exhibits/workMediaLoader.ts`: selected-work eager image decode, video metadata, cancellation, and two-work cache.
- `docs/performance/space-asset-baseline.md`: measured network/decode/frame/memory baseline, noise bands, and proposed (not silently assumed) caps.
- `docs/design/space-visual-system-v2.md`: executable SPACE color, material, fog, outline, light, HUD, camera, motion, and profile rules.

### Phase 1: Split the platform app shell

**Files:**
- Create: `apps/web/src/app/DesktopApp.tsx`
- Create: `apps/web/src/app/MobileApp.tsx`
- Create: `apps/web/tests/app/platform-shell.contract-test.mjs`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/MobileExperience.tsx`
- Modify: `package.json`

- [ ] **Write the failing import-graph contract.** Assert that `main.tsx` calls the existing client-platform resolver once, memoizes that result for the root lifetime, and lazy-imports either `DesktopApp` or `MobileApp`. Walk the `MobileApp` transitive import graph and fail on `three`, `@react-three/fiber`, `@react-three/rapier`, renderer modules, scene modules, GLB URLs, `SpaceHost`, or StartLobby.
- [ ] **Verify red.** Run `node apps/web/tests/app/platform-shell.contract-test.mjs`; expect failure because `App.tsx` and `SpacePage.tsx` currently mix both platforms.
- [ ] **Implement the stable branch.** Keep global providers and the router above the lazy boundary, but choose the platform only once. `DesktopApp` may reach SPACE modules; `MobileApp` may reach only terminal/data modules. Remove the second platform check from `SpacePage`, remove `EntryTransition` from `MobileExperience` so terminal boot is route-owned, and make `App.tsx` a compatibility-free shell export or delete it if no import remains.
- [ ] **Verify green.** Run `node apps/web/tests/app/platform-shell.contract-test.mjs` and `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`; expect pass.
- [ ] **Commit independently.** Stage only the files above and run `git commit -m "refactor: split desktop and mobile app shells"`.

### Phase 2: Resolve truthful renderer profiles on one runtime

**Files:**
- Create: `apps/web/src/rendering/rendererProfile.ts`
- Create: `apps/web/tests/space/renderer-profile.test.mjs`
- Modify: `apps/web/src/rendering/createWebGPURenderer.ts`
- Modify: `apps/web/src/rendering/GalleryRenderPipeline.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/exhibits/FocusOverlay.tsx`
- Modify: `package.json`

- [ ] **Write failing backend/profile tests.** Cover successful default r184 initialization resolving an actual WebGPU backend => `full`; the same default renderer resolving Three's internal WebGL2 backend => `simplified`; explicit `forceWebGL` => WebGL2 `simplified`; and final `init()` rejection => visible failure without duplicate retry or retained rejected initialization state. Assert both profiles retain identical `physics`, `interaction`, `spaceScene`, and Focus settings.
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

- [ ] **Implement backend resolution.** Await `renderer.init()` before returning the profile and inspect the actual initialized backend. Let Three r184 perform its native default WebGPU-to-WebGL2 selection exactly once; do not externally retry WebGL after a final rejection and do not pretend a rejected uninitialized renderer was disposed. Explicit simplified/device-loss recovery creates one forced-WebGL renderer. Never infer `full` from feature detection alone.
- [ ] **Apply only leaf quality flags at the real owner.** Migrate Canvas DPR and renderer creation in `SpaceDesktopExperience.tsx`, then pass the resolved profile through its existing Physics/`SpaceScene` composition to post, shadows, named expensive leaves, and `FocusOverlay`. Keep Rapier, controls, interaction registry, `SpaceScene`, assets, and Focus quality behavior identical across profiles.
- [ ] **Handle the Focus viewer exception.** Its local viewer Canvas uses the same resolved profile contract. If only that viewer renderer fails, show/degrade the viewer locally; do not change the main profile, recreate the main renderer, or restart Rapier/`SpaceScene`.
- [ ] **Add the single-main-runtime contract and verify.** Assert exactly one main SPACE Canvas owner, one `<Physics>` owner, and one `<SpaceScene>` owner. Permit the explicitly identified Focus local viewer Canvas, and later the mutually exclusive pre-entry lobby Canvas, without counting either as a second main runtime. Fail on `FullSpaceRuntime`/`SimplifiedSpaceRuntime` or duplicated main composition. Run `node --test apps/web/tests/space/renderer-profile.test.mjs` and `npm run build:chunks`; expect pass and no duplicated main runtime chunk.
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

- [ ] **Write failing router tests.** Assert `BrowserRouter basename={import.meta.env.BASE_URL}`, canonical routes `/`, `/works/:exhibitId`, `/profile`, `/devstories`, plus exactly the approved legacy aliases `/space -> /` and `/lizzardkevin -> /profile` via `<Navigate replace>`. Assert route UI uses `Link`/`NavLink`/`useNavigate`/`useParams`; forbid application `pushState`, `popstate`, and mirrored pathname state.
- [ ] **Write failing lifecycle tests.** A cold content route must not import or mount `SpaceHost`. Visiting `/` alone leaves `spaceStarted=false`; the trusted Enter handoff changes it to true exactly once. Later route changes preserve the same host key, Canvas node, renderer, Rapier world, loaded GLBs, and live pose. Back/Forward must change overlays without reconstructing SPACE. While a content surface is open, the retained host pauses main frameloop work, Rapier/physics stepping, main input, pointer lock, and runtime/background audio without disposing objects/resources/pose; returning to `/` restores only eligible runtime work.
- [ ] **Implement the route tree and sole start latch.** `DesktopApp` owns the routes and the only document-lifetime `spaceStarted` latch. A cold content route must not even import `SpaceHost`; `/` initially renders the lobby without that import. The Enter handoff sets the latch, which never resets, and only then enables the lazy `SpaceHost` import. `SpaceHost` receives an already-started session and does not own a second latch. `SpaceRouteCoordinator` keeps the host mounted but coordinates main frameloop pause, Rapier/physics pause, input suppression, pointer-lock release, and runtime/background-audio pause on blocked routes, then restores only eligible controls/work on return. Focus media remains locally playable on `/works/:id`.
- [ ] **Implement refresh semantics.** Persist only `{ version, position:[x,y,z], yaw, pitch }`; reject non-finite/out-of-bounds values. Read it only on a new SPACE session after hard refresh, never on same-document navigation, and never serialize boot/backend/resources/audio/pointer lock.
- [ ] **Map mobile canonical routes.** Each URL resolves a deterministic terminal target or terminal not-found target without entering the desktop import graph. Phase 4 places every canonical target behind the document-lifetime `mobileStarted` gate; Enter keeps the URL unchanged and reveals the resolved terminal target.
- [ ] **Verify and commit.** Run both new tests, `npm run test:contracts`, and TypeScript; expect aliases to replace, cold routes to remain 3D-free, and host identity to persist. Commit with `git commit -m "feat: add persistent route-driven SPACE host"`.

### Phase 4: Add the lightweight MobileStartMenu

**Files:**
- Create: `apps/web/src/mobile/MobileStartMenu.tsx`
- Create: `apps/web/src/mobile/mobileStartMenu.css`
- Create: `apps/web/tests/mobile/start-menu.contract-test.mjs`
- Modify: `apps/web/src/app/MobileApp.tsx`
- Strengthen: `apps/web/tests/app/platform-shell.contract-test.mjs`
- Strengthen: existing mobile route/terminal contracts and package scripts

- [ ] **Capture the accepted mobile reference before visual implementation.** Reuse the accepted Messenger evidence only if it is accessible in this task; otherwise recapture or ask the user to attach it. Record startup, keyboard-focus, and post-Enter target states at the same narrow viewport. If capture cannot be opened, stop this visual phase rather than inventing from prose.
- [ ] **Write failing dependency and behavior contracts.** Walk the complete MobileApp transitive static/dynamic/re-export graph and forbid StartLobby, Canvas, Three, R3F, Rapier, renderers, `SpaceHost`, GLBs, and desktop entry modules. Require one DOM button, native keyboard activation, visible `:focus-visible`, and `prefers-reduced-motion` behavior.
- [ ] **Implement a document-lifetime mobile latch.** `MobileApp` alone owns `mobileStarted`. Before Enter, render only brand title, bounded pointer/touch CSS-variable feedback, and Enter. After Enter, keep the current canonical URL and reveal the existing persistent terminal route. Back/Forward and aliases must not remount or reset either latch or Terminal.
- [ ] **Keep interaction cheap.** Do not add Canvas, RAF loops, recurring timers, device-motion permission, or continuous pointer state in React. Reduced motion uses a static state; mouse/touch feedback is finite and clamped.
- [ ] **Verify narrow/mobile behavior.** Capture startup/focus/after-Enter screenshots, test narrow emulation plus at least one physical touch device, keyboard/touch/reduced-motion/portrait/landscape, and verify initial and post-Enter 3D runtime/asset request count equals zero.
- [ ] **Commit independently.** `git commit -m "feat: add lightweight mobile start menu"`.

### Phase 5: Add the attempt-scoped Boot Controller

**Files:**
- Create: `apps/web/src/boot/spaceBootReducer.ts`
- Create: `apps/web/src/boot/useSpaceBootController.ts`
- Create: `apps/web/tests/boot/space-boot-reducer.test.mjs`
- Modify: `apps/web/src/space/SpaceHost.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/scenes/gallery/GalleryModel.tsx`
- Modify: `apps/web/src/scenes/exhibits/SceneExhibitPlacement.tsx`
- Modify: `package.json`

- [ ] **Write reducer tests first.** Cover `idle -> booting -> running`, monotonically increasing `attemptId`, real milestones (`renderer`, `environment`, `gallery`, `physics`, `exhibits`), real item `{loaded,total}`, failure, manual retry, stale-action rejection, and one device-loss fallback.
- [ ] **Use a pure reducer boundary.** Every async action includes `attemptId`; stale actions return the identical state. Milestone/item actions received in `running` also return the identical state. The reducer performs no I/O and stores no renderer/resource objects.
- [ ] **Expose start without auto-starting.** Creating/mounting controller state must not initialize a renderer. Its explicit `start()` is invoked only by the trusted desktop Enter sequence in Phase 6; therefore the `renderer` milestone can occur only after Enter.
- [ ] **Wire only real progress from existing sources.** `SpaceDesktopExperience` reports renderer completion only after `createWebGPURenderer().init()` resolves and Physics after its mounted readiness boundary. `SpaceScene`/`GalleryModel.onSceneReady` report the world/gallery GLB milestone. `SceneExhibitPlacement` reports each actual exhibit ID and final `onReady`; manifest completion comes from the real `loadManifest()` promise. Derive UI progress from these events and real item counts; do not use fake percentages, intervals, animation-frame dispatch, or progress timers.
- [ ] **Recover once from device loss.** Dispose the lost WebGPU renderer and resources, increment `attemptId`, and retry once with `forceWebGL=true`. A failure/loss after that enters `failed` and waits for an explicit user retry. Cleanup listeners for superseded attempts.
- [ ] **Prove quiescence and commit.** A source/runtime test must show no recurring timer or dispatch after `running`. Run `node --test apps/web/tests/boot/space-boot-reducer.test.mjs` and `npm run test:unit`; commit with `git commit -m "feat: add attempt-scoped SPACE boot controller"`.

### Phase 6: Replace the splash with the captured Desktop StartLobby

**Files:**
- Capture evidence before edits: current deployed-site screenshot and approved Messenger screenshot
- Create: `apps/web/src/lobby/StartLobby.tsx`
- Create: `apps/web/src/space/SpaceCanvasHost.tsx`
- Create: `apps/web/src/space/SpaceHud.tsx`
- Create: `apps/web/tests/lobby/start-lobby.contract-test.mjs`
- Delete: `apps/web/src/components/entry/EntrySplash.tsx`
- Delete: `apps/web/src/hooks/useEntryTransition.ts`
- Modify: `apps/web/src/pages/SpacePage.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Delete: `apps/web/src/entry/entryTypes.ts`
- Modify: `apps/web/src/styles/global.css`
- Modify: `package.json`

- [ ] **Write failing visual/interaction contracts.** Require interactive 3D `LizzardKevin SPACE` word art and exactly one DOM interactive element: Enter. Require mouse and touch/pointer response, keyboard activation, visible focus, `frameloop="demand"` before entry, and a static reduced-motion path. Forbid lobby links, blank-page click targets, secret/easter-egg handlers, and legacy splash imports.
- [ ] **Prepare the nonvisual handoff seam.** Extract the existing main Canvas from `SpaceDesktopExperience.tsx` into `SpaceCanvasHost`, add opaque boot/error UI in `SpaceHud`, and replace scene/exhibit callbacks with Boot Controller events. Keep the current splash usable until StartLobby passes its visual gate. This structural work is not blocked by browser capture and lets Phase 7 continue.
- [ ] **Capture both references before any StartLobby visual implementation.** Load current `https://lizzardkevin.github.io/lizzardkevin-space/` and reference `https://messenger.abeto.co/` at the same viewport/device scale. Save them outside the repository as `C:\Users\lizza\.codex\visualizations\2026\07\14\019f5ea2-1eef-74e3-8dbe-cfd03eafb830\space-architecture-v2\current-site.png` and `C:\Users\lizza\.codex\visualizations\2026\07\14\019f5ea2-1eef-74e3-8dbe-cfd03eafb830\space-architecture-v2\messenger-reference.png`; record both absolute paths, viewport, timestamp, type scale, spacing, camera, lighting, and interaction observations in execution evidence. If browser capture still fails, do not implement or approximate StartLobby visuals and do not remove the working legacy splash; continue independent nonvisual phases such as runtime decomposition and the read-only asset audit, then return when both captures succeed.
- [ ] **Implement a separate temporary lobby Canvas.** `StartLobby` owns a lightweight WebGL2/R3F Canvas with `frameloop="demand"`; it is not `SpaceCanvasHost` and does not initialize the WebGPU/WebGL2 main profile. Invalidate only for pointer/touch changes and finite entrance frames; reduced motion skips automatic movement.
- [ ] **Make Enter the strict handoff boundary.** The trusted gesture unlocks audio, locks further lobby input, and immediately covers the viewport with opaque loading. Dispose/unmount the lobby Canvas and verify its context is gone; only then call Boot Controller `start()`, mount the unique main `SpaceCanvasHost`, and load world/Physics/assets. The default renderer initializes once and accepts Three r184's actual internally selected WebGPU/WebGL2 backend; only explicit simplified or device-loss recovery creates a new `forceWebGL:true` renderer. After real readiness, fade out loading and only then allow pointer lock. At every instant, at most one lobby/main context exists; Focus is absent during lobby/Boot and may mount only after the main session is ready.
- [ ] **Migrate every real desktop entry caller.** In `SpacePage.tsx`, replace `EntrySplash`/`useEntryTransition` orchestration with StartLobby and handoff state. In `SpaceDesktopExperience.tsx`, replace `entry`, `loadExhibits`, `onCanvasReady`, and `onSceneExhibitsReady` coupling with Boot/session readiness events. Confirm Phase 1 removed the `MobileExperience` entry prop, then delete `entryTypes.ts`, blank-click, empty-page, click-secret, and easter-egg paths. Mobile uses `MobileStartMenu` and must not import this module.
- [ ] **Verify and commit.** Compare against both screenshots, then run the lobby contract, `npm run lint`, and the mobile import-graph contract. Commit with `git commit -m "feat: replace splash with screenshot-grounded StartLobby"`.

### Phase 7: Split runtime responsibilities without duplicating runtime state

**Files:**
- Create: `apps/web/src/space/SpaceSession.tsx`
- Create: `apps/web/tests/space/runtime-boundaries.contract-test.mjs`
- Modify: `apps/web/src/space/SpaceCanvasHost.tsx`
- Modify: `apps/web/src/space/SpaceHud.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/space/SpaceHost.tsx`
- Modify: `package.json`

- [ ] **Write failing ownership contracts.** Assert responsibilities: `DesktopApp` alone owns the start latch; `SpaceHost` owns only an already-started session lifecycle; `SpaceCanvasHost` owns the unique main renderer/Canvas; `SpaceSession` owns the only Physics/scene composition; `SpaceRouteCoordinator` owns route-to-pause/input effects; `SpaceHud` owns DOM status/controls. Treat StartLobby as a mutually exclusive temporary Canvas and Focus as a ready-session local viewer, not main runtime owners.
- [ ] **Extract one responsibility at a time.** Move existing behavior without cloning it. Preserve one interaction registry, one scene graph, one audio/playback integration, and one Focus tier. Delete obsolete ownership from `SpaceDesktopExperience` as each extraction lands.
- [ ] **Keep frame data out of React Context.** Player transform, raycast samples, and frame-loop values remain in R3F refs/store or imperative adapters. React state/context may carry only low-frequency semantic events such as selected exhibit, route-blocked, boot phase, and renderer profile.
- [ ] **Forbid architectural regressions.** Contract tests reject a second main SPACE Canvas, a second Physics/`SpaceScene`, lobby/main context overlap, `FullSpaceRuntime`, `SimplifiedSpaceRuntime`, conditional Rapier removal, and new state-library dependencies. The test explicitly permits only the mutually exclusive lobby Canvas and the ready-session Focus viewer Canvas.
- [ ] **Verify and commit.** Run `node apps/web/tests/space/runtime-boundaries.contract-test.mjs`, existing SPACE interaction/pointer-lock tests, TypeScript, and `npm run build:chunks`; commit with `git commit -m "refactor: separate SPACE runtime responsibilities"`.

### Phase 8: Establish the read-only asset performance baseline and proposed budgets

**Files:**
- Create: `scripts/audit-space-assets.mjs`
- Create: `apps/web/tests/performance/asset-budget.test.mjs`
- Create: `docs/performance/space-asset-baseline.md`
- Optionally create: `docs/performance/space-asset-inventory.json`
- Do not modify: shipping assets, generated content, workbook, GLB/Blender, textures, audio, or source media

- [ ] **Inventory actual bytes and ownership without mutation.** Record route/phase, file type, transfer bytes, decoded dimensions where available, hash, cache class, and source/shipping status for initial gallery/world GLBs, Focus GLBs, textures, collision meshes, Rapier WASM, audio, and public source-only assets. The audit script may read metadata but must never convert or rewrite files.
- [ ] **Keep the performance priority explicit.** React-versus-Svelte migration is not the current bottleneck or deliverable. Treat delayed Rapier runtime/WASM and 3D asset transfer/decode/GPU cost as the primary desktop investigation, while mobile and cold content remain 3D-free.
- [ ] **Measure the real network/decode/runtime baseline.** Fix browser version, hardware, viewport, network condition, route, spawn pose/camera, and sample count. Run repeated cold/warm measurements for mobile, cold content, desktop lobby, full boot, simplified boot, selected work, route return, and repeated work cycles. Report median, p95/dispersion, request bytes/count, boot/decode milestones, steady frame time, JS memory, and GPU memory when the browser exposes it; mark unavailable metrics honestly.
- [ ] **Inspect deployed cache behavior.** Record GitHub Pages response `Cache-Control`, ETag, content encoding, and repeat-request behavior for runtime chunks, Rapier WASM, GLBs, textures, audio, and content JSON.
- [ ] **Evaluate optimization candidates without executing them.** For KTX2, Meshopt/Draco, static merging, instancing, LOD, collision simplification, cache policy, and deployment exclusion, record applicable assets, expected benefit, compatibility/quality/maintenance risk, and whether source-asset approval is required.
- [ ] **Propose budgets from evidence, not guesses.** Commit measured values, measurement noise bands, and proposed full/simplified caps. Until the user approves caps and asset-write authority, the hard gates are deterministic: mobile/cold content 3D requests = 0; desktop lobby/pre-Enter Rapier chunk/WASM, world GLB, and Focus GLB requests = 0; route return core 3D re-requests = 0; shipping asset hashes/bytes unchanged; measured candidates show no regression beyond the recorded noise band. Do not claim an absolute performance target is complete from a build alone.
- [ ] **Commit the audit independently.** `git commit -m "docs: establish SPACE asset performance budget"`.

### Phase 9: Define and implement the SPACE main-gallery visual system

**Files:**
- Create: `docs/design/space-visual-system-v2.md`
- Create: `apps/web/src/space/spaceVisualTokens.ts`
- Create: `apps/web/tests/space/visual-system.contract-test.mjs`
- Modify only actual owners among: `spaceVisualSettings.ts`, `GalleryRenderPipeline.tsx`, `GalleryAtmosphere.tsx`, gallery material modules, `SpaceScene.tsx`, `SpaceHud.tsx`, and `global.css`

- [ ] **Capture the pre-change visual baseline first.** In the user-approved browser, capture current gallery `full` and `simplified` at the same viewport, route, semantic pose, camera, and device scale. Create a visual acceptance table before code changes. If capture cannot be opened, pause this visual phase; do not substitute memory, search results, or prose.
- [ ] **Define a SPACE-owned system, not a Messenger clone.** Freeze executable brand color roles, toon/material tiers, fog color/range, outline/depth hierarchy, light responsibilities, HUD typography/spacing/states, default FOV/spawn composition, route/boot/interaction motion, and reduced-motion rules. Preserve the first-person gallery identity.
- [ ] **Protect both quality profiles.** Contracts require cheap fog, base color/material hierarchy, basic depth/outline separation, and readable HUD in both profiles. Only `full` may enable high DPR, dynamic shadows, Bloom/glow, and high-cost post/effects. `simplified` must remain spatially legible and cannot regress to a flat gray scene.
- [ ] **Implement at existing owners without asset mutation.** Reuse current tokens/material patterns and change the fewest responsible modules. Any GLB, Blender, texture, audio, or source-asset problem becomes a separately authorized follow-up, not an implicit edit.
- [ ] **Run visual, input, and frame-budget acceptance.** Compare before/after screenshots side-by-side at identical states; complete the world consistency, strong first-frame focus, depth/outline, unified HUD, camera, and first-person readability table. Test mouse, touch, keyboard, pointer lock, focus-visible, and reduced motion for both profiles. Re-run Phase 8's frame/memory protocol and stay within the approved cap or recorded noise band.
- [ ] **Keep baseline and implementation auditable.** Commit the evidence/spec first as `docs: define SPACE visual acceptance baseline`, then code as `feat: establish SPACE gallery visual system`.

### Phase 10: Idle-prefetch only lightweight running-session routes

**Files:**
- Create: `apps/web/src/app/idleRoutePrefetch.ts`
- Create: `apps/web/tests/app/idle-prefetch.contract-test.mjs`
- Modify: `apps/web/src/app/DesktopApp.tsx` and lightweight Profile/DevStories route boundaries

- [ ] **Write the allowlist contract first.** Only Profile and DevStories lightweight code chunks may be scheduled, only after Boot is `running`, and at most once through a cancellable idle callback. Lack of idle-callback support may skip prefetch. Forbid recurring timers, works/Focus imports, GLBs, and all media loaders.
- [ ] **Preserve cold and mobile boundaries.** Cold `/profile`, `/devstories`, and `/works/:id` remain 3D-free; MobileApp never reaches this desktop module. Returning from a prefetched content route still reuses the same Canvas, renderer, Rapier world, core GLBs, and pose.
- [ ] **Prove no speculative media requests.** Before a work is selected, works media network requests equal zero. Idle prefetch must never call `workMediaLoader` or fetch exhibit image/video bodies.
- [ ] **Commit independently.** `git commit -m "perf: idle-prefetch lightweight desktop routes"`.

### Phase 11: Eagerly prepare every selected-work image

**Files:**
- Create: `apps/web/src/exhibits/workMediaLoader.ts`
- Create: `apps/web/tests/exhibits/work-media-loader.test.mjs`
- Modify: `apps/web/src/exhibits/FocusOverlay.tsx`
- Modify: `apps/web/src/space/SpaceRouteCoordinator.tsx`
- Modify: `package.json`

- [ ] **Write failing loader tests.** Before selection, assert media requests equal zero. For a selected work with several images and videos, assert the requested set exactly equals the deduplicated manifest image set and every unique image begins `request + decode()` immediately, not only the next slide. Assert truthful image `{loaded,total,failed}`, metadata-only video preparation, stale-selection isolation, abort where supported, and cache retention of exactly current plus last work.
- [ ] **Implement selection-scoped loading.** Normalize/deduplicate image URLs, launch all fetch/decode promises together only after a concrete exhibit selection, and count each settled image once. Attach a selection/attempt token to every completion; abort fetches on selection change and ignore non-abortable stale decode callbacks. Never let idle route prefetch call this loader.
- [ ] **Prepare videos without eager bodies.** Use `preload="metadata"`/metadata events; video completion is tracked separately and does not falsify the image `loaded/total` ratio.
- [ ] **Use a bounded two-work cache.** Promote the selected work to current, retain only the immediately previous work, and release object URLs/owned decoded references on eviction. Selection must immediately display `loaded/total`, including partial failures, and render every successfully decoded image in manifest order.
- [ ] **Verify and commit.** Run `node --test apps/web/tests/exhibits/work-media-loader.test.mjs`, existing Focus tests, and `npm run content:check`; expect generated/workbook/source assets unchanged. Commit with `git commit -m "feat: eagerly decode selected work media"`.

### Phase 12: Release gates and ordered independent review

**Files:**
- Modify only implementation/tests named by a confirmed failing gate or review finding.

- [ ] **Run automated release gates.** Run `npm run verify:quick`, `npm run build:chunks`, and `npm run build:github-pages:chunks`; all must pass.
- [ ] **Run the new structural gates.** Pass the mobile transitive import graph and MobileStartMenu interaction contract, idle-prefetch allowlist, full/simplified visual-profile contract, asset inventory/hash test, and selected-work exact-request/progress tests.
- [ ] **Prove protected scope.** Run `git diff --check` and compare the implementation range against the baseline for the workbook, `apps/web/src/generated/**`, `apps/web/public/exhibits/**`, GLBs, Blender files, and source assets; expect no changes.
- [ ] **Run desktop route/lifecycle QA.** Test cold canonical deep links, valid/invalid works, aliases, Back/Forward, returning to `/`, stable Canvas/Rapier/scene identity, pointer-lock release/resume, and hard-refresh semantic pose restoration. Confirm cold content requests contain no 3D/runtime assets. On blocked routes verify main frameloop, Rapier/physics stepping, input, and runtime/background audio are paused while retained objects/resources/pose stay alive, then resume correctly on `/`.
- [ ] **Run both renderer profiles and recovery QA.** Verify actual WebGPU => full; initialization fallback/forced WebGL => WebGL2 simplified; shared Rapier/interaction/Focus behavior; exactly one device-loss forced-WebGL retry; no ongoing dispatch/timer after running.
- [ ] **Run lobby and mobile visual/input QA.** Compare Desktop StartLobby and MobileStartMenu against their accepted evidence at matching viewports. Test mouse/touch/keyboard/focus-visible/reduced motion, demand frames, portrait/landscape, narrow emulation, at least one physical touch device, and every canonical mobile route. Desktop and mobile entry implementations must remain dependency-isolated; mobile initial and post-Enter 3D imports/requests equal zero, and desktop lobby/pre-Enter Rapier chunk/WASM, world GLB, and Focus GLB requests equal zero.
- [ ] **Run lifecycle/network QA.** A started `/ -> content -> /` round trip keeps the same Canvas, renderer, Rapier world, scene/core GLBs, and pose with zero core 3D re-requests. Before work selection, media requests equal zero; after selection, requests exactly match that work's deduplicated full-image manifest and progress reports real loaded/total/failed values.
- [ ] **Run measured performance and memory QA.** Repeat Phase 8's fixed full/simplified protocol for cold/warm boot, route cycles, and repeated work cycles. Report network, delayed Rapier chunk/WASM loading, 3D asset transfer/decode, frame time, JS/GPU memory where available, listener cleanup, and cache bounds. React-versus-Svelte migration is out of scope because it is not the measured primary cost. The candidate must remain within approved caps or the recorded baseline noise band; a successful build alone is not a performance pass.
- [ ] **Run main-gallery visual acceptance.** Compare full/simplified before/after screenshots at identical viewport/pose/camera. Complete the visual table and confirm both profiles retain fog, base hierarchy, depth/outline, readable HUD, and first-person identity; expensive leaves remain off in simplified.
- [ ] **Re-prove asset authorization boundaries.** Asset inventory hashes and byte sizes remain unchanged. Public source assets are reported, not moved/deleted/excluded. Any KTX2/Draco/Meshopt/LOD/collision/re-export work requires a separately approved goal and commit.
- [ ] **Request requirements review first.** A fresh independent reviewer receives the approved decisions, plan, diff, and gate evidence and returns PASS or file/line findings. Fix confirmed findings and rerun all affected gates.
- [ ] **Request quality review second.** Only after requirements PASS, a different independent reviewer checks reducer purity, stale async work, renderer/device disposal, route lifecycle, accessibility, performance/memory, cache cleanup, and test strength. Fix confirmed findings and rerun all affected gates.
- [ ] **Commit review fixes independently.** Keep each phase commit auditable; use a focused review-fix commit rather than squashing.

## Plan self-review checklist

- [ ] Platform is chosen once; mobile's transitive graph is 3D-free.
- [ ] Desktop StartLobby and MobileStartMenu are separate implementations; mobile keeps brand title, bounded lightweight feedback, one Enter, native keyboard/focus/reduced-motion support, and zero 3D imports/requests before and after Enter.
- [ ] WebGPU alone is full; every main-runtime WebGL2 path is simplified; the temporary lobby is WebGL2-only and has no main profile.
- [ ] Exactly one main Canvas, one Rapier world, one `SpaceScene`, one interaction model, and one Focus tier serve both profiles; the Focus viewer exception is local and the lobby/main contexts never overlap.
- [ ] React Router plus `BASE_URL` basename is the only URL authority; cold content routes do not start 3D; a started host persists.
- [ ] Returning from works/profile/DevStories reuses the same Canvas, renderer, Rapier world, core GLBs, and pose without another boot or core-resource request.
- [ ] Blocked desktop routes pause main frameloop work, Rapier/physics stepping, input, pointer lock, and runtime/background audio without disposing objects/resources/pose; Focus content media remains locally usable.
- [ ] Boot progress comes only from real attempt-scoped events and device loss retries once.
- [ ] StartLobby is based on the two named URLs and thread-scoped screenshots, has only 3D title plus one DOM Enter, then disposes before Boot/main Canvas begins; every old entry caller/path is removed.
- [ ] Runtime modules have narrow ownership; per-frame data never enters React Context; no state library is added.
- [ ] Running-session idle prefetch is one-shot/cancellable and allowlisted to Profile/DevStories lightweight code; it never prefetches works, Focus GLBs, or media.
- [ ] A selected work—and only a selected work—requests and decodes its complete deduplicated image set, reports truthful loaded/total/failed progress, handles stale work, prepares video metadata, and caches current plus last.
- [ ] The asset inventory and browser baseline cover network, cache, decode, frame time, and available JS/GPU memory for full/simplified; proposed budgets distinguish measured values, noise bands, and user-approved caps.
- [ ] Performance work prioritizes delayed Rapier and 3D asset cost rather than a React/Svelte rewrite; desktop lobby/pre-Enter Rapier chunk/WASM, world GLB, and Focus GLB requests are zero.
- [ ] Both profiles preserve cheap fog, base color/material hierarchy, basic depth/outline separation, and readable HUD; simplified disables named expensive leaves without becoming a flat gray scene.
- [ ] Main-gallery visual work has pre-change same-viewport evidence, an executable acceptance table, matching post-change comparisons, input/reduced-motion QA, and frame-budget evidence.
- [ ] Required builds, route/pointer/profile/mobile/performance/memory QA, then requirements and quality reviews, all pass.
- [ ] Workbook, generated output, GLBs, Blender files, textures, audio, and source assets remain untouched; asset conversion/removal/re-export requires separate approval.
