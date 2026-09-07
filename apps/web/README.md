# SPACE web app

React/TypeScript frontend for the desktop SPACE gallery and mobile terminal.

Use the [root README](../../README.md) for Node/npm requirements, setup, development, and release commands. Run npm commands from the repository root so the content and exhibit cache prerequisites are applied.

See the [architecture baseline](../../docs/architecture/space-architecture-v2-baseline.md) for route ownership, persistent desktop rendering, and mobile boundaries. The desktop renderer supports full WebGPU and simplified WebGL2 modes; mobile uses the terminal interface.

`npm run dev:local` starts local development. `npm run verify:quick` runs the source and test checks; release packaging and protected asset checks are separate phases described in the root documentation.
