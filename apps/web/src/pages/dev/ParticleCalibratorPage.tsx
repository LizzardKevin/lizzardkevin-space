import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadParticleCache } from "../../particles/particleCacheLoader.ts";
import { ParticlePointsRenderer } from "../../particles/ParticlePointsRenderer.ts";

type HudState = {
  backend: string;
  profile: string;
  pointCount: number | null;
  fps: number;
  error: string | null;
};

const INITIAL_HUD: HudState = {
  backend: "…",
  profile: "…",
  pointCount: null,
  fps: 0,
  error: null,
};

/** 可标定的 URL query 参数 → uniform;变更只更新 uniform 值。 */
function readCalibratorParams(searchParams: URLSearchParams) {
  const numeric = (key: string) => {
    const raw = searchParams.get(key);
    if (raw === null) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  };
  return {
    size: numeric("size"),
    waveAmp: numeric("waveAmp"),
    waveSpeed: numeric("waveSpeed"),
    twAmp: numeric("twAmp"),
    cursorGain: numeric("cursorGain"),
    cursorRadius: numeric("cursorRadius"),
    cursorSize: numeric("cursorSize"),
    depthAmp: numeric("depthAmp"),
    jitter: numeric("jitter"),
    /** 视差方位角上限(度,默认 30)。 */
    parallax: numeric("parallax"),
    /** 测试钩子:固定光标 NDC(无头截图用,真机上 pointermove 会覆盖)。 */
    px: numeric("px"),
    py: numeric("py"),
    /** 粒子地面开关:?ground=0 关闭,默认开。 */
    ground: numeric("ground"),
  };
}

/** mulberry32:确定性 PRNG,用于失败占位的静态环境点场。 */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function FallbackPointField() {
  const dots = (() => {
    const rand = mulberry32(0x5eed);
    return Array.from({ length: 140 }, (_, i) => ({
      key: i,
      left: `${(rand() * 100).toFixed(2)}%`,
      top: `${(rand() * 100).toFixed(2)}%`,
      size: rand() < 0.2 ? 2 : 1,
      opacity: 0.15 + rand() * 0.35,
    }));
  })();
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
      {dots.map((dot) => (
        <span
          key={dot.key}
          style={{
            position: "absolute",
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: dot.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function ParticleCalibratorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ParticlePointsRenderer | null>(null);
  const [searchParams] = useSearchParams();
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const params = readCalibratorParams(searchParams);
  // px/py 测试钩子只取首帧值(pointermove 之后会被真实光标覆盖)。
  const initialParamsRef = useRef(params);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "DEV / particle calibrator";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // 标定参数:query 变更时只更新 uniform 值。
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const { uniforms } = renderer;
    if (params.size !== null) uniforms.pointSizeBase.value = params.size;
    if (params.waveAmp !== null) uniforms.waveAmp.value = params.waveAmp;
    if (params.waveSpeed !== null) uniforms.waveSpeed.value = params.waveSpeed;
    if (params.twAmp !== null) uniforms.twinkleAmp.value = params.twAmp;
    if (params.cursorGain !== null) uniforms.cursorGain.value = params.cursorGain;
    if (params.cursorRadius !== null) uniforms.cursorRadius.value = params.cursorRadius;
    if (params.cursorSize !== null) uniforms.cursorSizeGain.value = params.cursorSize;
    if (params.depthAmp !== null) uniforms.depthFadeAmp.value = params.depthAmp;
    if (params.jitter !== null) uniforms.cursorJitterAmp.value = params.jitter;
    if (params.parallax !== null) {
      renderer.parallaxMaxAzimuth = (Math.abs(params.parallax) * Math.PI) / 180;
    }
  }, [params.size, params.waveAmp, params.waveSpeed, params.twAmp, params.cursorGain, params.cursorRadius, params.cursorSize, params.depthAmp, params.jitter, params.parallax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new ParticlePointsRenderer();
    rendererRef.current = renderer;
    let disposed = false;
    let rafId = 0;
    let running = false;
    let lastMs: number | null = null;
    // fps 滑动平均(~500ms 节流一次 HUD 更新)。
    let frameCount = 0;
    let fpsWindowStartMs = 0;
    let fps = 0;

    const renderFrame = (nowMs: number) => {
      rafId = window.requestAnimationFrame(renderFrame);
      const dt = lastMs === null ? 0 : Math.min((nowMs - lastMs) / 1000, 0.1);
      lastMs = nowMs;
      renderer.update(dt);
      frameCount += 1;
      if (fpsWindowStartMs === 0) fpsWindowStartMs = nowMs;
      const windowMs = nowMs - fpsWindowStartMs;
      if (windowMs >= 500) {
        fps = (frameCount * 1000) / windowMs;
        frameCount = 0;
        fpsWindowStartMs = nowMs;
        setHud((prev) => (prev.error ? prev : { ...prev, fps: Math.round(fps) }));
      }
    };

    const startLoop = () => {
      if (running || disposed) return;
      running = true;
      lastMs = null; // 恢复时 dt 从 0 起,time 不跳变。
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
        await renderer.init(canvas, (resolution) => {
          if (disposed) return;
          setHud((prev) => ({ ...prev, backend: resolution.backend, profile: resolution.profile }));
        });
        if (disposed) return;
        const hook = initialParamsRef.current;
        renderer.groundEnabled = hook.ground !== 0;
        const data = await loadParticleCache();
        if (disposed) return;
        renderer.setParticleData(data);
        setHud((prev) => ({ ...prev, pointCount: data.pointCount }));
        onResize();
        startLoop();
        if (hook.px !== null || hook.py !== null) {
          renderer.setCursor(hook.px ?? 0, hook.py ?? 0);
          renderer.snapCursorToTarget();
        }
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : String(error);
        if (import.meta.env.DEV) console.warn("[ParticleCalibrator] init failed:", error);
        setHud((prev) => ({ ...prev, error: message }));
      }
    };
    void boot();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <div
      className="app-route-layer"
      style={{ inset: 0, background: "#000", overflow: "hidden", color: "#888" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      />
      {hud.error ? <FallbackPointField /> : null}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 14,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 11,
          lineHeight: 1.7,
          color: "#777",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div style={{ color: "#999", letterSpacing: "0.08em" }}>DEV / particle calibrator</div>
        {hud.error ? (
          <div style={{ color: "#b06a6a" }}>error: {hud.error}</div>
        ) : (
          <>
            <div>
              backend: {hud.backend} / profile: {hud.profile} / fps: {hud.fps}
            </div>
            <div>points: {hud.pointCount ?? "loading…"}</div>
            <div>
              size={params.size ?? "·"} waveAmp={params.waveAmp ?? "·"} waveSpeed=
              {params.waveSpeed ?? "·"} twAmp={params.twAmp ?? "·"} cursorGain=
              {params.cursorGain ?? "·"} cursorRadius={params.cursorRadius ?? "·"} cursorSize=
              {params.cursorSize ?? "·"} depthAmp={params.depthAmp ?? "·"} jitter=
              {params.jitter ?? "·"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
