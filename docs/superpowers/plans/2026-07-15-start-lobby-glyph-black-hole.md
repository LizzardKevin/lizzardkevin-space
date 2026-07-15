# StartLobby Glyph Black Hole Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved V3 desktop StartLobby exhibit barrage with build-time bilingual workbook data, 36 right-to-left independent entries, per-grapheme radial attraction and persistent rotational disturbance, and restrained white core fragments.

**Architecture:** Keep the existing raw R3F canvas as a transparent foreground for the extruded brand title. Add one sibling Canvas2D background component with an imperative pointer API, a pure tested glyph-physics module, cached dot/glyph sprites, and a 30 FPS lifecycle that pauses when hidden, disposing, reduced-motion, or unmounted.

**Tech Stack:** React 19, TypeScript 6, Canvas2D, raw React Three Fiber, Three.js, i18next, Node test runner, SheetJS workbook generator, Vite 8.

---

## File Map

- Create `apps/web/src/generated/startLobbyExhibitText.generated.ts`: generated bilingual title/subtitle entry pool.
- Modify `scripts/generate-space-content.mjs`: derive and materialize the lightweight pool from enabled exhibit rows.
- Modify `apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs`: prove every workbook exhibit contributes separate title and subtitle entries in both languages.
- Create `apps/web/src/lobby/startLobbyGlyphPhysics.ts`: deterministic stream repetition, grapheme segmentation, mutable radial integration, and fragment generation.
- Create `apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs`: pure behavior tests.
- Create `apps/web/src/lobby/StartLobbyBarrage.tsx`: Canvas2D renderer, caches, RAF scheduler, lifecycle, visibility, pointer imperative handle, and i18n pool selection.
- Modify `apps/web/src/lobby/StartLobby.tsx`: transparent WebGL foreground, barrage layer, and shared pointer forwarding.
- Modify `apps/web/src/lobby/startLobby.css`: explicit background/foreground/control stacking.
- Modify `apps/web/tests/lobby/start-lobby.contract-test.mjs`: lifecycle, reduced-motion, import-boundary, stacking, and renderer transparency contracts.
- Modify root `package.json`: include the new focused physics test in `test:unit`.

### Task 1: Generate the independent bilingual entry pool

**Files:**
- Modify: `apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs`
- Modify: `scripts/generate-space-content.mjs`
- Create through generator: `apps/web/src/generated/startLobbyExhibitText.generated.ts`

- [ ] **Step 1: Write the failing workbook contract**

Add `START_LOBBY_TEXT_PATH`, read the generated source after `--check`, and assert that enabled exhibit rows each produce exactly two independent items per language:

```js
const START_LOBBY_TEXT_PATH = projectPath(
  "apps/web/src/generated/startLobbyExhibitText.generated.ts",
);

test("StartLobby gets separate bilingual title and subtitle entries from exhibit rows", () => {
  const workbook = XLSX.readFile(WORKBOOK_PATH, { cellDates: false });
  const exhibitRows = REQUIRED_SHEETS.flatMap((sheetName) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false }),
  ).filter((row) => {
    const enabled = String(row.enabled ?? "").trim().toLowerCase();
    return row.entry_kind === "exhibit" && !["n", "no", "false", "0"].includes(enabled);
  });
  const source = fs.readFileSync(START_LOBBY_TEXT_PATH, "utf8");

  assert.match(source, /generatedStartLobbyExhibitText/);
  assert.equal((source.match(/"kind": "title"/g) ?? []).length, exhibitRows.length * 2);
  assert.equal((source.match(/"kind": "subtitle"/g) ?? []).length, exhibitRows.length * 2);
  assert.doesNotMatch(source, /overview|storyHtml|imageUrls|focusGlbUrl/);
  for (const row of exhibitRows) {
    for (const field of ["title_en", "subtitle_en", "title_zh", "subtitle_zh"]) {
      assert.ok(source.includes(JSON.stringify(String(row[field]).trim()).slice(1, -1)));
    }
  }
});
```

- [ ] **Step 2: Run the contract and verify the expected failure**

Run:

```powershell
node --test apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs
```

Expected: FAIL because `startLobbyExhibitText.generated.ts` does not exist.

- [ ] **Step 3: Add the generator output**

In `buildOutputs`, derive independent objects without importing any mobile content:

