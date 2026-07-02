import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getDevStories } from "../../content/devStories";
import type { SupportedLanguage } from "../../i18n/resolveInitialLanguage";
import type { SplitArchiveItem, SplitArchivePanel } from "./splitArchiveTypes";

type SplitArchiveChromeCopy = {
  index: string;
  openPanel: string;
  currentSignal: string;
  spaceLayer: string;
  archiveNote: string;
  whatITuned: string;
  whatGotWeird: string;
  nextNote: string;
  profile: {
    label: string;
    title: string;
    eyebrow: string;
    description: string;
    overviewTitle: string;
    overviewSubtitle: string;
    overviewSummary: string;
    overviewSignal: string[];
    overviewLayer: string[];
    overviewNote: string;
  };
  devStories: {
    label: string;
    title: string;
    eyebrow: string;
    description: string;
  };
  profileSubtitles: Record<string, string>;
};

const splitArchiveCopy = {
  en: {
    index: "Index",
    openPanel: "Open {{title}}",
    currentSignal: "Current Signal",
    spaceLayer: "SPACE Layer",
    archiveNote: "Archive Note",
    whatITuned: "What I tuned",
    whatGotWeird: "What got weird",
    nextNote: "Next note",
    profile: {
      label: "Profile",
      title: "LizzardKevin",
      eyebrow: "Frosted profile archive",
      description:
        "A sparse profile index. The black DevStories edge stays visible until the process archive is called forward.",
      overviewTitle: "Overview",
      overviewSubtitle: "LizzardKevin profile archive",
      overviewSummary:
        "Architecture, images, music, culture, AI workflow, and SPACE are kept as one quiet index.",
      overviewSignal: [
        "Architecture + creative technology practice between New York and Shanghai.",
        "Spatial design, photography, music, AI workflow, and personal culture archive.",
      ],
      overviewLayer: [
        "Use the index to move between archive sectors.",
        "Each sector can later become a visual, audio, or interactive exhibit.",
      ],
      overviewNote:
        "This surface is the readable index for the personal SPACE. It stays spare first, then opens into detail only when selected.",
    },
    devStories: {
      label: "DevStories",
      title: "DevStories",
      eyebrow: "Personal build diary",
      description:
        "Loose notes on how SPACE keeps growing, including the bits I tuned, the things that got strange, and what I want to try next.",
    },
    profileSubtitles: {
      "profile-education": "Pratt / Columbia",
      "profile-architecture": "Professional stage",
      "profile-photography": "Image archive",
      "profile-music": "Bass / live",
      "profile-culture": "References",
      "profile-experiments": "AI / web / writing",
    },
  },
  zh: {
    index: "索引",
    openPanel: "打开 {{title}}",
    currentSignal: "当前信号",
    spaceLayer: "SPACE 层级",
    archiveNote: "档案备注",
    whatITuned: "我调了什么",
    whatGotWeird: "哪里变奇怪了",
    nextNote: "下一条备注",
    profile: {
      label: "Profile",
      title: "LizzardKevin",
      eyebrow: "个人档案",
      description:
        "一个稀疏的个人索引。黑色 DevStories 边缘会一直露出，直到过程档案被拉到前景。",
      overviewTitle: "总览",
      overviewSubtitle: "LizzardKevin 个人档案索引",
      overviewSummary:
        "建筑、图像、音乐、文化、AI workflow 和 SPACE 被收纳在同一个安静索引里。",
      overviewSignal: [
        "位于 New York / Shanghai 之间的建筑 + creative technology 实践。",
        "空间设计、摄影、音乐、AI workflow 和个人文化档案。",
      ],
      overviewLayer: [
        "用这个索引在不同档案区之间移动。",
        "每个区域之后都可以继续展开成视觉、声音或交互展品。",
      ],
      overviewNote:
        "这个界面是个人 SPACE 的可读索引。它先保持克制，只有被选中时才展开细节。",
    },
    devStories: {
      label: "DevStories",
      title: "DevStories",
      eyebrow: "个人建造日志",
      description:
        "记录 SPACE 如何继续生长：调过的东西、变奇怪的地方，以及下一步想试什么。",
    },
    profileSubtitles: {
      "profile-education": "Pratt / Columbia",
      "profile-architecture": "职业阶段",
      "profile-photography": "图像档案",
      "profile-music": "贝斯 / 现场",
      "profile-culture": "参考来源",
      "profile-experiments": "AI / web / 写作",
    },
  },
} satisfies Record<SupportedLanguage, SplitArchiveChromeCopy>;

export function getSplitArchiveChromeCopy(language: SupportedLanguage): SplitArchiveChromeCopy {
  return splitArchiveCopy[language] ?? splitArchiveCopy.en;
}

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

export function formatOpenPanelLabel(language: SupportedLanguage, title: string) {
  return interpolate(getSplitArchiveChromeCopy(language).openPanel, { title });
}

function firstSentence(text: string) {
  const match = text.match(/^.*?[。.!?！？]/);
  return match?.[0] ?? text;
}

export function buildSplitArchivePanels(
  language: SupportedLanguage,
): Record<"lizzardkevin" | "devStories", SplitArchivePanel> {
  const copy = getSplitArchiveChromeCopy(language);
  const profile = getLizzardKevinProfile(language);
  const profileOverview: SplitArchiveItem = {
    id: "profile-overview",
    number: "00",
    title: copy.profile.overviewTitle,
    subtitle: copy.profile.overviewSubtitle,
    summary: copy.profile.overviewSummary,
    tags: profile.identity.roles,
    detailGroups: [
      {
        title: copy.currentSignal,
        items: copy.profile.overviewSignal,
      },
      {
        title: copy.spaceLayer,
        items: copy.profile.overviewLayer,
      },
    ],
    note: {
      title: copy.archiveNote,
      body: copy.profile.overviewNote,
    },
  };

  const profileItems: SplitArchiveItem[] = [
    profileOverview,
    ...profile.sections.map((section) => ({
      id: section.id,
      number: section.number,
      title: section.title,
      subtitle: copy.profileSubtitles[section.id] ?? section.subtitle,
      summary: firstSentence(section.summary),
      tags: section.tags,
      detailGroups: [
        { title: copy.currentSignal, items: section.details },
        { title: copy.spaceLayer, items: section.fill },
      ],
      note: {
        title: copy.archiveNote,
        body: section.spaceUse,
      },
    })),
  ];

  const devItems: SplitArchiveItem[] = [...getDevStories(language)].reverse().map((story) => ({
    id: story.id,
    number: story.number,
    title: story.title,
    subtitle: story.period,
    summary: firstSentence(story.summary),
    tags: story.tags,
    detailGroups: [
      { title: copy.whatITuned, items: story.built },
      { title: copy.whatGotWeird, items: story.trouble },
    ],
    note: {
      title: copy.nextNote,
      body: story.next,
    },
  }));

  return {
    lizzardkevin: {
      tab: "lizzardkevin",
      label: copy.profile.label,
      title: copy.profile.title,
      eyebrow: copy.profile.eyebrow,
      description: copy.profile.description,
      items: profileItems,
      defaultItemId: "profile-overview",
    },
    devStories: {
      tab: "devStories",
      label: copy.devStories.label,
      title: copy.devStories.title,
      eyebrow: copy.devStories.eyebrow,
      description: copy.devStories.description,
      items: devItems,
      defaultItemId: devItems[0]?.id ?? "",
    },
  };
}

export const splitArchivePanels = buildSplitArchivePanels("en");
