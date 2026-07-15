import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import { generatedStartLobbyExhibitText } from "../generated/startLobbyExhibitText.generated.ts";
import {
  START_LOBBY_POINTER_RADIUS_PX,
  START_LOBBY_STREAM_COUNT,
  advanceLobbyGlyph,
  createLobbyFragmentBurst,
  repeatLobbyEntries,
  segmentLobbyGraphemes,
  type LobbyFragmentState,
  type LobbyGlyphState,
  type StartLobbyExhibitTextEntry,
} from "./startLobbyGlyphPhysics.ts";

export const START_LOBBY_BARRAGE_MAX_DPR = 1.25;
export const START_LOBBY_BARRAGE_FRAME_MS = 1000 / 30;

const FIELD_COLOR = "#69827e";
const FIELD_DOT_COLOR = "rgba(24, 43, 45, 0.18)";
const GLYPH_COLOR = "#f3f0e7";
const START_LOBBY_FONT_SCALE = 1.25;
const POINTER_DOT_FIELD_RADIUS_PX = 300;
const POINTER_DOT_MAX_PULL_PX = 30;
const POINTER_DOT_MAX_RADIUS_PX = 3.5;
const FIELD_DOT_BASE_RADIUS_PX = 0.58;
const POINTER_CORE_RADIUS_PX = 4.5;
const STREAM_VIEWPORT_PADDING_PX = 64;
const MAX_FRAGMENT_COUNT = 120;

type StartLobbyBarrageProps = {
  disposing: boolean;
};

export type StartLobbyBarrageHandle = {
  setPointer(clientX: number, clientY: number): void;
  resetPointer(): void;
};

type GlyphSprite = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  advance: number;
};

type BarrageGlyph = LobbyGlyphState & {
  glyph: string;
  offsetX: number;
  seed: number;
  sprite: GlyphSprite;
};

type BarrageStream = {
  entry: StartLobbyExhibitTextEntry;
  x: number;
  y: number;
  speed: number;
  fontSize: number;
  opacity: number;
  glyphs: BarrageGlyph[];
};

type BarrageRuntime = StartLobbyBarrageHandle & {
  destroy(): void;
};

function seededUnit(seed: number) {
  const value = Math.sin(seed * 91.713) * 43_758.5453;
  return value - Math.floor(value);
}

function resolveLanguage(language: string | undefined) {
  return language?.startsWith("zh") ? "zh" : "en";
}

