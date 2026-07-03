import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../..");

function readProjectFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const desktopExperience = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const warningFilter = readProjectFile("apps/web/src/runtime/suppressThirdPartyDeprecationWarnings.ts");

const filterImport = 'import "../runtime/suppressThirdPartyDeprecationWarnings"';
const canvasImport = 'import { Canvas } from "@react-three/fiber"';

assert(
  desktopExperience.includes(filterImport) &&
    desktopExperience.indexOf(filterImport) < desktopExperience.indexOf(canvasImport),
  "runtime warning filter must install in the lazy desktop SPACE chunk before R3F Canvas is imported",
);

assert(
  warningFilter.includes("setConsoleFunction") && warningFilter.includes("getConsoleFunction"),
  "Three deprecation filtering must use Three's console hook instead of patching broad globals",
);

assert(
  warningFilter.includes("Clock: This module has been deprecated. Please use THREE.Timer instead."),
  "filter must document the exact Three.Clock deprecation suppressed for R3F 9.x",
);

assert(
  warningFilter.includes("using deprecated parameters for the initialization function; pass a single object instead"),
  "filter must document the exact wasm-bindgen init deprecation suppressed for Rapier compat",
);

assert(
  /message === THREE_CLOCK_DEPRECATION_WARNING/.test(warningFilter) &&
    /message === WASM_BINDGEN_INIT_DEPRECATION_WARNING/.test(warningFilter),
  "runtime warning filter must match exact warning strings only",
);

assert(
  !/includes\(\s*THREE_CLOCK_DEPRECATION_WARNING\s*\)/.test(warningFilter) &&
    !/includes\(\s*WASM_BINDGEN_INIT_DEPRECATION_WARNING\s*\)/.test(warningFilter),
  "runtime warning filter must not use substring matching for these warnings",
);

console.log("space runtime warning filter contract tests passed");
