# SPACE Return And Lobby Tuning Design

**Status:** Approved by the user on 2026-07-15.

## Scope

This correction has two independent outcomes:

1. The desktop `StartLobby` keeps its existing composition, geometry, typography, lighting, demand rendering, and interaction, but its dominant green field becomes visibly darker and less saturated.
2. A trusted click or keyboard activation that returns from Focus, Profile, or DevStories restores first-person pointer lock without requiring a second Canvas click.

Mobile behavior, gallery assets, GLBs, Blender files, content data, and the main renderer profiles are out of scope.

## StartLobby Color Decision

Use the existing approved SPACE toon-mid color `#69827e` for all three layers that form the lobby field:

- Three scene background;
- Three linear fog;
- CSS fallback behind the temporary Canvas.

Keep the existing brighter geometric accents (`#4aa7a5`, `#79cbc6`, and `#358d8e`) unchanged. This lowers the full-screen field from a saturated teal to a muted cool green-gray without changing the Messenger-inspired composition or introducing a new token. Background, fog, and fallback must stay identical so Canvas initialization cannot reveal a color flash.

## Pointer-Lock Return Decision

The return activation is a short handoff owned by `DesktopApp`:

1. During the original trusted return activation, synchronously mark the route as returning.
2. The pointer-lock guard permits lock only during that explicit handoff; all ordinary blocked routes remain protected.
3. Request pointer lock synchronously while the browser still recognizes the click or keyboard activation.
4. Focus navigates normally. Profile and DevStories synchronously commit `/` before requesting pointer lock, while a small local `closingOverlay` snapshot retains only the close animation.
5. Clear the handoff after the retained animation finishes or if the request fails.

The guard must use layout-effect cleanup so `flushSync` removes the old blocked-route listener before the trusted request. Escape retains its dedicated keyup recovery path, but it uses the same armed handoff and must not create a second request at animation completion.

## Failure And Safety Rules

- A blocked route that is not returning must immediately reject/release pointer lock.
- Every return activation issues at most one pointer-lock request.
- Pointer-lock failure remains observable through the existing `space:pointer-lock-failed` event and still allows the normal Canvas-click fallback.
- Route return continues to reuse the same Canvas, renderer, Rapier world, GLBs, and saved pose.
- The close animations, audio pause/resume, and main-runtime pause policy remain unchanged.

## Acceptance

- StartLobby at 1440x900 and 1000x700 has a muted green-gray field, readable paper text, visible block depth, and no handoff flash.
- Focus, Profile, and DevStories return to `/` with `document.pointerLockElement?.id === "space-canvas"` before another Canvas click.
- Mouse movement controls the first-person camera immediately after each return.
- Escape, pointer-lock failure, narrow viewports, focus-visible, reduced motion, and one-context ownership do not regress.
- Targeted tests, TypeScript, lint, chunk build, and production Playwright QA pass.
