# SPACE Architecture V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement approved Solution B: a route-driven application shell that keeps one SPACE runtime alive while desktop and constrained clients receive stable, capability-aware experiences.

**Architecture:** `AppShell` owns stable platform selection, URL state, boot state, and overlay presentation. A persistent `SpaceHost` mounts the 3D runtime once for desktop-capable clients, while a WebGL2 boot controller selects `full` or `simplified` runtime modules; `/`, `/works/:exhibitId`, `/profile`, and `/devstories` change shell content without tearing down the host. Mobile or otherwise unsupported clients remain on the existing non-3D experience, and `MessengerStartLobby` is the explicit pre-entry boundary before SPACE captures input.

**Tech Stack:** React 19, TypeScript, React Router-compatible History API routing, React Three Fiber, Three.js WebGL2, Rapier, Vite, node:test contract tests.

---

## File Structure

- Create `apps/web/src/app/AppShell.tsx`: top-level platform, routing, boot, and overlay composition.
- Create `apps/web/src/app/appRoute.ts`: canonical parsing and formatting for `/`, `/works/:exhibitId`, `/profile`, and `/devstories`.
- Create `apps/web/src/app/AppRouteContext.tsx`: History API navigation without remounting the app shell.
- Create `apps/web/src/boot/spaceBootController.ts`: WebGL2 capability check and deterministic `full`/`simplified` decision.
- Create `apps/web/src/boot/SpaceBootGate.tsx`: boot loading, retry, and unavailable UI.
- Create `apps/web/src/lobby/MessengerStartLobby.tsx`: explicit user-gesture entry into the persistent SPACE host.
- Create `apps/web/src/space/SpaceHost.tsx`: stable owner of the SPACE canvas/runtime lifecycle.
- Create `apps/web/src/space/runtime/SpaceRuntime.tsx`: lazy runtime dispatcher.
- Create `apps/web/src/space/runtime/FullSpaceRuntime.tsx`: full WebGL2 scene, Rapier, projector, audio, and effects.
- Create `apps/web/src/space/runtime/SimplifiedSpaceRuntime.tsx`: WebGL2 scene with reduced effects and optional systems disabled.
- Create `apps/web/src/pages/WorksRoute.tsx`: exhibit route validation and complete image loading.
- Create `apps/web/src/exhibits/loadExhibitImages.ts`: ordered, deduplicated loading of every image listed by exhibit content.
- Modify `apps/web/src/main.tsx`: render `AppShell` as the only application root.
- Modify `apps/web/src/App.tsx`: reduce the legacy root to compatibility composition, then remove it after callers migrate.
- Modify `apps/web/src/pages/MobileExperience.tsx`: accept route state from the shell instead of detecting platform or reading location itself.
- Modify `apps/web/src/pages/SpaceDesktopExperience.tsx`: move canvas ownership to `SpaceHost` and expose only runtime composition.
- Modify `apps/web/src/scenes/SpaceScene.tsx`: receive explicit runtime mode and keep shared scene behavior mode-neutral.
- Modify `apps/web/src/exhibits/FocusOverlay.tsx`: render route-owned exhibit content and the complete image collection.
- Modify `apps/web/src/styles/global.css`: shell, lobby, boot, overlay, and simplified-mode presentation.
- Create `apps/web/tests/app/app-route.test.mjs`: route parser/formatter unit tests.
- Create `apps/web/tests/app/app-shell.contract-test.mjs`: persistent host and stable platform-routing contracts.
- Create `apps/web/tests/boot/space-boot-controller.test.mjs`: WebGL2 and runtime-mode decision tests.
- Create `apps/web/tests/space/runtime-split.contract-test.mjs`: dynamic import and bundle-boundary contracts.
- Create `apps/web/tests/exhibits/load-exhibit-images.test.mjs`: all-image ordering, filtering, and deduplication tests.
- Create `apps/web/tests/lobby/messenger-start-lobby.contract-test.mjs`: explicit start and input-capture contracts.
- Modify `package.json`: include the new tests in `test:unit` and `test:contracts`.

### Task 1: Lock the Route and Platform Contracts

