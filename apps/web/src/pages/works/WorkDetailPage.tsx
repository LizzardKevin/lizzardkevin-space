import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { generatedExhibitLabels } from "../../generated/exhibitLabels.generated";
import { formatExhibitIdFallback, type ExhibitContent } from "../../exhibits/exhibitContent";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
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
import { DataStrip, SectionHeader } from "../../scroll/primitives";
import { gsap } from "../../scroll/scrollGsap";
import "../../styles/scroll-lightbox.css";
import { useWorkDetail } from "./useWorkDetail";
import { useDragScroll } from "./useDragScroll";
import { useGalleryAutoFlow } from "./useGalleryAutoFlow";
import { WorkParticleHost } from "./WorkParticleHost";
import { WorkEdgeNav } from "./WorkEdgeNav";

/**
 * /works/:exhibitId 作品详情页:两段式结构——
 * a 段 hero(标题/简介/粒子模型展台),b 段 #work-media(视频 + 图集等多媒体材料)。
 * 无多媒体数据时 b 段隐藏,解构 morph 锚点在宿主内退化为页尾。
 * 项目简介与年份/角色来自 content.json；媒体保留独立阅读段。
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

/** 媒体段内编号:有视频时图集后移一位(01 video → 02 gallery,无视频时图集 01)。 */
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
  // 图集:拖拽 + 自动流(marquee)。环绕周期由自动流测量后经 ref 回流给拖拽 hook。
  const galleryWrapPeriodRef = useRef(0);
  const { ref: galleryRef, interaction: galleryInteraction } = useDragScroll<HTMLDivElement>({
    getWrapPeriod: () => galleryWrapPeriodRef.current,
  });
  const heroTitleRef = useRef<HTMLDivElement | null>(null);
  const [imageSelection, setSelectedImage] = useState<{ exhibitId: string; src: string; alt: string } | null>(null);
  const selectedImage = imageSelection?.exhibitId === exhibitId ? imageSelection : null;
  const [playingExhibitId, setPlayingExhibitId] = useState<string | null>(null);
  const galleryPlaying = playingExhibitId === exhibitId;
  const [galleryExhibitId, setGalleryExhibitId] = useState(exhibitId);
  if (galleryExhibitId !== exhibitId) {
    setGalleryExhibitId(exhibitId);
    setSelectedImage(null);
    setPlayingExhibitId(null);
  }
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
    const hasMedia =
      Boolean(state.exhibit.media?.videoUrl) ||
      (state.exhibit.media?.imageUrls ?? []).length > 0;
    return hasMedia ? [{ id: "work-media", label: "MED" }] : [];
  }, [state]);

  const ready = state.status === "ready";
  const galleryImageCount =
    state.status === "ready" ? (state.exhibit.media?.imageUrls ?? []).length : 0;
  // 自动流:hover/拖拽/惯性/页面隐藏/lightbox 打开时暂停,惯性结束恢复;
  // reduced-motion 与 ?wpGalleryFlow=0 下关闭(单份渲染、静态可拖)。
  const galleryCopies = useGalleryAutoFlow({
    trackRef: galleryRef,
    itemCount: galleryImageCount,
    interaction: galleryInteraction,
    paused: selectedImage !== null,
    enabled: galleryPlaying,
    wrapPeriodRef: galleryWrapPeriodRef,
  });
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
        scrollReady={false}
        rememberScroll
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
  const hasMedia = Boolean(videoUrl) || images.length > 0;
  // model3d 展品的展台由全页粒子点云承担；粒子失败时回退 video/poster 静态块。
  const particleFailed = particleFailedId === exhibitId;
  const showParticles = exhibit.type === "model3d" && !particleFailed;

  const title = resolveWorkTitle(exhibitId, content, language);
  const subtitle = content?.subtitle;

  // 上一件/下一件由 WorkEdgeNav(固定左右边缘、decrypt 揭示)承担。
  const prevWork = works.length > 1 ? works[(index - 1 + works.length) % works.length] : null;
  const nextWork = works.length > 1 ? works[(index + 1) % works.length] : null;

  return (
    <ScrollPageShell
      accent="yellow"
      pageCode={copy.work.pageCode}
      anchors={anchors}
      rememberScroll
      background="none"
      footerMeta={[title, `${index + 1} / ${works.length}`]}
      miniTitle={title}
      miniTitleAfterId="work-hero"
      blankDoubleClickToSpace
      onNavigateToSpace={onNavigateToSpace}
    >
      {showParticles ? (
        <WorkParticleHost key={`particles-${exhibitId}`} exhibitId={exhibitId} onError={handleParticleError} />
      ) : null}
      {prevWork && nextWork ? (
        <WorkEdgeNav
          key={`edge-${exhibitId}`}
          prev={{ id: prevWork.exhibitId, title: resolveWorkTitle(prevWork.exhibitId, null, language), hint: copy.work.prevWork }}
          next={{ id: nextWork.exhibitId, title: resolveWorkTitle(nextWork.exhibitId, null, language), hint: copy.work.nextWork }}
        />
      ) : null}
      {/* 粒子背景下的去框体样式作用域(display:contents 不改变布局) */}
      <div
        className="ark-work-page"
        style={{ display: "contents" }}
      >
      <section className="ark-hero" id="work-hero">
        <p className="ark-hero__eyebrow">
          {copy.work.eyebrow}
        </p>
        <div ref={heroTitleRef}>
          <MosaicTitle text={title} className="ark-hero__title" as="h1" />
        </div>
        {subtitle ? <p className="ark-hero__subtitle">{subtitle}</p> : null}
        <DataStrip
          className="ark-hero__meta"
          items={(content?.metadata ?? []).filter(item => ["Year", "Role", "年份", "角色"].includes(item.label))}
        />
        {content?.overview ? <p className="ark-work-summary">{content.overview}</p> : null}
        <span className="ark-hero__scrollHint">{copy.scrollHint}</span>
      </section>

      {particleFailed ? (
        <section className="ark-section" data-work-particle-state="failed">
          <p className="ark-wgallery__hint" style={{ marginBottom: "2vh" }}>
            {copy.work.modelFailed}
          </p>
          {videoUrl ? (
            <div className="ark-wvideo">
              <video
                className="ark-wvideo__player"
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
              />
            </div>
          ) : images.length > 0 ? (
            <div className="ark-wvideo">
              <img className="ark-wvideo__player" src={images[0]} alt={title} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* b 段:项目多媒体材料(视频 + 图集合并为一个 #work-media 分节);
          无多媒体数据的作品隐藏该段,粒子宿主的解构 morph 锚点退化为页尾。 */}
      {hasMedia ? (
        <section className="ark-wmedia" id="work-media">
          {videoUrl ? (
            <section className="ark-section" id="work-video">
              <Reveal>
                <SectionHeader number="01" title={copy.work.videoLabel} />
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
                  <SectionHeader number={sectionNo(Boolean(videoUrl), 1)} title={copy.work.galleryLabel} />
                  <div className="ark-wgallery__controls">
                    <button type="button" onClick={() => {
                      setPlayingExhibitId(null);
                      galleryRef.current?.scrollBy({ left: -(galleryRef.current.clientWidth * 0.85), behavior: "instant" });
                    }}>{language === "zh" ? "← 向左翻阅" : "← Scroll left"}</button>
                    <span>{images.length} {language === "zh" ? "张 · 点击放大" : "images · Select to enlarge"}</span>
                    <button type="button" onClick={() => {
                      setPlayingExhibitId(null);
                      galleryRef.current?.scrollBy({ left: galleryRef.current.clientWidth * 0.85, behavior: "instant" });
                    }}>{language === "zh" ? "向右翻阅 →" : "Scroll right →"}</button>
                    <button type="button" aria-pressed={galleryPlaying} onClick={() => setPlayingExhibitId(galleryPlaying ? null : exhibitId)}>
                      {galleryPlaying ? (language === "zh" ? "暂停自动流" : "Pause flow") : (language === "zh" ? "播放自动流" : "Play flow")}
                    </button>
                  </div>
                </div>
                <div className="ark-wgallery__track" ref={galleryRef}>
                  {/* 自动流:内容按份复制实现无缝循环,复制份仅视觉用(aria-hidden) */}
                  {Array.from({ length: galleryCopies }, (_, copyIndex) =>
                    images.map((url, i) => (
                      <figure
                        className="ark-wgallery__item"
                        key={`${copyIndex}:${url}`}
                        aria-hidden={copyIndex > 0 || undefined}
                      >
                        <button
                          type="button"
                          className="ark-wgallery__zoom"
                          aria-label={`${language === "zh" ? "放大" : "Enlarge"} ${title} — ${i + 1}`}
                          tabIndex={copyIndex > 0 ? -1 : 0}
                          onClick={(event) => {
                            event.currentTarget.focus({ preventScroll: true });
                            setSelectedImage({ exhibitId, src: url, alt: `${title} — ${i + 1}` });
                          }}
                        >
                        <img
                          src={url}
                          alt={`${title} — ${i + 1}`}
                          loading="lazy"
                          draggable={false}
                          style={{ cursor: "zoom-in" }}
                        />
                        </button>
                      </figure>
                    )),
                  )}
                </div>
              </section>
            </div>
          ) : images.length === 1 ? (
            <section className="ark-wgallery" id="work-gallery">
              <div className="ark-wgallery__single">
                <button
                  type="button"
                  className="ark-wgallery__zoom"
                  aria-label={`${language === "zh" ? "放大" : "Enlarge"} ${title}`}
                  onClick={(event) => {
                    event.currentTarget.focus({ preventScroll: true });
                    setSelectedImage({ exhibitId, src: images[0], alt: title });
                  }}
                >
                <img
                  src={images[0]}
                  alt={title}
                  loading="lazy"
                  draggable={false}
                  style={{ cursor: "zoom-in" }}
                />
                </button>
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {selectedImage ? (
        <ImageLightbox
          src={selectedImage.src}
          alt={selectedImage.alt}
          onClose={() => setSelectedImage(null)}
        />
      ) : null}
      </div>
    </ScrollPageShell>
  );
}
