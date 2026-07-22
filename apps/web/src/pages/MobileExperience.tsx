import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import { normalizeSupportedLanguage, readInitialLanguage } from "../i18n/resolveInitialLanguage";
import {
  getProjectItem,
  mobileProjectItems,
  mobileSkillEntries,
  mobileTabs,
  mobileTerminalCopy,
  type MobileProjectItem,
  type MobileSkillCategory,
  type MobileTabId,
  type MobileTerminalLanguage,
  type MobileTerminalTheme,
} from "../mobile/mobileArchiveData";
import {
  beginMobileTabSwipe,
  createMobileTabSwipeState,
  resetMobileTabSwipe,
  resolveMobileTabSwipeMove,
  resolveMobileTabSwipeRelease,
} from "../mobile/mobileTabSwipe.ts";
import { publicAssetUrl } from "../platform/publicAssets.ts";
import type { MobileRouteView } from "../mobile/mobileRouteView";

const BOOT_MIN_DURATION_MS = 3000;
const BOOT_MAX_DURATION_MS = 10000;
const FONT_LOAD_MAX_RETRIES = 3;
const FONT_LOAD_RETRY_DELAY_MS = 360;
const HEADER_COLLAPSE_DISTANCE_PX = 36;
const SPACE_INLINE_OFFSET_X_PX = 90;
const SPACE_INLINE_OFFSET_Y_PX = -16;
const THEME_REVEAL_DURATION_MS = 620;
const PROJECT_SNAP_DURATION_MS = 360;
const SHELL_COLLAPSE_OFFSET_PX = 84;
const NAV_COLLAPSE_OFFSET_PX = 34;
const DOC_SWIPE_EXIT_RATIO = 0.42;
const DOC_SWIPE_EXIT_MS = 180;
const DOC_SWIPE_ENTER_PX = 56;
const DOC_SWIPE_ENTER_MS = 240;
const DOC_SWIPE_REBOUND_MS = 240;
const DEFAULT_TERMINAL_THEME: MobileTerminalTheme = "light";
const LANGUAGE_STORAGE_KEY = "mobileTerminalLanguage";
const THEME_STORAGE_KEY = "mobileTerminalThemeV2";
const FALLBACK_BOOT_COMMAND = "$ space-cli boot --mode mobile";
const FALLBACK_BOOT_STATUS = "loading terminal session...";

const TERMINAL_LABELS = ["Projects", "Skills.md", "Soul.md", "Contact.md"] as const;
const TAB_ORDER: MobileTabId[] = ["projects", "skills", "soul", "contact"];
const SKILL_CATEGORY_META: Record<MobileSkillCategory, { command: string; path: string }> = {
  ai: {
    command: '$ grep -n "^AI" Skills.md',
    path: "skills/ai-workflows.md",
  },
  architecture: {
    command: '$ grep -n "^Visual / Spatial / Creative" Skills.md',
    path: "skills/spatial-creative.md",
  },
  digital: {
    command: '$ grep -n "^Digital" Skills.md',
    path: "skills/digital-production.md",
  },
  analog: {
    command: '$ grep -n "^Analog" Skills.md',
    path: "skills/analog-making.md",
  },
  soft: {
    command: '$ grep -n "^Soft Skills" Skills.md',
    path: "skills/soft-skills.md",
  },
};
const TERMINAL_FONT_LOADS: Record<MobileTerminalLanguage, string[]> = {
  en: ['400 14px "Ubuntu Mono Web"', '700 14px "Ubuntu Mono Web"'],
  zh: [],
};

type TerminalFontStatus = "idle" | "loading" | "ready" | "fallback";

type ThemeRevealState = {
  id: number;
  nextTheme: MobileTerminalTheme;
  x: number;
  y: number;
};

type TerminalFoldState = Record<string, boolean>;

function safeReadStorageItem(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Terminal preferences are cosmetic; restricted storage should not block the mobile site.
  }
}

function readStoredLanguage(): MobileTerminalLanguage {
  const sharedValue = safeReadStorageItem("lang");
  if (sharedValue === "zh" || sharedValue === "en") return sharedValue;
  const mobileValue = safeReadStorageItem(LANGUAGE_STORAGE_KEY);
  return mobileValue === "zh" || mobileValue === "en" ? mobileValue : readInitialLanguage();
}

