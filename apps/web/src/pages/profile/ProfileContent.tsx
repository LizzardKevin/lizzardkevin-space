import { useMemo } from "react";
import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { profileContactLinks } from '../../content/profileContacts.ts';
import { ProfileSocialLinks } from './ProfileSocialLinks.tsx';
import { ContactIcon, ProfileContactPanel } from './ProfileContactPanel.tsx';
import "./profile-narrative.css";

const CHAPTERS = [
  { id: "profile-education", stage: "student", title: "Student", side: "left" },
  { id: "profile-architecture", stage: "career", title: "Career", side: "right" },
  { id: "profile-photography", stage: "photo", title: "Photo", side: "left" },
  { id: "profile-music", stage: "band", title: "Band", side: "right" },
  { id: "profile-culture", stage: "culture", title: "Cultural", side: "left" },
  { id: "profile-experiments", stage: "experiments", title: "Experimental", side: "right" },
] as const;

/** Desktop narrative; the complete biography remains in the localized content bundle. */
export function ProfileContent() {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const profile = useMemo(() => getLizzardKevinProfile(language), [language]);
  const { identity, sections } = profile;
  const links=useMemo(()=>profileContactLinks(profile.links,language),[profile.links,language]);
  const [name, handle] = identity.displayName.split(" / ");
  const contact = links.find(link => link.href?.startsWith("mailto:"));

  return <article className="profile-narrative" lang={language}>
    <section className="profile-narrative__stage profile-narrative__hero" id="profile-hero" data-profile-stage="hero">
      <div className="profile-narrative__identity">
        <p className="profile-narrative__kicker">{copy.profile.eyebrow}</p>
        <h1 className="profile-narrative__name">{name}{handle ? <span>{handle}</span> : null}</h1>
        <p className="profile-narrative__roles">{identity.roles.join(" / ")}</p>
        <p className="profile-narrative__bio">{identity.bio}</p>
        <div className="profile-narrative__identityMeta">
          <span><ContactIcon kind="pin"/>{language==='zh'?'所处 · 深圳':'Base · Shenzhen'}</span>
          {contact?.href ? <a href={contact.href}><ContactIcon kind="mail"/>{contact.value} <span aria-hidden="true">↗</span></a> : null}
        </div>
        <ProfileSocialLinks account="personal" language={language} />
        <p className="profile-narrative__scrollHint"><span aria-hidden="true">↓</span> {copy.scrollHint}</p>
      </div>
    </section>

    {CHAPTERS.map(chapter => {
      const section = sections.find(item => item.id === chapter.id);
      if (!section) return null;
      // Education and practice keep two factual notes; work inventories belong to the archive.
      const details = chapter.stage === "student" || chapter.stage === "career" ? section.details.slice(0, 2) : [];
      return <section key={chapter.id} id={chapter.id}
        className="profile-narrative__stage profile-narrative__chapter"
        data-profile-stage={chapter.stage} data-reading-side={chapter.side}
        aria-labelledby={`${chapter.id}-title`}>
        <div className="profile-narrative__island">
          <p className="profile-narrative__kicker"><span>{section.number}</span><span aria-hidden="true">/</span>{chapter.title}</p>
          <h2 className="profile-narrative__title" id={`${chapter.id}-title`}>
            {language === "en" ? chapter.title : section.title}
          </h2>
          <p className="profile-narrative__subtitle">{section.subtitle}</p>
          <p className="profile-narrative__summary">{section.summary}</p>
          {chapter.stage==='band'?<ProfileSocialLinks account="band" language={language} />:null}
          {details.length > 0 ? <ul className="profile-narrative__details">
            {details.map(detail => <li key={detail}>{detail}</li>)}
          </ul> : null}
        </div>
      </section>;
    })}

    <section className="profile-narrative__stage profile-narrative__contacts" id="profile-links"
      data-profile-stage="links" aria-labelledby="profile-links-title">
      <div className="profile-narrative__contactBody">
        <p className="profile-narrative__kicker">07 / {language === "en" ? "Contact" : "联系"}</p>
        <h2 className="profile-narrative__title" id="profile-links-title">{copy.profile.linksTitle}</h2>
        <ProfileContactPanel links={links} language={language}/>
      </div>
    </section>
  </article>;
}