**Files:**
- Create: `apps/web/tests/app/app-route.test.mjs`
- Create: `apps/web/tests/app/app-shell.contract-test.mjs`
- Create: `apps/web/src/app/appRoute.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing route tests**

Cover these exact cases: `/` maps to `{ kind: "home" }`; `/works/arch_uabb_exhibit` maps to `{ kind: "work", exhibitId: "arch_uabb_exhibit" }`; `/profile` maps to `{ kind: "profile" }`; `/devstories` maps to `{ kind: "devstories" }`; query strings and hashes do not affect route identity; malformed percent encoding and unknown paths fall back to home.

- [ ] **Step 2: Write the failing shell contract**

Assert that `AppShell.tsx` owns one `useClientPlatform()` call, renders one `SpaceHost`, passes the selected platform to `MobileExperience`, and does not use `key={location.pathname}` or route-specific keys around `SpaceHost`.

- [ ] **Step 3: Verify red**

Run: `node --test apps/web/tests/app/app-route.test.mjs`

Run: `node apps/web/tests/app/app-shell.contract-test.mjs`

Expected: both fail because the new application-shell modules do not exist.

- [ ] **Step 4: Implement the canonical route model**

Export this closed union and the functions `parseAppRoute(pathname: string): AppRoute` and `formatAppRoute(route: AppRoute): string` from `appRoute.ts`:

```ts
export type AppRoute =
  | { kind: "home" }
  | { kind: "work"; exhibitId: string }
  | { kind: "profile" }
  | { kind: "devstories" };
```

Only accept non-empty single-segment exhibit IDs matching `/^[a-z0-9_\-]+$/i`; invalid routes return `{ kind: "home" }`.

- [ ] **Step 5: Add tests to the root scripts and verify green**

Run: `npm run test:unit`

Run: `npm run test:contracts`

Expected: the new route suite and shell source contract pass with the existing suites.

- [ ] **Step 6: Commit**

```bash
git add package.json apps/web/src/app/appRoute.ts apps/web/tests/app
git commit -m "test: lock SPACE v2 shell contracts"
```

### Task 2: Build the Stable App Shell and History Routing

**Files:**
- Create: `apps/web/src/app/AppRouteContext.tsx`
- Create: `apps/web/src/app/AppShell.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/MobileExperience.tsx`
- Modify: `apps/web/tests/app/app-shell.contract-test.mjs`

- [ ] **Step 1: Extend the shell contract**

Assert that navigation calls `history.pushState`, listens for `popstate`, and exposes `route`, `navigate`, and `backToHome`. Assert that platform selection is made once in `AppShell`, so resize or route changes cannot switch a mounted client between desktop and mobile experiences.

- [ ] **Step 2: Verify red**

Run: `node apps/web/tests/app/app-shell.contract-test.mjs`

Expected: FAIL because the route context and shell composition are absent.

- [ ] **Step 3: Implement route context**

`AppRouteProvider` initializes from `window.location.pathname`, updates state after `pushState`, responds to `popstate`, and restores focus to the navigation trigger after overlays close. All public navigation accepts an `AppRoute`; no component constructs pathname strings directly.

- [ ] **Step 4: Implement stable platform routing**

`AppShell` stores the first resolved platform in a ref-backed state value. Mobile renders `MobileExperience` with the canonical route. Desktop renders the persistent `SpaceHost` plus route overlays. The platform branch must not live inside route-specific components.

- [ ] **Step 5: Make `AppShell` the single root**

Update `main.tsx` to mount `AppErrorBoundary`, existing providers, and `AppShell`. Remove duplicated location/platform ownership from `App.tsx` and `MobileExperience.tsx` while preserving current mobile content.

- [ ] **Step 6: Verify**

Run: `npm run test:contracts`

Run: `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`

Expected: contracts and TypeScript pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app apps/web/src/main.tsx apps/web/src/App.tsx apps/web/src/pages/MobileExperience.tsx apps/web/tests/app
git commit -m "feat: add stable SPACE application shell"
```

### Task 3: Add the WebGL2 Boot Controller

