import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { generatedExhibitLabels } from "../../generated/exhibitLabels.generated";
import { formatExhibitIdFallback, type ExhibitContent } from "../../exhibits/exhibitContent";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { workRoute } from "../../app/routeConfig";
import { NotFound } from "../../app/appRoutes";
import { ScrollPageShell, type ScrollPageAnchor } from "../../scroll/ScrollPageShell";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { useScrollPage } from "../../scroll/scrollPageContext";
import { usePinSections } from "../../scroll/usePinSections";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import { Reveal } from "../../scroll/Reveal";
import { MosaicTitle } from "../../scroll/MosaicTitle";
import { DataStrip, SectionHeader, TagRow } from "../../scroll/primitives";
import { useWorkDetail } from "./useWorkDetail";
import { useDragScroll } from "./useDragScroll";
import { WorkModelViewer } from "./WorkModelViewer";

gsap.registerPlugin(ScrollTrigger);

/**
 * /works/:exhibitId 作品详情页：通用数据驱动、条件分节。
 * 每个分节按数据存在性渲染，缺什么跳什么；未来新增展品走
 * xlsx → content:generate 管线即零代码生效。详见计划 §6.3 渲染矩阵。
 */

type WorkCopy = ReturnType<typeof getScrollPagesCopy>["work"];

/** hero 标题下滚时缩小淡出（与壳层 mini-title 接力吸附左上）。 */
function useHeroTitleShrink(
  titleRef: React.RefObject<HTMLDivElement | null>,
  heroId: string,
  deps: readonly unknown[],
) {
  const { scroller } = useScrollPage();

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!scroller || !el || prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        scale: 0.32,
        autoAlpha: 0,
        transformOrigin: "left bottom",
        ease: "none",
        scrollTrigger: {
          trigger: `#${heroId}`,
          scroller,
          start: "bottom 82%",
          end: "bottom 18%",
          scrub: true,
        },
      });
    }, scroller);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方声明
  }, [scroller, heroId, ...deps]);
}

function resolveWorkTitle(
  exhibitId: string,
  content: Partial<ExhibitContent> | null,
  language: "zh" | "en",
) {
  if (content?.title) return content.title;
  const label = generatedExhibitLabels[exhibitId as keyof typeof generatedExhibitLabels];
  return label?.[language] ?? label?.en ?? formatExhibitIdFallback(exhibitId);
}

function WorkStage({
  exhibitId,
  type,
  focusGlbUrl,
  videoUrl,
  posterUrl,
  copy,
}: {
  exhibitId: string;
  type: string;
  focusGlbUrl: string;
  videoUrl?: string;
  posterUrl?: string;
  copy: WorkCopy;
}) {
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const handleReady = useCallback(() => setModelReady(true), []);
  const handleError = useCallback(() => setModelFailed(true), []);

  const canShowModel = type === "model3d" && Boolean(focusGlbUrl) && !modelFailed;

  return (
    <div className="ark-wstage" id="work-stage">
      {canShowModel ? (
        <>
          {!modelReady ? (
            <div className="ark-wstage__status">{copy.modelLoading}…</div>
          ) : null}
          <WorkModelViewer
            key={exhibitId}
            exhibitId={exhibitId}
            url={focusGlbUrl}
            onReady={handleReady}
            onError={handleError}
          />
        </>
      ) : videoUrl ? (
        <video
          className="ark-wstage__media"
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
        />
      ) : posterUrl ? (
        <img className="ark-wstage__media" src={posterUrl} alt="" />
      ) : null}
      {modelFailed && posterUrl ? (
        <img className="ark-wstage__media" src={posterUrl} alt="" />
      ) : null}
      <span className="ark-wstage__badge">
        {copy.typeLabels[type] ?? type.toUpperCase()}
        {modelFailed ? ` · ${copy.modelFailed}` : ""}
      </span>
    </div>
  );
}

