export const START_LOBBY_STREAM_COUNT = 36;
export const START_LOBBY_GLYPH_CORE_RADIUS_PX = 9;
export const START_LOBBY_FRAGMENT_LIFE_MS = 360;

export type StartLobbyExhibitTextEntry = Readonly<{
  exhibitId: string;
  kind: "title" | "subtitle";
  text: string;
}>;

export type LobbyPointerState = Readonly<{
  x: number;
  y: number;
  active: boolean;
}>;

export type LobbyGlyphState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  detached: boolean;
  alive: boolean;
};

export type LobbyFragmentState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  rotation: number;
  angularVelocity: number;
  bornAtMs: number;
  lifeMs: number;
};

function seededUnit(seed: number) {
  const value = Math.sin(seed * 91.713) * 43_758.5453;
  return value - Math.floor(value);
}

export function repeatLobbyEntries<T extends StartLobbyExhibitTextEntry>(
  entries: readonly T[],
  count = START_LOBBY_STREAM_COUNT,
) {
  if (entries.length === 0 || count <= 0) return [] as T[];
  return Array.from({ length: count }, (_, index) => entries[index % entries.length] as T);
}

export function segmentLobbyGraphemes(text: string, locale = "en") {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

export function advanceLobbyGlyph(
  glyph: LobbyGlyphState,
  pointer: LobbyPointerState,
  deltaSeconds: number,
  radiusPx: number,
  baselineSpeedPxPerSecond: number,
  seed: number,
): "alive" | "consumed" {
  if (!glyph.alive) return "consumed";

  const safeDelta = Math.max(0, Math.min(deltaSeconds, 0.05));
  const dx = pointer.x - glyph.x;
  const dy = pointer.y - glyph.y;
  const distance = Math.hypot(dx, dy);

  if (pointer.active && distance <= START_LOBBY_GLYPH_CORE_RADIUS_PX) {
    glyph.alive = false;
    return "consumed";
  }

  if (pointer.active && radiusPx > 0 && distance < radiusPx) {
    const influence = 1 - distance / radiusPx;
    const radialSpeed = 120 + 410 * influence * influence;
    const blend = 1 - Math.pow(0.74, safeDelta * 30);
    const unitX = distance > 0 ? dx / distance : 0;
    const unitY = distance > 0 ? dy / distance : 0;

    glyph.detached = true;
    glyph.vx = glyph.vx * (1 - blend) + unitX * radialSpeed * blend;
    glyph.vy = glyph.vy * (1 - blend) + unitY * radialSpeed * blend;
    const spinDirection = seededUnit(seed) >= 0.5 ? 1 : -1;
    glyph.angularVelocity += spinDirection * (0.45 + influence * 2.6) * safeDelta;
  } else {
    const horizontalBlend = Math.min(1, safeDelta * 1.2);
    glyph.vx += (-baselineSpeedPxPerSecond - glyph.vx) * horizontalBlend;
    glyph.vy *= Math.pow(0.988, safeDelta * 60);
    if (glyph.detached) {
      glyph.angularVelocity *= Math.pow(0.997, safeDelta * 60);
    }
  }

  glyph.x += glyph.vx * safeDelta;
  glyph.y += glyph.vy * safeDelta;
  glyph.rotation += glyph.angularVelocity * safeDelta;
  return "alive";
}

export function createLobbyFragmentBurst(
  x: number,
  y: number,
  seed: number,
  bornAtMs: number,
): LobbyFragmentState[] {
  const count = 2 + (seededUnit(seed * 3.7) > 0.55 ? 1 : 0);
  return Array.from({ length: count }, (_, index) => {
    const angle = seededUnit(seed + index * 17) * Math.PI * 2;
    const speed = 14 + seededUnit(seed + index * 29) * 28;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 1.5 + seededUnit(seed + index * 43) * 2.5,
      rotation: angle,
      angularVelocity: (seededUnit(seed + index * 59) - 0.5) * 5,
      bornAtMs,
      lifeMs: START_LOBBY_FRAGMENT_LIFE_MS,
    };
  });
}
