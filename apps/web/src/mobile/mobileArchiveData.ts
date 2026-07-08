import {
  generatedMobileProjectItems,
  generatedMobileSkillEntries,
  generatedMobileTabs,
  generatedMobileTerminalCopy,
} from "../generated/mobileArchive.generated.ts";

export type MobileTabId = "projects" | "skills" | "soul" | "contact";

export type MobileProjectStageId =
  | "stage-student"
  | "stage-work"
  | "stage-music"
  | "stage-culture"
  | "stage-explore";

export type MobileProjectCategory =
  | "Study"
  | "Architecture"
  | "Music"
  | "Culture"
  | "Experiment";

export type MobileMediaKind = "image" | "audio" | "video" | "model" | "text";

export type MobileLocalizedText = {
  en: string;
  zh: string;
};

export type MobileProjectItem = {
  id: string;
  title: string;
  subtitle?: MobileLocalizedText;
  indexLabel: string;
  category: MobileProjectCategory;
  stageId: MobileProjectStageId;
  stageLabel: string;
  tags?: string[];
  summary: MobileLocalizedText;
  story?: MobileLocalizedText;
  signal: MobileLocalizedText;
  spaceLayer: MobileLocalizedText;
  archiveNote: MobileLocalizedText;
  mediaKind: MobileMediaKind;
  mediaStatus: MobileLocalizedText;
  imageUrls?: string[];
};

export type MobileSkillCategory = "ai" | "architecture" | "soft" | "digital" | "analog";

export type MobileSkillEntry = {
  id: string;
  label: string;
  category: MobileSkillCategory;
  summary: MobileLocalizedText;
};

export type MobileContactValue = {
  text: string;
  href?: string;
};

export type MobileContactLine = {
  label: string;
  values: MobileContactValue[];
};

export type MobileTerminalLanguage = "en" | "zh";

export type MobileTerminalTheme = "light" | "dark";

export type MobileTab = {
  id: MobileTabId;
  label: string;
};

export type MobileTerminalCopy = Record<
  MobileTerminalLanguage,
  {
    boot: { command: string; status: string };
    settings: {
      label: string;
      language: string;
      theme: string;
      english: string;
      chinese: string;
      light: string;
      dark: string;
    };
    aria: {
      settings: string;
      sections: string;
      museum: string;
      loading: string;
      idle: string;
    };
    projectDetails: {
      currentSignal: string;
      spaceLayer: string;
      archiveNote: string;
      tags: string;
      media: string;
      imageAlt: string;
    };
    projects: { command: string; lede: string };
    skills: { command: string; lede: string };
    soul: {
      command: string;
      bio: string;
      sections: { title: string; meta: string; summary: string; details: string[] }[];
    };
    contact: { command: string; name: string; roleLine: string; lines: MobileContactLine[]; note: string };
  }
>;

export const mobileTabs = generatedMobileTabs as MobileTab[];
export const mobileTerminalCopy = generatedMobileTerminalCopy as MobileTerminalCopy;
export const mobileProjectItems = generatedMobileProjectItems as MobileProjectItem[];
export const mobileSkillEntries = generatedMobileSkillEntries as MobileSkillEntry[];

export function getProjectItem(id: string): MobileProjectItem {
  return mobileProjectItems.find((item) => item.id === id) ?? mobileProjectItems[0];
}
