# Ark Glass Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap independent square tiles on `/profile`, `/devstories`, and `/works/:id` with a restrained industrial liquid-glass shell (edge-following highlight + soft hover sheen) via a single `ArkGlassTile` wrapper around `@khvicha/react-liquid-glass`.

**Architecture:** Install the library only in `apps/web`. All call sites import `ArkGlassTile`, never the raw package. Presets for blur, radius, border light, and parallax are locked inside the wrapper. CSS in `scroll-pages.css` drops duplicate solid fills/borders on the three tile families so the glass layer owns the surface. Reduced motion disables border animation and keeps a static glass tint.

**Tech Stack:** React 19, Vite, TypeScript, `@khvicha/react-liquid-glass`, existing `--ark-*` tokens in `apps/web/src/styles/scroll-pages.css`.

**Spec:** `docs/superpowers/specs/2026-07-23-ark-glass-tiles-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/package.json` | Add `@khvicha/react-liquid-glass` dependency |
| Create `apps/web/src/components/ArkGlassTile.tsx` | Sole integration surface: presets + reduced-motion gate + variants |
| Create `apps/web/tests/components/ark-glass-tile.contract-test.mjs` | Source contract: presets, reduced-motion branch, no raw lib imports outside wrapper |
| Modify `apps/web/src/pages/devstories/DevStoriesContent.tsx` | Wrap three panel kinds with `ArkGlassTile` |
| Modify `apps/web/src/pages/profile/ProfileContent.tsx` | Wrap link tiles |
| Modify `apps/web/src/pages/works/WorkDetailPage.tsx` | Wrap work prev/next nav links |
| Modify `apps/web/src/styles/scroll-pages.css` | Neutralize double borders/fills; ensure glass fills grid cells |

Do **not** touch SPACE HUD, lobby, mobile terminal, Magnet, or DotGrid.

---

### Task 1: Install dependency

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/package-lock.json` (via npm)

- [ ] **Step 1: Install the package in apps/web**

Run from repo root (PowerShell):

```powershell
Set-Location "apps/web"
npm install @khvicha/react-liquid-glass
```

Expected: `package.json` dependencies include `"@khvicha/react-liquid-glass": "^…"`.

- [ ] **Step 2: Confirm the package resolves types**

Run:

```powershell
npx tsc --noEmit -p tsconfig.json
```

Expected: exit 0 (or only pre-existing unrelated errors — if new errors mention the package path, stop and fix resolution before continuing).

- [ ] **Step 3: Commit (only if the user asked to commit)**

```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "$(cat <<'EOF'
chore(web): add @khvicha/react-liquid-glass

EOF
)"
```

---

### Task 2: `ArkGlassTile` wrapper + contract test

**Files:**
- Create: `apps/web/src/components/ArkGlassTile.tsx`
- Create: `apps/web/tests/components/ark-glass-tile.contract-test.mjs`

- [ ] **Step 1: Write the failing contract test**

Create `apps/web/tests/components/ark-glass-tile.contract-test.mjs`:

```js
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
    assert.match(src, /prefersReducedMotion/);
    assert.match(src, /enableBorderAnimation=\{!reduceMotion\}/);
    assert.match(src, /blur=\{8\}/);
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run from `apps/web`:

```powershell
node --test tests/components/ark-glass-tile.contract-test.mjs
```

Expected: FAIL because `ArkGlassTile.tsx` does not exist yet.

- [ ] **Step 3: Implement `ArkGlassTile`**

Create `apps/web/src/components/ArkGlassTile.tsx`:

```tsx
import { type ReactNode } from "react";
import { LiquidGlass } from "@khvicha/react-liquid-glass";
import { prefersReducedMotion } from "../scroll/useLenisScroll";

export type ArkGlassTileVariant = "panel" | "link" | "nav";

type ArkGlassTileProps = {
  children: ReactNode;
  className?: string;
  variant?: ArkGlassTileVariant;
};

const VARIANT_TINT: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(255, 255, 255, 0.06)",
  link: "rgba(255, 255, 255, 0.05)",
  nav: "rgba(255, 255, 255, 0.05)",
};

const VARIANT_BORDER: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(213, 214, 216, 0.22)",
  link: "rgba(213, 214, 216, 0.18)",
  nav: "rgba(213, 214, 216, 0.22)",
};

/**
 * 舟味克制工业玻璃贴：边光跟随指针；禁止点击波纹与 parallax 位移。
 * 调用方只传 className / variant / children，不透出库强度参数。
 */
export function ArkGlassTile({
  children,
  className,
  variant = "panel",
}: ArkGlassTileProps) {
  const reduceMotion = prefersReducedMotion();

  return (
    <LiquidGlass
      className={["ark-glass-tile", className].filter(Boolean).join(" ")}
      blur={8}
      tint={VARIANT_TINT[variant]}
      borderColor={VARIANT_BORDER[variant]}
      borderWidth={1}
      borderRadius={0}
      shadowBlur={0}
      shadowSpread={0}
      shadowOffsetX={0}
      shadowOffsetY={0}
      shadowColor="transparent"
      enableBorderAnimation={!reduceMotion}
      enableClickAnimation={false}
      parallaxMovement={0}
      turbulenceFrequency={0.008}
      turbulenceOctaves={1}
      blurStdDeviation={2}
      displacementScale={40}
      surfaceScale={2}
    >
      {children}
    </LiquidGlass>
  );
}
```

