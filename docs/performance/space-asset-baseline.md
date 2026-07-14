# SPACE asset and delivery baseline (Phase 8A)

Status: deterministic inventory complete; browser frame/decode/GPU/JS-memory capture pending.

This is an evidence input, not approval of a final performance budget. It makes no asset edits and sets no guessed MB/ms limits. Numeric browser budgets must be based on the capture protocol below and separately approved by the user.

## Reproduction context

| Field | Value |
| --- | --- |
| Capture date | 2026-07-14 (Asia/Shanghai) |
| Git baseline | `d4dd31a3371afae0942796bd3d48096d56c8b626` plus this Phase 8A scripts/tests/docs-only change |
| OS | Windows 11 Pro 10.0.26200 |
| CPU / visible memory | AMD Ryzen 9 9950X3D / 47.2 GiB |
| Node / npm | v24.11.0 / 11.6.1 |
| Local build | `npm run build`; Vite 8.0.16; local base `./` |
| Deployed base | `https://lizzardkevin.github.io/lizzardkevin-space/` (`/lizzardkevin-space/`) |
| Machine-readable evidence | `docs/performance/space-asset-inventory.json` |
| Reproduce / check | `node scripts/audit-space-assets.mjs --output docs/performance/space-asset-inventory.json`; `node scripts/audit-space-assets.mjs --check docs/performance/space-asset-inventory.json` |

The audit hashes and measures files read-only. It scans all files under `apps/web/public` because Vite copies that directory verbatim, plus recognized asset/source formats in `BlenderFile` and `docs/assets`. It also reads the current `dist/index.html`, built chunks, and GLB JSON chunks. GLB `accessorLogicalBytes` is a static logical payload count, not measured GPU residency.

## Inventory baseline

All sizes below are binary MiB unless noted. “Shipping” means present under `public` and therefore copied into `dist`; it does not mean the browser requests every file during one visit.

| Corpus | Files | Bytes | MiB | Interpretation |
| --- | ---: | ---: | ---: | --- |
| All discovered assets/sources | 105 | 204,278,866 | 194.82 | Public payload plus Blender/workbook sources |
| Current public shipping corpus | 102 | 169,737,413 | 161.87 | Deployable static corpus, not one-route transfer |
| Semantic source-only corpus | 14 | 104,357,343 | 99.52 | Includes non-public sources and source artifacts currently under `public` |
| Source-only files currently shipping | 11 | 69,815,890 | 66.58 | Candidate for deploy exclusion only after explicit authorization |
| Boot/world-classified public corpus | 27 | 20,150,761 | 19.22 | Includes 18.68 MiB of world GLBs; exact first-load request set remains browser-pending |
| Focus/work-classified public corpus | 41 | 73,683,777 | 70.27 | Loaded per selected work, not all at startup |
| Audio-classified public corpus | 10 | 4,973,916 | 4.74 | Includes docs/placeholder files; actual audio media is 4,972,994 bytes |
| Draco decoder support | 3 | 1,063,920 | 1.01 | Two JS files plus WASM, request timing browser-pending |
| Current built HTML/CSS/JS chunks | 25 | 4,530,025 | 4.32 | gzip(level 9) sum 1,480,063 bytes / 1.41 MiB; not wire evidence |

### Largest and route-relevant inputs

| Input | Current bytes / MiB | Finding |
| --- | ---: | --- |
| `final-clip-without-bgm.mp4` | 48,398,326 / 46.16 | Largest individual shipping file; selected-work media only |
| `gallery_main.blend` | 28,362,740 / 27.05 | Non-shipping Blender source; protected |
| Public `.source.glb` files (3) | 38,655,508 / 36.86 | Semantic sources but currently copied to deployment |
| Projector source JPG files (5) | 32,531,311 / 31.02 | Semantic sources but currently copied to deployment |
| `space_main.glb` | 10,625,856 / 10.13 | 803 meshes/primitives, 9.51 MiB logical accessor payload, no Draco/Meshopt/KTX2 extension |
| World exhibit GLBs (3) | 8,762,752 / 8.36 | Current full and simplified profiles use the same assets |
| Focus: 3D-printing work | 55,669,050 / 53.09 | Focus GLB + content + video; loaded only after selecting this work |
| Focus: Treehabitat work | 9,437,530 / 9.00 | Focus GLB + content + 23 WebP images |
| Focus: UABB work | 8,577,197 / 8.18 | Focus GLB + content + 11 WebP images |
| Background MP3 | 4,879,196 / 4.65 | Audio is a separate post-gesture/runtime concern |

The exact hashes, integer byte counts, per-work members, and GLB metadata are in the JSON report.

### Current chunk evidence

