import { useEffect, useRef, type JSX } from "react";
import { readDotGridArrow, subscribeDotGridArrow } from "./dotGridArrowBus";

const GRID_SPACING = 20;
const TILE_SPAN = GRID_SPACING * 2;
const DOT_RADIUS = 1.2;

const BASE_R = 213;
const BASE_G = 214;
const BASE_B = 216;
const BASE_ALPHA = 0.07;
const BASE_COLOR = `rgba(${BASE_R}, ${BASE_G}, ${BASE_B}, ${BASE_ALPHA})`;

const INFLUENCE_RADIUS = 340;
const MAX_OFFSET = 12;
const MAX_ALPHA = 0.5;
const LERP_FACTOR = 0.14;
const IDLE_STOP_MS = 300;
const COLOR_BUCKETS = 32;
const TAU = Math.PI * 2;

/** 擦除半径：影响半径 + 最大位移 + 点半径，保证被吸引偏离的点也落在重绘区内 */
const ERASE_RADIUS = INFLUENCE_RADIUS + MAX_OFFSET + DOT_RADIUS;
/** 重绘半径：比擦除半径多半径，补上正好压在擦除圆边缘、被擦掉一半的基础点 */
const REDRAW_RADIUS = ERASE_RADIUS + DOT_RADIUS;

const FALLBACK_ACCENT = { r: 0xe8, g: 0xd4, b: 0x4d };

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function parseHexColor(value: string): RgbColor | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const raw = match[1] ?? "";
  const hex =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const num = Number.parseInt(hex, 16);
  return {
    r: Math.floor(num / 65536) % 256,
    g: Math.floor(num / 256) % 256,
    b: num % 256,
  };
}

/**
 * 指针吸引点阵背景（canvas 版，替换纯 CSS 点阵 + 光晕方案）。
 *
 * - 指针附近的点被"吸"向指针：位移强度 12px * (1 - dist/340)^1.5，
 *   颜色按 (1 - dist/340)^2 从暗灰插值到 --ark-accent（alpha 最高 0.5）。
 * - 纵向跟随 .ark-scroll 容器的滚动：offsetY = scrollTop % 网格间距。
 * - rAF 只在指针移动或滚动时运行，静止约 300ms 后停帧。
 * - 基础网格用离屏 canvas 按 网格间距*2 周期平铺缓存，每帧只 drawImage
 *   平铺 + destination-out 抠掉影响区 + 重绘影响区内的点。
 * - reduced-motion 下只做一次静态绘制，不挂任何事件。
 *
 * 样式（absolute inset-0 / pointer-events-none 等）由调用方通过 className 提供。
 */