**Files:**
- Create: `apps/web/tests/boot/space-boot-controller.test.mjs`
- Create: `apps/web/src/boot/spaceBootController.ts`
- Create: `apps/web/src/boot/SpaceBootGate.tsx`
- Modify: `apps/web/src/app/AppShell.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write failing boot-decision tests**

Test this decision table: no WebGL2 returns `unavailable`; WebGL2 plus reduced-motion, low device memory, or a persisted safe-mode flag returns `simplified`; otherwise return `full`. Verify an explicit `?spaceMode=full|simplified` override is accepted in development only.

- [ ] **Step 2: Verify red**

Run: `node --test apps/web/tests/boot/space-boot-controller.test.mjs`

Expected: FAIL because `spaceBootController.ts` does not exist.

- [ ] **Step 3: Implement the pure boot decision**

Export `SpaceRuntimeMode = "full" | "simplified"`, `SpaceBootDecision`, `SpaceBootSignals`, and `decideSpaceBoot(signals)`. Keep browser probing in `probeSpaceBootSignals()` so the decision tests require no DOM or GPU.

- [ ] **Step 4: Implement `SpaceBootGate`**

Probe exactly once per shell mount. Render a localized loading state during the probe, the persistent host after a supported decision, and an unavailable panel with a link to the mobile archive when WebGL2 is absent. Retry repeats probing without remounting `AppShell`.

- [ ] **Step 5: Verify**

Run: `npm run test:unit`

Run: `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`

Expected: tests and TypeScript pass.

- [ ] **Step 6: Commit**

```bash
git add package.json apps/web/src/boot apps/web/src/app/AppShell.tsx apps/web/tests/boot
git commit -m "feat: add WebGL2 SPACE boot controller"
```

### Task 4: Split Full and Simplified Runtimes Behind a Persistent SpaceHost

**Files:**
- Create: `apps/web/tests/space/runtime-split.contract-test.mjs`
- Create: `apps/web/src/space/SpaceHost.tsx`
- Create: `apps/web/src/space/runtime/SpaceRuntime.tsx`
- Create: `apps/web/src/space/runtime/FullSpaceRuntime.tsx`
- Create: `apps/web/src/space/runtime/SimplifiedSpaceRuntime.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/app/AppShell.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write the failing runtime split contract**

Assert that `SpaceHost` owns exactly one canvas, accepts a stable `mode`, and is rendered outside the route-overlay switch. Assert that `SpaceRuntime` dynamically imports both mode modules, Rapier is imported only by the full-runtime dependency tree, and neither `/profile` nor `/devstories` imports a runtime directly.

- [ ] **Step 2: Verify red**

Run: `node apps/web/tests/space/runtime-split.contract-test.mjs`

Expected: FAIL because the split modules do not exist.

- [ ] **Step 3: Move canvas ownership into `SpaceHost`**

Keep renderer creation, canvas error recovery, audio provider state, pointer-lock guard, and scene readiness in `SpaceHost`. Route changes may alter overlay visibility and selected exhibit only; they must not change the host component identity.

- [ ] **Step 4: Implement the lazy runtime dispatcher**

Use `React.lazy` for `FullSpaceRuntime` and `SimplifiedSpaceRuntime`. Preload only the selected module after the lobby becomes visible. Keep a shared suspense fallback within the existing canvas boundary.

- [ ] **Step 5: Define the runtime boundary**

`FullSpaceRuntime` owns Rapier physics, projector installation, post-processing, high-cost atmosphere, and full scene audio. `SimplifiedSpaceRuntime` keeps navigation, exhibit anchors, labels, and focus entry but disables post-processing, projector textures, nonessential dynamic audio, and expensive decoration; it must not silently substitute the mobile site.

- [ ] **Step 6: Pass mode explicitly through shared scene code**

Change `SpaceScene` to accept `mode: SpaceRuntimeMode`; shared layout and interaction code branches only on named feature flags derived from the mode, never on user agent or viewport checks.

- [ ] **Step 7: Verify bundle and behavior contracts**

Run: `npm run test:contracts`

Run: `npm run build:chunks`

Expected: the split contract passes, both runtime chunks are emitted, and chunk budgets pass.

- [ ] **Step 8: Commit**

```bash
git add package.json apps/web/src/space apps/web/src/pages/SpaceDesktopExperience.tsx apps/web/src/scenes/SpaceScene.tsx apps/web/src/app/AppShell.tsx apps/web/tests/space/runtime-split.contract-test.mjs
git commit -m "refactor: split persistent SPACE runtime modes"
```

### Task 5: Add Messenger StartLobby and Safe Input Entry

**Files:**
- Create: `apps/web/tests/lobby/messenger-start-lobby.contract-test.mjs`
- Create: `apps/web/src/lobby/MessengerStartLobby.tsx`
- Modify: `apps/web/src/app/AppShell.tsx`
- Modify: `apps/web/src/space/SpaceHost.tsx`
- Modify: `apps/web/src/styles/global.css`
- Modify: `package.json`

- [ ] **Step 1: Write the failing lobby contract**

