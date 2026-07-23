import { publicAssetUrl } from "../platform/publicAssets.ts";
import type { SupportedLanguage } from "../i18n/resolveInitialLanguage";

export type ExhibitContentMetadataItem = {
  label: string;
  value: string;
};

export type ExhibitContent = {
  title: string;
  subtitle?: string;
  overview: string;
  storyHtml: string;
  tags?: string[];
  metadata?: ExhibitContentMetadataItem[];
};

type LocalizedTextRecord = Partial<Record<SupportedLanguage, unknown>>;
type LocalizedArrayRecord = Partial<Record<SupportedLanguage, unknown>>;

export function exhibitContentUrl(exhibitId: string): string {
  return publicAssetUrl(`/exhibits/${exhibitId}/content.json`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveLocalizedValue(
  value: unknown,
  language: SupportedLanguage,
  fallbackLanguage: SupportedLanguage = "en",
): unknown {
  if (!isRecord(value)) return value;
  const localized = value as LocalizedTextRecord | LocalizedArrayRecord;
  const preferred = localized[language];
  if (typeof preferred === "string" && preferred.trim().length > 0) return preferred;
  if (Array.isArray(preferred) && preferred.length > 0) return preferred;
  const fallback = localized[fallbackLanguage];
  if (typeof fallback === "string" && fallback.trim().length > 0) return fallback;
  if (Array.isArray(fallback) && fallback.length > 0) return fallback;
  return preferred ?? fallback ?? null;
}

function parseLocalizedString(value: unknown, language: SupportedLanguage): string | null {
  const resolved = resolveLocalizedValue(value, language);
  if (typeof resolved !== "string") return null;
  const trimmed = resolved.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetadata(metadata: unknown, language: SupportedLanguage): ExhibitContentMetadataItem[] | undefined {
  const resolved = resolveLocalizedValue(metadata, language);
  if (!Array.isArray(resolved) && language !== "en") {
    return parseMetadata(resolveLocalizedValue(metadata, "en"), "en");
  }
  if (!Array.isArray(resolved)) return undefined;
  const items = resolved
    .filter(
      (item): item is Record<string, unknown> => isRecord(item),
    )
    .map((item) => {
      const label = parseLocalizedString(item.label, language);
      const value = parseLocalizedString(item.value, language);
      return label && value ? { label, value } : null;
    })
    .filter((item): item is ExhibitContentMetadataItem => item !== null);
  return items.length > 0 ? items : undefined;
}

function parseTags(tags: unknown, language: SupportedLanguage): string[] | undefined {
  const resolved = resolveLocalizedValue(tags, language);
  if (!Array.isArray(resolved) && language !== "en") {
    return parseTags(resolveLocalizedValue(tags, "en"), "en");
  }
  if (!Array.isArray(resolved)) return undefined;
  const items = resolved
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => tag.trim());
  return items.length > 0 ? Array.from(new Set(items)) : undefined;
}

export async function loadExhibitContent(
  exhibitId: string,
  language: SupportedLanguage = "en",
): Promise<ExhibitContent | null> {
  try {
    const res = await fetch(exhibitContentUrl(exhibitId), { cache: "no-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!isRecord(data)) {
      return null;
    }
    const title = parseLocalizedString(data.title, language);
    const overview = parseLocalizedString(data.overview, language);
    const storyHtml = parseLocalizedString(data.storyHtml, language);
    if (!title || !overview || !storyHtml) return null;

    const content: ExhibitContent = {
      title,
      overview,
      storyHtml,
    };
    const subtitle = parseLocalizedString(data.subtitle, language);
    if (subtitle) content.subtitle = subtitle;
    const tags = parseTags(data.tags, language);
    if (tags) content.tags = tags;
    const metadata = parseMetadata(data.metadata, language);
    if (metadata) content.metadata = metadata;
    return content;
  } catch {
    return null;
  }
}

/**
 * 宽松版加载器：字段逐个独立解析，缺哪个跳哪个。
 * 供作品详情滚动页使用——内容稀疏的展品也应尽量呈现已有信息，
 * 整体 404 / 解析失败时才返回 null（页面降级为 manifest-only 模式）。
 */
export async function loadExhibitContentPartial(
  exhibitId: string,
  language: SupportedLanguage = "en",
): Promise<Partial<ExhibitContent> | null> {
  try {
    const res = await fetch(exhibitContentUrl(exhibitId), { cache: "no-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!isRecord(data)) return null;

    const content: Partial<ExhibitContent> = {};
    const title = parseLocalizedString(data.title, language);
    if (title) content.title = title;
    const subtitle = parseLocalizedString(data.subtitle, language);
    if (subtitle) content.subtitle = subtitle;
    const overview = parseLocalizedString(data.overview, language);
    if (overview) content.overview = overview;
    const storyHtml = parseLocalizedString(data.storyHtml, language);
    if (storyHtml) content.storyHtml = storyHtml;
    const tags = parseTags(data.tags, language);
    if (tags) content.tags = tags;
    const metadata = parseMetadata(data.metadata, language);
    if (metadata) content.metadata = metadata;
    return content;
  } catch {
    return null;
  }
}

export function formatExhibitIdFallback(exhibitId: string): string {
  return exhibitId.replace(/_/g, " ");
}
