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

export function exhibitContentUrl(exhibitId: string): string {
  return `/exhibits/${exhibitId}/content.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMetadata(metadata: unknown): ExhibitContentMetadataItem[] | undefined {
  if (!Array.isArray(metadata)) return undefined;
  const items = metadata
    .filter(
      (item): item is ExhibitContentMetadataItem =>
        isRecord(item) && typeof item.label === "string" && typeof item.value === "string",
    )
    .map(({ label, value }) => ({ label, value }));
  return items.length > 0 ? items : undefined;
}

function parseTags(tags: unknown): string[] | undefined {
  if (!Array.isArray(tags)) return undefined;
  const items = tags
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => tag.trim());
  return items.length > 0 ? Array.from(new Set(items)) : undefined;
}

export async function loadExhibitContent(exhibitId: string): Promise<ExhibitContent | null> {
  try {
    const res = await fetch(exhibitContentUrl(exhibitId), { cache: "no-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (
      !isRecord(data) ||
      typeof data.title !== "string" ||
      typeof data.overview !== "string" ||
      typeof data.storyHtml !== "string"
    ) {
      return null;
    }
    const content: ExhibitContent = {
      title: data.title,
      overview: data.overview,
      storyHtml: data.storyHtml,
    };
    if (typeof data.subtitle === "string") content.subtitle = data.subtitle;
    const tags = parseTags(data.tags);
    if (tags) content.tags = tags;
    const metadata = parseMetadata(data.metadata);
    if (metadata) content.metadata = metadata;
    return content;
  } catch {
    return null;
  }
}

export function formatExhibitIdFallback(exhibitId: string): string {
  return exhibitId.replace(/_/g, " ");
}
