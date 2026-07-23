import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getDevStories } from "../../content/devStories";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { ScrollPageShell } from "../../scroll/ScrollPageShell";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { scrollBusJumpTo } from "../../scroll/scrollBus";
import { ProfileContent } from "../profile/ProfileContent";
import { DevStoriesContent } from "../devstories/DevStoriesContent";

gsap.registerPlugin(ScrollTrigger);

export type ArchiveHubTab = "profile" | "devstories";

/** 非活动面板：absolute + opacity 0（保持布局与合成状态，切换零重排）。
 *  overflow hidden：裁剪超出内容，避免撑大滚动容器的 scrollHeight。 */
const PANEL_HIDDEN_STYLE = {
  position: "absolute",
  inset: 0,
  opacity: 0,
  pointerEvents: "none",
  visibility: "hidden",
  overflow: "hidden",
} as const;

/** 切换动画中的离场面板：脱离文档流（滚动高度只由进场面板撑开，
 *  避免双面板叠加导致的滚动跳变/卡顿），对齐容器顶部原位滑出。
 *  overflow hidden：同样防止溢出内容撑高滚动区。 */
const PANEL_LEAVING_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  overflow: "hidden",
} as const;

/**
 * 个人档案 ↔ 开发日志的统一容器（本质一个页面，URL 跟随 tab 变化）。
 * react-router 在 /profile 与 /devstories 两条路由上渲染同一个
 * <ArchiveHub>（仅 tab prop 不同），React 按组件类型复用同一实例——
 * 切换时没有重挂载、没有色块遮盖，只有非线性滑动。
 *
 * 两个面板常驻 DOM（各自的状态、Reveal、3D/图片加载都保留），
 * 非活动面板绝对定位 + visibility 隐藏；滚动位置各自记忆恢复。
 */
export default function ArchiveHub({ tab }: { tab: ArchiveHubTab }) {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);

  const profileAnchors = useMemo(() => {
    const profile = getLizzardKevinProfile(language);
    return [
      ...profile.sections.map((section) => ({ id: section.id, label: section.number })),
      { id: "profile-links", label: "LNK" },
    ];
  }, [language]);
  const devStoriesAnchors = useMemo(
    () => getDevStories(language).map((story) => ({ id: story.id, label: story.number })),
    [language],
  );

  const [transition, setTransition] = useState<{
    from: ArchiveHubTab;
    to: ArchiveHubTab;
  } | null>(null);
  const scrollPosRef = useRef<Record<ArchiveHubTab, number>>({
    profile: 0,
    devstories: 0,
  });
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const devStoriesPanelRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef(tab);

  useLayoutEffect(() => {
    if (prevTabRef.current === tab) return undefined;
    const from = prevTabRef.current;
    prevTabRef.current = tab;

    const scroller = document.querySelector<HTMLElement>(".ark-scroll");
    if (scroller) {
      scrollPosRef.current[from] = scroller.scrollTop;
      // 走 Lenis 总线：直接写 scrollTop 会被 Lenis 内部状态覆盖（黑场根因）
      scrollBusJumpTo(scrollPosRef.current[tab] ?? 0);
    }

    const fromEl = from === "profile" ? profilePanelRef.current : devStoriesPanelRef.current;
    const toEl = tab === "profile" ? profilePanelRef.current : devStoriesPanelRef.current;
    if (!fromEl || !toEl) return undefined;

    // 向右切换（profile→devstories）：旧内容左移出，新内容从右入；反之为左入。
    const toRight = tab === "devstories";
    setTransition({ from, to: tab });

    const ctx = gsap.context(() => {
      // 交叉滑动：旧面板滑出的同时新面板从对侧滑入，无全黑间隙。
      gsap.set(toEl, { visibility: "visible", x: toRight ? 72 : -72, autoAlpha: 0 });
      gsap.to(fromEl, {
        x: toRight ? -56 : 56,
        autoAlpha: 0,
        duration: 0.3,
        ease: "power2.inOut",
      });
      gsap.to(
        toEl,
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.38,
          ease: "expo.out",
          delay: 0.05,
          onComplete: () => {
            gsap.set(fromEl, { visibility: "hidden", x: 0, autoAlpha: 1 });
            setTransition(null);
            // 面板落定后刷新 scrub 触发器（布局已稳定）
            requestAnimationFrame(() => ScrollTrigger.refresh());
          },
        },
      );
    });
    return () => ctx.revert();
  }, [tab]);

  const shellConfig = useMemo(() => {
    if (tab === "profile") {
      return {
        accent: "teal" as const,
        pageCode: copy.profile.pageCode,
        anchors: profileAnchors,
        switchTarget: {
          href: "/devstories",
          code: "02",
          label: copy.switchToDevStories,
          side: "right" as const,
          accent: "orange" as const,
        },
      };
    }
    return {
      accent: "orange" as const,
      pageCode: copy.devStories.pageCode,
      anchors: devStoriesAnchors,
      switchTarget: {
        href: "/profile",
        code: "01",
        label: copy.switchToProfile,
        side: "left" as const,
        accent: "teal" as const,
      },
    };
  }, [tab, copy, profileAnchors, devStoriesAnchors]);

  return (
    <ScrollPageShell
      accent={shellConfig.accent}
      pageCode={shellConfig.pageCode}
      anchors={shellConfig.anchors}
      switchTarget={shellConfig.switchTarget}
    >
      <div className="ark-hub">
        <div
          ref={profilePanelRef}
          className="ark-hub__panel"
          style={
            transition?.from === "profile"
              ? PANEL_LEAVING_STYLE
              : tab === "profile"
                ? undefined
                : PANEL_HIDDEN_STYLE
          }
          aria-hidden={tab !== "profile" && !transition}
        >
          <ProfileContent />
        </div>
        <div
          ref={devStoriesPanelRef}
          className="ark-hub__panel"
          style={
            transition?.from === "devstories"
              ? PANEL_LEAVING_STYLE
              : tab === "devstories"
                ? undefined
                : PANEL_HIDDEN_STYLE
          }
          aria-hidden={tab !== "devstories" && !transition}
        >
          <DevStoriesContent />
        </div>
      </div>
    </ScrollPageShell>
  );
}
