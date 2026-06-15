# Rapier Lazy Preload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the initial HTML/app entry from eagerly loading `rapier-vendor`, while preserving the current SPACE warm-up behavior so clicking `进入 SPACE` does not wait for Rapier to download.

**Architecture:** Keep `SpaceDesktopExperience` lazy and still mounted behind the entry screen, so the 3D canvas can warm up before the entry button is actionable. Disable Vite/Rolldown modulepreload injection for this app, then add a build artifact contract test that fails if `rapier-vendor` returns to the HTML preload list or static entry imports. Treat the large Rapier chunk as an intentionally lazy 3D runtime chunk and enforce the real performance contract with artifact tests instead of relying on Vite's generic 500 kB warning.

**Tech Stack:** Vite 8, Rolldown `codeSplitting.groups`, React lazy loading, React Three Fiber, `@react-three/rapier`, Node build artifact tests.

---

## File Structure

- Modify: `apps/web/vite.config.ts`
  - Disable modulepreload injection.
  - Keep existing vendor groups.
  - Raise `chunkSizeWarningLimit` only after adding a stricter artifact test for eager chunks.
- Create: `scripts/build-chunk-contract-test.mjs`
  - Reads `apps/web/dist/index.html` and built JS assets.
  - Asserts `rapier-vendor` exists as a separate built chunk.
  - Asserts `rapier-vendor` is not in HTML modulepreload links.
  - Asserts the entry JS does not statically import `rapier-vendor`.
  - Asserts no HTML-preloaded JS chunk is larger than 500 kB.
- Modify: `package.json`
  - Add `build:chunks` convenience script for the artifact contract test.

---

### Task 1: Add Failing Build Artifact Contract Test

**Files:**
- Create: `scripts/build-chunk-contract-test.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/build-chunk-contract-test.mjs`:

```js
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

const distRoot = new URL("../apps/web/dist/", import.meta.url);
const assetsRoot = new URL("./assets/", distRoot);
const html = readFileSync(new URL("./index.html", distRoot), "utf8");
const assets = readdirSync(assetsRoot).filter((file) => file.endsWith(".js"));

const rapierChunks = assets.filter((file) => file.startsWith("rapier-vendor-"));
assert.equal(rapierChunks.length, 1, "Rapier should remain isolated in one vendor chunk");
const rapierChunk = rapierChunks[0];

const entryMatch = html.match(/<script type="module" crossorigin src="\.\/assets\/([^"]+\.js)">/);
assert(entryMatch, "index.html should contain one module entry script");
const entryFile = entryMatch[1];
const entryJs = readFileSync(new URL(`./${entryFile}`, assetsRoot), "utf8");

const preloadMatches = Array.from(
  html.matchAll(/<link rel="modulepreload" crossorigin href="\.\/assets\/([^"]+\.js)">/g),
).map((match) => match[1]);

assert(
  !preloadMatches.includes(rapierChunk),
  `index.html must not modulepreload ${rapierChunk}`,
);

assert(
  !entryJs.includes(`from"./${rapierChunk}"`) && !entryJs.includes(`from "./${rapierChunk}"`),
  `entry chunk ${entryFile} must not statically import ${rapierChunk}`,
);

const oversizedPreloads = preloadMatches
  .map((file) => ({
    file,
    sizeKb: statSync(new URL(`./${file}`, assetsRoot)).size / 1024,
  }))
  .filter(({ sizeKb }) => sizeKb > 500);

assert.deepEqual(
  oversizedPreloads,
  [],
  `HTML-preloaded JS chunks must stay under 500 kB: ${JSON.stringify(oversizedPreloads)}`,
);

console.log("build chunk contract tests passed");
```

- [ ] **Step 2: Run the existing build**

Run:

```bash
npm run build
```

Expected: build exits `0`, but reports the current large chunk warning.

- [ ] **Step 3: Run the new test and verify it fails**

Run:

```bash
node scripts/build-chunk-contract-test.mjs
```

Expected: FAIL with `index.html must not modulepreload rapier-vendor-...js` or `entry chunk ... must not statically import rapier-vendor-...js`.

- [ ] **Step 4: Commit the failing test only if working in a TDD branch checkpoint**

```bash
git add scripts/build-chunk-contract-test.mjs
git commit -m "test: add chunk preload contract"
```

Skip this commit if implementing inline and the repo convention is one final commit.

---

### Task 2: Disable Eager Modulepreload and Set Explicit Chunk Warning Policy

**Files:**
- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: Update Vite build configuration**