export function DotGridAttractCanvas({
  className,
}: {
  className?: string;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    // mount 时解析强调色：最近的 [data-accent] 祖先（.ark-page），退化到 offsetParent
    let accent = FALLBACK_ACCENT;
    const accentHost = canvas.closest("[data-accent]") ?? canvas.offsetParent;
    if (accentHost) {
      const parsed = parseHexColor(
        window.getComputedStyle(accentHost as Element).getPropertyValue("--ark-accent"),
      );
      if (parsed) accent = parsed;
    }

    let dpr = window.devicePixelRatio || 1;
    let cssWidth = 0;
    let cssHeight = 0;
    let tile: HTMLCanvasElement | null = null;

    const buildTile = () => {
      const next = document.createElement("canvas");
      next.width = Math.max(1, Math.round(TILE_SPAN * dpr));
      next.height = Math.max(1, Math.round(TILE_SPAN * dpr));
      const tileCtx = next.getContext("2d");
      if (!tileCtx) {
        tile = null;
        return;
      }
      tileCtx.scale(dpr, dpr);
      tileCtx.fillStyle = BASE_COLOR;
      // 四个点：原点处的点被瓦片边缘裁成四份，平铺后由相邻瓦片拼回整点，
      // 这样 40px 周期的瓦片能覆盖完整的 20px 网格。
      for (const [dx, dy] of [
        [0, 0],
        [GRID_SPACING, 0],
        [0, GRID_SPACING],
        [GRID_SPACING, GRID_SPACING],
      ] as const) {
        tileCtx.beginPath();
        tileCtx.arc(dx, dy, DOT_RADIUS, 0, TAU);
        tileCtx.fill();
      }
      tile = next;
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      buildTile();
    };

    // 滚动跟随：.ark-scroll 与组件同级（都在 .ark-page 下），拿不到则退化为不跟随
    const scrollCandidate = canvas.closest(".ark-page")?.querySelector(".ark-scroll") ?? null;
    const scrollEl = scrollCandidate instanceof HTMLElement ? scrollCandidate : null;
    let scrollTop = scrollEl ? scrollEl.scrollTop : 0;

    // 指针状态（lerp 平滑，手感与 dotGridPointer.ts 一致）
    let pointerSeen = false;
    let targetX = -400;
    let targetY = -400;
    let pointerX = -400;
    let pointerY = -400;
    // 点阵箭头强度（非线性趋近目标值）
    let arrowStrength = 0;
    // 滚动跟随的纵向偏移（每帧 draw 前刷新）
    let offsetY = 0;

    const drawInfluence = () => {
      if (!pointerSeen) return;
      if (
        pointerX < -ERASE_RADIUS ||
        pointerY < -ERASE_RADIUS ||
        pointerX > cssWidth + ERASE_RADIUS ||
        pointerY > cssHeight + ERASE_RADIUS
      ) {
        return;
      }

      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(pointerX, pointerY, ERASE_RADIUS, 0, TAU);
      ctx.fill();
      ctx.restore();

      const iMin = Math.max(0, Math.ceil((pointerX - REDRAW_RADIUS) / GRID_SPACING));
      const iMax = Math.min(
        Math.floor(cssWidth / GRID_SPACING),
        Math.floor((pointerX + REDRAW_RADIUS) / GRID_SPACING),
      );
      const jMin = Math.ceil((pointerY - REDRAW_RADIUS - offsetY) / GRID_SPACING);
      const jMax = Math.floor((pointerY + REDRAW_RADIUS - offsetY) / GRID_SPACING);

      // 按颜色插值系数分桶合批，每桶一条 Path2D、一次 fill
      const buckets: (Path2D | undefined)[] = [];
      for (let i = iMin; i <= iMax; i += 1) {
        const baseX = i * GRID_SPACING;
        for (let j = jMin; j <= jMax; j += 1) {
          const baseY = j * GRID_SPACING + offsetY;
          const dx = pointerX - baseX;
          const dy = pointerY - baseY;
          const dist = Math.hypot(dx, dy);
          if (dist > REDRAW_RADIUS) continue;

          const t = Math.max(0, 1 - dist / INFLUENCE_RADIUS);
          const colorK = t * t;
          const bucketIndex = Math.round(colorK * (COLOR_BUCKETS - 1));
          let path = buckets[bucketIndex];
          if (!path) {
            path = new Path2D();
            buckets[bucketIndex] = path;
          }

          let drawX = baseX;
          let drawY = baseY;
          const offset = MAX_OFFSET * Math.pow(t, 1.5);
          if (dist > 1e-4 && offset > 0.01) {
            drawX += (dx / dist) * offset;
            drawY += (dy / dist) * offset;
          }
          path.moveTo(drawX + DOT_RADIUS, drawY);
          path.arc(drawX, drawY, DOT_RADIUS, 0, TAU);
        }
      }

      for (let index = 0; index < COLOR_BUCKETS; index += 1) {
        const path = buckets[index];
        if (!path) continue;
        const k = index / (COLOR_BUCKETS - 1);
        const r = Math.round(BASE_R + (accent.r - BASE_R) * k);
        const g = Math.round(BASE_G + (accent.g - BASE_G) * k);
        const b = Math.round(BASE_B + (accent.b - BASE_B) * k);
        const alpha = BASE_ALPHA + (MAX_ALPHA - BASE_ALPHA) * k;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill(path);
      }
    };

    /** 切换条 hover 的点阵箭头：三角形区域内点放大 + 强调色 + 边缘羽化。 */
    const ARROW_W = 120;
    const ARROW_H = 170;

    const drawArrow = () => {
      if (arrowStrength <= 0.01) return;
      const { direction } = readDotGridArrow();
      const dirSign = direction === "right" ? 1 : -1;
      const cx = direction === "right" ? cssWidth - 72 : 72;
      const cy = cssHeight / 2;
      const x0 = cx - ARROW_W / 2;
      const x1 = cx + ARROW_W / 2;
      const y0 = cy - ARROW_H / 2;
      const y1 = cy + ARROW_H / 2;

      // 先按三角形轮廓擦除该区域（吸引层与平铺层的点一并让位）
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      if (dirSign > 0) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, cy);
        ctx.lineTo(x0, y1);
      } else {
        ctx.moveTo(x1, y0);
        ctx.lineTo(x0, cy);
        ctx.lineTo(x1, y1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 重绘包围盒内网格点：斜边内按边缘距离羽化放大、混入强调色
      const iMin = Math.max(0, Math.floor(x0 / GRID_SPACING));
      const iMax = Math.min(Math.floor(cssWidth / GRID_SPACING), Math.ceil(x1 / GRID_SPACING));
      const jMin = Math.max(0, Math.floor((y0 - offsetY) / GRID_SPACING));
      const jMax = Math.ceil((y1 + offsetY) / GRID_SPACING);
      for (let i = iMin; i <= iMax; i += 1) {
        const px = i * GRID_SPACING;
        for (let j = jMin; j <= jMax; j += 1) {
          const py = j * GRID_SPACING + offsetY;
          const u = dirSign > 0 ? (px - x0) / ARROW_W : (x1 - px) / ARROW_W;
          if (u < 0 || u > 1) continue;
          const halfH = (ARROW_H / 2) * u + 1e-4;
          const dy = Math.abs(py - cy);
          if (dy > halfH) continue;
          const edge = 1 - dy / halfH;
          const k = arrowStrength * (0.25 + 0.75 * edge);
          const radius = DOT_RADIUS + 2.6 * k;
          const colorK = Math.min(1, k * 1.25);
          const r = Math.round(BASE_R + (accent.r - BASE_R) * colorK);
          const g = Math.round(BASE_G + (accent.g - BASE_G) * colorK);
          const b = Math.round(BASE_B + (accent.b - BASE_B) * colorK);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.12 + 0.78 * k})`;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, TAU);
          ctx.fill();
        }
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      if (!tile || cssWidth <= 0 || cssHeight <= 0) return;

      offsetY = ((scrollTop % GRID_SPACING) + GRID_SPACING) % GRID_SPACING;

      // 1. 平铺基础网格（滚动跟随）
      for (let y = offsetY - TILE_SPAN; y < cssHeight; y += TILE_SPAN) {
        for (let x = 0; x < cssWidth; x += TILE_SPAN) {
          ctx.drawImage(tile, x, y, TILE_SPAN, TILE_SPAN);
        }
      }

      // 2. 指针吸引层
      drawInfluence();
      // 3. 切换条 hover 的点阵箭头（若有强度）
      drawArrow();
    };

    resize();
    draw();

    // reduced-motion：只做这一次静态绘制，不挂事件
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let frame: number | null = null;
    let lastActivity = 0;

    const isSettled = () =>
      Math.abs(targetX - pointerX) < 0.4 && Math.abs(targetY - pointerY) < 0.4;

    const step = () => {
      const { targetStrength } = readDotGridArrow();
      pointerX += (targetX - pointerX) * LERP_FACTOR;
      pointerY += (targetY - pointerY) * LERP_FACTOR;
      arrowStrength += (targetStrength - arrowStrength) * 0.14;
      if ((window.devicePixelRatio || 1) !== dpr) resize();
      draw();
      if (
        isSettled() &&
        Math.abs(targetStrength - arrowStrength) < 0.02 &&
        performance.now() - lastActivity > IDLE_STOP_MS
      ) {
        pointerX = targetX;
        pointerY = targetY;
        arrowStrength = targetStrength;
        draw();
        frame = null;
        return;
      }
      frame = window.requestAnimationFrame(step);
    };

    const wake = () => {
      lastActivity = performance.now();
      if (frame === null) frame = window.requestAnimationFrame(step);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      pointerSeen = true;
      wake();
    };

    const handleScroll = () => {
      if (scrollEl) scrollTop = scrollEl.scrollTop;
      wake();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);

    const unsubscribeArrow = subscribeDotGridArrow(wake);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    scrollEl?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      unsubscribeArrow();
      window.removeEventListener("pointermove", handlePointerMove);
      scrollEl?.removeEventListener("scroll", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