Assert that the initial desktop state displays `MessengerStartLobby`; SPACE does not request pointer lock, resume audio, or mount the selected runtime until the user activates Start; the Start button supplies the trusted user gesture; returning from a route overlay does not show the lobby again in the same session.

- [ ] **Step 2: Verify red**

Run: `node apps/web/tests/lobby/messenger-start-lobby.contract-test.mjs`

Expected: FAIL because the lobby module does not exist.

- [ ] **Step 3: Implement the lobby state machine**

Use the states `idle`, `starting`, `entered`, and `failed`. Start unlocks audio first, mounts/preloads the selected runtime, then enables pointer-lock requests. Failure returns to an actionable retry state and does not discard the boot decision.

- [ ] **Step 4: Implement Messenger presentation**

Render current bilingual SPACE title/copy, runtime-mode disclosure, Start, profile, devstories, and archive links. Links navigate with `AppRouteContext`; they do not enter SPACE or capture input. Preserve keyboard focus, visible focus rings, and Escape behavior.

- [ ] **Step 5: Verify**

Run: `npm run test:contracts`

Run: `npm run lint`

Expected: lobby contracts and lint pass.

- [ ] **Step 6: Commit**

```bash
git add package.json apps/web/src/lobby apps/web/src/app/AppShell.tsx apps/web/src/space/SpaceHost.tsx apps/web/src/styles/global.css apps/web/tests/lobby
git commit -m "feat: add Messenger SPACE start lobby"
```

### Task 6: Make Route Overlays Preserve SPACE

**Files:**
- Create: `apps/web/src/pages/WorksRoute.tsx`
- Modify: `apps/web/src/app/AppShell.tsx`
- Modify: `apps/web/src/pages/LizzardKevinPage.tsx`
- Modify: `apps/web/src/pages/DevStoriesPage.tsx`
- Modify: `apps/web/src/exhibits/FocusOverlay.tsx`
- Modify: `apps/web/src/overlay/OverlayLayer.tsx`
- Modify: `apps/web/tests/app/app-shell.contract-test.mjs`

- [ ] **Step 1: Extend route-overlay contracts**

Assert the exact route mapping: `/` closes route overlays; `/works/:exhibitId` opens `WorksRoute`; `/profile` opens `LizzardKevinPage`; `/devstories` opens `DevStoriesPage`. Assert all overlays are siblings after `SpaceHost`, close by navigating to `/`, and pause SPACE input without unmounting the canvas.

- [ ] **Step 2: Verify red**

Run: `node apps/web/tests/app/app-shell.contract-test.mjs`

Expected: FAIL until all four routes are shell-owned.

- [ ] **Step 3: Implement overlay routing**

Resolve exhibit IDs through the manifest. Unknown IDs render a localized not-found panel with a home action and do not crash or remount SPACE. On open, release pointer lock and pause movement; on close, restore focus and allow the user to resume deliberately.

- [ ] **Step 4: Remove page-local URL mutation**

Profile, devstories, works, and SPACE interaction actions call `navigate(AppRoute)` only. Browser Back and Forward must reproduce overlay state without reconstructing the runtime.

- [ ] **Step 5: Verify**

Run: `npm run test:contracts`

Run: `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`

Expected: route overlays, history navigation, and TypeScript pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/AppShell.tsx apps/web/src/pages apps/web/src/exhibits/FocusOverlay.tsx apps/web/src/overlay/OverlayLayer.tsx apps/web/tests/app
git commit -m "feat: route SPACE overlays without host remounts"
```

### Task 7: Load Every Image for Every Work

**Files:**
- Create: `apps/web/tests/exhibits/load-exhibit-images.test.mjs`
- Create: `apps/web/src/exhibits/loadExhibitImages.ts`
- Modify: `apps/web/src/pages/WorksRoute.tsx`
- Modify: `apps/web/src/exhibits/FocusOverlay.tsx`
- Modify: `apps/web/src/exhibits/focusImagePreload.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing image-list tests**

Use fixtures containing multiple content sections, repeated paths, mixed image/video/model media, and missing captions. Assert the result contains every image exactly once, preserves workbook/content order, resolves paths through `publicAssets`, retains available alt/caption text, and excludes non-image media.

- [ ] **Step 2: Verify red**

Run: `node --test apps/web/tests/exhibits/load-exhibit-images.test.mjs`

Expected: FAIL because `loadExhibitImages.ts` does not exist.

- [ ] **Step 3: Implement the pure collector**

