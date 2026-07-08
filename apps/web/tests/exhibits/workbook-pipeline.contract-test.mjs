import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import XLSX from "xlsx";
import { projectPath } from "../helpers/projectPaths.mjs";

const WORKBOOK_PATH = projectPath("docs/assets/space-exhibit-index.xlsx");
const GENERATOR_PATH = projectPath("scripts/generate-space-content.mjs");
const DEV_STORIES_PATH = projectPath("apps/web/src/generated/devStories.generated.ts");
const PROFILE_PATH = projectPath("apps/web/src/generated/profile.generated.ts");
const REQUIRED_SHEETS = ["education", "professional_practice", "personal_archive", "explore"];

test("SPACE workbook content pipeline is generated and synchronized", () => {
  assert.ok(fs.existsSync(WORKBOOK_PATH), "space-exhibit-index.xlsx must exist");
  assert.ok(fs.existsSync(GENERATOR_PATH), "generate-space-content.mjs must exist");
  const workbook = XLSX.readFile(WORKBOOK_PATH, { bookSheets: true });
  assert.deepEqual(workbook.SheetNames, REQUIRED_SHEETS, "workbook must expose exactly the four author-facing sheets");

  const output = execFileSync(process.execPath, [GENERATOR_PATH, "--check"], {
    cwd: projectPath(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  for (const sheetName of REQUIRED_SHEETS) {
    assert.match(output, new RegExp(`\\b${sheetName}\\b`), `check output must mention ${sheetName}`);
  }
  assert.match(output, /content files are synchronized/i);

  const devStories = fs.readFileSync(DEV_STORIES_PATH, "utf8");
  const profile = fs.readFileSync(PROFILE_PATH, "utf8");
  assert.match(devStories, /Pointer Lock prompt cannot be hidden; the best fix/);
  assert.match(profile, /Public images can connect outward; private images/);
});
