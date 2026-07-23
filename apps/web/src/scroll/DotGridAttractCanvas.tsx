import { useEffect, useRef, type JSX } from "react";
import { readDotGridArrow, subscribeDotGridArrow } from "./dotGridArrowBus";

const GRID_SPACING = 20;
const DOT_RADIUS = 1.2;

const BASE_R = 213;
const BASE_G = 214;
const BASE_B = 216;
const BASE_ALPHA = 0.07;

const INFLUENCE_RADIUS = 340;
const MAX_OFFSET = 10.5;
const MAX_ALPHA = 0.45;
const LERP_FACTOR = 0.14;
const COLOR_BUCKETS = 32;
const TAU = Math.PI * 2;

/** 流动动画节流（~30fps 常驻）与呼吸分桶 */
const FLOW_FRAME_MS = 33;
const FLOW_BUCKETS = 8;

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

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
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

    /** 箭头区域判定（供流动层让位与箭头层复用） */
    const arrowContains = (px: number, py: number): boolean => {
      if (arrowStrength <= 0.01) return false;
      const { direction } = readDotGridArrow();
      const dirSign = direction === "right" ? 1 : -1;
      const cx = direction === "right" ? cssWidth - 72 : 72;
      const cy = cssHeight / 2;
      const x0 = cx - ARROW_W / 2;
      const x1 = cx + ARROW_W / 2;
      const u = dirSign > 0 ? (px - x0) / ARROW_W : (x1 - px) / ARROW_W;
      if (u < 0 || u > 1) return false;
      const halfH = (ARROW_H / 2) * u;
      return Math.abs(py - cy) <= halfH;
    };

    /** 自主动画层：点永不消失——基础亮度恒定，所有点随流场漂移并轻微
     *  呼吸缩放；约 12% 的活跃点额外做大幅半径波动、椭圆形状变化与
     *  弱强调色混入（幅度全部弱于指针吸引效果）。
     *  指针影响区与箭头区让位给对应层绘制。 */
    const drawFlow = (time: number) => {
      const flowT = time * 0.00045;
      const iMax = Math.ceil(cssWidth / GRID_SPACING);
      const jMax = Math.ceil(cssHeight / GRID_SPACING);
      const buckets: (Path2D | undefined)[] = [];

      for (let i = 0; i <= iMax; i += 1) {
        const x = i * GRID_SPACING;
        for (let j = 0; j <= jMax; j += 1) {
          const y = j * GRID_SPACING + offsetY;
          if (y < -GRID_SPACING || y > cssHeight + GRID_SPACING) continue;

          // 让位：指针影响区与箭头区由对应层绘制
          if (pointerSeen) {
            const pdx = pointerX - x;
            const pdy = pointerY - y;
            if (pdx * pdx + pdy * pdy < REDRAW_RADIUS * REDRAW_RADIUS) continue;
          }
          if (arrowContains(x, y)) continue;

          // 流场偏移（缓慢漂移）
          const a = Math.sin(x * 0.0048 + flowT) + Math.cos(y * 0.0042 - flowT * 0.8);
          const ang = a * Math.PI * 0.5;
          const fx = x + Math.cos(ang) * 3.4;
          const fy = y + Math.sin(ang) * 3.4;

          // 大小呼吸：普通点微动，活跃点（~12%）大幅波动
          const hash = (i * 31 + j * 17) % 97;
          const active = hash < 12;
          const sizeWave = Math.sin(time * 0.0007 + hash * 1.7);
          const radius = DOT_RADIUS * (1 + (active ? 0.85 : 0.22) * sizeWave);
          // 形状变化：活跃点在圆与椭圆之间缓慢变形
          const shapeWave = active ? Math.sin(time * 0.0009 + hash * 2.3) : 0;
          const rx = radius * (1 + 0.3 * shapeWave);
          const ry = radius * (1 - 0.3 * shapeWave);

          // 颜色与亮度：活跃点 glow 驱动弱提亮 + 弱强调色混入（弱于吸引）
          const glow = active ? Math.max(0, Math.sin(time * 0.0011 + hash * 0.65)) : 0;
          const bucketIndex = active
            ? Math.min(FLOW_BUCKETS - 1, 1 + Math.round(glow * (FLOW_BUCKETS - 2)))
            : 0;
          let path = buckets[bucketIndex];
          if (!path) {
            path = new Path2D();
            buckets[bucketIndex] = path;
          }
          path.moveTo(fx + rx, fy);
          path.ellipse(fx, fy, Math.max(rx, 0.3), Math.max(ry, 0.3), 0, 0, TAU);
        }
      }

      for (let index = 0; index < FLOW_BUCKETS; index += 1) {
        const path = buckets[index];
        if (!path) continue;
        const k = index / (FLOW_BUCKETS - 1);
        // 基础点 alpha 0.10 恒定（永不消失）；活跃点最高 0.26（弱于吸引 0.35）
        const alpha = 0.1 + (0.26 - 0.1) * k;
        const colorMix = k * 0.34;
        const r = Math.round(BASE_R + (accent.r - BASE_R) * colorMix);
        const g = Math.round(BASE_G + (accent.g - BASE_G) * colorMix);
        const b = Math.round(BASE_B + (accent.b - BASE_B) * colorMix);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fill(path);
      }
    };

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
          // 变色程度与吸引程度对应：t^1.5 让中距离的强调色也更明确
          const colorK = Math.pow(t, 1.5);
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
      const { direction, accentColor } = readDotGridArrow();
      // 箭头用对方页面强调色（bus 传入），缺省回落本页 accent
      const arrowAccent = (accentColor && parseHexColor(accentColor)) || accent;
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
          const r = Math.round(BASE_R + (arrowAccent.r - BASE_R) * colorK);
          const g = Math.round(BASE_G + (arrowAccent.g - BASE_G) * colorK);
          const b = Math.round(BASE_B + (arrowAccent.b - BASE_B) * colorK);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.12 + 0.78 * k})`;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, TAU);
          ctx.fill();
        }
      }
    };

    const draw = (time?: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      if (cssWidth <= 0 || cssHeight <= 0) return;

      offsetY = ((scrollTop % GRID_SPACING) + GRID_SPACING) % GRID_SPACING;

      // 1. 自主动画流动层（流场漂移 + 呼吸点亮）
      drawFlow(time ?? performance.now());
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
    let lastFlowAt = 0;

    // 常驻 ~30fps 流动循环；指针/箭头事件经 wake 立即补帧保持手感
    let lastStepAt = performance.now();
    const step = (now: number) => {
      const { targetStrength } = readDotGridArrow();
      // dt 归一化 lerp：主线程繁忙掉帧时（如 works 页 3D 渲染）收敛速度不变
      const dt = Math.min(now - lastStepAt, 100);
      lastStepAt = now;
      const k = 1 - Math.pow(1 - LERP_FACTOR, dt / 16.7);
      pointerX += (targetX - pointerX) * k;
      pointerY += (targetY - pointerY) * k;
      arrowStrength += (targetStrength - arrowStrength) * k;
      if ((window.devicePixelRatio || 1) !== dpr) resize();
      if (now - lastFlowAt >= FLOW_FRAME_MS) {
        lastFlowAt = now;
        draw(now);
      }
      frame = window.requestAnimationFrame(step);
    };

    const wake = () => {
      if (frame === null) {
        lastFlowAt = 0;
        frame = window.requestAnimationFrame(step);
        return;
      }
      draw();
    };

    // 常驻流动：立即启动循环（不等首次输入）
    frame = window.requestAnimationFrame(step);

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
