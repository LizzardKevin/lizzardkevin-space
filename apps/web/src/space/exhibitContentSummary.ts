import { publicAssetUrl } from "../platform/publicAssets";

/**
 * 展品 content.json 摘要(title/subtitle)按需加载 + 会话内缓存。
 * 供 SPACE 悬停提示使用:只在指针瞄准展品时拉取一次,不预载全部。
 */

export type SpaceExhibitContentSummary = {
  title: Record<string, string>;
  subtitle: Record<string, string>;
};

const summaryCache = new Map<string, SpaceExhibitContentSummary | null>();
const pendingRequests = new Map<string, Promise<SpaceExhibitContentSummary | null>>();

function isSummary(value: unknown): value is SpaceExhibitContentSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<SpaceExhibitContentSummary>;
  return !!summary.title && typeof summary.title === "object" && !!summary.subtitle && typeof summary.subtitle === "object";
}

export function fetchExhibitContentSummary(
  exhibitId: string,
): Promise<SpaceExhibitContentSummary | null> {
  if (summaryCache.has(exhibitId)) {
    return Promise.resolve(summaryCache.get(exhibitId) ?? null);
  }
  const pending = pendingRequests.get(exhibitId);
  if (pending) return pending;

  const request = fetch(publicAssetUrl(`/exhibits/${exhibitId}/content.json`))
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => {
      const summary = isSummary(data) ? data : null;
      summaryCache.set(exhibitId, summary);
      pendingRequests.delete(exhibitId);
      return summary;
    })
    .catch(() => {
      summaryCache.set(exhibitId, null);
      pendingRequests.delete(exhibitId);
      return null;
    });

  pendingRequests.set(exhibitId, request);
  return request;
}

/** content.json 的 {en, zh} 结构按当前语言取值,缺省回 en。 */
export function pickExhibitLocalizedText(
  texts: Record<string, string>,
  language: string | undefined,
): string {
  const key = language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  return texts[key] ?? texts.en ?? Object.values(texts)[0] ?? "";
}
