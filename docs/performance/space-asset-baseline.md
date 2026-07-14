# SPACE asset and browser performance baseline (Phase 8)

Status: deterministic inventory and authorized Playwright browser capture complete at `477fa09`; one production chunk hard gate and one repeated-work interaction check failed. Native WebGPU/full-profile and GPU-memory validation remain unavailable.

This is an evidence input, not approval of a final performance budget. It makes no asset edits. Numeric caps below are proposals derived from the measured simplified/SwiftShader baseline and the static inventory; they are not release PASS criteria until the user approves them and native-GPU validation exists.

## Reproduction context

| Field | Value |
| --- | --- |
| Capture date | 2026-07-14 (Asia/Shanghai) |
| Git baseline | frozen production source `477fa09d9863a2b818d410a4dda382a2d7a57dda` |
| Inventory code snapshot | refreshed from the Phase 8 commit tree after the independently committed gallery/Focus code; protected shipping asset bytes/hashes still match the frozen browser source |
| OS | Windows 11 Pro 10.0.26200 |
| CPU / visible memory | AMD Ryzen 9 9950X3D / 47.2 GiB |
| Node / npm | v24.11.0 / 11.6.1 |
| Deterministic inventory build | `npm run asset:audit`; Vite 8.0.16; configured base `./` |
| Browser-measurement build | same frozen source, production build with `--base=/`, copied outside the repository and served by `vite preview` at `127.0.0.1:4176` |
| Deployed base | `https://lizzardkevin.github.io/lizzardkevin-space/` (`/lizzardkevin-space/`) |
| Machine-readable evidence | `docs/performance/space-asset-inventory.json` |
| Browser evidence | `docs/performance/space-browser-baseline.json` |
| Raw deployed-header evidence | `docs/performance/github-pages-headers-2026-07-14.txt` |
| Reproduce / check | `npm run asset:audit`; `npm run asset:check` |
| Source-only quick gate | `npm run test:asset-source` (does not require `dist`) |
| Full release gate | `npm run verify:release` (quick verification, then a direct workspace build inside `asset:check`) |

The audit hashes and measures files read-only. It scans all files under `apps/web/public` because Vite copies that directory verbatim, plus recognized asset/source formats in `BlenderFile` and `docs/assets`. It also reads the current `dist/index.html`, built chunks, and GLB JSON chunks. GLB `accessorLogicalBytes` is a static logical payload count, not measured GPU residency.

## Inventory baseline

All sizes below are binary MiB unless noted. “Shipping” means present under `public` and therefore copied into `dist`; it does not mean the browser requests every file during one visit.

| Corpus | Files | Bytes | MiB | Interpretation |
| --- | ---: | ---: | ---: | --- |
| All discovered assets/sources | 105 | 204,278,866 | 194.82 | Public payload plus Blender/workbook sources |
| Current public shipping corpus | 102 | 169,737,413 | 161.87 | Deployable static corpus, not one-route transfer |
| Semantic source-only corpus | 14 | 104,357,343 | 99.52 | Includes non-public sources and source artifacts currently under `public` |
| Source-only files currently shipping | 11 | 69,815,890 | 66.58 | Candidate for deploy exclusion only after explicit authorization |
| Boot/world-classified public corpus | 27 | 20,150,761 | 19.22 | Includes 18.68 MiB of world GLBs; the measured simplified boot requested the route-relevant subset after Enter |
| Focus/work-classified public corpus | 41 | 73,683,777 | 70.27 | Loaded per selected work, not all at startup |
| Audio-classified public corpus | 10 | 4,973,916 | 4.74 | Includes docs/placeholder files; actual audio media is 4,972,994 bytes |
| Draco decoder support | 3 | 1,063,920 | 1.01 | Two JS files plus WASM; timing is recorded in browser evidence |
| Current built HTML/CSS/JS chunks | 31 | 4,604,817 | 4.39 | gzip(level 9) sum 1,506,646 bytes / 1.44 MiB; not wire evidence |

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

