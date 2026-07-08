import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getDevStories } from "../../content/devStories";
import { generatedSplitArchiveCopy } from "../../generated/splitArchiveCopy.generated.ts";
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

const splitArchiveCopy = generatedSplitArchiveCopy as Record<SupportedLanguage, SplitArchiveChromeCopy>;

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