function readStoredTheme(): MobileTerminalTheme {
  const value = safeReadStorageItem(THEME_STORAGE_KEY);
  return value === "dark" || value === "light" ? value : DEFAULT_TERMINAL_THEME;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function supportsFontLoading() {
  return typeof document !== "undefined" && "fonts" in document && typeof document.fonts.load === "function";
}

async function loadTerminalFonts(language: MobileTerminalLanguage): Promise<TerminalFontStatus> {
  if (!supportsFontLoading()) return "ready";

  const fontLoads = TERMINAL_FONT_LOADS[language];
  if (fontLoads.length === 0) return "ready";

  for (let attempt = 0; attempt <= FONT_LOAD_MAX_RETRIES; attempt += 1) {
    try {
      await Promise.all(fontLoads.map((font) => document.fonts.load(font)));
      if (fontLoads.every((font) => document.fonts.check(font))) {
        return "ready";
      }
    } catch {
      // Retry below, then fall back after the configured attempts.
    }

    if (attempt < FONT_LOAD_MAX_RETRIES) {
      await delay(FONT_LOAD_RETRY_DELAY_MS);
    }
  }

  return "fallback";
}

function applyTerminalScrollState(root: HTMLElement | null, scrollTop: number) {
  if (!root) return;
  const progress = Math.min(1, Math.max(0, scrollTop / HEADER_COLLAPSE_DISTANCE_PX));
  const scrollWithinCollapse = Math.min(scrollTop, HEADER_COLLAPSE_DISTANCE_PX);
  const contentScrollY = SHELL_COLLAPSE_OFFSET_PX * progress;
  const navScrollY = NAV_COLLAPSE_OFFSET_PX * progress - scrollWithinCollapse;

  root.style.setProperty("--terminal-collapse", progress.toFixed(3));
  root.style.setProperty("--terminal-header-height", `${82 - 34 * progress}px`);
  root.style.setProperty("--terminal-brand-height", `${58 - 36 * progress}px`);
  root.style.setProperty("--terminal-nav-top", `${82 - 34 * progress}px`);
  root.style.setProperty("--terminal-shell-top", `${194 - 84 * progress}px`);
  root.style.setProperty("--terminal-space-size", `${36 - 24 * progress}px`);
  root.style.setProperty("--terminal-space-x", `${SPACE_INLINE_OFFSET_X_PX * progress}px`);
  root.style.setProperty("--terminal-space-y", `${SPACE_INLINE_OFFSET_Y_PX * progress}px`);
  root.style.setProperty("--terminal-space-line-height", `${0.96 + 0.24 * progress}`);
  root.style.setProperty("--terminal-content-scroll-y", `${contentScrollY}px`);
  root.style.setProperty("--terminal-nav-scroll-y", `${navScrollY}px`);
}

function getFoldExpanded(foldState: TerminalFoldState, foldId: string) {
  return foldState[foldId] ?? false;
}

export function MobileExperience({
  routeView,
  onNavigateToProject,
  onNavigateToProfile,
  onNavigateToRoot,
}: {
  routeView: MobileRouteView;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToRoot?: () => void;
}) {
  const { i18n, t } = useTranslation();
  const terminalRootRef = useRef<HTMLDivElement | null>(null);
  const terminalShellRef = useRef<HTMLElement | null>(null);
  const terminalCollapseRef = useRef(0);
  const terminalSnapFrameRef = useRef<number | null>(null);
  const tabSwipeRef = useRef(createMobileTabSwipeState());
  const docSwipeFrameRef = useRef<number | null>(null);
  const suppressSwipeClickRef = useRef(false);
  const [bootLanguage] = useState<MobileTerminalLanguage>(() => readStoredLanguage());
  const [localActiveTab, setActiveTab] = useState<MobileTabId | null>(null);
  const [foldState, setFoldState] = useState<TerminalFoldState>({});
  const [localSelectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewLoadKey, setViewLoadKey] = useState(0);
  const [language, setLanguageState] = useState<MobileTerminalLanguage>(() => readStoredLanguage());
  const [theme, setThemeState] = useState<MobileTerminalTheme>(() => readStoredTheme());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontStatus, setFontStatus] = useState<TerminalFontStatus>("loading");
  const [booting, setBooting] = useState(true);
  const [themeReveal, setThemeReveal] = useState<ThemeRevealState | null>(null);
  const themeRevealTimeoutRef = useRef<number | null>(null);
  const copy = mobileTerminalCopy[language];
  const activeTab = routeView.kind === "work"
    ? "projects"
    : routeView.kind === "profile"
      ? "soul"
      : routeView.kind === "root"
        ? localActiveTab
        : null;
  const selectedProjectId = routeView.kind === "work" ? routeView.projectId : localSelectedProjectId;
  const selectedProject = selectedProjectId ? getProjectItem(selectedProjectId) : null;
  const documentKey = selectedProject
    ? `project-${selectedProject.id}-${language}-${viewLoadKey}`
    : `${activeTab ?? "idle"}-${language}-${viewLoadKey}`;
  const documentLabel = activeTab ? TERMINAL_LABELS[TAB_ORDER.indexOf(activeTab)] : copy.aria.idle;

  useEffect(() => {
    let cancelled = false;

    const fontTask = loadTerminalFonts(bootLanguage);
    const completeAfterMinimum = Promise.all([delay(BOOT_MIN_DURATION_MS), fontTask]).then(([, status]) => status);
    const completeAtMaximum = delay(BOOT_MAX_DURATION_MS).then((): TerminalFontStatus => "fallback");

    Promise.race([completeAfterMinimum, completeAtMaximum]).then((status) => {
      if (cancelled) return;
      setFontStatus(status);
      setBooting(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bootLanguage]);

  useEffect(() => {
    const syncLanguage = (value: string) => {
      const nextLanguage = normalizeSupportedLanguage(value);
      setLanguageState(nextLanguage);
      safeWriteStorageItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      void loadTerminalFonts(nextLanguage).then((status) => setFontStatus(status));
    };

    i18n.on("languageChanged", syncLanguage);
    return () => {
      i18n.off("languageChanged", syncLanguage);
    };
  }, [i18n]);

  useEffect(() => {
    return () => {
      if (themeRevealTimeoutRef.current !== null) {
        window.clearTimeout(themeRevealTimeoutRef.current);
      }
      if (terminalSnapFrameRef.current !== null) {
        window.cancelAnimationFrame(terminalSnapFrameRef.current);
      }
      if (docSwipeFrameRef.current !== null) {
        window.cancelAnimationFrame(docSwipeFrameRef.current);
      }
    };
  }, []);

  const setLanguage = (next: MobileTerminalLanguage) => {
    setLanguageState(next);
    safeWriteStorageItem(LANGUAGE_STORAGE_KEY, next);
    safeWriteStorageItem("lang", next);
    void i18n.changeLanguage(next);
    void loadTerminalFonts(next);
  };

  const setTheme = (next: MobileTerminalTheme, event?: MouseEvent<HTMLButtonElement>) => {
    if (next === theme) return;
    safeWriteStorageItem(THEME_STORAGE_KEY, next);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !event) {
      setThemeState(next);
      setThemeReveal(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (themeRevealTimeoutRef.current !== null) {
      window.clearTimeout(themeRevealTimeoutRef.current);
    }

    setThemeReveal({
      id: Date.now(),
      nextTheme: next,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    themeRevealTimeoutRef.current = window.setTimeout(() => {
      setThemeState(next);
      setThemeReveal(null);
      themeRevealTimeoutRef.current = null;
    }, THEME_REVEAL_DURATION_MS);
  };

  const handleDocumentScroll = (event: UIEvent<HTMLElement>) => {
    const progress = Math.min(1, Math.max(0, event.currentTarget.scrollTop / HEADER_COLLAPSE_DISTANCE_PX));
    terminalCollapseRef.current = progress;
    applyTerminalScrollState(terminalRootRef.current, event.currentTarget.scrollTop);
  };

  const animateTerminalCollapseTo = (targetProgress: number) => {
    const shell = terminalShellRef.current;
    const root = terminalRootRef.current;
    if (!shell || !root) return;

    if (terminalSnapFrameRef.current !== null) {
      window.cancelAnimationFrame(terminalSnapFrameRef.current);
    }

    const startProgress = terminalCollapseRef.current;
    const startTime = window.performance.now();
    const targetScrollTop = targetProgress * HEADER_COLLAPSE_DISTANCE_PX;

    const tick = (now: number) => {
      const raw = Math.min(1, (now - startTime) / PROJECT_SNAP_DURATION_MS);
      const eased = 1 - (1 - raw) ** 3;
      const progress = startProgress + (targetProgress - startProgress) * eased;

      terminalCollapseRef.current = progress;
      shell.scrollTop = progress * HEADER_COLLAPSE_DISTANCE_PX;
      applyTerminalScrollState(root, shell.scrollTop);

      if (raw < 1) {
        terminalSnapFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      terminalCollapseRef.current = targetProgress;
      shell.scrollTop = targetScrollTop;
      applyTerminalScrollState(root, targetScrollTop);
      terminalSnapFrameRef.current = null;
    };

    terminalSnapFrameRef.current = window.requestAnimationFrame(tick);
  };

  const snapTerminalCollapseToNearest = () => {
    const targetProgress = terminalCollapseRef.current >= 0.5 ? 1 : 0;
    window.requestAnimationFrame(() => animateTerminalCollapseTo(targetProgress));
  };

  const setDocSwipeOffset = (value: number) => {
    terminalRootRef.current?.style.setProperty("--terminal-doc-swipe-x", `${Math.round(value)}px`);
  };

  const animateDocSwipeTo = (from: number, to: number, durationMs: number, onDone?: () => void) => {
    if (docSwipeFrameRef.current !== null) {
      window.cancelAnimationFrame(docSwipeFrameRef.current);
    }
    if (!terminalRootRef.current || from === to) {
      setDocSwipeOffset(to);
      docSwipeFrameRef.current = null;
      onDone?.();
      return;
    }
    const startTime = window.performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - raw) ** 3;
      setDocSwipeOffset(from + (to - from) * eased);
      if (raw < 1) {
        docSwipeFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }
      docSwipeFrameRef.current = null;
      onDone?.();
    };
    docSwipeFrameRef.current = window.requestAnimationFrame(tick);
  };

  const swipeTabIndex = activeTab ? TAB_ORDER.indexOf(activeTab) : -1;
  const tabSwipeEnabled = routeView.kind !== "not-found" && selectedProject === null && swipeTabIndex >= 0;

  const handleShellPointerDown = (event: PointerEvent<HTMLElement>) => {
    suppressSwipeClickRef.current = false;
    if (!tabSwipeEnabled || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    beginMobileTabSwipe(tabSwipeRef.current, { pointerId: event.pointerId, x: event.clientX, y: event.clientY });
  };

  const handleShellPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = tabSwipeRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    const outcome = resolveMobileTabSwipeMove(state, {
      x: event.clientX,
      y: event.clientY,
      currentIndex: swipeTabIndex,
      total: TAB_ORDER.length,
    });
    if (outcome.kind === "idle" || outcome.kind === "ignore") return;
    if (outcome.kind === "engage") {
      suppressSwipeClickRef.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort; the swipe still resolves without it.
      }
    }
    event.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setDocSwipeOffset(outcome.offsetX);
  };

  const handleShellPointerRelease = (event: PointerEvent<HTMLElement>) => {
    const state = tabSwipeRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    const outcome = resolveMobileTabSwipeRelease(state, { currentIndex: swipeTabIndex, total: TAB_ORDER.length });
    if (outcome.kind === "idle") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (outcome.kind === "rebound") {
      if (reducedMotion) {
        setDocSwipeOffset(0);
        return;
      }
      animateDocSwipeTo(outcome.offsetX, 0, DOC_SWIPE_REBOUND_MS);
      return;
    }

    const nextTab = TAB_ORDER[outcome.nextIndex];
    if (!nextTab) return;
    if (reducedMotion) {
      setDocSwipeOffset(0);
      selectTab(nextTab);
      return;
    }
    const shellWidth = terminalShellRef.current?.clientWidth ?? window.innerWidth;
    const exitTarget = (outcome.direction === "next" ? -1 : 1) * shellWidth * DOC_SWIPE_EXIT_RATIO;
    const enterStart = (outcome.direction === "next" ? 1 : -1) * DOC_SWIPE_ENTER_PX;
    animateDocSwipeTo(outcome.offsetX, exitTarget, DOC_SWIPE_EXIT_MS, () => {
      selectTab(nextTab);
      setDocSwipeOffset(enterStart);
      animateDocSwipeTo(enterStart, 0, DOC_SWIPE_ENTER_MS);
    });
  };

  const handleShellPointerCancel = (event: PointerEvent<HTMLElement>) => {
    const state = tabSwipeRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;
    const offsetX = state.offsetX;
    resetMobileTabSwipe(state);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDocSwipeOffset(0);
      return;
    }
    animateDocSwipeTo(offsetX, 0, DOC_SWIPE_REBOUND_MS);
  };

  const handleShellClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressSwipeClickRef.current) return;
    suppressSwipeClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFoldExpandedChange = (foldId: string, expanded: boolean) => {
    setFoldState((current) => {
      if (current[foldId] === expanded) return current;
      return { ...current, [foldId]: expanded };
    });
  };

  const selectTab = (tabId: MobileTabId) => {
    if (activeTab === tabId && selectedProjectId === null) {
      return;
    }

    if (tabId === "soul" && onNavigateToProfile) {
      onNavigateToProfile();
      return;
    }
    if (routeView.kind !== "root" && onNavigateToRoot) {
      onNavigateToRoot();
    }
    setActiveTab(tabId);
    setSelectedProjectId(null);
    setViewLoadKey((key) => key + 1);
    setSettingsOpen(false);
    snapTerminalCollapseToNearest();
  };

  const openProject = (projectId: string) => {
    if (onNavigateToProject) {
      onNavigateToProject(projectId);
      return;
    }
    setSelectedProjectId(projectId);
    setViewLoadKey((key) => key + 1);
    snapTerminalCollapseToNearest();
  };

  const closeProject = () => {
    if (onNavigateToRoot) {
      onNavigateToRoot();
      return;
    }
    setSelectedProjectId(null);
    setViewLoadKey((key) => key + 1);
    snapTerminalCollapseToNearest();
  };

  return (
    <div
      ref={terminalRootRef}
      className={`mobile-site mobile-terminal-site mobile-terminal-site--${theme}`}
      data-active-tab={activeTab ?? "idle"}
      data-font-status={fontStatus}
      data-language={language}
    >
      {booting ? (
        <TerminalBootView
          ariaLabel={copy.aria.loading}
          command={copy.boot.command || FALLBACK_BOOT_COMMAND}
          status={copy.boot.status || FALLBACK_BOOT_STATUS}
        />
      ) : (
        <>
          <header className="mobile-terminal-header mobile-terminal-chromeLoad">
            <div className="mobile-terminal-brand">
              <p>LizzardKevin's</p>
              <strong>Space</strong>
            </div>
            <button
              type="button"
              className="mobile-terminal-settingsButton"
              aria-label={copy.aria.settings}
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              ⚙
            </button>
          </header>

          {settingsOpen ? (
            <TerminalSettings
              copy={copy.settings}
              language={language}
              theme={theme}
              onLanguageChange={setLanguage}
              onThemeChange={setTheme}
            />
          ) : null}

          <nav className="mobile-terminal-nav mobile-terminal-chromeLoad" aria-label={copy.aria.sections}>
            {mobileTabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                className={`mobile-terminal-row${activeTab === tab.id ? " mobile-terminal-row--active" : ""}`}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => selectTab(tab.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{tab.label}</strong>
              </button>
            ))}
          </nav>
          {themeReveal ? (
            <div
              key={themeReveal.id}
              aria-hidden="true"
              className="mobile-terminal-themeReveal"
              style={
                {
                  "--terminal-reveal-x": `${themeReveal.x}px`,
                  "--terminal-reveal-y": `${themeReveal.y}px`,
                } as CSSProperties
              }
            />
          ) : null}

          <main
            ref={terminalShellRef}
            className={`mobile-terminal-shell${activeTab === "contact" ? " mobile-terminal-shell--contact" : ""}`}
            aria-label={copy.aria.museum}
            onScroll={handleDocumentScroll}
            onPointerDown={handleShellPointerDown}
            onPointerMove={handleShellPointerMove}
            onPointerUp={handleShellPointerRelease}
            onPointerCancel={handleShellPointerCancel}
            onClickCapture={handleShellClickCapture}
          >
            {routeView.kind === "not-found" ? (
              <section className="mobile-terminal-document" data-route-not-found="true">
                <div className="mobile-terminal-loadLayer mobile-terminal-document--loading">
                  <div className="mobile-terminal-command">{t("route.notFoundTerminal")}</div>
                  <button type="button" className="mobile-terminal-back" onClick={onNavigateToRoot}>
                    cd /
                  </button>
                </div>
              </section>
            ) : selectedProject ? (
              <ProjectDetailView
                copy={copy}
                project={selectedProject}
                language={language}
                key={documentKey}
                onBack={closeProject}
              />
            ) : (
              <section
                key={documentKey}
                className={`mobile-terminal-document${activeTab === "contact" ? " mobile-terminal-document--contact" : ""}`}
                aria-label={documentLabel}
              >
                <div className="mobile-terminal-loadLayer mobile-terminal-document--loading">
                  {activeTab === null ? <MobileTerminalIdle /> : null}
                  {activeTab === "projects" ? (
                    <ProjectsView
                      copy={copy.projects}
                      foldState={foldState}
                      onFoldExpandedChange={handleFoldExpandedChange}
                      onSelectProject={openProject}
                    />
                  ) : null}
                  {activeTab === "skills" ? (
                    <SkillsDocument
                      copy={copy.skills}
                      foldState={foldState}
                      language={language}
                      onFoldExpandedChange={handleFoldExpandedChange}
                    />
                  ) : null}
                  {activeTab === "soul" ? (
                    <SoulDocument
                      copy={copy.soul}
                      foldState={foldState}
                      onFoldExpandedChange={handleFoldExpandedChange}
                    />
                  ) : null}
                  {activeTab === "contact" ? <ContactDocument copy={copy.contact} /> : null}
                </div>
              </section>
            )}
          </main>
        </>
      )}
    </div>
  );
}

function TerminalBootView({
  ariaLabel,
  command,
  status,
}: {
  ariaLabel: string;
  command: string;
  status: string;
}) {
  const loadingStatus = status.endsWith("...") ? status.slice(0, -3) : status;

  return (
    <div className="mobile-terminal-boot" aria-label={ariaLabel}>
      <span>{command}</span>
      <strong>
        {loadingStatus}
        {status.endsWith("...") ? (
          <span className="mobile-terminal-bootDots" aria-label="...">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        ) : null}
      </strong>
    </div>
  );
}

function MobileTerminalIdle() {
  return <div className="mobile-terminal-idle" aria-hidden="true" />;
}

function TerminalSettings({
  copy,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
}: {
  copy: typeof mobileTerminalCopy.en.settings;
  language: MobileTerminalLanguage;
  theme: MobileTerminalTheme;
  onLanguageChange: (next: MobileTerminalLanguage) => void;
  onThemeChange: (next: MobileTerminalTheme, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="mobile-terminal-settings" role="dialog" aria-label={copy.label}>
      <div>
        <span>{copy.language}</span>
        <button type="button" className={language === "en" ? "is-active" : ""} onClick={() => onLanguageChange("en")}>
          {copy.english}
        </button>
        <button type="button" className={language === "zh" ? "is-active" : ""} onClick={() => onLanguageChange("zh")}>
          {copy.chinese}
        </button>
      </div>
      <div>
        <span>{copy.theme}</span>
        <button
          type="button"
          className={theme === "light" ? "is-active" : ""}
          aria-pressed={theme === "light"}
          onClick={(event) => onThemeChange("light", event)}
        >
          {copy.light}
        </button>
        <button
          type="button"
          className={theme === "dark" ? "is-active" : ""}
          aria-pressed={theme === "dark"}
          onClick={(event) => onThemeChange("dark", event)}
        >
          {copy.dark}
        </button>
      </div>
    </div>
  );
}

function TerminalFold({
  className,
  expanded,
  foldId,
  onExpandedChange,
  summary,
  children,
}: {
  className: string;
  expanded: boolean;
  foldId: string;
  onExpandedChange: (expanded: boolean) => void;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details open className={className} data-fold-id={foldId} data-fold-state={expanded ? "open" : "closed"}>
      <summary
        aria-expanded={expanded}
        onClick={(event) => {
          event.preventDefault();
          onExpandedChange(!expanded);
        }}
      >
        {summary}
      </summary>
      <div className="mobile-terminal-fold__body" aria-hidden={!expanded}>
        {children}
      </div>
    </details>
  );
}

function ProjectsView({
  copy,
  foldState,
  onFoldExpandedChange,
  onSelectProject,
}: {
  copy: typeof mobileTerminalCopy.en.projects;
  foldState: TerminalFoldState;
  onFoldExpandedChange: (foldId: string, expanded: boolean) => void;
  onSelectProject: (id: string) => void;
}) {
  const groupedProjects = useMemo(() => {
    return mobileProjectItems.reduce<Record<string, MobileProjectItem[]>>((groups, item) => {
      const group = groups[item.stageLabel] ?? [];
      groups[item.stageLabel] = [...group, item];
      return groups;
    }, {});
  }, []);

  return (
    <div className="mobile-terminal-section">
      <div className="mobile-terminal-command">{copy.command}</div>
      <p className="mobile-terminal-lede">{copy.lede}</p>
      {Object.entries(groupedProjects).map(([stageLabel, projects]) => (
        <TerminalFold
          key={stageLabel}
          className="mobile-terminal-fold mobile-terminal-fold--projects"
          expanded={getFoldExpanded(foldState, `projects:${stageLabel}`)}
          foldId={`projects:${stageLabel}`}
          onExpandedChange={(expanded) => onFoldExpandedChange(`projects:${stageLabel}`, expanded)}
          summary={<span>{stageLabel}</span>}
        >
          <div className="mobile-project-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="mobile-project-line"
                onClick={() => onSelectProject(project.id)}
              >
                <span>{project.id}</span>
                <strong>{project.title}</strong>
                <small>{project.indexLabel}</small>
              </button>
            ))}
          </div>
        </TerminalFold>
      ))}
    </div>
  );
}

