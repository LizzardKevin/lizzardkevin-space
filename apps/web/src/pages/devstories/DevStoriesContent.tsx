import { useMemo } from "react";
import { ArkGlassTile } from "../../components/ArkGlassTile";
import { getDevStories } from "../../content/devStories";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { useSectionReadProgress } from "../../scroll/useSectionReadProgress";
import { AsciiText } from "../../scroll/AsciiText";
import { MosaicTitle } from "../../scroll/MosaicTitle";
import { DataStrip, TagRow } from "../../scroll/primitives";

/**
 * 开发日志内容（ArchiveHub 的 devstories 面板）。
 * 数据全部来自 generatedDevStoriesByLanguage（xlsx 内容管线生成）。
 */
export function DevStoriesContent({ titleEpoch = "initial" }: { titleEpoch?: string }) {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const stories = useMemo(() => getDevStories(language), [language]);

  const firstPeriod = stories[0]?.period ?? "";
  const lastPeriod = stories[stories.length - 1]?.period ?? "";

  useSectionReadProgress(".ark-dentry", ".ark-dentry__railBar", [stories]);

  return (
    <>
      <section className="ark-hero" id="devstories-hero">
        <p className="ark-hero__eyebrow"><AsciiText text={copy.devStories.eyebrow} /></p>
        <MosaicTitle key={titleEpoch} accent="#e8d44d" text="Dev Stories" className="ark-hero__title" as="h1" />
        <p className="ark-hero__subtitle"><AsciiText text={language === "zh" ? "这些手记记录了 SPACE 的早期开发与架构取舍，内容截至 2026 年 7 月 15 日。" : "Notes on the early development and architecture of SPACE, recorded through July 15, 2026."} /></p>
        <DataStrip
          className="ark-hero__meta"
          items={[
            { label: copy.devStories.entriesLabel, value: String(stories.length) },
            { label: copy.devStories.spanLabel, value: `${firstPeriod} — ${lastPeriod}` },
          ]}
        />
        <span className="ark-hero__scrollHint"><AsciiText text={copy.scrollHint} /></span>
      </section>

      {stories.map((story) => (
        <section className="ark-dentry" id={story.id} key={story.id}>
          <div className="ark-dentry__index">
            <div className="ark-dentry__indexInner">
              <span className="ark-dentry__number"><AsciiText text={story.number} /></span>
              <span className="ark-dentry__period"><AsciiText text={story.period} /></span>
              <span className="ark-dentry__railBar" aria-hidden="true" />
            </div>
          </div>

          <div className="ark-dentry__body">
            <div className="ark-dentry__main">
              <>
                <h2 className="ark-dentry__title"><AsciiText text={story.title} /></h2>
              </>
              <>
                <p className="ark-dentry__summary"><AsciiText text={story.summary} /></p>
              </>
              <div className="ark-dentry__tags">
                <TagRow tags={story.tags} />
              </div>
            </div>

            <>
              <div className="ark-dentry__grid">
                {story.built.length > 0 ? (
                  <ArkGlassTile className="ark-dentry__panel" variant="panel">
                    <span className="ark-dentry__panelLabel">
                      <AsciiText text={copy.devStories.builtLabel} />
                    </span>
                    <ul>
                      {story.built.map((line) => (
                        <li key={line}><AsciiText text={line} /></li>
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
                      <AsciiText text={copy.devStories.troubleLabel} />
                    </span>
                    <ul>
                      {story.trouble.map((line) => (
                        <li key={line}><AsciiText text={line} /></li>
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
                      <AsciiText text={copy.devStories.nextLabel} />
                    </span>
                    <p><AsciiText text={story.next} /></p>
                  </ArkGlassTile>
                ) : null}
              </div>
            </>
          </div>
        </section>
      ))}
    </>
  );
}
