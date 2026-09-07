import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollTrigger } from "../../scroll/scrollGsap";
import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getDevStories } from "../../content/devStories";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { ScrollPageShell, type SpaceReturnHandler } from "../../scroll/ScrollPageShell";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { scrollBusJumpTo } from "../../scroll/scrollBus";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import { AsciiContext } from "../../scroll/asciiContext";
import { archiveTransition, ASCII_EXIT_SECONDS } from "../../scroll/asciiTransition";
import { ProfileContent } from "../profile/ProfileContent";
import { DevStoriesContent } from "../devstories/DevStoriesContent";

export type ArchiveHubTab = "profile" | "devstories";
const HIDDEN = { position: "absolute", inset: 0, visibility: "hidden", overflow: "hidden", pointerEvents: "none" } as const;

/** Persistent panels, but only one occupies layout or the accessibility tree.
 * Route changes (including POP) encrypt the visible body before replacing it.
 */
export default function ArchiveHub({ tab, onNavigateToSpace }: {
  tab: ArchiveHubTab; onNavigateToSpace: SpaceReturnHandler;
}) {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const [view, setView] = useState({ visible: tab, phase: "enter" as "enter" | "exit", epoch: 0 });
  const visibleRef = useRef(tab);
  const scrollPos = useRef<Record<ArchiveHubTab, number>>({ profile: 0, devstories: 0 });

  useLayoutEffect(() => {
    const from = visibleRef.current;
    if (from === tab) {
      setView(current => ({ ...current, phase: "enter", epoch: current.epoch + 1 }));
      return;
    }
    const scroller = document.querySelector<HTMLElement>(".ark-scroll");
    scrollPos.current[from] = scroller?.scrollTop ?? 0;
    const finish = () => {
      visibleRef.current = tab;
      setView(current => ({ ...archiveTransition(from, tab, ASCII_EXIT_SECONDS), epoch: current.epoch + 1 }));
    };
    if (prefersReducedMotion()) { finish(); return; }
    setView(current => ({ ...archiveTransition(from, tab, 0), epoch: current.epoch }));
    const timer = window.setTimeout(finish, ASCII_EXIT_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [tab]);

  useLayoutEffect(() => {
    scrollBusJumpTo(scrollPos.current[view.visible]);
    ScrollTrigger.refresh();
  }, [view.visible]);

  const anchors = useMemo(() => view.visible === "profile"
    ? [...getLizzardKevinProfile(language).sections.map(section => ({ id: section.id, label: section.number })), { id: "profile-links", label: "LNK" }]
    : getDevStories(language).map(story => ({ id: story.id, label: story.number })), [view.visible, language]);
  const isProfile = view.visible === "profile";
  // Navigation follows the requested route, so a quick reversal cancels the pending exit.
  const switchTarget = tab === "profile"
    ? { href: "/devstories", label: copy.switchToDevStories, side: "right" as const }
    : { href: "/profile", label: copy.switchToProfile, side: "left" as const };

  return <ScrollPageShell accent={isProfile ? "teal" : "orange"}
    pageCode={isProfile ? copy.profile.pageCode : copy.devStories.pageCode}
    anchors={anchors} switchTarget={switchTarget} onNavigateToSpace={onNavigateToSpace}>
    <div className="ark-hub" data-archive-phase={view.phase} data-archive-visible={view.visible}>
      {(["profile", "devstories"] as const).map(panel => {
        const active = view.visible === panel;
        const epoch = `${view.epoch}|${language}`;
        return <div key={panel} className="ark-hub__panel" style={active ? undefined : HIDDEN}
          inert={!active || view.phase === "exit"} aria-hidden={!active}>
          <AsciiContext.Provider value={{ phase: active ? view.phase : "hidden", epoch }}>
            {panel === "profile" ? <ProfileContent titleEpoch={active ? epoch : "hidden"} /> : <DevStoriesContent titleEpoch={active ? epoch : "hidden"} />}
          </AsciiContext.Provider>
        </div>;
      })}
    </div>
  </ScrollPageShell>;
}
