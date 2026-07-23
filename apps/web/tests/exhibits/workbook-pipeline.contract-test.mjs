import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import test from "node:test";
import XLSX from "xlsx";
import { projectPath } from "../helpers/projectPaths.mjs";

XLSX.set_fs(fs);

const WORKBOOK_PATH = projectPath("docs/assets/space-exhibit-index.xlsx");
const GENERATOR_PATH = projectPath("scripts/generate-space-content.mjs");
const DEV_STORIES_PATH = projectPath("apps/web/src/generated/devStories.generated.ts");
const PROFILE_PATH = projectPath("apps/web/src/generated/profile.generated.ts");
const START_LOBBY_TEXT_PATH = projectPath(
  "apps/web/src/generated/startLobbyExhibitText.generated.ts",
);
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
  // 文案经历多轮润色（见 grok/devstories-humanizer），断言锚定稳定片段而非完整句子。
  assert.match(devStories, /Pointer Lock prompt cannot be hidden/);
  assert.match(profile, /Public images can connect outward; private images/);
});

test("StartLobby gets separate bilingual title and subtitle entries from exhibit rows", () => {
  assert.ok(
    fs.existsSync(START_LOBBY_TEXT_PATH),
    "startLobbyExhibitText.generated.ts must be generated from the workbook",
  );

  const workbook = XLSX.readFile(WORKBOOK_PATH, { cellDates: false });
  const exhibitRows = REQUIRED_SHEETS.flatMap((sheetName) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false }),
  ).filter((row) => {
    const enabled = String(row.enabled ?? "").trim().toLowerCase();
    return row.entry_kind === "exhibit" && !["n", "no", "false", "0"].includes(enabled);
  });
  const source = fs.readFileSync(START_LOBBY_TEXT_PATH, "utf8");

  assert.match(source, /generatedStartLobbyExhibitText/);
  assert.equal((source.match(/"kind": "title"/g) ?? []).length, exhibitRows.length * 2);
  assert.equal((source.match(/"kind": "subtitle"/g) ?? []).length, exhibitRows.length * 2);
  assert.doesNotMatch(source, /overview|storyHtml|imageUrls|focusGlbUrl/);
  for (const row of exhibitRows) {
    for (const field of ["title_en", "subtitle_en", "title_zh", "subtitle_zh"]) {
      assert.ok(
        source.includes(JSON.stringify(String(row[field]).trim()).slice(1, -1)),
        `${row.id} ${field} must be emitted for StartLobby`,
      );
    }
  }
});
