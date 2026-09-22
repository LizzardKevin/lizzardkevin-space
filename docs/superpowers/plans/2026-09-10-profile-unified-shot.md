# Unified Profile continuous-shot implementation

2026-09-10. Supersedes the prior two-model pipeline. User authorizes new single Rhino source, all six chapters as a continuous shot, and authoring the final two cameras.

1. Read-only extraction of the supplied 3dm; verify four saved cameras,72columns,117people.
2. Bake one270k-point cache with explicit source semantics and weighted detail preservation. Rebuild supplementalDUMBO against the new window.
3. Replace runtime dual-model/scatter logic with a single world-position buffer and continuous camera-space transforms; author Cultural side view and Experimental overview. Keep autonomous body motion and existing contact/label controls.
4. Route exterior travel around walls and through the window; preserve source camera endpoint projections.
5. Remove legacy public main-model caches and old source dependencies from active scripts/runtime/tests.
6. Validate geometry hashes, camera endpoints, continuous paths/lifecycle, all six browser views and both backends; refresh asset inventory after build.