```js
const startLobbyExhibitText = {
  en: exhibitRows.flatMap((row) => [
    { exhibitId: row.id, kind: "title", text: required(row, "title_en") },
    { exhibitId: row.id, kind: "subtitle", text: required(row, "subtitle_en") },
  ]),
  zh: exhibitRows.flatMap((row) => [
    { exhibitId: row.id, kind: "title", text: required(row, "title_zh") },
    { exhibitId: row.id, kind: "subtitle", text: required(row, "subtitle_zh") },
  ]),
};
```

Return `startLobbyExhibitText` from `buildOutputs` and materialize it:

```js
files.set(path.join(generatedRoot, "startLobbyExhibitText.generated.ts"), writeTsModule([
  `export const generatedStartLobbyExhibitText = ${literal(outputs.startLobbyExhibitText)};`,
]));
```

- [ ] **Step 4: Generate content and rerun the contract**

Run:

```powershell
npm run content:generate
node --test apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs
```

Expected: generated module written; workbook contract PASS.

- [ ] **Step 5: Commit the content boundary**

```powershell
git add -- scripts/generate-space-content.mjs apps/web/src/generated/startLobbyExhibitText.generated.ts apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs
git commit -m "feat: generate lobby exhibit text pool"
```

### Task 2: Implement test-first per-grapheme physics

**Files:**
- Create: `apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs`
- Create: `apps/web/src/lobby/startLobbyGlyphPhysics.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for the public physics API**

The tests import these exact exports:

```js
import {
  START_LOBBY_STREAM_COUNT,
  advanceLobbyGlyph,
  createLobbyFragmentBurst,
  repeatLobbyEntries,
  segmentLobbyGraphemes,
} from "../../src/lobby/startLobbyGlyphPhysics.ts";
```

Cover these assertions:

```js
test("repeats a small independent pool to exactly 36 streams", () => {
  const pool = [
    { exhibitId: "a", kind: "title", text: "TITLE" },
    { exhibitId: "a", kind: "subtitle", text: "SUBTITLE" },
  ];
  const streams = repeatLobbyEntries(pool);
  assert.equal(streams.length, START_LOBBY_STREAM_COUNT);
  assert.deepEqual(streams.slice(0, 4).map((item) => item.kind), ["title", "subtitle", "title", "subtitle"]);
});

test("segments emoji and CJK by grapheme cluster", () => {
  assert.deepEqual(segmentLobbyGraphemes("A👨‍👩‍👧‍👦中", "zh"), ["A", "👨‍👩‍👧‍👦", "中"]);
});

test("attraction is radial and adds rotation without a spiral force", () => {
  const glyph = { x: 0, y: 0, vx: -20, vy: 0, rotation: 0, angularVelocity: 0, detached: false, alive: true };
  advanceLobbyGlyph(glyph, { x: 100, y: 0, active: true }, 1 / 30, 180, 20, 0.8);
  assert.ok(glyph.vx > -20);
  assert.equal(glyph.vy, 0);
  assert.notEqual(glyph.angularVelocity, 0);
  assert.equal(glyph.detached, true);
});

test("detached glyphs keep displacement and rotation after force leaves", () => {
  const glyph = { x: 25, y: 17, vx: 42, vy: 8, rotation: 0.4, angularVelocity: 1.2, detached: true, alive: true };
  advanceLobbyGlyph(glyph, { x: 0, y: 0, active: false }, 1 / 30, 180, 20, 0.3);
  assert.notEqual(glyph.y, 0);
  assert.ok(glyph.rotation > 0.4);
  assert.equal(glyph.detached, true);
});

test("core grinding emits only two or three short white fragments", () => {
  const burst = createLobbyFragmentBurst(20, 30, 0.4, 1000);
  assert.ok(burst.length === 2 || burst.length === 3);
  assert.ok(burst.every((fragment) => fragment.lifeMs === 360 && fragment.length <= 4));
});
```

- [ ] **Step 2: Run the physics test and verify import failure**

Run:

```powershell
node --test apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `startLobbyGlyphPhysics.ts`.

- [ ] **Step 3: Implement the exact low-allocation physics API**

