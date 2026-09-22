import assert from "node:assert/strict";
import test from "node:test";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const content = readSourceFile("pages/profile/ProfileContent.tsx");
const styles = readSourceFile("pages/profile/profile-narrative.css");
const hub = readSourceFile("pages/archive/ArchiveHub.tsx");

test("Profile exposes six ordered alternating chapters and stable timeline anchors", () => {
  const chapters = [...content.matchAll(/stage: "([^"]+)", title: "[^"]+", side: "([^"]+)"/g)]
    .map(match => [match[1], match[2]]);
  assert.deepEqual(chapters, [
    ["student", "left"], ["career", "right"], ["photo", "left"],
    ["band", "right"], ["culture", "left"], ["experiments", "right"],
  ]);
  assert.match(content, /data-profile-stage="hero"/);
  assert.match(content, /data-profile-stage=\{chapter.stage\}/);
  assert.match(content, /data-profile-stage="links"/);
  assert.match(styles, /min-height:\s*calc\(100svh - var\(--ark-topbar-h\)\)/);
  assert.match(styles, /grid-template-columns:\s*35% 30% 35%/);
  assert.match(styles,/min-height:\s*calc\(120svh - var\(--ark-topbar-h\) \* 1.2\)/);
  assert.doesNotMatch(styles,/linear-gradient|box-shadow|text-shadow/);
  assert.doesNotMatch(styles, /scroll-snap|position:\s*sticky|(?:^|[;{])\s*(?:animation|transform):/m);
});

test("Profile retains localized facts and contact links without work inventories or animated headings", () => {
  assert.match(content, /getLizzardKevinProfile\(language\)/);
  assert.match(content, /section.details.slice\(0, 2\)/);
  assert.match(content, /<ProfileContactPanel links=\{links\}/);
  assert.match(content, /href=\{contact.href\}/);
  assert.doesNotMatch(content, /section.fill|workRoute|ArkGlassTile|TagRow|MosaicTitle|AsciiText|useSectionReadProgress/);
});

test("ArchiveHub loads particles only after Profile is visited and retains the host across tabs", () => {
  assert.match(hub, /lazy\(\(\) => import\("..\/profile\/ProfileParticleHost"\)/);
  assert.match(hub, /profileVisited: tab === "profile"/);
  assert.match(hub, /profileVisited: current.profileVisited \|\| tab === "profile"/);
  assert.match(hub, /view.profileVisited \? <Suspense/);
  assert.match(hub, /<ProfileParticleHost active=\{isProfile\} \/>/);
  assert.match(hub, /background=\{isProfile \? "none" : "dotgrid"\}/);
  assert.ok(hub.indexOf("<ProfileParticleHost") < hub.indexOf('<div className="ark-hub"'),
    "the persistent host must sit outside hidden tab panels");
  assert.match(hub, /<AsciiContext.Provider/);
  assert.match(hub, /scrollBusJumpTo\(scrollPos.current\[view.visible\]\)/);
});
