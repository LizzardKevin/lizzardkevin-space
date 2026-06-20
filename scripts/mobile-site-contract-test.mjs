import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function readProjectFile(path) {
  const url = new URL(`../${path}`, import.meta.url);
  assert(existsSync(url), `${path} must exist`);
  return readFileSync(url, "utf8");
}

function terminalCssSlice(css) {
  const start = css.indexOf(".mobile-terminal-site");
  assert.notEqual(start, -1, "mobile terminal CSS root class must exist");
  const end = css.indexOf(".playback-bar", start);
  assert.notEqual(end, -1, "mobile terminal CSS must end before desktop playback CSS");
  return end === -1 ? css.slice(start) : css.slice(start, end);
}

const files = {
  app: readProjectFile("apps/web/src/App.tsx"),
  spacePage: readProjectFile("apps/web/src/pages/SpacePage.tsx"),
  mobileExperience: readProjectFile("apps/web/src/pages/MobileExperience.tsx"),
  profile: readProjectFile("apps/web/src/content/lizzardKevinProfile.ts"),
  css: readProjectFile("apps/web/src/styles/global.css"),
};

const mobileDataUrl = new URL("../apps/web/src/mobile/mobileArchiveData.ts", import.meta.url);
assert(existsSync(mobileDataUrl), "mobile archive data module must exist");
const mobileData = readFileSync(mobileDataUrl, "utf8");

assert(
  !files.app.includes('from "./components/TopBar"'),
  "App must not statically import the desktop TopBar on mobile",
);
assert(
  !files.app.includes('from "./overlay/OverlayLayer"'),
  "App must not statically import the desktop OverlayLayer on mobile",
);
assert(
  files.app.includes("lazy(() =>") && files.app.includes("./desktop/DesktopChrome"),
  "App must lazy-load desktop chrome behind the desktop platform branch",
);

assert(
  files.spacePage.includes("const SpaceDesktopExperience = lazy("),
  "SpacePage must keep the desktop 3D experience lazy-loaded",
);
assert(
  files.spacePage.includes("{isDesktop &&") && files.spacePage.includes("<SpaceDesktopExperience"),
  "SpacePage must render the desktop 3D experience only for desktop clients",
);

