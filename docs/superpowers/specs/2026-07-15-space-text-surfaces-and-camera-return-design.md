# SPACE Text Surfaces And Camera Return Design

**Status:** Approved by the user on 2026-07-15.

## Scope

This correction has three user-visible outcomes:

1. The desktop StartLobby Enter control becomes text-only while retaining depth, hover, focus, keyboard, and touch feedback. The `LIZZARDKEVIN` Three text becomes exactly half its current size.
2. Transient SPACE reminders use glowing glyph outlines instead of rectangular HUD surfaces.
3. Returning from Focus, Profile, or DevStories restores not only pointer lock but working first-person camera rotation without another click.

Mobile, assets, GLBs, Blender files, route structure, renderer profiles, and the persistent Canvas lifecycle remain unchanged.

## Design Direction

This is a targeted evolution of the existing experimental portfolio language. It keeps the current native CSS, React, R3F, Three, and SPACE tokens with `DESIGN_VARIANCE 8`, `MOTION_INTENSITY 6`, and `VISUAL_DENSITY 3`.

The Enter button remains a real DOM button for keyboard and screen-reader access. Its box, fill, minimum width, and border are removed. Depth comes from layered ink-toned text shadows, a small perspective translation on hover, and a pressed offset on active. Focus remains visible as a glyph-following glow rather than a rectangular outline.

The Three title changes only `LIZZARDKEVIN` from size `0.76` to `0.38`. `SPACE`, the scene composition, lighting, colors, pointer tilt, and renderer budget do not change.

## Transient Reminder Rule

The following lightweight notices become text-only:

- jump hint;
- projector Q/E hint;
- generic Toast messages.

They use transparent backgrounds, no borders, no backdrop blur, a subtle glyph stroke, and layered teal-white text glow. Existing already-unboxed onboarding notices remain consistent. Error, retry, boot, and blocking panels retain their containers because they communicate actionable or persistent state.

## Camera Return Root Cause And Decision

Browser diagnosis proved that the previous implementation acquired pointer lock but did not rotate the camera. After Profile return, `document.pointerLockElement` was `space-canvas`, the overlay was gone, and mouse events carried non-zero movement values, yet the guarded controls published no movement samples and before/after screenshots were identical.

The cause is lifecycle churn: `GuardedPointerLockControls` is conditionally unmounted whenever an overlay or Focus surface disables controls. The return click can acquire pointer lock before the R3F control listener has been re-established. Pointer lock ownership therefore cannot be the only readiness signal.

The control component will remain mounted for the lifetime of the SPACE scene. Its document listeners remain stable and read the current `enabled` value through a ref. While disabled they return immediately. R3F event computation remains enabled only when interaction is allowed. This adds one dormant boolean check to mousemove events while overlays are open and avoids React state updates or per-frame overhead.

## Acceptance

- Enter has no rectangular border, fill, or outline and remains keyboard/touch accessible with visible text-depth feedback.
- `LIZZARDKEVIN` uses Three text size `0.38`; `SPACE` remains `1.24`.
- Jump, projector, and Toast reminders have no rectangular surface and retain readable glowing glyph outlines.
- Focus, Profile, and DevStories return to `/`, retain the same `space-canvas`, obtain pointer lock, receive applied mouse deltas, and visibly rotate the camera before another click.
- Overlay-open mouse movement cannot rotate the camera.
- Reduced motion, keyboard focus, pointer-lock fallback, routing, and one-Canvas ownership do not regress.

