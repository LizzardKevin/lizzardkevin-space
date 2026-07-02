# Exhibit World Model Pipeline

This document is the runtime contract for keeping real exhibit geometry out of
`space_main.glb` while avoiding runtime LOD switching.

## Source of Truth

- `space_main.glb` contains the architecture shell, `COL_*` collision,
  `spawn_player_main`, and required light/zone markers.
- Real exhibit geometry lives in independent exhibit folders under
  `apps/web/public/exhibits/<exhibitId>/`.
- Scene exhibit placement lives in `apps/web/public/exhibits/manifest.json`
  under each exhibit's optional `scene` field.
- Focus overlay content still uses `focusGlbUrl`, `content.json`, and media
  fields.

## Exhibit Folder Shape

```txt
apps/web/public/exhibits/work_001/
  content.json
  work_001.source.glb
  space_work_001.glb
  focus_work_001.glb
  work_001.report.json
```

## Model Budgets

- `space_<exhibitId>.glb`: loaded inside SPACE, target <= 50k triangles.
- `focus_<exhibitId>.glb`: loaded inside Focus, target <= 150k triangles.
- `<exhibitId>.source.glb`: preserved source export used for regeneration.

## Manifest Contract

```json
{
  "scene": {
    "distanceCenter": [0, 0, 0],
    "modelUrl": "/exhibits/work_001/space_work_001.glb",
    "placement": {
      "snap": "none",
      "heightOffset": 0,
      "yawOffsetDeg": 0
    },
    "load": {
      "unloadDistance": 60
    }
  }
}
```

- `distanceCenter` is the authored world-space center used for distance-based
  mount/unmount.
- `modelUrl` points to the single SPACE runtime model.
- `placement.snap: "none"` keeps authored world coordinates.
- Runtime no longer switches between multiple LOD files.
- Loaded scene exhibit roots and children receive `userData.exhibitId`, so
  raycast, hover label, and Focus behavior continue to use the existing
  `exhibitId` contract.

## Scripts

```bash
npm run exhibits:validate
npm run exhibits:cache
npm run exhibits:models -- apps/web/public/exhibits/work_001/work_001.source.glb --force
```

- `exhibits:validate` checks scene manifest entries, SPACE model files, and
  prevents embedded `exhibit_*` nodes in `space_main.glb`.
- `exhibits:cache` writes `generated-exhibit-placement.json` with world
  placement metadata.
- `exhibits:models` uses Blender Decimate to generate the SPACE and Focus
  models from the source GLB.

## QA Checklist

- Aim at scene exhibits and confirm hover label + Focus click still work.
- Move beyond `unloadDistance` and back inside range; the model should unload
  and remount without visible LOD popping.
- Watch the debug overlay `exhibit` row for `exhibitId / world / space /
  mounted`.
- Run `npm run verify:quick` before committing.