### Static image dimensions and decoded exposure

The report parses PNG, JPEG, and WebP headers without decoding or rewriting files. `estimatedRgba8Bytes` is exactly `width * height * 4`: a qualified logical RGBA8 exposure estimate, not measured GPU residency. It excludes mipmaps, GPU compression, row alignment, browser decode caches, upload copies, video frames, and renderer-owned copies.

| Raster corpus | Files | Pixels | Estimated RGBA8 bytes / MiB |
| --- | ---: | ---: | ---: |
| All discovered raster images | 58 | 189,392,449 | 757,569,796 / 722.47 |
| Boot/world classified | 19 | 10,293,600 | 41,174,400 / 39.27 |
| Focus/work classified | 34 | 104,290,448 | 417,161,792 / 397.84 |
| Source-only classified | 5 | 74,808,401 | 299,233,604 / 285.37 |

The largest image is the currently shipping projector source `FL-9.jpg` at 5101x3301 (16,838,401 pixels; 67,353,604 estimated RGBA8 bytes / 64.23 MiB). The largest Focus images are 2200x1424 (12,531,200 estimated RGBA8 bytes / 11.95 MiB each). These corpus totals are not simultaneous-memory claims: browser request/decode/cache lifetimes remain pending browser capture.

### Current chunk evidence

| Chunk | Raw bytes | Deterministic gzip bytes | Current role |
| --- | ---: | ---: | --- |
| `rapier-vendor-DKJSwKmw.js` | 3,142,708 | 1,069,978 | Largest JS cost; production chunk ownership currently leaks it into the pre-Enter StartLobby graph |
| `three-vendor-dIoh7Jr-.js` | 605,514 | 167,680 | Largest Three runtime chunk |
| `react-vendor-CsIBO4y-.js` | 189,646 | 58,867 | Shared application shell |
| `index-BKl9XSuD.js` | 150,257 | 46,754 | Entry chunk |
| `index-CsVCXeBj.css` | 83,336 | 15,131 | Shared styles |
| `SpaceHost-B0tarOXy.js` | 78,338 | 24,627 | Post-Enter persistent SPACE host |
| `MobileApp-CmgKEqaz.js` | 45,833 | 15,418 | Mobile terminal application; its measured browser route also has zero 3D requests |

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

Both preserved rounds returned `Vary: Accept-Encoding` and `Age: 0` for all six representative URLs. Preserved rounds observed X-Cache HIT 12/12 and x-proxy-cache MISS 12/12. These are distinct headers at different cache layers; this evidence does not contain an `X-Cache: MISS` response. `Cache-Control`, validators, content type, and encoding were stable across the two rounds. The deployed JS filename differs from the local build, so deployed-header evidence and local chunk evidence must not be conflated. A ten-minute cache lifetime is observable for content-hashed JS and large immutable assets; a future deployment review should evaluate immutable caching, but changing hosting/cache policy is outside Phase 8A.

## Deterministic gates now enforceable

| Gate | Threshold | Evidence |
| --- | ---: | --- |
| Inventory reproducibility | 0 byte/hash/schema drift after the verified build | `--check` and `asset-budget.test.mjs` |
| Full-report build evidence | Required `dist/index.html` plus `dist/assets`; missing build is an error | `createBuildEvidence` and `asset:check` |
| Report output destinations | Exactly 1 approved repository path; 0 symlink/reparse components | output-policy tests |
| Protected asset mutation by the audit | 0 changed bytes/hashes | before/after snapshot test |
| Public-file accounting | 0 omitted public files | every public file must appear as `shipping: true` |
| Missing semantic sources | 0 missing `.source.glb`, Blender, workbook, projector-source inputs | source classification tests/report |
| Mobile and cold-route 3D static imports | 0 Three/R3F/Rapier imports and 0 world/Focus GLB references | existing platform contract plus asset-budget graph test |
| Pre-Enter Rapier/world/Focus source reachability | 0 static reachability | `SpacePage` source-graph test passes, but this is insufficient to prove the production chunk graph |
| Production pre-Enter Rapier request | **FAIL: 1 Rapier-named chunk in 6/6 samples** | `SpacePage-*.js` imports symbols from `rapier-vendor-*.js`; browser report contains the exact URL |
| Raster metadata integrity | 100% of PNG/JPEG/WebP files have positive dimensions and exact `width*height*4` logical estimates | source and full asset tests |
| Unapproved source/asset edits in this phase | 0 protected shipping/source paths | inventory hash comparison against `477fa09` |