If the library requires importing CSS, add at the top of the same file:

```tsx
import "@khvicha/react-liquid-glass/dist/liquid-glass.css";
```

(Only add this import if the package exports that CSS path; verify under `node_modules/@khvicha/react-liquid-glass/package.json` `exports` / `files`.)

- [ ] **Step 4: Re-run the contract test**

```powershell
node --test tests/components/ark-glass-tile.contract-test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit (only if the user asked to commit)**

```bash
git add apps/web/src/components/ArkGlassTile.tsx apps/web/tests/components/ark-glass-tile.contract-test.mjs
git commit -m "$(cat <<'EOF'
feat(web): add ArkGlassTile restrained liquid-glass wrapper

EOF
)"
```

---

### Task 3: Wire DevStories panels

**Files:**
- Modify: `apps/web/src/pages/devstories/DevStoriesContent.tsx`
- Modify: `apps/web/src/styles/scroll-pages.css` (panel surface rules)

- [ ] **Step 1: Wrap the three panel branches**

In `DevStoriesContent.tsx`, add:

```tsx
import { ArkGlassTile } from "../../components/ArkGlassTile";
```

Replace each panel root `div` with `ArkGlassTile`, keeping the same `className` values:

```tsx
{story.built.length > 0 ? (
  <ArkGlassTile className="ark-dentry__panel" variant="panel">
    <span className="ark-dentry__panelLabel">
      {copy.devStories.builtLabel}
    </span>
    <ul>
      {story.built.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </ArkGlassTile>
) : null}
{story.trouble.length > 0 ? (
  <ArkGlassTile
    className="ark-dentry__panel ark-dentry__panel--trouble"
    variant="panel"
  >
    <span className="ark-dentry__panelLabel">
      {copy.devStories.troubleLabel}
    </span>
    <ul>
      {story.trouble.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </ArkGlassTile>
) : null}
{story.next ? (
  <ArkGlassTile
    className="ark-dentry__panel ark-dentry__panel--next"
    variant="panel"
  >
    <span className="ark-dentry__panelLabel">
      {copy.devStories.nextLabel}
    </span>
    <p>{story.next}</p>
  </ArkGlassTile>
) : null}
```

- [ ] **Step 2: Neutralize CSS so glass owns the surface**

In `scroll-pages.css`, change `.ark-dentry__panel` from solid fill to layout-only:

```css
.ark-dentry__panel {
  /* 表面由 ArkGlassTile / LiquidGlass 承担；此处只保留盒模型 */
  border: none;
  background: transparent;
  padding: 22px 24px 24px;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
}

.ark-glass-tile {
  min-width: 0;
  width: 100%;
  height: 100%;
  display: block;
}
```

Keep `.ark-dentry__panelLabel` and list styles unchanged.

- [ ] **Step 3: Smoke-check types**

```powershell
npx tsc --noEmit -p tsconfig.json
```

Expected: exit 0.

- [ ] **Step 4: Commit (only if the user asked to commit)**

```bash
git add apps/web/src/pages/devstories/DevStoriesContent.tsx apps/web/src/styles/scroll-pages.css
git commit -m "$(cat <<'EOF'
feat(web): apply ArkGlassTile to DevStories panels

EOF
)"
```

---

### Task 4: Wire profile link tiles and work nav tiles

**Files:**
- Modify: `apps/web/src/pages/profile/ProfileContent.tsx`
- Modify: `apps/web/src/pages/works/WorkDetailPage.tsx`
- Modify: `apps/web/src/styles/scroll-pages.css`

- [ ] **Step 1: Profile links — glass inside the interactive element**

Import `ArkGlassTile`. Keep `<a>` / `<div>` as the outer semantic node with `className="ark-links__item"`. Put glass inside so clicks/keyboard stay on the anchor:

```tsx
return link.href ? (
  <a
    key={`${link.label}-${link.value}`}
    className="ark-links__item"
    href={link.href}
    target="_blank"
    rel="noreferrer"
  >
    <ArkGlassTile className="ark-links__glass" variant="link">
      {inner}
    </ArkGlassTile>
  </a>
) : (
  <div key={`${link.label}-${link.value}`} className="ark-links__item">
    <ArkGlassTile className="ark-links__glass" variant="link">
      {inner}
    </ArkGlassTile>
  </div>
);
```

- [ ] **Step 2: Work nav — same pattern with React Router `Link`**

Import `ArkGlassTile` in `WorkDetailPage.tsx` and wrap link children:

```tsx
<nav className="ark-wnav" aria-label="EXHIBITS">
  <Link className="ark-wnav__link" to={workRoute(prevWork.exhibitId)}>
    <ArkGlassTile className="ark-wnav__glass" variant="nav">
      <span className="ark-wnav__dir">← {copy.work.prevWork}</span>
      <span className="ark-wnav__title">{navTitle(prevWork.exhibitId)}</span>
    </ArkGlassTile>
  </Link>
  <Link className="ark-wnav__link ark-wnav__link--next" to={workRoute(nextWork.exhibitId)}>
    <ArkGlassTile className="ark-wnav__glass" variant="nav">
      <span className="ark-wnav__dir">{copy.work.nextWork} →</span>
      <span className="ark-wnav__title">{navTitle(nextWork.exhibitId)}</span>
    </ArkGlassTile>
  </Link>
</nav>
```

- [ ] **Step 3: CSS for link/nav hosts**

Append/adjust in `scroll-pages.css`:

```css
.ark-links__item {
  display: flex;
  flex-direction: column;
  padding: 0;
  border-right: 1px solid var(--ark-line);
  border-bottom: 1px solid var(--ark-line);
  color: inherit;
  text-decoration: none;
  background: transparent;
  transition: none;
}

.ark-links__item:hover {
  background: transparent;
}

.ark-links__glass {
  flex: 1 1 auto;
  width: 100%;
  padding: var(--ark-gap-3);
  display: flex;
  flex-direction: column;
  gap: var(--ark-gap-1);
}

.ark-wnav__link {
  display: flex;
  flex-direction: column;
  padding: 0;
  border-top: 1px solid var(--ark-line);
  border-right: 1px solid var(--ark-line);
  border-bottom: 1px solid var(--ark-line);
  text-decoration: none;
  color: inherit;
  background: transparent;
  transition: none;
}

.ark-wnav__link:hover {
  background: transparent;
}

.ark-wnav__glass {
  flex: 1 1 auto;
  width: 100%;
  padding: var(--ark-gap-4);
  display: flex;
  flex-direction: column;
  gap: var(--ark-gap-2);
}
```

Preserve existing `.ark-links__label` / `.ark-links__value` / `.ark-wnav__dir` / `.ark-wnav__title` rules.

- [ ] **Step 4: Re-run glass contract + typecheck**

```powershell
node --test tests/components/ark-glass-tile.contract-test.mjs
npx tsc --noEmit -p tsconfig.json
```

Expected: both PASS / exit 0.

- [ ] **Step 5: Commit (only if the user asked to commit)**

```bash
git add apps/web/src/pages/profile/ProfileContent.tsx apps/web/src/pages/works/WorkDetailPage.tsx apps/web/src/styles/scroll-pages.css
git commit -m "$(cat <<'EOF'
feat(web): glass-wrap profile links and work nav tiles

EOF
)"
```

---

### Task 5: Verification

**Files:** none new (manual + existing verify)

- [ ] **Step 1: Run quick verify from repo root**

```powershell
npm run verify:quick
```

Expected: pass (content check, lint, tsc, unit/contract tests including the new glass contract).

- [ ] **Step 2: Manual visual checklist (dev server)**

With `npm run dev:local` open:

1. `/devstories` — three panels show light glass; hover moves edge highlight; text stays sharp; no click ripple
2. `/profile` — link tiles same; external links still open
3. `/works/:id` — prev/next tiles same; navigation still works
4. Windows「动画效果」临时关掉后刷新：边光停止，静态玻璃仍在
5. Width ≤900px: grids stack, no horizontal overflow from glass wrappers

- [ ] **Step 3: Mark spec acceptance boxes**

Update checkboxes in `docs/superpowers/specs/2026-07-23-ark-glass-tiles-design.md` acceptance section to `[x]` only after Step 2 passes.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Library `@khvicha/react-liquid-glass` | Task 1 |
| `ArkGlassTile` presets (blur 8, radius 0, no click wave, parallax 0) | Task 2 |
| Only wrapper imports raw lib | Task 2 contract |
| DevStories panels | Task 3 |
| Profile links + work nav | Task 4 |
| CSS no double surface | Tasks 3–4 |
| reduced-motion disables border anim | Task 2 |
| verify:quick + visual | Task 5 |
| Out of scope surfaces untouched | File Structure note |

No TBD placeholders remain in this plan.
