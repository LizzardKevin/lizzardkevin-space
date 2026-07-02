import assert from "node:assert/strict";
import { files, mobileData } from "../helpers/mobileContractFixture.mjs";

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
assert(files.mobileExperience.includes("safeReadStorageItem"), "mobile terminal storage reads must be guarded");
assert(files.mobileExperience.includes("safeWriteStorageItem"), "mobile terminal storage writes must be guarded");
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
  /<header[\s\S]*<\/header>\s*\{\s*settingsOpen\s*\?\s*\(\s*<TerminalSettings/.test(files.mobileExperience),
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


console.log("mobile shell routing contract tests passed");