Create the types and constants, use `Intl.Segmenter` with `Array.from` fallback, repeat entries deterministically to 36, mutate glyph state in `advanceLobbyGlyph`, apply only normalized radial acceleration, preserve `detached`, ease only horizontal velocity toward `-baselineSpeed` outside the field, and generate 2–3 capped fragments from a deterministic seed.

The integration signature must remain:

```ts
export function advanceLobbyGlyph(
  glyph: LobbyGlyphState,
  pointer: LobbyPointerState,
  deltaSeconds: number,
  radiusPx: number,
  baselineSpeedPxPerSecond: number,
  seed: number,
): "alive" | "consumed";
```

The pointer inactive path must never write a baseline word offset or set `detached=false`.

- [ ] **Step 4: Add the focused test to `test:unit` and verify green**

Append `apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs` to the root `test:unit` Node test invocation, then run:

```powershell
node --test apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
```

Expected: both PASS.

- [ ] **Step 5: Commit the physics core**

```powershell
git add -- package.json apps/web/src/lobby/startLobbyGlyphPhysics.ts apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs
git commit -m "feat: add lobby glyph black hole physics"
```

### Task 3: Integrate the Canvas2D barrage behind the 3D title

**Files:**
- Create: `apps/web/src/lobby/StartLobbyBarrage.tsx`
- Modify: `apps/web/src/lobby/StartLobby.tsx`
- Modify: `apps/web/src/lobby/startLobby.css`
- Modify: `apps/web/tests/lobby/start-lobby.contract-test.mjs`

- [ ] **Step 1: Extend the lobby contract before implementation**

Add assertions that require:

```js
const barrage = readSource("lobby/StartLobbyBarrage.tsx");
const physics = readSource("lobby/startLobbyGlyphPhysics.ts");

assert.match(source, /<StartLobbyBarrage/);
assert.match(source, /alpha:\s*true/);
assert.doesNotMatch(source, /<color\s+attach=["']background/);
assert.match(barrage, /generatedStartLobbyExhibitText/);
assert.match(barrage, /START_LOBBY_STREAM_COUNT/);
assert.match(barrage, /requestAnimationFrame/);
assert.match(barrage, /document\.visibilityState/);
assert.match(barrage, /prefers-reduced-motion:\s*reduce/);
assert.match(barrage, /Math\.min\([^\n]*1\.25/);
assert.doesNotMatch(barrage + physics, /@react-three|three|rapier|\.glb|mobileArchive|postprocessing|Howl/);
```

Update the existing palette contract so the CSS background and Three fog remain `#69827e`, while the Three scene has no opaque background color.

- [ ] **Step 2: Run the contract and verify the expected failure**

Run:

```powershell
node apps/web/tests/lobby/start-lobby.contract-test.mjs
```

Expected: FAIL because `StartLobbyBarrage.tsx` does not exist and the renderer is still opaque.

- [ ] **Step 3: Build `StartLobbyBarrage`**

Expose this imperative handle:

```ts
export type StartLobbyBarrageHandle = {
  setPointer(clientX: number, clientY: number): void;
  resetPointer(): void;
};
```

The component receives `disposing: boolean`, selects `generatedStartLobbyExhibitText.zh` when `i18n.resolvedLanguage` begins with `zh`, repeats to 36 streams, creates the Canvas2D engine once per language/size lifecycle, caps DPR at 1.25, and runs at 30 FPS.

Implementation requirements:

- Pre-render the full ordered dot lattice into one offscreen canvas on resize.
- Cache glyph sprites and advance metrics by `kind + grapheme`.
- Keep undisturbed glyphs on stream offsets; detach only inside the pointer radius.
- Cull glyphs outside a 64 px padded viewport.
- Call `advanceLobbyGlyph` only for detached or influenced glyphs.
- On `"consumed"`, append `createLobbyFragmentBurst`, capped at 120 fragments.
- Pause when `disposing`, `document.visibilityState !== "visible"`, or unmounted.
- In reduced motion, draw one static frame and schedule no RAF.
- Cancel the RAF, disconnect `ResizeObserver`, remove visibility and media-query listeners, and clear caches on cleanup.

- [ ] **Step 4: Make the existing WebGL title transparent and forward pointers**

In `StartLobby.tsx`:

- Import and render the barrage before the WebGL canvas.
- Set the WebGL renderer to `alpha: true`.
- Remove the Three scene background color but retain fog `#69827e`.
- Forward existing `onPointerMove` and `onPointerDown` coordinates to the barrage handle without React state.
- Call `resetPointer()` from `onPointerLeave` while preserving already detached glyph state.

In CSS:

```css
.start-lobby__barrage { position:absolute; inset:0; z-index:0; width:100%; height:100%; pointer-events:none; }
.start-lobby__canvas { z-index:1; }
.start-lobby__enter { z-index:2; }
```

- [ ] **Step 5: Run focused contracts, typecheck, and lint**

Run:

```powershell
node apps/web/tests/lobby/start-lobby.contract-test.mjs
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
npm run lint
```

Expected: all PASS with no warnings introduced by the new component.

- [ ] **Step 6: Commit the rendering integration**

```powershell
git add -- apps/web/src/lobby/StartLobbyBarrage.tsx apps/web/src/lobby/StartLobby.tsx apps/web/src/lobby/startLobby.css apps/web/tests/lobby/start-lobby.contract-test.mjs
git commit -m "feat: add lobby exhibit glyph barrage"
```

### Task 4: Verify behavior, import boundaries, and build output

**Files:**
- Modify only if a discovered regression requires a targeted correction.
- Record screenshots under `.codex/visualizations/...`; do not commit browser artifacts.

- [ ] **Step 1: Run focused generated-content and lobby tests**

```powershell
npm run content:check
node --test apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs
node apps/web/tests/lobby/start-lobby.contract-test.mjs
node apps/web/tests/mobile/start-menu.contract-test.mjs
node apps/web/tests/space/runtime-boundaries.contract-test.mjs
```

Expected: all PASS, proving content synchronization and desktop/mobile/runtime isolation.

- [ ] **Step 2: Run repository quick verification**

```powershell
npm run verify:quick
```

Expected: PASS.

- [ ] **Step 3: Run chunk build verification**

```powershell
npm run build:chunks
```

Expected: PASS; no mobile or cold content route acquires Three/R3F/StartLobby imports.

- [ ] **Step 4: Run desktop browser QA at 1440×900**

Use the already-authorized Playwright CLI against the local Vite server. Capture the StartLobby at rest, after a slow pointer pass, and immediately after a fast pointer sweep. Verify:

- 36 small streams are present or scheduled.
- The foreground title remains dominant and unobscured.
- Individual glyphs detach and rotate rather than whole words moving as one block.
- Fast pointer departure leaves displaced glyphs moving left without reassembly.
- Core contact emits only short white fragments.
- Enter still starts SPACE.
- No console error or black screen occurs.

- [ ] **Step 5: Run reduced-motion and one-minute performance QA**

Emulate `prefers-reduced-motion: reduce` and confirm a static field with no continuous RAF motion. In normal motion, observe one minute at 1440×900 and confirm:

- animation cadence remains capped near 30 FPS;
- DPR remains no higher than 1.25;
- animation pauses when the page is backgrounded;
- heap and fragment counts do not grow continuously;
- no long task attributable to the barrage blocks Enter interaction.

- [ ] **Step 6: Commit any targeted QA corrections separately**

If QA requires changes, stage only those files and commit:

```powershell
git commit -m "fix: stabilize lobby glyph barrage"
```

If no corrections are required, do not create an empty commit.

### Task 5: Completion audit

**Files:**
- Inspect the design spec, plan, git diff, generated module, tests, screenshots, and command output.

- [ ] **Step 1: Audit every approved requirement against direct evidence**

Confirm each item from `docs/superpowers/specs/2026-07-15-start-lobby-glyph-black-hole-design.md` has source, test, build, or browser evidence. Treat missing browser evidence as incomplete rather than inferred.

- [ ] **Step 2: Confirm repository state**

```powershell
git status --short --branch
git log -6 --oneline --decorate
```

Expected: only intentionally untracked local visual-companion artifacts may remain; all project changes are committed in atomic commits.

- [ ] **Step 3: Stop and remove local visual-companion artifacts**

Stop the visual companion session, verify the resolved `.superpowers/brainstorm/1258-1784097942` path is inside this worktree, then remove only that generated session directory so the worktree is clean.

- [ ] **Step 4: Mark the active Goal complete only after all evidence passes**

Do not mark complete if any required interaction, reduced-motion state, import boundary, test, build, or browser check is missing.
