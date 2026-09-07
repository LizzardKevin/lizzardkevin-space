# SPACE agent entry points

## Canvas UI effects

When the user mentions Canvas UI, canvasui.dev, or asks to reuse an effect from
that library, read [the project integration guide](docs/design/canvas-ui-integration.md)
before changing code.

- Canvas UI means `DavidHDev/canvas-ui`, not the unrelated `canvasui/CanvasUI` project.
- The `@canvas-ui` registry is configured in `apps/web/components.json`.
- From the repository root, use `npm run canvasui:search`, `canvasui:view`,
  `canvasui:preview`, and `canvasui:add` with the arguments documented in the guide.
- Search and inspect first; preview before adding. Add only the requested effect
  and renderer. Do not run `shadcn init`, bulk-install the library, overwrite
  customized files, or install the upstream documentation site's dependencies.
- Registry configuration is not an installed MCP server, an installed effect,
  or proof that an effect works in production. Report those states separately.
- Keep model-derived effects distinct from experimental HTML-in-Canvas effects.
  Preserve readable HTML, keyboard/link behavior, reduced-motion fallbacks, and
  the existing SPACE renderer and Pointer Lock ownership.
- Do not modify GLB/Blender/Rhino source assets or upgrade Three as an incidental
  effect-installation step. Review licensing and lifecycle requirements in the guide.

Existing user instructions and more-specific directory instructions still apply.
