import { useMemo } from "react";
import { ArkGlassTile } from "../../components/ArkGlassTile";
import { getDevStories } from "../../content/devStories";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { useScrubSections } from "../../scroll/useScrubSections";
import { useSectionReadProgress } from "../../scroll/useSectionReadProgress";
import { Reveal } from "../../scroll/Reveal";
import { MosaicTitle } from "../../scroll/MosaicTitle";
import { DataStrip, TagRow } from "../../scroll/primitives";

/**
 * 开发日志内容（ArchiveHub 的 devstories 面板）。
 * 数据全部来自 generatedDevStoriesByLanguage（xlsx 内容管线生成）。
 */
export function DevStoriesContent() {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const stories = useMemo(() => getDevStories(language), [language]);

  const firstPeriod = stories[0]?.period ?? "";
  const lastPeriod = stories[stories.length - 1]?.period ?? "";

  useScrubSections(
    [
      { selector: ".ark-dentry__main", drift: 48, minHeightRatio: 0.3 },
      { selector: ".ark-dentry__grid", drift: 40, minHeightRatio: 0.3 },
    ],
    [stories],
  );
  useSectionReadProgress(".ark-dentry", ".ark-dentry__railBar", [stories]);

  return (
    <>
      <section className="ark-hero" id="devstories-hero">
        <p className="ark-hero__eyebrow">{copy.devStories.eyebrow}</p>
        <MosaicTitle text="Dev Stories" className="ark-hero__title" as="h1" />
        <DataStrip
          className="ark-hero__meta"
          items={[
            { label: copy.devStories.entriesLabel, value: String(stories.length) },
            { label: copy.devStories.spanLabel, value: `${firstPeriod} — ${lastPeriod}` },
          ]}
        />
        <span className="ark-hero__scrollHint">{copy.scrollHint}</span>
      </section>

      {stories.map((story) => (
        <section className="ark-dentry" id={story.id} key={story.id}>
          <div className="ark-dentry__head">
            <div className="ark-dentry__index">
              <div className="ark-dentry__indexInner">
                <span className="ark-dentry__number">{story.number}</span>
                <span className="ark-dentry__period">{story.period}</span>
                <span className="ark-dentry__railBar" aria-hidden="true" />
              </div>
            </div>
            <div className="ark-dentry__main">
              <Reveal>
                <h2 className="ark-dentry__title">{story.title}</h2>
              </Reveal>
              <Reveal>
                <p className="ark-dentry__summary">{story.summary}</p>
              </Reveal>
              <div className="ark-dentry__tags">
                <TagRow tags={story.tags} />
              </div>
            </div>
          </div>

          <Reveal>
            <div className="ark-dentry__grid">
              {story.built.length > 0 ? (
                <ArkGlassTile className="ark-dentry__panel" variant="panel">
                  <span className="ark-dentry__panelLabel">
                    {copy.devStories.builtLabel}
                  </span>
                  <ul>
                    {story.built.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </ArkGlassTile>
              ) : null}
              {story.trouble.length > 0 ? (
                <ArkGlassTile
                  className="ark-dentry__panel ark-dentry__panel--trouble"
                  variant="panel"
                >
                  <span className="ark-dentry__panelLabel">
                    {copy.devStories.troubleLabel}
                  </span>
                  <ul>
                    {story.trouble.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </ArkGlassTile>
              ) : null}
              {story.next ? (
                <ArkGlassTile
                  className="ark-dentry__panel ark-dentry__panel--next"
                  variant="panel"
                >
                  <span className="ark-dentry__panelLabel">
                    {copy.devStories.nextLabel}
                  </span>
                  <p>{story.next}</p>
                </ArkGlassTile>
              ) : null}
            </div>
          </Reveal>
        </section>
      ))}
    </>
  );
}
