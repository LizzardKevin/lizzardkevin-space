import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArkGlassTile } from "../../components/ArkGlassTile";
import { generatedExhibitLabels } from "../../generated/exhibitLabels.generated";
import { formatExhibitIdFallback, type ExhibitContent } from "../../exhibits/exhibitContent";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { workRoute } from "../../app/routeConfig";
import { NotFound } from "../../app/appRoutes";
import {
  ScrollPageShell,
  type ScrollPageAnchor,
  type SpaceReturnHandler,
} from "../../scroll/ScrollPageShell";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { useScrubSections } from "../../scroll/useScrubSections";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import { useGalleryEntrance } from "../../scroll/useGalleryEntrance";
import { Reveal } from "../../scroll/Reveal";
import { MosaicTitle } from "../../scroll/MosaicTitle";
import { ImageLightbox } from "../../scroll/ImageLightbox";
import { DataStrip, SectionHeader, TagRow } from "../../scroll/primitives";
import { gsap } from "../../scroll/scrollGsap";
import "../../styles/scroll-lightbox.css";
import { useWorkDetail } from "./useWorkDetail";
import { useDragScroll } from "./useDragScroll";
import { WorkParticleHost } from "./WorkParticleHost";

/**
 * /works/:exhibitId 作品详情页：通用数据驱动、条件分节。
 * 每个分节按数据存在性渲染，缺什么跳什么；未来新增展品走
 * xlsx → content:generate 管线即零代码生效。详见计划 §6.3 渲染矩阵。
 */

