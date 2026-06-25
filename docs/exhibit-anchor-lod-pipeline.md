# Exhibit Anchor + LOD Pipeline

This document is the runtime contract for moving real exhibit geometry out of
`space_main.glb` and into independent exhibit folders.

## Source of Truth

- `space_main.glb` contains only the architecture shell, `COL_*` collision, `spawn_player_main`, `ANCHOR_*`, and required light/zone markers.
- Scene exhibit placement lives in `apps/web/public/exhibits/manifest.json` under each exhibit's optional `scene` field.
- Focus overlay content still uses the existing `focusGlbUrl`, `content.json`, and media fields.

## Anchor Rules

- Anchor names must start with `ANCHOR_`, for example `ANCHOR_WORK_001`.
- Prefer Blender Empty objects for anchors. A tiny marker mesh is acceptable only when Empty export is unreliable.
- Anchor position controls approximate X/Z and yaw. Runtime placement handles floor snap and height correction.
- Do not put real exhibit meshes in `space_main.glb`. Use independent exhibit GLBs instead.

## Exhibit Folder Shape

```txt
apps/web/public/exhibits/work_001/
  content.json
  focus_work_001.glb
  work_001.lod0.glb
  work_001.lod1.glb
  work_001.lod2.glb
  work_001.report.json
```

The first trial exhibits are `demo_box` and `demo_bass`; their current LOD files
are placeholder copies of the focus GLB so the runtime path can be tested before
batch simplification.

## Runtime Behavior

- `GalleryModel` scans `space_main.glb` for all `ANCHOR_*` nodes.
- `ExhibitPlacement` loads manifest items that include `scene`.
- Loaded scene exhibit roots and children receive `userData.exhibitId`, so existing raycast, hover label, and Focus behavior continue to work.
- For `placement.snap: "floor"`, runtime casts downward from anchor + 4m and accepts floor targets named `COL_floor*`, `COL_ground*`, `COL_platform*`, `COL_STAIR*`, `ARCH_FLOOR*`, `STRUCT_FLOOR*`, `ARCH_STAIR*`, or `STRUCT_STAIR*`.
- Final height uses the exhibit bounding box:

```ts
finalY = floorHitY - exhibitBoundingBox.minY + heightOffset;
```

- LOD thresholds default to `lod0 <= 8m`, `lod1 <= 22m`, `lod2 <= 60m`; unload is `> 60m`. A 2m hysteresis prevents boundary flicker.

## Scripts

```bash
npm run exhibits:validate
npm run exhibits:cache
npm run exhibits:lod -- apps/web/public/exhibits/work_001/work_001.source.glb
```

- `exhibits:validate` checks anchors, scene manifest entries, LOD files, and prevents embedded `exhibit_*` nodes in `space_main.glb`.
- `exhibits:cache` writes `generated-exhibit-placement.json` with anchor transforms and runtime snap placeholders.
- `exhibits:lod` creates first-pass `lod0/lod1/lod2` files and a report. It intentionally marks `lod1/lod2` as requiring manual review until Blender Decimate or glTF Transform simplification is wired in.

## QA Checklist

- Aim at trial scene exhibits and confirm hover label + Focus click still work.
- Move across `8m`, `22m`, and `60m` thresholds and check the debug overlay for LOD changes.
- Watch the debug overlay `exhibit` row for `exhibitId / anchor / lod / floor`.
- Run `npm run verify:quick` before committing.
