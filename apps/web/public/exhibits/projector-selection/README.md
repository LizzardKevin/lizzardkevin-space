# SPACE projector selection

Put original curated projection images in each exhibit folder's `source/` directory, then run:

```bash
npm run projector:optimize
```

The script writes small WebP files to `optimized/`. SPACE runtime image lists should reference only
`optimized/*.webp`, never the original `source/` files.

Current folder:

- `arch_treehabitat/`

The runtime image list is declared in `apps/web/src/scenes/projector/projectorImageDirectory.ts`.
Each image stays linked to its `exhibitId`, so clicking the projection opens that exhibit Focus.
