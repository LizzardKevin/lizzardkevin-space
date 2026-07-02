# GitHub Pages deployment prep

This repo is prepared for a GitHub Project Pages deployment at:

```text
https://lizzardkevin.github.io/lizzardkevin-space/
```

This is the safest default for the existing repository name `lizzardkevin-space`. A future user-site deployment at `https://lizzardkevin.github.io/` would need a root-hosted repo named `lizzardkevin.github.io` or a separate publishing strategy, and should use Vite base `/` instead of `/lizzardkevin-space/`.

## Local build check

```bash
npm run verify:quick
npm run build:github-pages:chunks
```

`build:github-pages` runs the Vite build with `--base=/lizzardkevin-space/`, then prepares `apps/web/dist` for Pages by:

- copying `index.html` to `404.html` for SPA fallback behavior;
- writing `.nojekyll`;
- checking that built CSS does not keep root `/fonts/` URLs.

`apps/web/dist` remains a build artifact and should not be committed for the GitHub Actions strategy.

## GitHub setup

After this branch is reviewed and merged, configure the repository in GitHub:

1. Go to `Settings > Pages`.
2. Set `Build and deployment > Source` to `GitHub Actions`.
3. Push `main` or run the `Deploy GitHub Pages` workflow manually.

The workflow at `.github/workflows/github-pages.yml` installs dependencies, runs `npm run verify:quick`, builds with the Project Pages base path, uploads `apps/web/dist`, and deploys through GitHub Pages. It does not use a `gh-pages` branch and does not commit `dist`.

## Path strategy

Runtime public assets must pass through `publicAssetUrl()` before they are used in fetches, GLB loaders, image tags, or audio players. Default local and Cloudflare builds keep root-hosted paths such as `/models/space_main.glb`; the GitHub Pages build compiles `import.meta.env.BASE_URL` to `/lizzardkevin-space/`, so runtime URLs become `/lizzardkevin-space/models/space_main.glb`.

The JSON files in `apps/web/public/exhibits` intentionally keep root-style paths. The app normalizes those URLs after loading the manifest, which keeps content editing simple while supporting Project Pages.

## Asset size notes

Current `apps/web/public` size is about 162 MB across 102 files, below the documented GitHub Pages published-site limit of 1 GB. The largest migration candidates are:

| Asset group | Approx. size | Recommendation |
| --- | ---: | --- |
| `exhibits/arch_3d_printing_architecture/video/final-clip-without-bgm.mp4` | 46 MB | Acceptable for a personal demo, but monitor bandwidth. |
| `*.source.glb` regeneration assets | 37 MB total | Move out of `public` or use LFS/CDN if they are not runtime assets. |
| `projector-selection/**/source/*.jpg` | 30 MB total | Keep only optimized WebP in public unless source review images must be downloadable. |

GitHub Pages has a soft bandwidth limit and no custom edge caching controls. Cloudflare Pages is better for heavier media, cache rules, redirects, and future custom headers. GitHub Pages is simpler for a github.io portfolio mirror.

## Final choices before publishing

- Confirm whether the first live target is Project Pages (`/lizzardkevin-space/`) or a user site root (`/`).
- Confirm whether GitHub Actions deployment is preferred over a `gh-pages` branch.
- Decide whether source/regeneration assets should continue shipping from `public`, move to non-public workspace folders, move to Git LFS, or move to a CDN.