assert(!files.mobileExperience.includes("devStories"), "mobile experience must not import or render DevStories");
assert(!mobileData.includes("DevStories"), "mobile archive data must not reference DevStories");
assert(files.mobileExperience.includes("mobileTabs"), "mobile experience must use the four mobile tab data");
assert(files.mobileExperience.includes("mobileProjectItems"), "mobile experience must render project data");
assert(files.mobileExperience.includes("mobileSkillEntries"), "mobile experience must render skill data");
assert(!files.mobileExperience.includes("lizzardKevinSections"), "mobile Soul.md view must use mobile-localized copy");
assert(files.mobileExperience.includes("LizzardKevin's"), "mobile header must include LizzardKevin's");
assert(files.mobileExperience.includes("Space"), "mobile header must include the Space title");
assert(files.mobileExperience.includes("$ space-cli boot --mode mobile"), "mobile boot view must include the space-cli boot command");
assert(files.mobileExperience.includes("loading terminal session..."), "mobile boot view must include terminal loading copy");
assert(files.mobileExperience.includes("BOOT_MIN_DURATION_MS = 3000"), "mobile boot minimum duration must be 3000ms");
assert(files.mobileExperience.includes("BOOT_MAX_DURATION_MS = 10000"), "mobile boot maximum duration must be 10000ms");
assert(files.mobileExperience.includes("FONT_LOAD_MAX_RETRIES = 3"), "mobile font loading must retry at most three times");
assert(files.mobileExperience.includes("fontStatus"), "mobile boot must track font loading status");
assert(files.mobileExperience.includes("loadTerminalFonts"), "mobile boot must wait for configured web fonts");
assert(files.mobileExperience.includes("document.fonts.load"), "mobile boot must use the browser font loading API");
assert(files.mobileExperience.includes("mobile-terminal-bootDots"), "mobile boot must split the trailing loading dots into an animated span");
assert(files.mobileExperience.includes('zh: []'), "Chinese mode must not configure a downloaded web font");
assert(!files.mobileExperience.includes("BOOT_DURATION_MS"), "mobile boot must not use a fixed 3000ms timeout");
assert(files.mobileExperience.includes("mobileTerminalLanguage"), "mobile language preference must use localStorage");
assert(files.mobileExperience.includes("mobileTerminalTheme"), "mobile theme preference must use localStorage");
assert(files.mobileExperience.includes('const THEME_STORAGE_KEY = "mobileTerminalThemeV2"'), "mobile theme preference must ignore the legacy dark-mode storage key");
assert(!files.mobileExperience.includes('const THEME_STORAGE_KEY = "mobileTerminalTheme";'), "mobile theme preference must not keep reading the legacy theme key");
assert(files.mobileExperience.includes('aria-label="Terminal settings"'), "mobile settings button must expose an accessible label");
assert(files.mobileExperience.includes('aria-pressed={theme === "light"}'), "settings panel must expose a Light theme toggle");
assert(files.mobileExperience.includes('aria-pressed={theme === "dark"}'), "settings panel must expose a Dark theme toggle");
assert(
  !files.mobileExperience.includes(`            {settingsOpen ? (
              <TerminalSettings`),
  "settings panel must not render inside the animated header because header clip-path clips the theme row",
);
assert(
  files.mobileExperience.includes(`          {settingsOpen ? (
            <TerminalSettings`),
  "settings panel must render as an overlay sibling outside the animated header",
);
assert(files.mobileExperience.includes("mobileTerminalCopy"), "mobile experience must use localized terminal copy");
assert(files.mobileExperience.includes('DEFAULT_TERMINAL_LANGUAGE: MobileTerminalLanguage = "en"'), "mobile terminal language must default to English");
assert(files.mobileExperience.includes('DEFAULT_TERMINAL_THEME: MobileTerminalTheme = "light"'), "mobile terminal theme must default to light mode");
assert(files.mobileExperience.includes("terminalRootRef"), "mobile experience must keep a root ref for scroll-driven CSS variables");
assert(files.mobileExperience.includes("--terminal-collapse"), "mobile scroll must write the terminal collapse CSS variable");
assert(files.mobileExperience.includes("applyTerminalScrollState"), "mobile scroll must use a two-phase scroll state helper");
assert(files.mobileExperience.includes("--terminal-content-scroll-y"), "mobile scroll must let document content move one-to-one while the header collapses");
assert(files.mobileExperience.includes("--terminal-nav-scroll-y"), "mobile scroll must let the four main tabs move one-to-one while the header collapses");
assert(files.mobileExperience.includes("HEADER_COLLAPSE_DISTANCE_PX = 36"), "mobile Space title must collapse over a shorter 36px scroll distance");
assert(files.mobileExperience.includes("const scrollWithinCollapse = Math.min(scrollTop, HEADER_COLLAPSE_DISTANCE_PX)"), "mobile scroll must explicitly separate the collapse scroll range");
assert(files.mobileExperience.includes("const contentScrollY = SHELL_COLLAPSE_OFFSET_PX * progress"), "content movement must only compensate shell collapse, not pin the document");
assert(files.mobileExperience.includes("const navScrollY = NAV_COLLAPSE_OFFSET_PX * progress - scrollWithinCollapse"), "main tabs must stop once the header is fully collapsed");
assert(files.mobileExperience.includes("className=\"mobile-terminal-loadLayer mobile-terminal-document--loading\""), "terminal text-load animation must run on an inner load layer");
assert(files.mobileExperience.includes("className=\"mobile-terminal-loadLayer mobile-terminal-document--loading mobile-project-detail__loadLayer\""), "project detail text-load animation must run on an inner load layer");
assert(!files.mobileExperience.includes("className={`mobile-terminal-document mobile-terminal-document--loading"), "terminal document scroll compensation element must not carry the text-load animation class");
assert(!files.mobileExperience.includes("className=\"mobile-project-detail mobile-terminal-document--loading\""), "project detail scroll compensation element must not carry the text-load animation class");
assert(!files.mobileExperience.includes("pinnedScroll"), "mobile scroll must not keep the document visually pinned during header collapse");
assert(files.mobileExperience.includes("SPACE_INLINE_OFFSET_X_PX = 90"), "collapsed Space x-offset must sit closer to the small brand label");
assert(files.mobileExperience.includes("SPACE_INLINE_OFFSET_Y_PX = -16"), "collapsed Space y-offset must align with the small brand label");
assert(!files.mobileExperience.includes("Preparing mobile SPACE"), "mobile entry must skip the preparing placeholder and show the terminal boot view instead");
assert(!files.mobileExperience.includes("<i aria-hidden=\"true\" />"), "mobile terminal boot view must not render the vertical cursor");
assert(files.mobileExperience.includes("animateTerminalCollapseTo"), "project navigation must animate to the nearest header collapse state");
assert(files.mobileExperience.includes("snapTerminalCollapseToNearest"), "all mobile view switches must share the nearest collapse snap helper");
assert(files.mobileExperience.includes("terminalCollapseRef"), "project navigation must remember the current header collapse progress");
assert(files.mobileExperience.includes("targetProgress = terminalCollapseRef.current >= 0.5 ? 1 : 0"), "project navigation must snap midway progress to the nearest state");
assert(!files.mobileExperience.includes("terminalCollapseRef.current = 0;\n    terminalShellRef.current?.scrollTo({ top: 0 });\n    applyTerminalCollapse"), "tab switching must not force the header open");
assert(!files.mobileExperience.includes("headerCompact"), "mobile header collapse must not be a boolean threshold state");
assert(!files.mobileExperience.includes("mobile-terminal-header--compact"), "mobile header collapse must not use the old compact class");
assert(files.mobileExperience.includes("SKILL_CATEGORY_META"), "Skills.md must wrap categories with terminal-style metadata");
assert(files.mobileExperience.includes("skills/ai-workflows.md"), "AI skills must be named as a readable terminal document");
assert(files.mobileExperience.includes("mobile-skill-module__prompt"), "Skills.md must render a terminal prompt for each category");
assert(files.mobileExperience.includes("themeReveal"), "theme switching must create a reveal state");
assert(files.mobileExperience.includes("--terminal-reveal-x"), "theme reveal must originate from the clicked control x coordinate");
assert(files.mobileExperience.includes("--terminal-reveal-y"), "theme reveal must originate from the clicked control y coordinate");
assert(files.mobileExperience.includes("nextTheme: next"), "theme reveal must store the next theme while the circular reveal runs");
assert(files.mobileExperience.includes("themeRevealTimeoutRef.current = window.setTimeout"), "theme switching must delay the real theme swap until the circular reveal starts");
assert(files.mobileExperience.includes("setThemeState(next);"), "theme switching must apply the requested theme after the reveal animation");
assert(files.mobileExperience.includes("useState<MobileTabId | null>(null)"), "mobile terminal must enter with no default tab selected");
assert(files.mobileExperience.includes('data-active-tab={activeTab ?? "idle"}'), "mobile terminal must expose an idle state before a tab is opened");
assert(files.mobileExperience.includes("viewLoadKey"), "mobile terminal must key changed document text for reload animation");
assert(files.mobileExperience.includes("setViewLoadKey((key) => key + 1)"), "tab switches must trigger the document text load animation");
assert(files.mobileExperience.includes("if (activeTab === tabId && selectedProjectId === null)"), "same-tab clicks must not reload unchanged document text");
assert(files.mobileExperience.includes("MobileTerminalIdle"), "mobile terminal must render a blank idle document area before the first tab");
assert(files.mobileExperience.includes("mobile-terminal-chromeLoad"), "mobile terminal chrome must animate into the console after boot");
assert(files.mobileExperience.includes("mobile-terminal-document--loading"), "changed document text must use the terminal load animation class");

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
assert(files.mobileExperience.includes("<ProjectDetailView project={selectedProject} language={language}"), "project details must render localized project body copy");
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

