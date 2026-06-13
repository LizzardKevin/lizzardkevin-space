export type SplitArchiveDetailGroup = {
  title: string;
  items: string[];
};

export type SplitArchiveItem = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  tags: string[];
  detailGroups: SplitArchiveDetailGroup[];
  note?: {
    title: string;
    body: string;
  };
};

export type SplitArchiveTab = "lizzardkevin" | "devStories";

export type SplitArchivePanel = {
  tab: SplitArchiveTab;
  label: string;
  title: string;
  eyebrow: string;
  description: string;
  items: SplitArchiveItem[];
  defaultItemId: string;
};