export default function WorkDetailPage() {
  const { exhibitId } = useParams<{ exhibitId: string }>();
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const state = useWorkDetail(exhibitId, language);
  const galleryRef = useDragScroll<HTMLDivElement>();
  const heroTitleRef = useRef<HTMLDivElement | null>(null);

  const anchors: ScrollPageAnchor[] = useMemo(() => {
    if (state.status !== "ready") return [];
    const list: ScrollPageAnchor[] = [{ id: "work-stage", label: "STG" }];
    if (state.content?.overview) list.push({ id: "work-overview", label: "OVW" });
    const images = state.exhibit.media?.imageUrls ?? [];
    if (images.length >= 2) list.push({ id: "work-gallery", label: "IMG" });
    if (state.content?.storyHtml) list.push({ id: "work-story", label: "STY" });
    return list;
  }, [state]);

  const ready = state.status === "ready";
  usePinSections(
    [
      { selector: ".ark-wstage", end: "+=50%", minHeightRatio: 0.5 },
      { selector: ".ark-wgallery", end: "+=35%", minHeightRatio: 0.5 },
    ],
    [ready, state],
  );
  useHeroTitleShrink(heroTitleRef, "work-hero", [ready, state]);

  if (!exhibitId || state.status === "not-found") return <NotFound />;

  if (state.status === "loading") {
    return (
      <ScrollPageShell
        accent="yellow"
        pageCode={copy.work.pageCode}
        eyebrow={copy.work.eyebrow}
        anchors={[]}
      >
        <section className="ark-hero">
          <p className="ark-hero__eyebrow">{copy.work.eyebrow}</p>
          <h1 className="ark-hero__title">
            {generatedExhibitLabels[
              exhibitId as keyof typeof generatedExhibitLabels
            ]?.[language] ?? formatExhibitIdFallback(exhibitId)}
          </h1>
        </section>
      </ScrollPageShell>
    );
  }

  const { exhibit, content, works, index } = state;
  const images = exhibit.media?.imageUrls ?? [];
  const videoUrl = exhibit.media?.videoUrl;
  const hasModel = exhibit.type === "model3d" && Boolean(exhibit.focusGlbUrl);
  // 舞台已占用首图（无模型时）→ 画廊展示余下图片；有模型则画廊展示全部。
  const stageUsesPoster = !hasModel && !videoUrl && images.length > 0;
  const galleryImages = stageUsesPoster ? images.slice(1) : images;

  const title = resolveWorkTitle(exhibitId, content, language);
  const subtitle = content?.subtitle;
  const metadata = content?.metadata ?? [];
  const tags = content?.tags ?? [];

  const prevWork = works.length > 1 ? works[(index - 1 + works.length) % works.length] : null;
  const nextWork = works.length > 1 ? works[(index + 1) % works.length] : null;
  const navTitle = (id: string) => resolveWorkTitle(id, null, language);

  return (
    <ScrollPageShell
      accent="yellow"
      pageCode={copy.work.pageCode}
      eyebrow={copy.work.eyebrow}
      anchors={anchors}
      footerMeta={[exhibitId, `${index + 1} / ${works.length}`]}
      miniTitle={title}
      miniTitleAfterId="work-hero"
    >
      <section className="ark-hero" id="work-hero">
        <p className="ark-hero__eyebrow">
          {copy.work.eyebrow} / {exhibitId.replace(/_/g, " ").toUpperCase()}
        </p>
        <div ref={heroTitleRef}>
          <MosaicTitle text={title} className="ark-hero__title" as="h1" />
        </div>
        {subtitle ? <p className="ark-hero__subtitle">{subtitle}</p> : null}
        <DataStrip
          className="ark-hero__meta"
          items={[
            { label: "EXHIBIT", value: exhibitId },
            {
              label: "TYPE",
              value: copy.work.typeLabels[exhibit.type] ?? exhibit.type.toUpperCase(),
            },
            { label: "INDEX", value: `${index + 1} / ${works.length}` },
          ]}
        />
        <span className="ark-hero__scrollHint">{copy.scrollHint}</span>
      </section>

      {hasModel || videoUrl || images.length > 0 ? (
        <WorkStage
          exhibitId={exhibitId}
          type={exhibit.type}
          focusGlbUrl={exhibit.focusGlbUrl}
          videoUrl={videoUrl}
          posterUrl={images[0]}
          copy={copy.work}
        />
      ) : null}

      {content?.overview ? (
        <section className="ark-section" id="work-overview">
          <Reveal>
            <SectionHeader number="01" title={copy.work.overviewLabel} />
          </Reveal>
          <Reveal>
            <p className="ark-psection__summary" style={{ marginTop: "3vh" }}>
              {content.overview}
            </p>
          </Reveal>
          {tags.length > 0 ? (
            <div style={{ marginTop: "3vh" }}>
              <TagRow tags={tags} />
            </div>
          ) : null}
        </section>
      ) : null}

      {galleryImages.length >= 2 ? (
        <section className="ark-wgallery" id="work-gallery">
          <div className="ark-wgallery__head">
            <SectionHeader number="02" title={copy.work.galleryLabel} />
            <span className="ark-wgallery__hint">{copy.work.dragHint} ↔</span>
          </div>
          <div className="ark-wgallery__track" ref={galleryRef}>
            {galleryImages.map((url, i) => (
              <figure className="ark-wgallery__item" key={url}>
                <img src={url} alt={`${title} — ${i + 1}`} loading="lazy" draggable={false} />
              </figure>
            ))}
          </div>
        </section>
      ) : galleryImages.length === 1 ? (
        <section className="ark-wgallery" id="work-gallery">
          <div className="ark-wgallery__single">
            <img src={galleryImages[0]} alt={title} loading="lazy" draggable={false} />
          </div>
        </section>
      ) : null}

      {content?.storyHtml ? (
        <section className="ark-section" id="work-story">
          <Reveal>
            <SectionHeader number="03" title={copy.work.storyLabel} />
          </Reveal>
          <Reveal>
            <div
              className="ark-wstory"
              style={{ marginTop: "3vh" }}
              dangerouslySetInnerHTML={{ __html: content.storyHtml }}
            />
          </Reveal>
        </section>
      ) : null}

      {metadata.length > 0 ? (
        <section className="ark-section" id="work-spec">
          <Reveal>
            <SectionHeader number="04" title={copy.work.specLabel} />
          </Reveal>
          <div className="ark-wspec" style={{ marginTop: "3vh" }}>
            <DataStrip
              items={metadata.map((item) => ({ label: item.label, value: item.value }))}
            />
            {tags.length > 0 ? <TagRow tags={tags} /> : <span />}
          </div>
        </section>
      ) : null}

      {prevWork || nextWork ? (
        <nav className="ark-wnav" aria-label="EXHIBITS">
          {prevWork ? (
            <Link className="ark-wnav__link" to={workRoute(prevWork.exhibitId)}>
              <span className="ark-wnav__dir">← {copy.work.prevWork}</span>
              <span className="ark-wnav__title">{navTitle(prevWork.exhibitId)}</span>
            </Link>
          ) : (
            <span />
          )}
          {nextWork ? (
            <Link className="ark-wnav__link ark-wnav__link--next" to={workRoute(nextWork.exhibitId)}>
              <span className="ark-wnav__dir">{copy.work.nextWork} →</span>
              <span className="ark-wnav__title">{navTitle(nextWork.exhibitId)}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </ScrollPageShell>
  );
}