/** hero 标题下滚时缩小淡出（与壳层 mini-title 接力吸附左上）。 */
function useHeroTitleShrink(
  titleRef: React.RefObject<HTMLDivElement | null>,
  heroId: string,
  deps: readonly unknown[],
) {
  useLayoutEffect(() => {
    const el = titleRef.current;
    const scroller = document.querySelector<HTMLElement>(".ark-scroll");
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
  }, [heroId, ...deps]);
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

/** 有视频分节时编号整体后移一位（01 overview → 02 video → …）。 */
function sectionNo(hasVideo: boolean, base: number): string {
  return String(hasVideo ? base + 1 : base).padStart(2, "0");
}

export default function WorkDetailPage({
  onNavigateToSpace,
}: {
  onNavigateToSpace: SpaceReturnHandler;
}) {
  const { exhibitId } = useParams<{ exhibitId: string }>();
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const state = useWorkDetail(exhibitId, language);
  const galleryRef = useDragScroll<HTMLDivElement>();
  const heroTitleRef = useRef<HTMLDivElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  // 粒子宿主失败按展品 id 记录：切到下一个展品（同路由换参数）时自动重置重试。
  const [particleFailedId, setParticleFailedId] = useState<string | null>(null);
  const handleParticleError = useCallback(
    (message: string) => {
      if (import.meta.env.DEV) console.warn("[WorkDetailPage] particle host failed:", message);
      setParticleFailedId(exhibitId ?? null);
    },
    [exhibitId],
  );

  const anchors: ScrollPageAnchor[] = useMemo(() => {
    if (state.status !== "ready") return [];
    const list: ScrollPageAnchor[] = [];
    if (state.content?.overview) list.push({ id: "work-overview", label: "OVW" });
    if (state.exhibit.media?.videoUrl) list.push({ id: "work-video", label: "VID" });
    if ((state.exhibit.media?.imageUrls ?? []).length >= 1) {
      list.push({ id: "work-gallery", label: "IMG" });
    }
    if (state.content?.storyHtml) list.push({ id: "work-story", label: "STY" });
    return list;
  }, [state]);

  const ready = state.status === "ready";
  const galleryImageCount =
    state.status === "ready" ? (state.exhibit.media?.imageUrls ?? []).length : 0;
  useScrubSections(
    [
      { selector: ".ark-wgallery", drift: 48, minHeightRatio: 0.4 },
      { selector: ".ark-section", drift: 40, minHeightRatio: 0.3 },
    ],
    [ready, exhibitId],
  );
  useHeroTitleShrink(heroTitleRef, "work-hero", [ready, exhibitId]);
  useGalleryEntrance(galleryRef, galleryImageCount >= 2, [ready, exhibitId]);

  // dev-only 测试钩子:?wpGoto=<sectionId> 直接跳到目标分节(无头截图/调试用)。
  useEffect(() => {
    if (!import.meta.env.DEV || !ready) return;
    const target = new URLSearchParams(window.location.search).get("wpGoto");
    if (!target) return;
    const timer = window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "instant", block: "start" });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [ready, exhibitId]);

  if (!exhibitId || state.status === "not-found") return <NotFound />;

  if (state.status === "loading") {
    return (
      <ScrollPageShell
        accent="yellow"
        pageCode={copy.work.pageCode}
        anchors={[]}
        background="none"
        blankDoubleClickToSpace
        onNavigateToSpace={onNavigateToSpace}
      >
        <section className="ark-hero">
          <p className="ark-hero__eyebrow">{copy.work.eyebrow}</p>
          <h1 className="ark-hero__title">
            {resolveWorkTitle(exhibitId, null, language)}
          </h1>
        </section>
      </ScrollPageShell>
    );
  }

  const { exhibit, content, works, index } = state;
  const images = exhibit.media?.imageUrls ?? [];
  const videoUrl = exhibit.media?.videoUrl;
  // model3d 展品的展台由全页粒子点云承担；粒子失败时回退 video/poster 静态块。
  const particleFailed = particleFailedId === exhibitId;
  const showParticles = exhibit.type === "model3d" && !particleFailed;

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
      anchors={anchors}
      background="none"
      footerMeta={[exhibitId, `${index + 1} / ${works.length}`]}
      miniTitle={title}
      miniTitleAfterId="work-hero"
      blankDoubleClickToSpace
      onNavigateToSpace={onNavigateToSpace}
    >
      {showParticles ? (
        <WorkParticleHost key={exhibitId} exhibitId={exhibitId} onError={handleParticleError} />
      ) : null}
      {/* 粒子背景下的去框体样式作用域(display:contents 不改变布局) */}
      <div className="ark-work-page" style={{ display: "contents" }}>
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

      {particleFailed && (videoUrl || images.length > 0) ? (
        <section className="ark-section">
          <p className="ark-wgallery__hint" style={{ marginBottom: "2vh" }}>
            {copy.work.modelFailed}
          </p>
          <div className="ark-wvideo">
            {videoUrl ? (
              <video
                className="ark-wvideo__player"
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img className="ark-wvideo__player" src={images[0]} alt={title} />
            )}
          </div>
        </section>
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

      {videoUrl ? (
        <section className="ark-section" id="work-video">
          <Reveal>
            <SectionHeader number="02" title={copy.work.videoLabel} />
          </Reveal>
          <Reveal>
            <div className="ark-wvideo" style={{ marginTop: "3vh" }}>
              <video
                className="ark-wvideo__player"
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
              />
            </div>
          </Reveal>
        </section>
      ) : null}

      {images.length >= 2 ? (
        <div className="ark-wgallery-zone">
          <section className="ark-wgallery" id="work-gallery">
            <div className="ark-wgallery__head">
              <SectionHeader number={sectionNo(Boolean(videoUrl), 2)} title={copy.work.galleryLabel} />
              <span className="ark-wgallery__hint">{copy.work.dragHint} ↔</span>
            </div>
            <div className="ark-wgallery__track" ref={galleryRef}>
              {images.map((url, i) => (
                <figure className="ark-wgallery__item" key={url}>
                  <img
                    src={url}
                    alt={`${title} — ${i + 1}`}
                    loading="lazy"
                    draggable={false}
                    onClick={() =>
                      setSelectedImage({ src: url, alt: `${title} — ${i + 1}` })
                    }
                    style={{ cursor: "zoom-in" }}
                  />
                </figure>
              ))}
            </div>
          </section>
        </div>
      ) : images.length === 1 ? (
        <section className="ark-wgallery" id="work-gallery">
          <div className="ark-wgallery__single">
            <img
              src={images[0]}
              alt={title}
              loading="lazy"
              draggable={false}
              onClick={() => setSelectedImage({ src: images[0], alt: title })}
              style={{ cursor: "zoom-in" }}
            />
          </div>
        </section>
      ) : null}

      {selectedImage ? (
        <ImageLightbox
          src={selectedImage.src}
          alt={selectedImage.alt}
          onClose={() => setSelectedImage(null)}
        />
      ) : null}

      {content?.storyHtml ? (
        <section className="ark-section" id="work-story">
          <Reveal>
            <SectionHeader number={sectionNo(Boolean(videoUrl), 3)} title={copy.work.storyLabel} />
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
            <SectionHeader number={sectionNo(Boolean(videoUrl), 4)} title={copy.work.specLabel} />
          </Reveal>
          <div className="ark-wspec" style={{ marginTop: "3vh" }}>
            <DataStrip
              items={metadata.map((item) => ({ label: item.label, value: item.value }))}
            />
            {tags.length > 0 ? <TagRow tags={tags} /> : <span />}
          </div>
        </section>
      ) : null}

      {prevWork && nextWork ? (
        <nav className="ark-wnav" aria-label="EXHIBITS">
          <Link className="ark-wnav__link" to={workRoute(prevWork.exhibitId)}>
            <ArkGlassTile className="ark-wnav__glass" variant="nav">
              <span className="ark-wnav__dir">← {copy.work.prevWork}</span>
              <span className="ark-wnav__title">{navTitle(prevWork.exhibitId)}</span>
            </ArkGlassTile>
          </Link>
          <Link className="ark-wnav__link ark-wnav__link--next" to={workRoute(nextWork.exhibitId)}>
            <ArkGlassTile className="ark-wnav__glass" variant="nav">
              <span className="ark-wnav__dir">{copy.work.nextWork} →</span>
              <span className="ark-wnav__title">{navTitle(nextWork.exhibitId)}</span>
            </ArkGlassTile>
          </Link>
        </nav>
      ) : null}
      </div>
    </ScrollPageShell>
  );
}
