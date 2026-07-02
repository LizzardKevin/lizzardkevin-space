import { useCallback, useSyncExternalStore } from "react";

export type SpaceQualityConfig = {
  performance: {
    targetFps: number;
  };
  post: {
    bloom: {
      enabled: boolean;
      strength: number;
      radius: number;
      threshold: number;
    };
  };
  lighting: {
    lightEmissiveIntensity: number;
    bulbIntensity: number;
    bulbDistance: number;
  };
};

export type SpaceVisualSettings = {
  antialias: boolean;
};

export const DEFAULT_SPACE_VISUAL_SETTINGS: SpaceVisualSettings = {
  antialias: false,
};

export const SPACE_QUALITY_CONFIG: SpaceQualityConfig = {
  performance: { targetFps: 30 },
  post: {
    bloom: { enabled: true, strength: 0.06, radius: 0.06, threshold: 0.94 },
  },
  lighting: { lightEmissiveIntensity: 6.2, bulbIntensity: 12, bulbDistance: 9.75 },
};

const SPACE_VISUAL_SETTINGS_STORAGE_KEY = "spaceVisualSettings";
const listeners = new Set<() => void>();

let currentSettings = DEFAULT_SPACE_VISUAL_SETTINGS;

function readStoredBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSpaceVisualSettings(value: unknown): SpaceVisualSettings {
  if (!value || typeof value !== "object") return DEFAULT_SPACE_VISUAL_SETTINGS;
  const stored = value as Partial<Record<keyof SpaceVisualSettings, unknown>>;
  return {
    antialias: readStoredBoolean(stored.antialias, DEFAULT_SPACE_VISUAL_SETTINGS.antialias),
  };
}

function readStoredSpaceVisualSettings() {
  if (typeof window === "undefined") return DEFAULT_SPACE_VISUAL_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SPACE_VISUAL_SETTINGS_STORAGE_KEY);
    return raw ? normalizeSpaceVisualSettings(JSON.parse(raw)) : DEFAULT_SPACE_VISUAL_SETTINGS;
  } catch {
    return DEFAULT_SPACE_VISUAL_SETTINGS;
  }
}

function persistSpaceVisualSettings(settings: SpaceVisualSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPACE_VISUAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // SPACE settings are visual preferences; storage failures should never interrupt walking.
  }
}

function emitSpaceVisualSettingsChange() {
  listeners.forEach((listener) => listener());
}

function syncSpaceVisualSettingsFromStorage() {
  currentSettings = readStoredSpaceVisualSettings();
  emitSpaceVisualSettingsChange();
}

if (typeof window !== "undefined") {
  currentSettings = readStoredSpaceVisualSettings();
  window.addEventListener("storage", (event) => {
    if (event.key === SPACE_VISUAL_SETTINGS_STORAGE_KEY) syncSpaceVisualSettingsFromStorage();
  });
}

export function getSpaceQualityConfig() {
  return SPACE_QUALITY_CONFIG;
}

export function readSpaceVisualSettings() {
  return currentSettings;
}

export function writeSpaceVisualSettings(settings: SpaceVisualSettings) {
  currentSettings = normalizeSpaceVisualSettings(settings);
  persistSpaceVisualSettings(currentSettings);
  emitSpaceVisualSettingsChange();
}

export function setSpaceAntialias(antialias: boolean) {
  writeSpaceVisualSettings({ ...currentSettings, antialias });
}

export function subscribeSpaceVisualSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSpaceVisualSettings() {
  const settings = useSyncExternalStore(
    subscribeSpaceVisualSettings,
    readSpaceVisualSettings,
    () => DEFAULT_SPACE_VISUAL_SETTINGS,
  );

  const toggleAntialias = useCallback((enabled: boolean) => {
    setSpaceAntialias(enabled);
  }, []);

  return {
    quality: getSpaceQualityConfig(),
    settings,
    toggleAntialias,
  };
}
