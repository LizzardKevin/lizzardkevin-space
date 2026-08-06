import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getScrollPagesCopy, type ScrollPageAccent } from "../content/scrollPagesCopy";
import type { SupportedLanguage } from "../i18n/resolveInitialLanguage";
import Magnet from "../components/react-bits/Magnet";
import { ScrollPageContext } from "./scrollPageContext";
import { useLenisScroll, prefersReducedMotion } from "./useLenisScroll";
import { usePageLanguage } from "./usePageLanguage";
import { useEscapeToSpace } from "./useEscapeToSpace";
import { useScrollTriggerRefresh } from "./useScrollTriggerRefresh";
import { DotGridAttractCanvas } from "./DotGridAttractCanvas";
import { setDotGridArrow } from "./dotGridArrowBus";
import { CursorDot } from "./CursorDot";
import { HazardRule } from "./primitives";
import { gsap } from "./scrollGsap";

export type ScrollPageAnchor = { id: string; label: string };
export type SpaceReturnHandler = (options?: { fromEscape?: boolean }) => void;

export type ScrollPageSwitchTarget = {
  href: string;
  code: string;
  label: string;
  /** 切换条所在缘侧与横扫方向：profile→devstories 为 right（01→02 向右），反之为 left */
  side: "left" | "right";
  /** 对方页面强调色（halo 用）：teal 或 orange */
  accent: "teal" | "orange";
};

/** 与 --ark-accent / 切换条 halo 同源的色值。 */
const PAGE_ACCENT_COLORS: Record<ScrollPageAccent, string> = {
  teal: "#67c2be",
  orange: "#ef8b61",
  yellow: "#e8d44d",
};

/** 与对方页面 --ark-accent 对应的色值（切换条 hover halo）。 */
const SWITCH_ACCENT_COLORS: Record<"teal" | "orange", string> = {
  teal: "#67c2be",
  orange: "#ef8b61",
};

function writeStoredLanguage(language: SupportedLanguage) {
  try {
    localStorage.setItem("lang", language);
  } catch {
    // 语言持久化失败不应阻塞可见的语言切换。
  }
}

function LanguageSwitch() {
  const { i18n } = useTranslation();
  const language = usePageLanguage();
  const [pending, setPending] = useState(false);

  const switchTo = useCallback(
    async (next: SupportedLanguage) => {
      if (pending || next === language) return;
      setPending(true);
      try {
        await i18n.changeLanguage(next);
        writeStoredLanguage(next);
        document.documentElement.lang = next;
      } finally {
        setPending(false);
      }
    },
    [i18n, language, pending],
  );

  return (
    <div className="ark-top__lang" role="group" aria-label="Language">
      <button
        type="button"
        aria-pressed={language === "en"}
        disabled={pending}
        onClick={() => void switchTo("en")}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={language === "zh"}
        disabled={pending}
        onClick={() => void switchTo("zh")}
      >
        中
      </button>
    </div>
  );
}

/**
 * 滚动流三页共享壳层：
 * 顶栏（标识 / 页码 / 章节锚点 / 语言 / 返回 SPACE）+ 独立滚动容器 + 底栏黑条。
 * 页面绝对定位覆盖在常驻但暂停渲染的 SpaceHost 之上。
 */