function ProjectDetailView({
  copy,
  project,
  language,
  onBack,
}: {
  copy: typeof mobileTerminalCopy.en;
  project: MobileProjectItem;
  language: MobileTerminalLanguage;
  onBack: () => void;
}) {
  const subtitle = project.subtitle?.[language];
  const story = project.story?.[language];

  return (
    <article className="mobile-project-detail">
      <div className="mobile-terminal-loadLayer mobile-terminal-document--loading mobile-project-detail__loadLayer">
        <button type="button" className="mobile-terminal-back" onClick={onBack}>
          cd ..
        </button>
        <div className="mobile-terminal-command">$ open {project.id}</div>
        <header className="mobile-project-detail__header">
          <span>{project.indexLabel}</span>
          <h1>{project.title}</h1>
          {subtitle ? <p className="mobile-project-detail__subtitle">{subtitle}</p> : null}
          {project.tags?.length ? (
            <div className="mobile-project-detail__tags" aria-label={`${project.title} ${copy.projectDetails.tags}`}>
              {project.tags?.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
          <p>{project.summary[language]}</p>
        </header>
        <div className="mobile-project-detail__media" aria-label={`${project.title} ${copy.projectDetails.media}`}>
          <span>{project.mediaKind}</span>
          <strong>{project.mediaStatus[language]}</strong>
          {project.imageUrls?.length ? (
            <div className="mobile-project-detail__imageRail">
              {project.imageUrls?.map((url, index) => (
                <img
                  key={url}
                  src={publicAssetUrl(url)}
                  alt={`${project.title} ${copy.projectDetails.imageAlt} ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          ) : null}
        </div>
        {story ? <p className="mobile-project-detail__story">{project.story?.[language]}</p> : null}
        <dl className="mobile-project-detail__notes">
          <div>
            <dt>{copy.projectDetails.currentSignal}</dt>
            <dd>{project.signal[language]}</dd>
          </div>
          <div>
            <dt>{copy.projectDetails.spaceLayer}</dt>
            <dd>{project.spaceLayer[language]}</dd>
          </div>
          <div>
            <dt>{copy.projectDetails.archiveNote}</dt>
            <dd>{project.archiveNote[language]}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function SkillsDocument({
  copy,
  foldState,
  language,
  onFoldExpandedChange,
}: {
  copy: typeof mobileTerminalCopy.en.skills;
  foldState: TerminalFoldState;
  language: MobileTerminalLanguage;
  onFoldExpandedChange: (foldId: string, expanded: boolean) => void;
}) {
  return (
    <div className="mobile-terminal-section">
      <div className="mobile-terminal-command">{copy.command}</div>
      <p className="mobile-terminal-lede">{copy.lede}</p>
      {(Object.keys(SKILL_CATEGORY_META) as MobileSkillCategory[]).map((category, index) => {
        const entries = mobileSkillEntries.filter((entry) => entry.category === category);
        const meta = SKILL_CATEGORY_META[category];
        return (
          <TerminalFold
            key={category}
            className="mobile-terminal-fold mobile-terminal-fold--skills mobile-skill-module"
            expanded={getFoldExpanded(foldState, `skills:${category}`)}
            foldId={`skills:${category}`}
            onExpandedChange={(expanded) => onFoldExpandedChange(`skills:${category}`, expanded)}
            summary={
              <>
              <div className="mobile-skill-module__prompt">{meta.command}</div>
              <h2>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {meta.path}
              </h2>
              </>
            }
          >
            <ul className="mobile-skill-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.label}</strong>
                  <span>{entry.summary[language]}</span>
                </li>
              ))}
            </ul>
          </TerminalFold>
        );
      })}
    </div>
  );
}

function SoulDocument({
  copy,
  foldState,
  onFoldExpandedChange,
}: {
  copy: typeof mobileTerminalCopy.en.soul;
  foldState: TerminalFoldState;
  onFoldExpandedChange: (foldId: string, expanded: boolean) => void;
}) {
  return (
    <div className="mobile-terminal-section">
      <div className="mobile-terminal-command">{copy.command}</div>
      <p className="mobile-terminal-lede mobile-soul-intro">{copy.bio}</p>
      <div className="mobile-resume-list">
        {copy.sections.map((section) => (
          <TerminalFold
            key={section.title}
            className="mobile-terminal-fold mobile-terminal-fold--soul mobile-resume-block"
            expanded={getFoldExpanded(foldState, `soul:${section.title}`)}
            foldId={`soul:${section.title}`}
            onExpandedChange={(expanded) => onFoldExpandedChange(`soul:${section.title}`, expanded)}
            summary={
              <>
              <span>{section.meta}</span>
              <h2>{section.title}</h2>
              </>
            }
          >
            <div>
              <p>{section.summary}</p>
              <ul>
                {section.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          </TerminalFold>
        ))}
      </div>
    </div>
  );
}

function ContactDocument({ copy }: { copy: typeof mobileTerminalCopy.en.contact }) {
  return (
    <div className="mobile-terminal-section mobile-contact-document">
      <div className="mobile-terminal-command">{copy.command}</div>
      <div className="mobile-contact-identity">
        <strong>{copy.name}</strong>
        <span>{copy.roleLine}</span>
      </div>
      <div className="mobile-contact-lines">
        {copy.lines.map((line) => (
          <div key={line.label}>
            <span>{line.label}</span>
            {line.values.map((value) => (
              value.href ? (
                <a
                  key={value.text}
                  href={value.href}
                  target={value.href.startsWith("http") ? "_blank" : undefined}
                  rel={value.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <strong>{value.text}</strong>
                </a>
              ) : (
                <strong key={value.text}>{value.text}</strong>
              )
            ))}
          </div>
        ))}
      </div>
      <p className="mobile-terminal-lede">{copy.note}</p>
    </div>
  );
}
