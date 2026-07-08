import { generatedProfileByLanguage } from "../generated/profile.generated.ts";
import type { SupportedLanguage } from "../i18n/resolveInitialLanguage";

export type ProfileLink = {
  label: string;
  value: string;
  href?: string;
};

export type ProfileSection = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  details: string[];
  fill: string[];
  spaceUse: string;
  tags: string[];
};

type ProfileIdentity = {
  name: string;
  displayName: string;
  roles: string[];
  location: string;
  status: string;
  bio: string;
};

type ProfileBundle = {
  identity: ProfileIdentity;
  links: ProfileLink[];
  sections: ProfileSection[];
};

const lizzardKevinProfileByLanguage = generatedProfileByLanguage as Record<SupportedLanguage, ProfileBundle>;

export function getLizzardKevinProfile(language: SupportedLanguage): ProfileBundle {
  return lizzardKevinProfileByLanguage[language] ?? lizzardKevinProfileByLanguage.en;
}

export const lizzardKevinIdentity = lizzardKevinProfileByLanguage.zh.identity;
export const lizzardKevinLinks = lizzardKevinProfileByLanguage.zh.links;
export const lizzardKevinSections = lizzardKevinProfileByLanguage.zh.sections;
