import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

async function loadContentFixture(content, language = "en") {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => content,
  });

  try {
    const { loadExhibitContentPartial } = await importSourceModule("exhibits/exhibitContent.ts");
    return await loadExhibitContentPartial("sample_exhibit", language);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("loadExhibitContentPartial keeps string subtitle and filters tags and metadata entries", async () => {
  const content = await loadContentFixture({
    title: "Sample Exhibit",
    subtitle: "Material study",
    overview: "A compact overview.",
    storyHtml: "<p>A longer story.</p>",
    tags: ["MANGROVE LOGIC", "", "  SKY GARDEN  ", "MANGROVE LOGIC", 42],
    metadata: [
      { label: "Year", value: "2026" },
      { label: "Invalid value", value: 2026 },
      { label: null, value: "Missing label" },
      "not an object",
      { label: "Medium", value: "WebGL" },
    ],
  });

  assert.deepEqual(content, {
    title: "Sample Exhibit",
    subtitle: "Material study",
    overview: "A compact overview.",
    storyHtml: "<p>A longer story.</p>",
    tags: ["MANGROVE LOGIC", "SKY GARDEN"],
    metadata: [
      { label: "Year", value: "2026" },
      { label: "Medium", value: "WebGL" },
    ],
  });
});

test("loadExhibitContentPartial omits invalid optional subtitle and metadata without rejecting content", async () => {
  const content = await loadContentFixture({
    title: "Sample Exhibit",
    subtitle: 42,
    overview: "A compact overview.",
    storyHtml: "<p>A longer story.</p>",
    metadata: { label: "Year", value: "2026" },
  });

  assert.deepEqual(content, {
    title: "Sample Exhibit",
    overview: "A compact overview.",
    storyHtml: "<p>A longer story.</p>",
  });
});

test("loadExhibitContentPartial resolves bilingual content for the requested language", async () => {
  const content = await loadContentFixture(
    {
      title: { en: "Sample Exhibit", zh: "样本展品" },
      subtitle: { en: "Material study", zh: "材料研究" },
      overview: {
        en: "A compact overview.",
        zh: "一段简洁概述。",
      },
      storyHtml: {
        en: "<p>A longer story.</p>",
        zh: "<p>更完整的故事。</p>",
      },
      tags: {
        en: ["student work", "model"],
        zh: ["学生作品", "模型"],
      },
      metadata: {
        en: [
          { label: "Year", value: "2026" },
          { label: "Medium", value: "WebGL" },
        ],
        zh: [
          { label: "年份", value: "2026" },
          { label: "媒介", value: "WebGL" },
        ],
      },
    },
    "zh",
  );

  assert.deepEqual(content, {
    title: "样本展品",
    subtitle: "材料研究",
    overview: "一段简洁概述。",
    storyHtml: "<p>更完整的故事。</p>",
    tags: ["学生作品", "模型"],
    metadata: [
      { label: "年份", value: "2026" },
      { label: "媒介", value: "WebGL" },
    ],
  });
});

test("loadExhibitContentPartial falls back to English when localized content is incomplete", async () => {
  const content = await loadContentFixture(
    {
      title: { en: "Sample Exhibit" },
      subtitle: { en: "Material study", zh: "" },
      overview: { en: "A compact overview." },
      storyHtml: { en: "<p>A longer story.</p>" },
      tags: { en: ["student work"] },
      metadata: {
        en: [{ label: "Year", value: "2026" }],
        zh: [],
      },
    },
    "zh",
  );

  assert.deepEqual(content, {
    title: "Sample Exhibit",
    subtitle: "Material study",
    overview: "A compact overview.",
    storyHtml: "<p>A longer story.</p>",
    tags: ["student work"],
    metadata: [{ label: "Year", value: "2026" }],
  });
});

test("partial content keeps independent valid fields when other fields are missing or invalid", async () => {
  const cases = [
    [{ title: 42, overview: "Overview", storyHtml: "<p>Story</p>" }, { overview: "Overview", storyHtml: "<p>Story</p>" }],
    [{ title: "Title", storyHtml: "<p>Story</p>" }, { title: "Title", storyHtml: "<p>Story</p>" }],
    [{ title: "Title", overview: "Overview", storyHtml: null }, { title: "Title", overview: "Overview" }],
    [{}, {}],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(await loadContentFixture(input), expected);
  }
});

test("partial content rejects non-object JSON", async () => {
  for (const input of [null, [], "content", 42, true]) {
    assert.equal(await loadContentFixture(input), null);
  }
});

test("partial content retains English fallback and filters malformed localized arrays", async () => {
  assert.deepEqual(await loadContentFixture({
    title: { en: " Title ", zh: "  " },
    tags: { en: [" model ", "model", null, {}], zh: { invalid: true } },
    metadata: { en: [{ label: { en: "Year" }, value: { en: "2026" } }, null, { label: "Invalid" }], zh: 42 },
  }, "zh"), { title: "Title", tags: ["model"], metadata: [{ label: "Year", value: "2026" }] });
  assert.deepEqual(await loadContentFixture({
    title: { en: "Title", zh: "标题" },
    tags: { zh: [null, 42, " 模型 ", "模型"] },
    metadata: { zh: [null, { label: " 年份 ", value: " 2026 " }, { label: 42, value: "bad" }] },
  }, "zh"), { title: "标题", tags: ["模型"], metadata: [{ label: "年份", value: "2026" }] });
});

test("partial content returns null on HTTP, network, and JSON decoding failures", async () => {
  const previousFetch = globalThis.fetch;
  const { loadExhibitContentPartial } = await importSourceModule("exhibits/exhibitContent.ts");
  try {
    for (const fetchResult of [
      async () => ({ ok: false, status: 404, json() { assert.fail("404 must not decode a body"); } }),
      async () => { throw new TypeError("Network unavailable"); },
      async () => ({ ok: true, json: async () => { throw new SyntaxError("Malformed JSON"); } }),
    ]) {
      globalThis.fetch = fetchResult;
      assert.equal(await loadExhibitContentPartial("missing_exhibit", "zh"), null);
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Tree Habitat uses its reader-facing exhibit title", async () => {
  const { formatExhibitLabel } = await importSourceModule("exhibits/exhibitTarget.ts");

  assert.equal(formatExhibitLabel("arch_treehabitat"), "Tree Habitat");
});

test("isExhibitWithinRange honors projector-specific interaction distance", async () => {
  const { isExhibitWithinRange } = await importSourceModule("exhibits/exhibitTarget.ts");
  const THREE = await import("three");

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 0);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  screen.position.set(0, 0, 24);
  screen.userData.exhibitMaxDistance = 25;
  screen.updateMatrixWorld(true);

  assert.equal(isExhibitWithinRange(camera, screen), true);

  screen.position.set(0, 0, 26);
  screen.updateMatrixWorld(true);

  assert.equal(isExhibitWithinRange(camera, screen), false);
});
