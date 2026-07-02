import {
  lizzardKevinIdentity,
  lizzardKevinSections,
} from "../../content/lizzardKevinProfile";
import { devStories } from "../../content/devStories";
import type { SplitArchiveItem, SplitArchivePanel } from "./splitArchiveTypes";

const profileSubtitles: Record<string, string> = {
  "profile-education": "Pratt / Columbia",
  "profile-architecture": "Professional stage",
  "profile-photography": "Image archive",
  "profile-music": "Bass / live",
  "profile-culture": "References",
  "profile-experiments": "AI / web / writing",
};

function firstSentence(text: string) {
  const match = text.match(/^.*?[。.!?！？]/);
  return match?.[0] ?? text;
}

const profileOverview: SplitArchiveItem = {
  id: "profile-overview",
  number: "00",
  title: "Overview",
  subtitle: "LizzardKevin profile archive",
  summary:
    "Architecture, images, music, culture, AI workflow, and SPACE are kept as one quiet index.",
  tags: lizzardKevinIdentity.roles,
  detailGroups: [
    {
      title: "Current Signal",
      items: [
        "Architecture + creative technology practice between New York and Shanghai.",
        "Spatial design, photography, music, AI workflow, and personal culture archive.",
      ],
    },
    {
      title: "SPACE Layer",
      items: [
        "Use the index to move between archive sectors.",
        "Each sector can later become a visual, audio, or interactive exhibit.",
      ],
    },
  ],
  note: {
    title: "Archive Note",
    body:
      "This surface is the readable index for the personal SPACE. It stays spare first, then opens into detail only when selected.",
  },
};

const profileItems: SplitArchiveItem[] = [
  profileOverview,
  ...lizzardKevinSections.map((section) => ({
    id: section.id,
    number: section.number,
    title: section.title,
    subtitle: profileSubtitles[section.id] ?? section.subtitle,
    summary: firstSentence(section.summary),
    tags: section.tags,
    detailGroups: [
      { title: "Current Signal", items: section.details },
      { title: "SPACE Layer", items: section.fill },
    ],
    note: {
      title: "Archive Note",
      body: section.spaceUse,
    },
  })),
];

const devItems: SplitArchiveItem[] = [...devStories].reverse().map((story) => ({
  id: story.id,
  number: story.number,
  title: story.title,
  subtitle: story.period,
  summary: firstSentence(story.summary),
  tags: story.tags,
  detailGroups: [
    { title: "What I tuned", items: story.built },
    { title: "What got weird", items: story.trouble },
  ],
  note: {
    title: "Next note",
    body: story.next,
  },
}));

export const splitArchivePanels: Record<"lizzardkevin" | "devStories", SplitArchivePanel> = {
  lizzardkevin: {
    tab: "lizzardkevin",
    label: "Profile",
    title: "LizzardKevin",
    eyebrow: "Frosted profile archive",
    description:
      "A sparse profile index. The black DevStories edge stays visible until the process archive is called forward.",
    items: profileItems,
    defaultItemId: "profile-overview",
  },
  devStories: {
    tab: "devStories",
    label: "DevStories",
    title: "DevStories",
    eyebrow: "Personal build diary",
    description:
      "Loose notes on how SPACE keeps growing, including the bits I tuned, the things that got strange, and what I want to try next.",
    items: devItems,
    defaultItemId: devItems[0]?.id ?? "",
  },
};
