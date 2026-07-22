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
    const { loadExhibitContent } = await importSourceModule("exhibits/exhibitContent.ts");
    return await loadExhibitContent("sample_exhibit", language);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("loadExhibitContent keeps string subtitle and filters tags and metadata entries", async () => {
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

test("loadExhibitContent omits invalid optional subtitle and metadata without rejecting content", async () => {
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

test("loadExhibitContent resolves bilingual content for the requested language", async () => {
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

test("loadExhibitContent falls back to English when localized content is incomplete", async () => {
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

test("loadExhibitContent rejects missing or non-string required fields", async () => {
  const requiredFieldCases = [
    { title: 42, overview: "Overview", storyHtml: "<p>Story</p>" },
    { title: "Title", storyHtml: "<p>Story</p>" },
    { title: "Title", overview: "Overview", storyHtml: null },
  ];

  for (const invalidContent of requiredFieldCases) {
    assert.equal(await loadContentFixture(invalidContent), null);
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
