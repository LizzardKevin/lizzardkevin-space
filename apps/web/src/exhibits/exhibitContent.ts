export type ExhibitContent = {
  title: string;
  overview: string;
  storyHtml: string;
};

export function exhibitContentUrl(exhibitId: string): string {
  return `/exhibits/${exhibitId}/content.json`;
}

export async function loadExhibitContent(exhibitId: string): Promise<ExhibitContent | null> {
  try {
    const res = await fetch(exhibitContentUrl(exhibitId), { cache: "no-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as ExhibitContent;
    if (!data.title || typeof data.overview !== "string" || typeof data.storyHtml !== "string") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function formatExhibitIdFallback(exhibitId: string): string {
  return exhibitId.replace(/_/g, " ");
}