No absolute download, decode, GPU-memory, JS-heap, or frame-time pass/fail cap is approved yet. The current full and simplified profiles share the same world and Focus assets, so their static download corpus is identical; simplified currently saves rendering cost, not asset bytes.

## Superseded Phase 8A capture protocol

The following was the Phase 8A protocol written while the in-app browser integration failed with `Cannot redefine property: process`. The user subsequently authorized standalone Playwright CLI; the measured protocol and replacement budget table follow below. The pending table in this subsection is retained only as historical plan evidence and is not the current status.

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

## Measured Playwright protocol and results

The committed harness is reproducible with:

```powershell
$env:SPACE_PLAYWRIGHT_MODULE='<installed playwright package directory>'
npm run performance:browser -- --base-url http://127.0.0.1:4176 --samples 3 --source-git-head 477fa09d9863a2b818d410a4dda382a2d7a57dda
```

Environment: Playwright 1.61.1, Chromium 149.0.7827.55, Windows 10.0.26200, AMD Ryzen 9 9950X3D, `1440x900` desktop and `390x844` touch/mobile at DPR 1. Chromium was headless with ANGLE SwiftShader and actual WebGL2 fallback. Network was unthrottled local loopback against a frozen production preview. Cold means a new isolated context with empty storage and CDP cache disabled. Warm means a new isolated context, one unmeasured same-context prime, then a fresh measured page with HTTP cache enabled. Each cold/warm cell has three samples; nearest-rank p95 therefore equals the maximum. These narrow bands are a regression baseline, not population statistics.

CDP `encodedDataLength` is the primary transfer-like figure. Resource Timing transfer/encoded/decoded-body sizes, FCP/LCP/CLS, long-task blocking time, milestones, request identities, `performance.memory`, CDP heap metrics, and RAF intervals are also preserved. Local preview and GitHub Pages have different cache/encoding policies, so local warm bytes are not deployed-bandwidth claims. GPU memory, native WebGPU/full-profile behavior, representative INP, and isolated GLB decode/GPU-upload duration were unavailable.