Export `loadExhibitImages(content): ExhibitImage[]`. Traverse every supported exhibit content section instead of selecting a hero image or a hard-coded maximum. Deduplicate by normalized public URL while keeping the first metadata occurrence.

- [ ] **Step 4: Render and preload the full ordered collection**

`WorksRoute` passes the collection to `FocusOverlay`. Render all images with stable URL keys, intrinsic dimensions where available, lazy loading below the fold, eager loading for the first visible image, and per-image error isolation. Preload the next image only; do not eagerly decode the entire collection.

- [ ] **Step 5: Verify against all generated exhibit content**

Run: `npm run content:check`

Run: `npm run test:unit`

Expected: generated content remains unchanged and every image test passes.

- [ ] **Step 6: Commit**

```bash
git add package.json apps/web/src/exhibits/loadExhibitImages.ts apps/web/src/exhibits/focusImagePreload.ts apps/web/src/exhibits/FocusOverlay.tsx apps/web/src/pages/WorksRoute.tsx apps/web/tests/exhibits/load-exhibit-images.test.mjs
git commit -m "feat: load complete work image collections"
```

### Task 8: Migration Verification and Dual Subagent Review

**Files:**
- Modify only files identified by verification or review findings; do not edit generated content, workbooks, GLB assets, or media unless a separately approved task explicitly authorizes it.

- [ ] **Step 1: Run the complete automated gate**

Run: `npm run verify:quick`

Run: `npm run build:chunks`

Run: `npm run package:test`

Expected: unit tests, contracts, lint, TypeScript, content checks, production build, chunk budgets, and package checks all pass.

- [ ] **Step 2: Confirm generated and asset boundaries**

Run: `git status --short`

Run: `git diff --check`

Run: `git diff --name-only -- apps/web/src/generated apps/web/public/exhibits docs/assets BlenderFile`

Expected: no whitespace errors and no generated, workbook, exhibit asset, or Blender changes.

- [ ] **Step 3: Exercise the route matrix manually**

On a WebGL2 desktop, verify `/`, a valid and invalid `/works/:exhibitId`, `/profile`, and `/devstories`; Back/Forward; direct reload on every route; lobby Start; Escape; pointer-lock recovery; full and simplified overrides; and canvas identity across every transition. On a mobile viewport, verify the same URLs remain in the stable mobile experience with no 3D runtime request.

- [ ] **Step 4: Exercise the capability matrix manually**

Verify full mode, reduced-motion simplified mode, persisted safe mode, and WebGL2 unavailable fallback. Check that simplified mode preserves movement and exhibit entry, and that unavailable mode never imports Rapier or requests pointer lock.

- [ ] **Step 5: Verify every work image collection**

Visit every manifest exhibit, compare rendered image count and order with its generated content, scroll through all images, and confirm one broken image does not prevent the remaining images from loading.

- [ ] **Step 6: Request requirements-compliance subagent review**

Give a fresh subagent the approved Solution B requirements, this plan, and the final diff. Require a written PASS or a list of file-and-line gaps covering App Shell, stable platform split, WebGL2 full/simplified boot, persistent `SpaceHost`, all four routes, Messenger StartLobby, runtime split, and all-work image loading. Resolve every confirmed gap and rerun Step 1.

- [ ] **Step 7: Request code-quality subagent review**

After compliance passes, give a different fresh subagent the final diff and verification output. Require review of lifecycle stability, route/history correctness, lazy chunk boundaries, accessibility, error recovery, memory/resource cleanup, and test quality. Resolve every confirmed finding and rerun Steps 1 and 2.

- [ ] **Step 8: Commit final verified fixes**

```bash
git add apps/web/src apps/web/tests package.json
git commit -m "fix: address SPACE v2 review findings"
```

## Self Review

- Solution B is represented as one stable App Shell with a single platform decision and persistent SPACE host.
- The plan defines all required routes: `/`, `/works/:exhibitId`, `/profile`, and `/devstories`.
- WebGL2 probing and `full`/`simplified` mode selection are deterministic and testable.
- Boot Controller, Messenger StartLobby, runtime splitting, and complete per-work image loading each have an explicit red/green task.
- Route overlays pause input but never key, replace, or unmount `SpaceHost`.
- Validation includes automated gates, manual route/capability matrices, asset-boundary checks, and two independent subagent reviews in compliance-then-quality order.
- The plan contains no production changes itself; implementation remains separately executable and reviewable task by task.
