import type { ReactNode } from "react";
import type { ExhibitContentMetadataItem } from "./exhibitContent";
import { SHOW_FOCUS_BLANK_DEBUG, SHOW_FOCUS_TEXT_PANEL_DEBUG } from "./focusConfig";
import { FocusRichText } from "./FocusRichText";

export type FocusPanelCopy = {
  overviewAria: string;
  overviewHeading: string;
  loading: string;
  emptyOverview: string;
  tagsAria: string;
  tagsHeading: string;
  detailsAria: string;
  detailsHeading: string;
  storyAria: string;
  storyHeading: string;
};

function FocusSideBlank({
  placement,
}: {
  placement: "top" | "bottom";
}) {
  return (
    <div
      className={`focus-blank focus-blank--side-${placement}${SHOW_FOCUS_BLANK_DEBUG ? " focus-blank--debug-side" : ""}`}
      data-focus-blank="true"
      aria-hidden
    />
  );
}

export function FocusSideColumn({
  side,
  children,
}: {
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div className={`focus-layout__side focus-layout__side--${side}`}>
      <FocusSideBlank placement="top" />
      <div className="focus-side-panel-slot">{children}</div>
      <FocusSideBlank placement="bottom" />
    </div>
  );
}

export function FocusOverviewPanel({
  copy,
  overview,
  loading,
  tags,
  metadata = [],
  visible,
}: {
  copy: FocusPanelCopy;
  overview: string | null;
  loading: boolean;
  tags: string[];
  metadata?: ExhibitContentMetadataItem[];
  visible: boolean;
}) {
  const hasMetadata = (metadata?.length ?? 0) > 0;

  return (
    <aside
      className={`focus-panel focus-panel--left${visible ? " focus-panel--visible" : ""}${SHOW_FOCUS_TEXT_PANEL_DEBUG ? " focus-panel--debug" : ""}`}
      data-panel-debug-label="TEXT PANEL / OVERVIEW"
      aria-label={copy.overviewAria}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="focus-panel__inner">
        <h2 className="focus-panel__heading">{copy.overviewHeading}</h2>
        {loading ? (
          <p className="focus-panel__placeholder">{copy.loading}</p>
        ) : overview ? (
          <div className="focus-overview">{overview}</div>
        ) : (
          <p className="focus-panel__placeholder">{copy.emptyOverview}</p>
        )}
        {tags.length > 0 ? (
          <div className="focus-tags" aria-label={copy.tagsAria}>
            <h3>{copy.tagsHeading}</h3>
            <div>
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        ) : null}
        {hasMetadata ? (
          <div className="focus-details" aria-label={copy.detailsAria}>
            <h3>{copy.detailsHeading}</h3>
            <dl>
              {metadata.map((item) => (
                <div key={`${item.label}:${item.value}`}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function FocusStoryPanel({
  copy,
  storyHtml,
  loading,
  visible,
}: {
  copy: FocusPanelCopy;
  storyHtml: string | null;
  loading: boolean;
  visible: boolean;
}) {
  const hasStoryHtml = Boolean(storyHtml?.trim());
  const storyMarkup = hasStoryHtml ? storyHtml : null;

  if (!loading && !hasStoryHtml) return null;

  return (
    <aside
      className={`focus-panel focus-panel--right${visible ? " focus-panel--visible" : ""}${SHOW_FOCUS_TEXT_PANEL_DEBUG ? " focus-panel--debug" : ""}`}
      data-panel-debug-label="TEXT PANEL / STORY"
      aria-label={copy.storyAria}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="focus-panel__inner">
        <h2 className="focus-panel__heading">{copy.storyHeading}</h2>
        {loading ? (
          <p className="focus-panel__placeholder">{copy.loading}</p>
        ) : storyMarkup ? (
          <FocusRichText html={storyMarkup} />
        ) : null}
      </div>
    </aside>
  );
}
