import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("desktop and mobile publish one profile identity, experience and contact set", async () => {
  const { generatedProfileByLanguage: profiles } = await importSourceModule("generated/profile.generated.ts");
  const { generatedMobileTerminalCopy: mobile, generatedMobileProjectItems: projects } = await importSourceModule("generated/mobileArchive.generated.ts");
  for (const language of ["en","zh"]) {
    const profile=profiles[language], copy=mobile[language];
    assert.equal(copy.contact.name,profile.identity.displayName);
    assert.equal(copy.soul.bio,profile.identity.bio);
    assert.deepEqual(copy.soul.sections.map(s=>s.summary),profile.sections.map(s=>s.summary));
    const links=copy.contact.lines.flatMap(l=>l.values).map(v=>v.href).filter(Boolean);
    assert.ok(links.includes("mailto:lizzardkevin@gmail.com"));
    assert.ok(links.includes("mailto:lizzardkevin@qq.com"));
    assert.match(profile.identity.location,/Shenzhen/);
  }
  assert.ok(projects.every(p=>!/^project-\d+$/.test(p.id)),"unwritten placeholders stay author-side");
  const home=projects.find(p=>p.id==="the-home-alive");
  assert.ok(home);
  assert.match(home.story.en,/Levittown/);
  assert.equal(home.mediaKind,"text");
  assert.equal(home.imageUrls,undefined,"no invented media");
});
