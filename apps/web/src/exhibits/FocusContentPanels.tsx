import type { ReactNode } from "react";
import { SHOW_FOCUS_BLANK_DEBUG } from "./focusConfig";
import { FocusRichText } from "./FocusRichText";

function FocusSideBlank({
  placement,
  onBlankClick,
}: {
  placement: "top" | "bottom";
  onBlankClick: () => void;
}) {
  return (
    <div
      className={`focus-blank focus-blank--side-${placement}${SHOW_FOCUS_BLANK_DEBUG ? " focus-blank--debug-side" : ""}`}
      data-focus-blank="true"
      onClick={onBlankClick}
      aria-hidden
    />
  );
}

export function FocusSideColumn({
  side,
  onBlankClick,
  children,
}: {
  side: "left" | "right";
  onBlankClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`focus-layout__side focus-layout__side--${side}`}>
      <FocusSideBlank placement="top" onBlankClick={onBlankClick} />
      <div className="focus-side-panel-slot">{children}</div>
      <FocusSideBlank placement="bottom" onBlankClick={onBlankClick} />
    </div>
  );
}

export function FocusOverviewPanel({
  overview,
  loading,
  tags,
  visible,
}: {
  overview: string | null;
  loading: boolean;
  tags: string[];
  visible: boolean;
}) {
  return (
    <aside
      className={`focus-panel focus-panel--left${visible ? " focus-panel--visible" : ""}`}
      aria-label="展品概述"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="focus-panel__inner">
        <h2 className="focus-panel__heading">Overview</h2>
        {loading ? (
          <p className="focus-panel__placeholder">加载中…</p>
        ) : overview ? (
          <div className="focus-overview">{overview}</div>
        ) : (
          <p className="focus-panel__placeholder">暂无概述</p>
        )}
        <div className="focus-tags" aria-label="Tags">
          <h3>Tags</h3>
          <div>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function FocusStoryPanel({
  storyHtml,
  loading,
  visible,
}: {
  storyHtml: string | null;
  loading: boolean;
  visible: boolean;
}) {
  return (
    <aside
      className={`focus-panel focus-panel--right${visible ? " focus-panel--visible" : ""}`}
      aria-label="展品故事"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="focus-panel__inner">
        <h2 className="focus-panel__heading">Stories</h2>
        {loading ? (
          <p className="focus-panel__placeholder">加载中…</p>
        ) : storyHtml ? (
          <FocusRichText html={storyHtml} />
        ) : (
          <p className="focus-panel__placeholder">暂无故事</p>
        )}
      </div>
    </aside>
  );
}