| Scenario | Cold median (range) | Warm median (range) | Result |
| --- | --- | --- | --- |
| Mobile StartMenu through terminal | 11 requests; 168,879 encoded bytes; 4.48 MB JS heap; terminal 3,379 ms (3,379-3,398) | 11 requests; 1,917 encoded bytes; 4.48 MB JS heap; terminal 3,370 ms (3,368-3,377) | 0 Three/R3F/Rapier/GLB/WASM requests across root, profile, and selected-work routes |
| Cold desktop profile / DevStories | 13 requests; about 159.6 KB encoded; 3.45 MB JS heap | 13 requests; 2,275 encoded bytes; 3.45 MB JS heap | 0 3D requests |
| Cold desktop work route | 11 requests; 134,153 encoded bytes; 2.86 MB JS heap | 11 requests; 1,917 encoded bytes; 2.86 MB JS heap | 0 3D requests |
| Desktop lobby before Enter | 19 requests; 1,408,396 encoded bytes; 4,275,713 decoded-body bytes | 19 requests; 3,297 encoded bytes; same decoded-body exposure | **FAIL:** `rapier-vendor-*.js` requested in 6/6 samples |
| Simplified lobby-through-running | 57 requests; 18,226,889 encoded bytes; 21,247,167 decoded-body bytes; entered 2,845 ms (2,843-2,887) | 57 requests; 10,634,451 encoded bytes; same decoded-body exposure; entered 2,845 ms (2,840-2,858) | Actual WebGL2 fallback; no native WebGPU measurement |
| Simplified steady RAF | median interval 66.7 ms (66.7-66.7); sample p95 150.0 ms (133.4-150.0) | median 66.7 ms (66.7-66.7); sample p95 149.9 ms (133.4-150.0) | SwiftShader-only regression evidence, not native-GPU FPS |
| Simplified JS heap after running | 83.54 MB median; 88.75 MB max | 88.42 MB median; 96.45 MB max | browser/GC-sensitive |
| First Treehabitat all-image selection | +9,452,599 encoded bytes; ready 900 ms (607-2,148); heap 109.93 MB median, 114.81 MB max | same bytes; ready 593 ms (573-599); heap 111.01 MB median, 119.34 MB max | 23 images plus Focus resources settle only after selection |
| Repeated same-work selection | 0 selected-work re-requests; ready 15 ms (10-30) | 0 re-requests; ready 17 ms (16-17) | cache reuse passes; second UI Return fails separately |
| SPACE to Profile to SPACE to DevStories to SPACE | 0 encoded-byte route delta; 0 persistent-core re-requests | same | Canvas identity preserved |

The slow desktop RAF result is expected from software rendering and cannot validate real desktop smoothness. It is useful only as a same-machine regression band.

### Hard gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Mobile and cold-content 3D requests | PASS: 0 | 24 mobile/content cold/warm samples |
| Desktop lobby/pre-Enter Rapier chunk, WASM, world/Focus GLB, audio media | **FAIL:** one `rapier-vendor-*.js` request in every lobby sample; all other forbidden classes 0 | production `SpacePage-*.js` and a StartLobby Three subchunk import symbols from the Rapier-named chunk |
| Route-return persistent-core re-requests | PASS: 0 | six simplified desktop samples |
| Protected shipping asset bytes/hashes | PASS: 0 drift | refreshed deterministic inventory versus committed Phase 8A assets |
| Repeated selected-work Return | **FAIL:** 0/6 second Return actions reached `/`; the harness records failure and uses programmatic navigation only to finish measurement | independently reproduced; no application fix in this phase |

The production chunk failure explains why the source static-graph contract was green: Rolldown group ownership places shared R3F/Three symbols in `rapier-vendor`, so StartLobby's built chunk imports it even though StartLobby source never imports Rapier. Bundler ownership and repeated Return lifecycle are separate atomic follow-ups.

### Proposed budgets (not approved)

| Profile / scenario | Download / decoded-body | Decode/readiness | JS heap | GPU memory | Steady frame-time | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Simplified cold lobby-through-running | <= 18.5 MiB CDP encoded / <= 22 MiB decoded-body | Enter-to-running <= 3.25 s on this exact SwiftShader protocol | <= 105 MB after running | proposed <= 256 MiB, derived from 39.27 MiB logical boot raster exposure plus geometry/framebuffer/renderer headroom | native target median <= 16.7 ms, p95 <= 33.3 ms; SwiftShader regression-only <= 90/180 ms | Proposed; pre-Enter gate currently fails |
| Full cold lobby-through-running | <= 18.5 MiB / <= 22 MiB because assets currently match simplified | provisional <= 3.25 s | proposed <= 110 MB | proposed <= 384 MiB for higher DPR/shadows/post buffers | native target median <= 16.7 ms, p95 <= 25 ms | Not measured; native WebGPU validation required |
| Treehabitat selected work | <= 9.5 MiB additional / <= 10 MiB decoded-body | all-image settle <= 2.5 s local | <= 128 MB after repeat | must stay inside profile cap after native capture | active profile cap | Proposed from measured max plus bounded headroom |
| SPACE route round trip | 0 persistent-core re-requests | overlay ready <= 1 s local | no monotonic growth beyond 10% in a GC-controlled native study | no new allocation after return | active profile cap | Network gate PASS |