function createBarrageRuntime(
  canvas: HTMLCanvasElement,
  entries: readonly StartLobbyExhibitTextEntry[],
  reducedMotionQuery: MediaQueryList,
): BarrageRuntime | null {
  const maybeContext = canvas.getContext("2d", { alpha: true });
  if (!maybeContext) return null;
  const context: CanvasRenderingContext2D = maybeContext;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let destroyed = false;
  let rafId: number | null = null;
  let lastFrameAtMs = performance.now();
  let streams: BarrageStream[] = [];
  let fragments: LobbyFragmentState[] = [];
  let staticField: HTMLCanvasElement | null = null;
  const glyphSprites = new Map<string, GlyphSprite>();
  const pointer = { x: 0, y: 0, active: false };
  const streamEntries = repeatLobbyEntries(entries);

  function getGlyphSprite(glyph: string, kind: "title" | "subtitle", fontSize: number) {
    const weight = kind === "title" ? 700 : 500;
    const key = `${dpr}:${weight}:${fontSize.toFixed(2)}:${glyph}`;
    const cached = glyphSprites.get(key);
    if (cached) return cached;

    const measurementCanvas = document.createElement("canvas");
    const measurementContext = measurementCanvas.getContext("2d");
    if (!measurementContext) {
      const fallback = { canvas: measurementCanvas, width: fontSize, height: fontSize, advance: fontSize };
      glyphSprites.set(key, fallback);
      return fallback;
    }
    const font = `${weight} ${fontSize}px "Ubuntu Mono Web", "Ubuntu Mono", "SFMono-Regular", Consolas, monospace`;
    measurementContext.font = font;
    const metrics = measurementContext.measureText(glyph);
    const advance = Math.max(1, metrics.width);
    const spriteWidth = Math.ceil(advance + 4);
    const spriteHeight = Math.ceil(fontSize * 1.8 + 4);
    measurementCanvas.width = Math.max(1, Math.ceil(spriteWidth * dpr));
    measurementCanvas.height = Math.max(1, Math.ceil(spriteHeight * dpr));
    measurementContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    measurementContext.font = font;
    measurementContext.textAlign = "center";
    measurementContext.textBaseline = "middle";
    measurementContext.fillStyle = GLYPH_COLOR;
    measurementContext.fillText(glyph, spriteWidth / 2, spriteHeight / 2);
    const sprite = {
      canvas: measurementCanvas,
      width: spriteWidth,
      height: spriteHeight,
      advance,
    };
    glyphSprites.set(key, sprite);
    return sprite;
  }

  function createStream(entry: StartLobbyExhibitTextEntry, index: number, initial: boolean) {
    const title = entry.kind === "title";
    const fontSize =
      ((title ? 8.7 : 7.1) + seededUnit(index * 3.1) * (title ? 1.6 : 1.2)) *
      START_LOBBY_FONT_SCALE;
    const speed = 19 + seededUnit(index * 9.4) * 18;
    const glyphs: BarrageGlyph[] = [];
    let offsetX = 0;
    for (const [glyphIndex, glyph] of segmentLobbyGraphemes(entry.text).entries()) {
      const sprite = getGlyphSprite(glyph, entry.kind, fontSize);
      glyphs.push({
        glyph,
        offsetX,
        seed: index * 101 + glyphIndex * 13,
        sprite,
        x: 0,
        y: 0,
        vx: -speed,
        vy: 0,
        rotation: 0,
        angularVelocity: 0,
        detached: false,
        alive: true,
      });
      offsetX += sprite.advance;
    }

    return {
      entry,
      x: initial
        ? -width * 0.08 + seededUnit(index * 7.1) * width * 1.23
        : width * (1.04 + seededUnit(index * 7.1 + performance.now() * 0.001) * 0.32),
      y: height * (0.045 + seededUnit(index * 4.7) * 0.91),
      speed,
      fontSize,
      opacity: title ? 0.52 : 0.3,
      glyphs,
    } satisfies BarrageStream;
  }

  function rebuildStreams(initial: boolean) {
    streams = streamEntries.map((entry, index) => createStream(entry, index, initial));
    fragments = [];
  }

  function rebuildStaticField() {
    const field = document.createElement("canvas");
    field.width = Math.max(1, Math.round(width * dpr));
    field.height = Math.max(1, Math.round(height * dpr));
    const fieldContext = field.getContext("2d");
    if (!fieldContext) {
      staticField = null;
      return;
    }
    fieldContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    fieldContext.fillStyle = FIELD_COLOR;
    fieldContext.fillRect(0, 0, width, height);
    fieldContext.fillStyle = FIELD_DOT_COLOR;
    const step = Math.max(9, Math.round(width / 120));
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        fieldContext.beginPath();
        fieldContext.arc(x, y, FIELD_DOT_BASE_RADIUS_PX, 0, Math.PI * 2);
        fieldContext.fill();
      }
    }
    staticField = field;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, bounds.width);
    const nextHeight = Math.max(1, bounds.height);
    const nextDpr = Math.min(window.devicePixelRatio || 1, START_LOBBY_BARRAGE_MAX_DPR);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    glyphSprites.clear();
    rebuildStaticField();
    rebuildStreams(true);
    draw(performance.now(), 0);
  }

  function drawPointerField() {
    if (!pointer.active) return;
    const fieldRadius = Math.min(POINTER_DOT_FIELD_RADIUS_PX, width * 0.25);
    const step = Math.max(9, Math.round(width / 120));
    context.save();
    context.beginPath();
    context.arc(pointer.x, pointer.y, fieldRadius, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = FIELD_COLOR;
    context.fillRect(pointer.x - fieldRadius, pointer.y - fieldRadius, fieldRadius * 2, fieldRadius * 2);
    context.fillStyle = FIELD_DOT_COLOR;
    const startX = Math.floor((pointer.x - fieldRadius) / step) * step + step / 2;
    const startY = Math.floor((pointer.y - fieldRadius) / step) * step + step / 2;
    for (let y = startY; y <= pointer.y + fieldRadius; y += step) {
      for (let x = startX; x <= pointer.x + fieldRadius; x += step) {
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        const distance = Math.hypot(dx, dy);
        if (distance > fieldRadius) continue;
        const influence = 1 - distance / fieldRadius;
        const smooth = influence * influence * (3 - 2 * influence);
        const curvedInfluence = smooth * smooth;
        const pull = curvedInfluence * POINTER_DOT_MAX_PULL_PX;
        const unitX = distance > 0 ? dx / distance : 0;
        const unitY = distance > 0 ? dy / distance : 0;
        context.beginPath();
        context.arc(
          x + unitX * pull,
          y + unitY * pull,
          FIELD_DOT_BASE_RADIUS_PX +
            curvedInfluence * (POINTER_DOT_MAX_RADIUS_PX - FIELD_DOT_BASE_RADIUS_PX),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    context.restore();
  }

  function drawGlyph(glyph: BarrageGlyph, x: number, y: number, opacity: number) {
    if (
      x < -STREAM_VIEWPORT_PADDING_PX ||
      x > width + STREAM_VIEWPORT_PADDING_PX ||
      y < -STREAM_VIEWPORT_PADDING_PX ||
      y > height + STREAM_VIEWPORT_PADDING_PX
    ) {
      return;
    }
    context.save();
    context.translate(x, y);
    context.rotate(glyph.rotation);
    context.globalAlpha = opacity;
    context.drawImage(
      glyph.sprite.canvas,
      -glyph.sprite.width / 2,
      -glyph.sprite.height / 2,
      glyph.sprite.width,
      glyph.sprite.height,
    );
    context.restore();
  }

  function respawnStream(stream: BarrageStream, streamIndex: number) {
    const replacement = createStream(stream.entry, streamIndex, false);
    streams[streamIndex] = replacement;
  }

  function updateAndDrawStreams(nowMs: number, deltaSeconds: number) {
    const fieldRadius = Math.min(START_LOBBY_POINTER_RADIUS_PX, width * 0.18);
    streams.forEach((stream, streamIndex) => {
      stream.x -= stream.speed * deltaSeconds;
      let aliveCount = 0;
      let rightmostX = -Infinity;
      for (const glyph of stream.glyphs) {
        if (!glyph.alive) continue;
        aliveCount += 1;
        const baselineX = stream.x + glyph.offsetX;
        const baselineY = stream.y;
        let drawX = baselineX;
        let drawY = baselineY;
        const distanceToPointer = pointer.active
          ? Math.hypot(pointer.x - baselineX, pointer.y - baselineY)
          : Infinity;

        if (!glyph.detached && distanceToPointer < fieldRadius) {
          glyph.x = baselineX;
          glyph.y = baselineY;
          glyph.vx = -stream.speed;
          glyph.vy = 0;
        }
        if (glyph.detached || distanceToPointer < fieldRadius) {
          const result = advanceLobbyGlyph(
            glyph,
            pointer,
            deltaSeconds,
            fieldRadius,
            stream.speed,
            glyph.seed,
          );
          if (result === "consumed") {
            fragments.push(...createLobbyFragmentBurst(pointer.x, pointer.y, glyph.seed, nowMs));
            if (fragments.length > MAX_FRAGMENT_COUNT) {
              fragments.splice(0, fragments.length - MAX_FRAGMENT_COUNT);
            }
            aliveCount -= 1;
            continue;
          }
          drawX = glyph.x;
          drawY = glyph.y;
        }

        rightmostX = Math.max(rightmostX, drawX);
        const coreDistance = pointer.active
          ? Math.hypot(pointer.x - drawX, pointer.y - drawY)
          : Infinity;
        const coreScale = Math.max(0.14, Math.min(1, coreDistance / 34));
        drawGlyph(glyph, drawX, drawY, stream.opacity * coreScale);
      }
      if (aliveCount === 0 || rightmostX < -STREAM_VIEWPORT_PADDING_PX) {
        respawnStream(stream, streamIndex);
      }
    });
  }

  function updateAndDrawFragments(nowMs: number, deltaSeconds: number) {
    const retained: LobbyFragmentState[] = [];
    for (const fragment of fragments) {
      const age = nowMs - fragment.bornAtMs;
      if (age >= fragment.lifeMs) continue;
      const life = 1 - age / fragment.lifeMs;
      fragment.x += fragment.vx * deltaSeconds;
      fragment.y += fragment.vy * deltaSeconds;
      const damping = Math.pow(0.94, deltaSeconds * 60);
      fragment.vx *= damping;
      fragment.vy *= damping;
      fragment.rotation += fragment.angularVelocity * deltaSeconds;
      context.save();
      context.translate(fragment.x, fragment.y);
      context.rotate(fragment.rotation);
      context.globalAlpha = life * 0.74;
      context.fillStyle = "#ffffff";
      context.fillRect(-fragment.length / 2, -0.55, fragment.length, 1.1);
      context.restore();
      retained.push(fragment);
    }
    fragments = retained;
  }

  function drawPointerCore() {
    if (!pointer.active) return;
    context.strokeStyle = "rgba(24, 43, 45, 0.5)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(pointer.x, pointer.y, 11, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "rgba(7, 13, 14, 0.9)";
    context.beginPath();
    context.arc(pointer.x, pointer.y, POINTER_CORE_RADIUS_PX, 0, Math.PI * 2);
    context.fill();
  }

  function draw(nowMs: number, deltaSeconds: number) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (staticField) context.drawImage(staticField, 0, 0, width, height);
    else {
      context.fillStyle = FIELD_COLOR;
      context.fillRect(0, 0, width, height);
    }
    drawPointerField();
    updateAndDrawStreams(nowMs, deltaSeconds);
    updateAndDrawFragments(nowMs, deltaSeconds);
    drawPointerCore();
  }

  function shouldAnimate() {
    return (
      !destroyed &&
      !reducedMotionQuery.matches &&
      document.visibilityState === "visible"
    );
  }

  function scheduleFrame() {
    if (!shouldAnimate() || rafId !== null) return;
    rafId = requestAnimationFrame(onAnimationFrame);
  }

  function onAnimationFrame(nowMs: number) {
    rafId = null;
    const elapsedMs = nowMs - lastFrameAtMs;
    if (elapsedMs >= START_LOBBY_BARRAGE_FRAME_MS) {
      lastFrameAtMs = nowMs - (elapsedMs % START_LOBBY_BARRAGE_FRAME_MS);
      draw(nowMs, Math.min(elapsedMs, 50) / 1000);
    }
    scheduleFrame();
  }

  function stopFrame() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function syncMotion() {
    if (shouldAnimate()) {
      lastFrameAtMs = performance.now();
      scheduleFrame();
    } else {
      stopFrame();
      pointer.active = false;
      draw(performance.now(), 0);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  document.addEventListener("visibilitychange", syncMotion);
  reducedMotionQuery.addEventListener("change", syncMotion);
  resize();
  if (streams.length === 0 && streamEntries.length > 0) rebuildStreams(true);
  draw(performance.now(), 0);
  syncMotion();

  void document.fonts.ready.then(() => {
    if (destroyed) return;
    glyphSprites.clear();
    rebuildStreams(true);
    draw(performance.now(), 0);
  });

  return {
    setPointer(clientX, clientY) {
      if (destroyed || reducedMotionQuery.matches) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.x = clientX - bounds.left;
      pointer.y = clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 && pointer.x <= bounds.width && pointer.y >= 0 && pointer.y <= bounds.height;
    },
    resetPointer() {
      pointer.active = false;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopFrame();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotionQuery.removeEventListener("change", syncMotion);
      glyphSprites.clear();
      streams = [];
      fragments = [];
      staticField = null;
    },
  };
}

export const StartLobbyBarrage = forwardRef<StartLobbyBarrageHandle, StartLobbyBarrageProps>(
  function StartLobbyBarrage({ disposing }, forwardedRef) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runtimeRef = useRef<BarrageRuntime | null>(null);
    const { i18n } = useTranslation();
    const language = resolveLanguage(i18n.resolvedLanguage ?? i18n.language);

    useImperativeHandle(
      forwardedRef,
      () => ({
        setPointer(clientX, clientY) {
          runtimeRef.current?.setPointer(clientX, clientY);
        },
        resetPointer() {
          runtimeRef.current?.resetPointer();
        },
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || disposing) return;
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const languageEntries = generatedStartLobbyExhibitText[language] as readonly StartLobbyExhibitTextEntry[];
      const runtime = createBarrageRuntime(canvas, languageEntries, reducedMotionQuery);
      runtimeRef.current = runtime;
      return () => {
        if (runtimeRef.current === runtime) runtimeRef.current = null;
        runtime?.destroy();
      };
    }, [disposing, language]);

    return (
      <canvas
        ref={canvasRef}
        className="start-lobby__barrage"
        aria-hidden="true"
        data-stream-count={generatedStartLobbyExhibitText[language].length > 0 ? START_LOBBY_STREAM_COUNT : 0}
      />
    );
  },
);