| Chunk | Raw bytes | Deterministic gzip bytes | Current role |
| --- | ---: | ---: | --- |
| `rapier-vendor-DEvu4GBG.js` | 3,142,648 | 1,069,949 | Largest JS cost; independent lazy chunk, not statically referenced by entry |
| `three-vendor-0ewCj_Jt.js` | 605,494 | 167,549 | Largest Three runtime chunk |
| `react-vendor-CsIBO4y-.js` | 189,646 | 58,867 | Shared application shell |
| `index-I0UOGeAQ.js` | 150,134 | 46,660 | Entry chunk |
| `index-DbEa81DE.css` | 84,394 | 15,459 | Shared styles |
| `SpaceHost-DZkUxIwl.js` | 78,193 | 24,710 | Post-Enter persistent SPACE host |
| `MobileApp-BopSXKVA.js` | 45,378 | 15,289 | Mobile terminal application; its static graph has zero 3D imports |

These are local deterministic build sizes. They are not a substitute for browser transfer, parse, compile, decode, or memory measurements.

## Deployed GitHub Pages HTTP evidence

Captured with:

```powershell
curl.exe -sS -L -I --connect-timeout 10 --max-time 30 -H "Accept-Encoding: gzip, br" <url>
```

| Representative resource | Status | Content-Type | Cache-Control | Encoding | Observed Content-Length | Validator |
| --- | --- | --- | --- | --- | ---: | --- |
| `/` | 200 | `text/html; charset=utf-8` | `max-age=600` | gzip | 573 | weak ETag + Last-Modified |
| `/assets/index-aEZfzqC9.js` | 200 | `application/javascript; charset=utf-8` | `max-age=600` | gzip | 62,178 | weak ETag + Last-Modified |
| `/models/space_main.glb` | 200 | `model/gltf-binary` | `max-age=600` | gzip | 2,687,326 | weak ETag + Last-Modified |
| `/draco/draco_decoder.wasm` | 200 | `application/wasm` | `max-age=600` | gzip | 89,904 | weak ETag + Last-Modified |
| `/audio/space_background_looped.mp3` | 200 | `audio/mp3` | `max-age=600` | none observed | 4,879,196 | strong ETag + Last-Modified |
| `/exhibits/manifest.json` | 200 | `application/json; charset=utf-8` | `max-age=600` | gzip | 641 | weak ETag + Last-Modified |

All sampled responses returned `Vary: Accept-Encoding`, `Age: 0`, and `X-Cache: MISS` during this capture. The deployed JS filename differs from the local build, so deployed-header evidence and local chunk evidence must not be conflated. A ten-minute cache lifetime is observable for content-hashed JS and large immutable assets; a future deployment review should evaluate immutable caching, but changing hosting/cache policy is outside Phase 8A.

## Deterministic gates now enforceable

| Gate | Threshold | Evidence |
| --- | ---: | --- |
| Inventory reproducibility | 0 byte/hash/schema drift after the verified build | `--check` and `asset-budget.test.mjs` |
| Protected asset mutation by the audit | 0 changed bytes/hashes | before/after snapshot test |
| Public-file accounting | 0 omitted public files | every public file must appear as `shipping: true` |
| Missing semantic sources | 0 missing `.source.glb`, Blender, workbook, projector-source inputs | source classification tests/report |
| Mobile and cold-route 3D static imports | 0 Three/R3F/Rapier imports and 0 world/Focus GLB references | existing platform contract plus asset-budget graph test |
| Pre-Enter Rapier/world/Focus reachability | 0 static reachability | `SpacePage` graph test |
| Entry-to-Rapier eagerness | 0 static entry reference; exactly 1 independent Rapier build chunk | existing chunks contract |
| Unapproved source/asset edits in this phase | 0 files outside scripts/tests/docs | `git diff --name-only d4dd31a` plus protected hashes |

No absolute download, decode, GPU-memory, JS-heap, or frame-time pass/fail cap is approved yet. The current full and simplified profiles share the same world and Focus assets, so their static download corpus is identical; simplified currently saves rendering cost, not asset bytes.

## Browser capture protocol and pending budget table

Browser control is currently unavailable in this task because the configured browser integration fails with `Cannot redefine property: process`. No Playwright or alternate browser was substituted without authorization. Every browser-only value is therefore explicitly pending.

Use the same supported browser/version and this machine for the first budget proposal:

1. Build once, serve the production build, and record browser version, GPU/driver, viewport, DPR, renderer backend, commit, and network mode.
2. Test `1440x900` CSS pixels at DPR 1 for both `full` and `simplified`. Record the exact semantic spawn pose and camera orientation on run 1; reuse it for every run.
3. Run at least 7 samples per cell. Cold runs use a fresh profile/cache-disabled reload; warm runs keep HTTP cache but restart the route sequence. Report median and p95, plus min/max and coefficient of variation; investigate any cell with >10% coefficient of variation before proposing a cap.
4. Capture: `/` cold content route, pre-Enter lobby idle, Enter-to-running, 60 seconds at fixed spawn, fixed scripted camera turn/walk, `/profile` and `/devstories` round trips, each work route open/all-media settle/return, and a second warm return to SPACE.
5. For each work cycle, record network transfer/resource count, model/image/video decode duration, main-thread long tasks, JS heap, GPU memory if DevTools exposes it, renderer draw calls/triangles/textures, frame-time median/p95, and whether Canvas/Rapier/GLB identities were reused.
6. Run the same protocol with `prefers-reduced-motion`, keyboard, mouse, and touch emulation where relevant. Mobile/narrow-view QA remains a separate 3D-zero contract.

| Profile / scenario | Download budget | Decode budget | GPU-memory budget | JS-heap budget | Frame-time median/p95 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Full, cold Enter-to-running | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | Not approved |
| Simplified, cold Enter-to-running | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | Not approved |
| Full, warm fixed-pose world | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | Not approved |
| Simplified, warm fixed-pose world | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | Not approved |
| Each selected-work all-media cycle | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | Not approved |
| SPACE → route → SPACE reuse cycle | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | `pending_browser_capture` | Not approved |

## Optimization candidate matrix (evaluation only)

| Candidate | Evidence / likely value | Risk and required authority | Phase 8A decision |
| --- | --- | --- | --- |
| KTX2/Basis textures | Shipping GLBs report no embedded textures/KTX2; public work imagery is already WebP. Value depends on future texture use. | Requires texture conversion, loader/runtime validation, visual QA, and explicit asset authorization. | Measure first; do not implement. |
| Meshopt/Draco | `gallery_main.glb` reports Draco; `space_main`, world exhibit, and Focus GLBs report neither Draco nor Meshopt. Potentially material network benefit. | Re-export/recompression can change geometry, decode CPU cost, and compatibility. Explicit user approval required. | Candidate after browser decode baseline. |
| Static mesh merging | `space_main.glb` has 803 meshes/primitives; source exhibit GLBs have 497–1,866. Shipping exhibit derivatives are already one mesh/two primitives each. | May break material identity, raycast targets, interactions, culling, or collision mapping; Blender/GLB changes require approval. | Investigate `space_main` only after draw-call capture. |
| Instancing | Repetition is plausible but not proven by this inventory. | Requires semantic mesh/material analysis and interaction QA; asset/runtime change needs approval. | No recommendation until duplicate geometry is measured. |
| LOD / profile-specific assets | Full and simplified currently download identical assets. LOD could make simplified materially lighter. | Adds authoring/runtime branches and visual popping; asset generation requires approval. | Candidate only if full asset/decode cost misses approved budgets. |
| Collision simplification | `space_main.glb` has 245 collision-named nodes; `gallery_main.glb` has 7. Rapier is also the largest JS chunk. | Collision changes can create falls, tunneling, blocked paths, or spawn bugs; Blender/GLB changes require approval and playtest. | Profile and inspect before proposing edits. |
| Cache policy | Every deployed sample uses `max-age=600`, including hashed JS and large assets. | Hosting/header change; must verify GitHub Pages constraints and rollback behavior. | Recommend a later deployment-specific design, not an asset edit. |
| Deploy exclusion | 66.58 MiB of semantic source files are currently under `public`, including `.source.glb` and projector source JPGs. | Moving/excluding files is explicitly prohibited without separate user confirmation; first prove no runtime references and preserve source workflow. | Highest-confidence packaging candidate, authorization still required. |
| Audio delivery | Background MP3 is 4.65 MiB and uncompressed over HTTP in the sample. | Re-encoding can audibly regress loops; preload policy changes behavior. Asset edit requires approval. | Verify request timing and audible quality before proposal. |

React versus Svelte is not the primary performance decision here. The dominant measured build/runtime inputs are Rapier’s delayed chunk and 3D/media payloads. The architecture must continue to keep mobile and cold content routes at zero 3D imports; framework migration would not remove these dominant costs.

## Phase completion boundary

Phase 8A is complete only when the deterministic report, tests, build evidence, header evidence, protected-asset diff, and this pending-browser protocol are all present. Full asset-performance-budget completion additionally requires browser capture for both profiles, agreed numeric caps, regression runs, and explicit authorization before any source/asset movement, deletion, recompression, re-export, or GLB/Blender change.