GPU-memory figures are inventory-derived ceilings, not measurements or PASS claims. Full download stays equal to simplified until separately authorized profile-specific assets exist. Hard zero-request gates take priority over numeric caps.

## Optimization candidate matrix (evaluation only)

| Candidate | Evidence / likely value | Risk and required authority | Phase 8 decision |
| --- | --- | --- | --- |
| KTX2/Basis textures | Shipping GLBs report no embedded textures/KTX2; public work imagery is WebP. The boot raster logical exposure is 39.27 MiB. | Requires conversion, loader/runtime validation, visual QA, and explicit asset authorization. | Low priority until native GPU-memory capture proves texture pressure. |
| Meshopt/Draco | `space_main`, world exhibit, and Focus GLBs report neither Draco nor Meshopt; cold simplified boot moved 18.23 MB encoded and Treehabitat added 9.45 MB. | Re-export/recompression changes geometry and decode CPU cost. Explicit user approval required. | High-value candidate after chunk-boundary fix, but do not execute. |
| Static mesh merging | `space_main.glb` has 803 meshes/primitives; source exhibit GLBs have 497–1,866. | May break material identity, raycasts, culling, or collision mapping; Blender/GLB changes require approval. | Investigate only after native draw-call capture. |
| Instancing | Repetition is plausible but not proven by this inventory. | Requires semantic mesh/material analysis and interaction QA; asset/runtime change needs approval. | No recommendation until duplicate geometry is measured. |
| LOD / profile-specific assets | Full and simplified currently download identical assets; simplified saves rendering flags but no asset bytes. | Adds authoring/runtime branches and visual popping; asset generation requires approval. | Strong candidate if native simplified misses the proposed cap. |
| Collision simplification | `space_main.glb` has 245 collision-named nodes; `gallery_main.glb` has 7. Rapier is also the largest JS chunk. | Collision changes can create falls, tunneling, blocked paths, or spawn bugs; Blender/GLB changes require approval and playtest. | Profile and inspect before proposing edits. |
| Cache policy | GitHub Pages evidence uses `max-age=600`; local warm boot still moved about 10.63 MB because preview policy differs. | Hosting/header change; verify Pages constraints and rollback. | Deployment follow-up; do not infer deployed warm bytes from local preview. |
| Deploy exclusion | 66.58 MiB of semantic source files are currently under `public`, including `.source.glb` and projector source JPGs. | Moving/excluding files is explicitly prohibited without separate user confirmation; first prove no runtime references and preserve source workflow. | Highest-confidence packaging candidate, authorization still required. |
| Audio delivery | Background MP3 is 4.65 MiB and uncompressed over HTTP in the sample. | Re-encoding can audibly regress loops; preload policy changes behavior. Asset edit requires approval. | Verify request timing and audible quality before proposal. |

React versus Svelte is not the primary performance decision here. The dominant measured build/runtime inputs are Rapier’s delayed chunk and 3D/media payloads. The architecture must continue to keep mobile and cold content routes at zero 3D imports; framework migration would not remove these dominant costs.

## Phase completion boundary

Phase 8's evidence package is complete when the deterministic report, browser report, tests, fresh-build evidence, raw header evidence, and protected-asset diff are present. It is intentionally **not a performance PASS** while the pre-Enter Rapier request and repeated-work Return fail, and while native full/WebGPU and GPU-memory validation are unavailable. `npm run asset:check` remains the canonical read-only inventory check. Any source/asset movement, deletion, recompression, re-export, or GLB/Blender change still requires separate approval.
