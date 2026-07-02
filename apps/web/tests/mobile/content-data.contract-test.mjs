import assert from "node:assert/strict";
import { files, mobileData } from "../helpers/mobileContractFixture.mjs";

const tabOrder = [...mobileData.matchAll(/id:\s*"(projects|skills|soul|contact)"[\s\S]*?label:\s*"([^"]+)"/g)].map(
  (match) => `${match[1]}:${match[2]}`,
);
assert.deepEqual(
  tabOrder,
  ["projects:Projects", "skills:Skills.md", "soul:Soul.md", "contact:Contact.md"],
  "mobile tab data must define exactly four terminal tabs in order",
);

for (const label of ["Projects", "Skills.md", "Soul.md", "Contact.md"]) {
  assert(mobileData.includes(label), `mobile tab data must include ${label}`);
  assert(files.mobileExperience.includes(label), `mobile UI source must render ${label}`);
}

assert(!files.mobileExperience.includes("<small>{getTabSummary"), "mobile tabs must not render descriptions");
assert(!files.mobileExperience.includes("getTabSummary"), "mobile tab summaries must not be read by the UI");
const mobileTabsSlice = mobileData.slice(mobileData.indexOf("export const mobileTabs"), mobileData.indexOf("export const mobileTerminalCopy"));
assert(!mobileTabsSlice.includes("summary:"), "mobile tab data must not carry tab summaries");
assert(mobileData.includes("mobileTerminalCopy"), "mobile data must export localized mobile terminal copy");
assert(mobileData.includes("soul:") && mobileData.includes("contact:"), "localized copy must include Soul and Contact content");
assert(mobileData.includes("LizzardKevin is an architecture-trained creative technologist"), "English Soul.md copy must exist");
assert(mobileData.includes('name: "Wang Tianyi"'), "English Contact.md must use the requested name");
assert(mobileData.includes('name: "王天奕"'), "Chinese Contact.md must translate the name");
assert(mobileData.includes('AI Visual Creator/ Architect/ Photographer/ Bassist'), "English Contact.md must use the requested role line");
assert(mobileData.includes('AI视觉创作者 / 建筑师 / 摄影师 / 贝斯手'), "Chinese Contact.md must translate the role line");
assert(mobileData.includes("+86 13682600019"), "Contact.md must include the requested phone number");
assert(mobileData.includes("lizzardkevin@gmail.com"), "Contact.md must include the requested email");
assert(mobileData.includes('label: "contact"'), "Contact.md must keep lowercase contact title");
assert(mobileData.includes('label: "location"'), "Contact.md must keep lowercase location title");
assert(mobileData.includes('label: "github"'), "Contact.md must keep lowercase github title");
assert(mobileData.includes('label: "practice"'), "Contact.md must keep lowercase practice title");
assert(mobileData.includes('text: "Shenzhen, China"'), "English Contact.md must include Shenzhen, China");
assert(mobileData.includes('text: "深圳，中国"'), "Chinese Contact.md must translate the location value");
assert(mobileData.includes('text: "lizzardkevin"'), "Contact.md must include the requested GitHub handle");
assert(mobileData.includes("(spatial + visual + AI) x Creativity"), "English Contact.md must include the requested practice formula");
assert(mobileData.includes("(空间 + 视觉 + AI) x 创造力"), "Chinese Contact.md must translate the practice formula");
assert(mobileData.includes("mobile terminal only gives brief index. Desktop opens full SPACE experience."), "English Contact.md must include the requested desktop note");
assert(mobileData.includes("移动端 terminal 只提供简要索引。桌面端会打开完整的 SPACE 体验。"), "Chinese Contact.md must translate the desktop note");
assert(mobileData.includes('command: "$ cat Skills.md"'), "localized terminal commands must keep English file syntax");
assert(!mobileData.includes("$ cat 技能.md"), "localized copy must not use Chinese pseudo terminal commands");
assert(!mobileData.includes("$ 查看"), "localized copy must not translate shell commands into Chinese");

for (const oldLabel of ["Archives", "Expertise", "About", "Get in Touch", "Mobile view", "Open layer", "Close layer"]) {
  assert(!mobileData.includes(oldLabel), `mobile data must not include old label ${oldLabel}`);
  assert(!files.mobileExperience.includes(oldLabel), `mobile UI source must not include old label ${oldLabel}`);
}

for (const oldId of ['"archives"', '"expertise"', '"about"']) {
  assert(!mobileData.includes(oldId), `mobile data must not keep old tab id ${oldId}`);
}

