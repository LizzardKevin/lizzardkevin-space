import assert from "node:assert/strict";
import test from "node:test";
import { cssRule, cssRuleInMedia, declarationValue } from "../helpers/cssAssertions.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";

test("Focus content panels use generic copy structure and hide empty optional blocks", () => {
  const panelsSource = readSourceFile("exhibits/FocusContentPanels.tsx");
  const storyPanelSource = panelsSource.slice(
    panelsSource.indexOf("export function FocusStoryPanel"),
  );

  const overviewIndex = panelsSource.indexOf("{copy.overviewHeading}</h2>");
  const tagsIndex = panelsSource.indexOf("{copy.tagsHeading}</h3>");
  const detailsIndex = panelsSource.indexOf("{copy.detailsHeading}</h3>");

  assert.ok(overviewIndex > 0, "Focus left panel must start with a localized Overview block");
  assert.ok(tagsIndex > overviewIndex, "Focus left panel must render localized Tags after Overview");
  assert.ok(detailsIndex > tagsIndex, "Focus left panel must render localized Details after Tags");
  assert.match(
    panelsSource,
    /import type \{ ExhibitContentMetadataItem \} from "\.\/exhibitContent";/,
    "Details metadata should use the ExhibitContentMetadataItem content type",
  );
  assert.match(
    panelsSource,
    /tags\.length > 0 \? \([\s\S]*<h3>\{copy\.tagsHeading\}<\/h3>/,
    "Tags block should only render when tags are present",
  );
  assert.match(
    panelsSource,
    /const hasMetadata = \(metadata\?\.length \?\? 0\) > 0;[\s\S]*hasMetadata \? \([\s\S]*<h3>\{copy\.detailsHeading\}<\/h3>[\s\S]*metadata\.map/,
    "Details block should only render when metadata entries are present",
  );
  assert.ok(
    panelsSource.includes("item.label") && panelsSource.includes("item.value"),
    "Details metadata should render label/value pairs",
  );
  assert.match(
    panelsSource,
    /<div className="focus-details" aria-label=\{copy\.detailsAria\}>[\s\S]*<dl>[\s\S]*<dt>\{item\.label\}<\/dt>[\s\S]*<dd>\{item\.value\}<\/dd>[\s\S]*<\/dl>/,
    "Details metadata should render with a dedicated dl/dt/dd structure",
  );
  assert.doesNotMatch(
    panelsSource,
    /<div className="focus-tags" aria-label="Details">/,
    "Details metadata should not reuse the tags visual structure",
  );
  assert.ok(storyPanelSource.includes("{copy.storyHeading}</h2>"), "Focus right panel heading must be localized singular Story");
  assert.ok(!storyPanelSource.includes(">Stories</h2>"), "Focus right panel must not use Stories copy");
  assert.match(
    storyPanelSource,
    /!loading && !hasStoryHtml[\s\S]*return null;/,
    "Missing story content after loading should omit the story card instead of showing fallback copy",
  );
  assert.equal(
    (storyPanelSource.match(/focus-panel__placeholder/g) ?? []).length,
    1,
    "Focus story panel should only keep the loading placeholder",
  );
});