export function ScrollPageShell({
  accent,
  pageCode,
  anchors,
  footerMeta,
  switchTarget,
  miniTitle,
  miniTitleAfterId,
  blankDoubleClickToSpace = false,
  onNavigateToSpace,
  children,
}: {
  accent: ScrollPageAccent;
  pageCode: string;
  anchors: ScrollPageAnchor[];
  footerMeta?: string[];
  /** profile ↔ devstories 互切目标；不传则不渲染切换条 */
  switchTarget?: ScrollPageSwitchTarget;
  /** 滚过 miniTitleAfterId 后左上常驻的迷你标题（works 展品名） */
  miniTitle?: string;
  miniTitleAfterId?: string;
  /** 双击页面空白处返回 SPACE（works 详情页启用）；交互元素不触发 */
  blankDoubleClickToSpace?: boolean;
  onNavigateToSpace: SpaceReturnHandler;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const language = usePageLanguage();
  const copy = useMemo(() => getScrollPagesCopy(language), [language]);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const leavingRef = useRef(false);
  const magnetOff = prefersReducedMotion();

  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const lenisRef = useLenisScroll(scroller, content);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const activeAnchorRef = useRef<string | null>(null);
  const [miniTitleVisible, setMiniTitleVisible] = useState(false);

  useScrollTriggerRefresh(scroller);

  const leaveToSpace = useCallback(
    (options?: { fromEscape?: boolean }) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      // ESC：立刻回 SPACE 并接管指针锁；延迟会导致首击落在展品上又进作品页
      if (options?.fromEscape || prefersReducedMotion()) {
        onNavigateToSpace(options);
        return;
      }
      const root = pageRef.current;
      if (!root) {
        onNavigateToSpace(options);
        return;
      }
      const chrome = root.querySelectorAll<HTMLElement>(".ark-top, .ark-footer");
      if (chrome.length === 0) {
        onNavigateToSpace(options);
        return;
      }
      gsap.to(chrome, {
        autoAlpha: 0,
        duration: 0.12,
        ease: "power1.out",
        onComplete: () => onNavigateToSpace(options),
      });
    },
    [onNavigateToSpace],
  );

  useEscapeToSpace(leaveToSpace);

  // 双击空白返回 SPACE:仅启用的页面(works 详情);链接/按钮/媒体/图片/顶底栏不算空白。
  // 走 leaveToSpace() 非 ESC 路径:dblclick 自带用户激活,指针锁在点击手势内直接恢复。
  useEffect(() => {
    if (!blankDoubleClickToSpace) return undefined;
    const root = pageRef.current;
    if (!root) return undefined;
    const onDoubleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (document.querySelector("[data-ark-lightbox]")) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "a, button, input, select, textarea, video, canvas, img, [role='button'], .ark-top, .ark-footer",
        )
      ) {
        return;
      }
      event.preventDefault();
      leaveToSpace();
    };
    root.addEventListener("dblclick", onDoubleClick);
    return () => root.removeEventListener("dblclick", onDoubleClick);
  }, [blankDoubleClickToSpace, leaveToSpace]);

  const handleSwitch = useCallback(() => {
    if (!switchTarget) return;
    // 点击后点阵三角立即进入消失动画（不等 hover 离开）
    setDotGridArrow(null);
    navigate(switchTarget.href);
  }, [navigate, switchTarget]);

  const scrollToTarget = useCallback(
    (target: string | HTMLElement) => {
      const el =
        typeof target === "string" ? document.getElementById(target) : target;
      if (!el) return;
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(el, { offset: -72, duration: 1.2 });
      } else {
        el.scrollIntoView({ block: "start" });
      }
    },
    [lenisRef],
  );

  // Scrollspy：以滚动容器为 root 观察各锚点 section。
  useEffect(() => {
    if (!scroller || anchors.length === 0) return undefined;
    const sections = anchors
      .map((anchor) => document.getElementById(anchor.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && activeAnchorRef.current !== entry.target.id) {
            activeAnchorRef.current = entry.target.id;
            setActiveAnchor(entry.target.id);
          }
        }
      },
      { root: scroller, rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [scroller, anchors]);

  const contextValue = useMemo(
    () => ({ scroller }),
    [scroller],
  );

  // 迷你标题：滚过指定 section 后左上常驻。
  useEffect(() => {
    if (!scroller || !miniTitleAfterId) return undefined;
    const anchorSection = document.getElementById(miniTitleAfterId);
    if (!anchorSection) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setMiniTitleVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        }
      },
      { root: scroller, threshold: 0 },
    );
    observer.observe(anchorSection);
    return () => observer.disconnect();
  }, [scroller, miniTitleAfterId]);

  return (
    <ScrollPageContext.Provider value={contextValue}>
      <div className="ark-page" data-accent={accent} ref={pageRef}>
        <DotGridAttractCanvas
          className="ark-dotgrid-canvas"
          accentColor={PAGE_ACCENT_COLORS[accent]}
        />
        <CursorDot />
        <header className="ark-top">
          <div className="ark-top__brand">
            <span className="ark-top__brandMain">{copy.brandMain}</span>
            <span className="ark-top__brandSub">{copy.brandSub}</span>
          </div>
          <span className="ark-top__pageCode">{pageCode}</span>
          <nav className="ark-top__anchors" aria-label={copy.indexLabel}>
            {anchors.map((anchor) => (
              <button
                key={anchor.id}
                type="button"
                data-active={activeAnchor === anchor.id || undefined}
                onClick={() => scrollToTarget(anchor.id)}
              >
                {anchor.label}
              </button>
            ))}
          </nav>
          <div className="ark-top__right">
            <LanguageSwitch />
            <button
              type="button"
              className="ark-top__back"
              onClick={() => leaveToSpace()}
            >
              <span aria-hidden="true">←</span> {copy.backToSpace}
            </button>
          </div>
        </header>

        <div className="ark-scroll" ref={setScroller}>
          <div className="ark-scroll__content" ref={setContent}>
            {children}

            <footer className="ark-footer">
              <HazardRule />
              <div className="ark-footer__row">
                <div className="ark-footer__meta">
                  <span>{copy.brandMain} {copy.brandSub}</span>
                  <span>{copy.footerNote}</span>
                  {(footerMeta ?? []).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
                <Magnet disabled={magnetOff} wrapperClassName="ark-magnet">
                  <button
                    type="button"
                    className="ark-footer__cta"
                    onClick={() => leaveToSpace()}
                  >
                    {copy.backToSpace} <span aria-hidden="true">→</span>
                  </button>
                </Magnet>
              </div>
            </footer>
          </div>
        </div>

        {switchTarget ? (
          <button
            type="button"
            className={`ark-switchstrip${switchTarget.side === "right" ? " ark-switchstrip--right" : ""}`}
            style={{ "--ark-switch-accent": SWITCH_ACCENT_COLORS[switchTarget.accent] } as CSSProperties}
            aria-label={`${copy.switchAriaPrefix} ${switchTarget.label}`}
            onClick={handleSwitch}
            onMouseEnter={() =>
              setDotGridArrow(switchTarget.side, SWITCH_ACCENT_COLORS[switchTarget.accent])
            }
            onMouseLeave={() => setDotGridArrow(null)}
            onFocus={() =>
              setDotGridArrow(switchTarget.side, SWITCH_ACCENT_COLORS[switchTarget.accent])
            }
            onBlur={() => setDotGridArrow(null)}
          >
            <span className="ark-switchstrip__code">{switchTarget.code}</span>
            <span>{switchTarget.label}</span>
          </button>
        ) : null}

        {miniTitle ? (
          <div className="ark-minititle" data-visible={miniTitleVisible || undefined}>
            <span className="ark-minititle__name">{miniTitle}</span>
          </div>
        ) : null}
      </div>
    </ScrollPageContext.Provider>
  );
}
