import { useEffect, useState } from "react";
import {
  loadManifest,
  type ExhibitManifestItem,
} from "../../exhibits/manifest";
import {
  loadExhibitContentPartial,
  type ExhibitContent,
} from "../../exhibits/exhibitContent";
import { isKnownExhibitId } from "../../content/lightweightExhibitIndex";
import type { SupportedLanguage } from "../../i18n/resolveInitialLanguage";

export type WorkDetailReady = {
  status: "ready";
  exhibit: ExhibitManifestItem;
  /** null = manifest-only 模式（content.json 缺失或解析失败） */
  content: Partial<ExhibitContent> | null;
  works: ExhibitManifestItem[];
  index: number;
};

export type WorkDetailState =
  | { status: "loading" }
  | { status: "not-found" }
  | WorkDetailReady;

type LoadedWorkDetail = {
  key: string;
  value: WorkDetailState;
};

/**
 * 作品详情页数据 hook：自 fetch manifest + content.json（不依赖 space boot）。
 * - exhibitId 不在已知清单 / 不在 manifest → not-found
 * - content.json 缺失 → content 为 null（manifest-only 降级）
 * - works 为 manifest 中全部已知展品，用于上一件/下一件循环导航
 */
export function useWorkDetail(
  exhibitId: string | undefined,
  language: SupportedLanguage,
): WorkDetailState {
  const validId = exhibitId && isKnownExhibitId(exhibitId) ? exhibitId : null;
  const key = `${validId}|${language}`;
  const [loaded, setLoaded] = useState<LoadedWorkDetail | null>(null);

  useEffect(() => {
    if (validId === null) return undefined;

    let cancelled = false;
    void (async () => {
      try {
        const [manifest, content] = await Promise.all([
          loadManifest(),
          loadExhibitContentPartial(validId, language),
        ]);
        if (cancelled) return;

        const works = manifest.exhibits.filter((item) =>
          isKnownExhibitId(item.exhibitId),
        );
        const index = works.findIndex((item) => item.exhibitId === validId);
        const value: WorkDetailState =
          index === -1
            ? { status: "not-found" }
            : { status: "ready", exhibit: works[index], content, works, index };
        setLoaded({ key: `${validId}|${language}`, value });
      } catch {
        if (!cancelled) {
          setLoaded({ key: `${validId}|${language}`, value: { status: "not-found" } });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [validId, language]);

  if (validId === null) return { status: "not-found" };
  if (loaded?.key === key) return loaded.value;
  return { status: "loading" };
}