Change `apps/web/vite.config.ts` to:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Rapier is intentionally isolated as a lazy SPACE runtime dependency.
// A separate build artifact contract test guards against it returning to the
// HTML preload path, so this limit only suppresses Vite's generic vendor warning.
const KNOWN_LAZY_VENDOR_WARNING_LIMIT_KB = 3300

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** 相对路径，便于解压后用本地静态服务器直接打开 */
  base: "./",
  build: {
    modulePreload: false,
    chunkSizeWarningLimit: KNOWN_LAZY_VENDOR_WARNING_LIMIT_KB,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "rapier-vendor",
              test: /node_modules[\\/](@react-three[\\/]rapier|@dimforge)[\\/]/,
              priority: 25,
            },
            {
              name: "three-vendor",
              test: /node_modules[\\/](three|@react-three|@react-spring|@use-gesture|zustand|troika-three-text|troika-worker-utils|camera-controls|meshline)[\\/]/,
              priority: 20,
              maxSize: 450_000,
            },
          ],
        },
      },
    },
  },
})
```

- [ ] **Step 2: Build after the config change**

Run:

```bash
npm run build
```

Expected: build exits `0` and no longer prints the generic `Some chunks are larger than 500 kB` warning because `chunkSizeWarningLimit` now matches the known lazy Rapier vendor size.

- [ ] **Step 3: Verify the artifact contract is green**

Run:

```bash
node scripts/build-chunk-contract-test.mjs
```

Expected: PASS with `build chunk contract tests passed`.

- [ ] **Step 4: Inspect `dist/index.html` manually**

Run:

```bash
sed -n '1,40p' apps/web/dist/index.html
```

Expected:
- no `<link rel="modulepreload" ... rapier-vendor...>`
- no `<link rel="modulepreload" ... three-vendor-fHyGiDjJ...>`
- the entry script still points to `./assets/index-*.js`

---

### Task 3: Add a Package Script for the Contract Test

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add a script**

Modify the root `package.json` scripts block to include:

```json
{
  "scripts": {
    "dev": "npm run dev -w apps/web",
    "build": "npm run build -w apps/web",
    "build:chunks": "npm run build && node scripts/build-chunk-contract-test.mjs",
    "preview": "npm run preview -w apps/web",
    "lint": "npm run lint -w apps/web",
    "deploy:pages": "npm run build -w apps/web && echo \"Deploy via Cloudflare Pages: set build output to apps/web/dist\"",
    "package:test": "node scripts/package-test-build.mjs",
    "github:push": "bash scripts/github-bootstrap.sh"
  }
}
```

- [ ] **Step 2: Run the new script**

Run:

```bash
npm run build:chunks
```

Expected:
- build exits `0`
- chunk contract test prints `build chunk contract tests passed`
- no generic Vite large chunk warning

---

### Task 4: Browser QA for Entry Warm-Up Behavior

**Files:**
- No source files.

- [ ] **Step 1: Start or reuse Vite**

Run:

```bash
npm run dev -w apps/web -- --host 127.0.0.1 --port 5173
```

Expected: Vite serves `http://127.0.0.1:5173/`.

- [ ] **Step 2: Desktop rendered QA at 1440x900**

Use Browser/IAB if available:

1. Open `http://127.0.0.1:5173/`.
2. Wait until `LizzardKevin Space` and `点击进入 SPACE` are visible.
3. Confirm the entry button is not visible until the desktop canvas has reached `canvasReady`.
4. Click `点击进入 SPACE`.
5. Confirm the fade enters SPACE without a loading overlay appearing after the click.
6. Open `LizzardKevin`.
7. Confirm the frosted overlay still opens and `回到space` remains at the top center.

Expected: Rapier no longer loads at HTML parse time, but the click into SPACE remains smooth because SPACE still warms in the background before the entry button is actionable.

- [ ] **Step 3: Browser console/network sanity**

Use Browser dev logs or Chrome DevTools:

Expected:
- No framework error overlay.
- No new runtime errors.
- In IAB, pointer lock may still fail; this is an environment limitation and not part of this chunk change.

---

### Task 5: Final Verification and Commit

**Files:**
- All files modified in prior tasks.

- [ ] **Step 1: Run full verification**

Run:

```bash
node scripts/frosted-overlay-contract-test.mjs
node scripts/frosted-split-wheel-paging-test.mjs
npm run build:chunks
npm run lint
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
git diff --check
```

Expected:
- Both existing overlay tests pass.
- `build:chunks` passes.
- lint exits `0`.
- TypeScript exits `0`.
- `git diff --check` exits `0`.

- [ ] **Step 2: Review changed files**

Run:

```bash
git status --short
git diff --stat
git diff -- apps/web/vite.config.ts package.json scripts/build-chunk-contract-test.mjs
```

Expected:
- Only `apps/web/vite.config.ts`, `package.json`, and `scripts/build-chunk-contract-test.mjs` changed for this task.
- No `dist/` files are staged.

- [ ] **Step 3: Commit**

Run:

```bash
git add apps/web/vite.config.ts package.json scripts/build-chunk-contract-test.mjs
git commit -m "fix: keep rapier out of entry preload"
```

Expected: one commit containing the chunk preload fix and the artifact contract test.

---

## Fallback Path If `modulePreload: false` Is Too Broad

Use this only if Browser QA shows a visible regression in SPACE warm-up or dynamic chunk loading.

**Files:**
- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: Replace `modulePreload: false` with targeted dependency filtering**

```ts
build: {
  modulePreload: {
    resolveDependencies(_filename, deps, context) {
      if (context.hostType !== "html") return deps;
      return deps.filter((dep) => !dep.includes("rapier-vendor-"));
    },
  },
  chunkSizeWarningLimit: KNOWN_LAZY_VENDOR_WARNING_LIMIT_KB,
  rolldownOptions: {
    output: {
      codeSplitting: {
        groups: [
          // keep existing groups unchanged
        ],
      },
    },
  },
}
```

- [ ] **Step 2: Re-run artifact contract**

Run:

```bash
npm run build
node scripts/build-chunk-contract-test.mjs
```

Expected: PASS. If it fails because the entry JS still imports `rapier-vendor`, revert to `modulePreload: false`; targeted HTML filtering is not enough for this app because the Vite preload helper was bundled into `rapier-vendor`.

---

## Self-Review

- Spec coverage: The plan explains what `rapier-vendor` does, avoids HTML/entry eager loading, preserves SPACE warm-up, and adds verification so the warning is not merely hidden.
- Placeholder scan: No `TODO`, `TBD`, or vague "add tests" steps remain.
- Type consistency: Vite 8 `modulePreload` and `chunkSizeWarningLimit` names match the installed `node_modules/vite/dist/node/index.d.ts` types.