const projectIdMatches = mobileData.match(/id:\s*"project-/g) ?? [];
assert.ok(projectIdMatches.length >= 10, "mobile projects must define at least ten placeholder projects");

for (const projectField of ["summary", "signal", "spaceLayer", "archiveNote", "mediaStatus"]) {
  const matches = mobileData.match(new RegExp(`${projectField}:\\s*\\{\\s*en:\\s*"`, "g")) ?? [];
  assert.ok(
    matches.length >= projectIdMatches.length,
    `every mobile project item must define bilingual ${projectField}`,
  );
}

for (const stageLabel of ["Education", "Professional Practice", "Personal Archive", "Explore"]) {
  assert(mobileData.includes(`stageLabel: "${stageLabel}"`), `mobile projects must include ${stageLabel} stage label`);
}

for (const oldStageLabel of ["Student", "Work", "Music", "Culture"]) {
  assert(!mobileData.includes(`stageLabel: "${oldStageLabel}"`), `mobile projects must remove old ${oldStageLabel} stage label`);
}

const skillIdMatches = mobileData.match(/id:\s*"skill-/g) ?? [];
assert.ok(skillIdMatches.length >= 15, "mobile skills must define a broad static skill document");
const skillDataSlice = mobileData.slice(mobileData.indexOf("export const mobileSkillEntries"), mobileData.indexOf("export function getProjectItem"));
const bilingualSkillSummaryMatches = skillDataSlice.match(/summary:\s*\{\s*en:\s*"/g) ?? [];
assert.equal(
  bilingualSkillSummaryMatches.length,
  skillIdMatches.length,
  "every mobile skill entry must define a bilingual summary object",
);

for (const category of ["ai", "architecture", "soft", "digital", "analog"]) {
  assert(mobileData.includes(`category: "${category}"`), `mobile skill entries must include ${category}`);
}

for (const skillLabel of [
  "AIGC workflows",
  "AI prototyping",
  "Agent-based web programs",
  "Spatial narrative",
  "Model logic",
  "Visualization process",
  "Interactive engines",
  "Creative coding",
  "Software fluency",
  "Visual communication",
  "Photography",
  "Music playing",
  "Physical modeling",
  "Presentation",
  "Project coordination",
  "Creative aesthetic",
  "Fast-paced workflow",
  "Creative problem-solving",
]) {
  assert(mobileData.includes(`label: "${skillLabel}"`), `mobile skill entries must include ${skillLabel}`);
}

for (const skillCopy of [
  "Stable Diffusion WebUI, ComfyUI, GPT Image, Nano Banana Pro",
  "agent-based image/video generation pipelines",
  "Rhino 3D, SketchUp, and Blender",
  "V-Ray, Enscape, D5 Render, Twinmotion, and Adobe Suite",
  "UE5, Unity, and Godot",
  "Laser cutting, 3D printing, hand modeling",
]) {
  assert(mobileData.includes(skillCopy), `mobile skill copy must include ${skillCopy}`);
}

assert(files.mobileExperience.includes("Visual / Spatial / Creative"), "Skills.md category meta must rename architecture to Visual / Spatial / Creative");
assert(files.mobileExperience.includes("skills/spatial-creative.md"), "Skills.md category meta must use the spatial creative document path");
assert(files.mobileExperience.includes("skills/digital-production.md"), "Skills.md category meta must use the digital production document path");
assert(mobileData.includes("Using AI agents and related skills to perform fast concept tests for spatial, visual, interactive, and interface ideas."), "AI prototyping copy must mention AI agents and fast concept tests");
assert(mobileData.includes("使用 AI agents 以及相关能力，快速测试空间、视觉、互动和界面方向的早期概念。"), "AI prototyping must include a Chinese summary");
assert(!mobileData.includes("Prompt systems"), "mobile skill copy must remove old placeholder skill label Prompt systems");
assert(!mobileData.includes("Three.js thinking"), "mobile skill copy must remove old placeholder skill label Three.js thinking");
assert(!mobileData.includes("Archive writing"), "mobile skill copy must remove old placeholder skill label Archive writing");

for (const soulSection of ["Education", "Professional Practice", "Persona", "Rule"]) {
  assert(mobileData.includes(`title: "${soulSection}"`), `Soul.md sections must include ${soulSection}`);
}

for (const typeName of ["MobileProjectItem", "MobileSkillEntry", "MobileTabId"]) {
  assert(mobileData.includes(typeName), `mobile data must export ${typeName}`);
}

for (const removedType of ["ExpertiseChip", "ExpertiseCategory", "expertiseFilters", "speed:", "lane:"]) {
  assert(!mobileData.includes(removedType), `mobile data must remove ${removedType}`);
}

assert(files.mobileExperience.includes("selectedProjectId"), "mobile experience must use selectedProjectId state");
assert(files.mobileExperience.includes("ProjectDetailView"), "project selection must open a detail view");
assert(
  /<ProjectDetailView[\s\S]*copy=\{copy\}[\s\S]*project=\{selectedProject\}[\s\S]*language=\{language\}/.test(
    files.mobileExperience,
  ),
  "project details must render localized project body copy and chrome",
);
assert(files.mobileExperience.includes("ProjectsView"), "mobile experience must include a Projects view");
assert(files.mobileExperience.includes("SkillsDocument"), "mobile experience must include a Skills.md document view");
assert(files.mobileExperience.includes("copy={copy.skills}"), "Skills.md must receive localized skill copy");
assert(files.mobileExperience.includes("language={language}"), "Skills.md must render localized skill summaries");
assert(files.mobileExperience.includes("SoulDocument"), "mobile experience must include a Soul.md document view");
assert(files.mobileExperience.includes("ContactDocument"), "mobile experience must include a Contact.md document view");
assert(!files.mobileExperience.includes("lizzardKevinIdentity"), "Contact.md must not reuse desktop identity data");
assert(!files.mobileExperience.includes("lizzardKevinLinks"), "Contact.md must not reuse desktop link data");
assert(!files.mobileExperience.includes("contactLinks"), "Contact.md must read mobile-localized contact lines directly");
assert(files.mobileExperience.includes("copy.lines.map"), "Contact.md must render localized contact line data");
assert(files.mobileExperience.includes("entry.summary[language]"), "Skills.md summaries must be selected by current language");
assert(files.mobileExperience.includes("project.summary[language]"), "Project summaries must be selected by current language");
assert(files.mobileExperience.includes("project.subtitle?.[language]"), "Project subtitles must be selected by current language when present");
assert(files.mobileExperience.includes("project.tags?.map"), "Project details must render optional project tags");
assert(files.mobileExperience.includes("project.story?.[language]"), "Project details must render optional project story copy");
assert(files.mobileExperience.includes("project.imageUrls?.map"), "Project details must render optional project images");
assert(files.mobileExperience.includes("project.signal[language]"), "Project signals must be selected by current language");
assert(files.mobileExperience.includes("project.spaceLayer[language]"), "Project SPACE layer copy must be selected by current language");
assert(files.mobileExperience.includes("project.archiveNote[language]"), "Project archive notes must be selected by current language");
assert(files.mobileExperience.includes("project.mediaStatus[language]"), "Project media status must be selected by current language");
assert(files.mobileExperience.includes("<details open"), "mobile terminal documents must render native open details folds");
assert(files.mobileExperience.includes("<summary"), "mobile terminal documents must render native summary controls");
assert(files.mobileExperience.includes("function TerminalFold"), "foldable terminal subsections must use a controlled TerminalFold component");
assert(files.mobileExperience.includes("type TerminalFoldState = Record<string, boolean>"), "fold expanded state must be tracked above individual fold components");
assert(files.mobileExperience.includes("const [foldState, setFoldState] = useState<TerminalFoldState>({})"), "fold expanded state must persist while switching between mobile tabs");
assert(files.mobileExperience.includes("function getFoldExpanded"), "folds must read remembered expanded state through a shared helper");
assert(files.mobileExperience.includes("return foldState[foldId] ?? false"), "folds must default to collapsed when they have not been opened before");
assert(files.mobileExperience.includes("onFoldExpandedChange"), "Projects, Skills.md, and Soul.md must receive a shared fold state updater");
assert(!files.mobileExperience.includes("const [expanded, setExpanded] = useState(true);"), "TerminalFold must not default child folds to open local state");
assert(files.mobileExperience.includes("data-fold-state={expanded ? \"open\" : \"closed\"}"), "TerminalFold must keep closed content mounted for animation");
assert(files.mobileExperience.includes("event.preventDefault();"), "TerminalFold summary clicks must prevent native details from skipping the animation");
assert(files.mobileExperience.includes("onExpandedChange(!expanded)"), "TerminalFold must toggle shared React state for animated expand and collapse");
assert(files.mobileExperience.includes("foldId={`projects:${stageLabel}`}"), "Projects fold state must be keyed by project group");
assert(files.mobileExperience.includes("foldId={`skills:${category}`}"), "Skills.md fold state must be keyed by skill category");
assert(files.mobileExperience.includes("foldId={`soul:${section.title}`}"), "Soul.md fold state must be keyed by soul section");
assert(files.mobileExperience.includes('className="mobile-terminal-fold__body"'), "folded body text must be wrapped for nonlinear expansion animation");
assert(files.mobileExperience.includes("mobile-terminal-fold mobile-terminal-fold--projects"), "Projects must render markdown-style fold sections");
assert(files.mobileExperience.includes("mobile-terminal-fold mobile-terminal-fold--skills"), "Skills.md must render markdown-style fold sections");
assert(files.mobileExperience.includes("mobile-terminal-fold mobile-terminal-fold--soul"), "Soul.md must render markdown-style fold sections");
assert(files.mobileExperience.includes("mobile-soul-intro"), "Soul.md intro must stay outside collapsible details");

for (const detailLabel of ["currentSignal", "spaceLayer", "archiveNote", "tags", "media", "imageAlt"]) {
  assert(mobileData.includes(detailLabel), `project detail copy must include localized ${detailLabel}`);
}

assert(mobileData.includes('id: "arch_treehabitat"'), "mobile projects must include Tree Habitat by exhibit id");
assert(mobileData.includes('title: "Tree Habitat"'), "Tree Habitat mobile project must use the exhibit title");
assert(
  mobileData.includes('subtitle: {') && mobileData.includes("Academic architecture study"),
  "Tree Habitat mobile project must include a subtitle for the student architecture context",
);
assert(
  mobileData.includes('category: "Study"') && mobileData.includes('stageLabel: "Education"'),
  "Tree Habitat mobile project must stay under the Education student-stage group",
);
assert(mobileData.includes('mediaKind: "image"'), "Tree Habitat mobile project must use image media instead of a model");
assert(!mobileData.includes('title: "Tree Habitat"') || !mobileData.includes('en: "3D preview reserved"'), "Tree Habitat mobile project must not reserve a 3D preview");
for (const tag of ["student work", "mixed use", "highrise building", "architecture"]) {
  assert(mobileData.includes(`"${tag}"`), `Tree Habitat mobile project must include ${tag} tag`);
}
assert(mobileData.includes("student-era architecture project"), "Tree Habitat mobile copy must identify the work as student-era");
assert(mobileData.includes("学生阶段建筑作品"), "Tree Habitat mobile copy must include the Chinese student-work framing");
assert(
  mobileData.includes('"/exhibits/arch_treehabitat/img/FL-1.webp"') &&
    mobileData.includes('"/exhibits/arch_treehabitat/img/FL-26.webp'),
  "Tree Habitat mobile project must include exhibit image URLs",
);
assert(mobileData.includes('id: "arch_uabb_exhibit"'), "mobile projects must include UABB Exhibit by exhibit id");
assert(mobileData.includes('title: "UABB Exhibit"'), "UABB mobile project must use the exhibit title");
for (const tag of ["urban research", "field observation", "exhibition proposal"]) {
  assert(mobileData.includes(`"${tag}"`), `UABB mobile project must include ${tag} tag`);
}
assert(
  mobileData.includes("Urban research and exhibition model study") &&
    mobileData.includes("Shenzhen field observation"),
  "UABB mobile copy must frame the work as urban research and exhibition model study",
);
assert(
  mobileData.includes('id: "arch_3d_printing_architecture"'),
  "mobile projects must include 3D Printing Architecture by exhibit id",
);
assert(
  mobileData.includes('title: "3D Printing Architecture"') &&
    mobileData.includes('mediaKind: "video"') &&
    mobileData.includes("architecture animation") &&
    mobileData.includes("0.9-meter") &&
    mobileData.includes("3D-printed cement"),
  "3D Printing Architecture mobile project must describe the model plus process animation",
);
for (const tag of ["student work", "3d printing", "architecture animation"]) {
  assert(mobileData.includes(`"${tag}"`), `3D Printing Architecture mobile project must include ${tag} tag`);
}

for (const forbiddenMarker of [
  "archiveAutoPaused",
  "pauseArchiveAuto",
  "resumeArchiveAutoLater",
  "handleArchivePointerDown",
  "handleArchivePointerMove",
  "handleArchivePointerUp",
  "suppressArchiveClickRef",
  "handleChipPointerDown",
  "handleChipPointerMove",
  "handleChipPointerUp",
  "mobile-archive-carousel",
  "mobile-expertise-field",
  "mobile-white-glass-theme",
  "mobile-glass",
]) {
  assert(!files.mobileExperience.includes(forbiddenMarker), `mobile experience must remove ${forbiddenMarker}`);
}

console.log("mobile content data contract tests passed");
