# SPACE projector selection

Put curated projection images in exhibit folders here.

Current folder:

- `arch_treehabitat/`

The default files inside exhibit folders are hardlinks to existing exhibit images, so the
projection works before you replace them. You can overwrite them with your own selected files.

The runtime image list is declared in `apps/web/src/scenes/projector/projectorImageDirectory.ts`.
Each image stays linked to its `exhibitId`, so clicking the projection opens that exhibit Focus.
