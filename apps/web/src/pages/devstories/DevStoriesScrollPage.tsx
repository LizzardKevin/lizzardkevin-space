import { useMemo } from "react";
import { getDevStories } from "../../content/devStories";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { ScrollPageShell } from "../../scroll/ScrollPageShell";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { Reveal } from "../../scroll/Reveal";
import { Stat, TagRow } from "../../scroll/primitives";

/**
 * /devstories 开发日志页：垂直时间线流。
 * 每篇日志一个「案例行」大区块（编号 + period → 大标题 → summary →
 * BUILT / TROUBLE / NEXT 三组标签化面板 → tags），数据全部来自
 * generatedDevStoriesByLanguage（xlsx 内容管线生成）。
 */
export default function DevStoriesScrollPage() {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const stories = useMemo(() => getDevStories(language), [language]);

  const anchors = useMemo(
    () => stories.map((story) => ({ id: story.id, label: story.number })),
    [stories],
  );

  const firstPeriod = stories[0]?.period ?? "";
  const lastPeriod = stories[stories.length - 1]?.period ?? "";

  return (
    <ScrollPageShell
      accent="orange"
      pageCode={copy.devStories.pageCode}
      eyebrow={copy.devStories.eyebrow}
      anchors={anchors}
      footerMeta={[`${stories.length} ENTRIES`, `${firstPeriod} — ${lastPeriod}`]}
    >
      <section className="ark-hero" id="devstories-hero">
        <p className="ark-hero__eyebrow">{copy.devStories.eyebrow}</p>
        <h1 className="ark-hero__title">Dev Stories</h1>
        <div className="ark-hero__meta">
          <div className="ark-stat-row">
            <Stat value={stories.length} label={copy.devStories.entriesLabel} />
            <div className="ark-stat">
              <span className="ark-stat__value ark-stat__value--text">
                {firstPeriod}
                <br />— {lastPeriod}
              </span>
              <span className="ark-stat__label">{copy.devStories.spanLabel}</span>
            </div>
          </div>
        </div>
        <span className="ark-hero__scrollHint">{copy.scrollHint}</span>
      </section>

      {stories.map((story) => (
        <section className="ark-dentry" id={story.id} key={story.id}>
          <div className="ark-dentry__head">
            <div className="ark-dentry__index">
              <span className="ark-dentry__number">{story.number}</span>
              <span className="ark-dentry__period">{story.period}</span>
            </div>
            <div>
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
                <div className="ark-dentry__panel">
                  <span className="ark-dentry__panelLabel">
                    {copy.devStories.builtLabel}
                  </span>
                  <ul>
                    {story.built.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {story.trouble.length > 0 ? (
                <div className="ark-dentry__panel ark-dentry__panel--trouble">
                  <span className="ark-dentry__panelLabel">
                    {copy.devStories.troubleLabel}
                  </span>
                  <ul>
                    {story.trouble.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {story.next ? (
                <div className="ark-dentry__panel ark-dentry__panel--next">
                  <span className="ark-dentry__panelLabel">
                    {copy.devStories.nextLabel}
                  </span>
                  <p>{story.next}</p>
                </div>
              ) : null}
            </div>
          </Reveal>
        </section>
      ))}
    </ScrollPageShell>
  );
}
