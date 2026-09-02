import { useEffect, useRef, useState } from "react";
import { loadParticleCache, particleCacheUrlFor } from "../../particles/particleCacheLoader.ts";
import { ParticlePointsRenderer } from "../../particles/ParticlePointsRenderer.ts";
import { ScrollTrigger } from "../../scroll/scrollGsap";

/**
 * 作品详情页全页粒子宿主：固定定位全视口点云背景（Hero 即展台，点云承担原舞台角色），
 * 滚到 overview 时按滚动进度把模型点云线性解构为 ambient 散布。
 * 渲染闭环照 dev 标定页模板：init → loadParticleCache → setParticleData → rAF，
 * 初始化后不再碰缓冲，每帧只写 uniform。canvas 铺满视口但 pointer-events:none，
 * 光标经 window pointermove 喂 NDC；z-index -1 压在壳层滚动内容之下
 * （.ark-scroll 自身是 z-index:2 的堆叠上下文且无背景，负层级子元素仍盖在页面底色之上）。
 * 加载/初始化失败：onError 上报并渲染 null，静态降级由页面 DOM 层负责。
 */
export function WorkParticleHost({
  exhibitId,
  onReady,
  onError,
}: {
  exhibitId: string;
  onReady?: () => void;
  onError?: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new ParticlePointsRenderer();
    let disposed = false;
    let rafId = 0;
    let running = false;
    let lastMs: number | null = null;
    let morphTrigger: ScrollTrigger | null = null;

    const renderFrame = (nowMs: number) => {
      rafId = window.requestAnimationFrame(renderFrame);
      const dt = lastMs === null ? 0 : Math.min((nowMs - lastMs) / 1000, 0.1);
      lastMs = nowMs;
      renderer.update(dt);
    };
    const startLoop = () => {
      if (running || disposed) return;
      running = true;
      lastMs = null; // 恢复时 dt 从 0 起，time 不跳变。
      rafId = window.requestAnimationFrame(renderFrame);
    };
    const stopLoop = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(rafId);
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    const onPointerMove = (event: PointerEvent) => {
      renderer.setCursor(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
    };
    const onResize = () => {
      renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    };

    const boot = async () => {
      try {
        await renderer.init(canvas);
        if (disposed) return;
        const data = await loadParticleCache(particleCacheUrlFor(exhibitId));
        if (disposed) return;
        renderer.setParticleData(data);
        // 视觉中心右移约 1/3 半径,给左上标题栏让位(标定页保持居中)。
        renderer.viewOffsetFactor = 0.33;
        onResize();
        startLoop();
        // 滚动解构：进度只由 scroller 绝对滚动位置驱动——scrollTop=0 恒为 0(成形),
        // overview 顶走到 25% 视口处恒为 1(解构),区间线性、可逆。
        // 不用 "top bottom" 相对起点:hero 仅 86vh,overview 加载即在视口内,
        // 相对起点 + 创建时序/刷新顺序会让初始进度非零(首屏半解体模糊柱)。
        const scroller = document.querySelector<HTMLElement>(".ark-scroll");
        if (scroller && document.getElementById("work-overview")) {
          morphTrigger = ScrollTrigger.create({
            trigger: "#work-overview",
            scroller,
            start: 0,
            end: () => {
              const el = document.getElementById("work-overview");
              if (!el) return scroller.clientHeight;
              const elTop =
                el.getBoundingClientRect().top -
                scroller.getBoundingClientRect().top +
                scroller.scrollTop;
              return Math.max(elTop - scroller.clientHeight * 0.25, 1);
            },
            invalidateOnRefresh: true,
            onUpdate: (self) => renderer.setMorphProgress(self.progress),
          });
        }
        onReady?.();
        // dev-only 测试钩子:?wpMorph=0..1 强制解构进度;?px=&py= 固定光标 NDC
        // (无头截图/调试用,真机上 pointermove 会覆盖)。
        if (import.meta.env.DEV) {
          const query = new URLSearchParams(window.location.search);
          const px = Number.parseFloat(query.get("px") ?? "");
          const py = Number.parseFloat(query.get("py") ?? "");
          if (Number.isFinite(px) || Number.isFinite(py)) {
            renderer.setCursor(
              Number.isFinite(px) ? px : 0,
              Number.isFinite(py) ? py : 0,
            );
            renderer.snapCursorToTarget();
          }
          const forced = Number.parseFloat(query.get("wpMorph") ?? "");
          if (Number.isFinite(forced)) {
            morphTrigger?.kill();
            morphTrigger = null;
            renderer.setMorphProgress(forced);
          }
        }
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        if (import.meta.env.DEV) console.warn("[WorkParticleHost] init failed:", error);
        setFailed(true);
        onError?.(message);
      }
    };
    void boot();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      stopLoop();
      morphTrigger?.kill();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [exhibitId, onReady, onError]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}
