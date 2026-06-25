import assert from "node:assert/strict";
import test from "node:test";

async function loadContentFixture(content) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => content,
  });

  try {
    const { loadExhibitContent } = await import("../src/exhibits/exhibitContent.ts");
    return await loadExhibitContent("sample_exhibit");
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

test("resolveFocusDisplayTitle prefers loaded content title before formatted exhibit label", async () => {
  const { resolveFocusDisplayTitle } = await import("../src/exhibits/focusDisplayTitle.ts");

  assert.equal(
    resolveFocusDisplayTitle({ title: "Content Title" }, "arch_treehabitat"),
    "Content Title",
  );
  assert.equal(resolveFocusDisplayTitle(null, "arch_treehabitat"), "Tree Habitat");
});