for (const detailLabel of ["Current Signal", "SPACE Layer", "Archive Note"]) {
  assert(files.mobileExperience.includes(detailLabel), `project detail must render ${detailLabel}`);
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

const terminalCss = terminalCssSlice(files.css);
assert(files.css.includes("@font-face"), "mobile terminal CSS must self-host web fonts");
assert(files.css.includes("Ubuntu Mono Web"), "mobile CSS must define the Ubuntu Mono web font");
assert(files.css.includes("/fonts/ubuntu-mono/"), "Ubuntu Mono must load from local public font assets");
assert(!files.css.includes("Sarasa"), "mobile CSS must not reference Sarasa fonts");
assert(!files.css.includes("/fonts/sarasa-mono-sc/"), "Sarasa font assets must not be loaded");
assert(terminalCss.includes('--terminal-font-en: "Ubuntu Mono Web"'), "English mode must use Ubuntu Mono Web first");
assert(terminalCss.includes('--terminal-font-zh: "PingFang SC"'), "Chinese mode must use system Chinese fonts first");
assert(terminalCss.includes("--terminal-ui-font"), "terminal CSS must separate UI font from body copy font");
assert(terminalCss.includes("--terminal-body-font"), "terminal CSS must expose a body copy font variable");
assert(terminalCss.includes('font-family: var(--terminal-body-font)'), "Chinese body copy must be able to use system Chinese fonts");
assert(!terminalCss.includes('--terminal-font: var(--terminal-font-zh)'), "Chinese mode must not switch every terminal title/control to system Chinese");
assert(terminalCss.includes('"Microsoft YaHei"'), "Chinese mode must include common system Chinese fallbacks");
assert(terminalCss.includes("--terminal-collapse"), "terminal CSS must expose scroll-driven collapse variables");
assert(terminalCss.includes("--terminal-content-scroll-y"), "terminal CSS must expose document scroll-follow offset");
assert(terminalCss.includes("--terminal-nav-scroll-y"), "terminal CSS must expose main tab scroll-follow offset");
assert(terminalCss.includes("transform: translate3d(0, var(--terminal-nav-scroll-y), 0)"), "main tabs must move with the user's scroll during header collapse");
assert(terminalCss.includes("transform: translate3d(0, var(--terminal-content-scroll-y), 0)"), "terminal documents must move one-to-one with the user's scroll during header collapse");
assert(terminalCss.includes(".mobile-terminal-loadLayer"), "terminal CSS must include a separate inner text-load animation layer");
assert(terminalCss.includes("color-mix(in srgb, var(--terminal-text)"), "collapsed Space color must interpolate toward the muted small-label color");
assert(terminalCss.includes("var(--terminal-muted) calc(var(--terminal-collapse) * 100%)"), "collapsed Space final color must match the small-label muted color");
assert(terminalCss.includes(".mobile-terminal-fold"), "terminal CSS must include markdown-style fold sections");
assert(terminalCss.includes(".mobile-terminal-fold summary"), "terminal CSS must style fold summaries");
assert(terminalCss.includes(".mobile-terminal-fold__body"), "terminal CSS must include fold body animation wrappers");
assert(terminalCss.includes("grid-template-rows"), "fold animation must use grid rows for expand and collapse");
assert(terminalCss.includes("cubic-bezier(0.22, 1, 0.36, 1)"), "fold animation must use a nonlinear easing curve");
assert(terminalCss.includes("grid-template-rows 180ms"), "fold expand and collapse animation must be fast");
assert(terminalCss.includes(".mobile-terminal-fold summary::-webkit-details-marker"), "terminal CSS must hide the default details marker");
assert(terminalCss.includes('.mobile-terminal-fold summary::before'), "terminal CSS must add terminal text fold markers");
assert(terminalCss.includes('.mobile-terminal-fold[data-fold-state="open"] summary::before'), "terminal CSS must distinguish open fold state");
assert(terminalCss.includes('.mobile-terminal-fold[data-fold-state="closed"] .mobile-terminal-fold__body'), "terminal CSS must keep closed fold bodies mounted for the closing animation");
assert(terminalCss.includes(".mobile-skill-module"), "Skills.md CSS must include terminal module wrappers");
assert(terminalCss.includes(".mobile-skill-module__prompt"), "Skills.md CSS must include terminal prompt styling");
const skillSummaryRule = terminalCss.match(/\.mobile-skill-list span\s*\{[\s\S]*?\}/)?.[0] ?? "";
assert(skillSummaryRule, "Skills.md summary text must have a dedicated CSS rule");
assert(skillSummaryRule.includes("font-size: 12px"), "Skills.md summary text must be smaller than regular body copy");
assert(skillSummaryRule.includes("line-height: 1.48"), "Skills.md summary text must use tighter terminal document leading");
assert(skillSummaryRule.includes("color: var(--terminal-muted)"), "Skills.md summary text must use muted gray instead of pure terminal text");
assert(skillSummaryRule.includes("font-family: var(--terminal-body-font)"), "Skills.md summary text must keep the body font stack");
assert(terminalCss.includes(".mobile-project-detail__notes dd"), "project detail body copy must keep its existing shared body rule");
assert(terminalCss.includes(".mobile-resume-block p"), "Soul.md body copy must keep its existing shared body rule");
assert(terminalCss.includes(".mobile-contact-lines strong"), "Contact.md body copy must keep its existing shared body rule");
assert(terminalCss.includes(".mobile-terminal-themeReveal"), "terminal CSS must include theme reveal overlay");
assert(terminalCss.includes(".mobile-terminal-site--light"), "terminal CSS must include an explicit light theme class for white background and black text");
assert(terminalCss.includes("clip-path: circle"), "theme reveal must use a circular expansion");
assert(terminalCss.includes("mix-blend-mode: difference"), "theme reveal must use a mask-like black/white inversion instead of a solid color wipe");
assert(!terminalCss.includes(".mobile-terminal-themeReveal--light"), "theme reveal must not switch through solid light fill classes");
assert(!terminalCss.includes(".mobile-terminal-themeReveal--dark"), "theme reveal must not switch through solid dark fill classes");
assert(terminalCss.includes("@keyframes mobile-terminal-theme-reveal"), "theme reveal must define a bounded circular animation");
assert(terminalCss.includes(".mobile-terminal-bootDots"), "terminal CSS must animate the boot loading dots");
assert(terminalCss.includes(".mobile-terminal-boot > span"), "terminal boot CSS must only block-layout the command and status rows");
assert(terminalCss.includes(".mobile-terminal-boot .mobile-terminal-bootDots"), "terminal boot dot span must override row layout and stay inline");
assert(!terminalCss.includes(".mobile-terminal-boot span,\n.mobile-terminal-boot strong"), "terminal boot CSS must not block-layout every nested dot span");
assert(terminalCss.includes("@keyframes mobile-terminal-dot-pulse"), "boot loading dots must use a repeating dot animation");
assert(terminalCss.includes("@keyframes mobile-terminal-text-load"), "terminal CSS must define the 250ms text loading animation");
assert(terminalCss.includes(".mobile-terminal-loadLayer.mobile-terminal-document--loading"), "terminal changed text animation must be scoped to the inner load layer");
assert(terminalCss.includes("animation: mobile-terminal-text-load 250ms"), "terminal changed text must animate for 250ms");
assert(!terminalCss.includes(".mobile-terminal-boot i"), "mobile terminal boot CSS must not keep the vertical cursor rule");
assert(terminalCss.includes("--terminal-project-scroll-room"), "project detail must reserve scroll room for header collapse");
assert(terminalCss.includes("min-height: calc(100% + var(--terminal-project-scroll-room))"), "project detail must stay scrollable enough to fully collapse the header");
assert(terminalCss.includes("--terminal-view-scroll-room"), "regular terminal documents must reserve scroll room for header collapse");
assert(terminalCss.includes("min-height: calc(100% + var(--terminal-view-scroll-room))"), "all terminal documents must stay scrollable enough to fully collapse the header");
assert(!terminalCss.includes(".mobile-terminal-shell--contact {\n  overflow: hidden;"), "Contact.md shell must remain scrollable so Space can collapse");
assert(!terminalCss.includes("ui-sans-serif"), "terminal CSS must not use sans-serif font stacks");
assert(!terminalCss.includes(".mobile-terminal-header--compact"), "terminal CSS must remove the old compact class");
assert(!files.mobileExperience.includes("Sarasa"), "mobile experience must not reference Sarasa fonts");
for (const requiredClass of [
  ".mobile-terminal-site",
  ".mobile-terminal-site--dark",
  ".mobile-terminal-header",
  ".mobile-terminal-settings",
  ".mobile-terminal-boot",
  ".mobile-terminal-shell",
  ".mobile-terminal-nav",
  ".mobile-terminal-row",
  ".mobile-terminal-document",
  ".mobile-terminal-document--contact",
  ".mobile-project-detail",
]) {
  assert(terminalCss.includes(requiredClass), `terminal CSS must include ${requiredClass}`);
}

for (const removedClass of [
  ".mobile-liquid-archive",
  ".mobile-white-glass-theme",
  ".mobile-glass",
  ".mobile-archive-carousel",
  ".mobile-expertise-field",
  ".mobile-noise-field",
  ".mobile-glass-vignette",
]) {
  assert(!files.css.includes(removedClass), `mobile CSS must remove ${removedClass}`);
}

for (const forbiddenCss of [
  "backdrop-filter",
  "-webkit-backdrop-filter",
  "blur(",
  "box-shadow",
  "linear-gradient",
  "radial-gradient",
  "border:",
  "outline:",
]) {
  assert(!terminalCss.includes(forbiddenCss), `terminal CSS must not include ${forbiddenCss}`);
}

for (const fontPath of [
  "apps/web/public/fonts/ubuntu-mono/UbuntuMono-Regular.woff2",
  "apps/web/public/fonts/ubuntu-mono/UbuntuMono-Bold.woff2",
  "apps/web/public/fonts/ubuntu-mono/LICENSE.txt",
]) {
  const url = new URL(`../${fontPath}`, import.meta.url);
  assert(existsSync(url), `${fontPath} must exist for self-hosted terminal fonts`);
}

const sarasaDirectory = new URL("../apps/web/public/fonts/sarasa-mono-sc", import.meta.url);
assert(!existsSync(sarasaDirectory), "Sarasa font directory must be removed to release mobile bundle space");

assert(files.profile.includes("lizzardKevinSections"), "profile sections must remain available for desktop profile reuse");

console.log("mobile terminal contract tests passed");
