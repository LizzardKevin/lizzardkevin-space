import { useMemo } from "react";
import { ArkGlassTile } from "../../components/ArkGlassTile";
import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { useSectionReadProgress } from "../../scroll/useSectionReadProgress";
import { AsciiText } from "../../scroll/AsciiText";
import { Link } from "react-router-dom";
import { workRoute } from "../../app/routeConfig";
import { MosaicTitle } from "../../scroll/MosaicTitle";
import { DataStrip, SectionHeader, TagRow } from "../../scroll/primitives";

function ProfileLine({ line, language }: { line: string; language: "zh" | "en" }) {
  const work = /Tree Habitat/.test(line) ? { id: "arch_treehabitat", title: "Tree Habitat" }
    : /UABB/.test(line) ? { id: "arch_uabb_exhibit", title: "UABB" } : null;
  const label = language === "zh" ? "查看作品" : "VIEW WORK";
  return <li>
    <AsciiText text={line} />
    {work ? <Link className="ark-profile-worklink" to={workRoute(work.id)} aria-label={`${label}: ${work.title}`}>
      <AsciiText text={`[ ${label} ↗ ]`} />
    </Link> : null}
  </li>;
}

/**
 * 个人档案内容（ArchiveHub 的 profile 面板）。
 * 数据全部来自 generatedProfileByLanguage（xlsx 内容管线生成）。
 */
export function ProfileContent({ titleEpoch = "initial" }: { titleEpoch?: string }) {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const profile = useMemo(() => getLizzardKevinProfile(language), [language]);
  const { identity, links, sections } = profile;

  useSectionReadProgress(".ark-psection", ".ark-psection__railBar", [sections]);

  return (
    <>
      <section className="ark-hero" id="profile-hero">
        <p className="ark-hero__eyebrow"><AsciiText text={copy.profile.eyebrow} /></p>
        <MosaicTitle key={titleEpoch} accent="#e8d44d" text={identity.displayName} className="ark-hero__title" as="h1" />
        <p className="ark-hero__subtitle"><AsciiText text={identity.bio} /></p>
        <div className="ark-profile-roles">
          <TagRow tags={identity.roles} />
        </div>
        <DataStrip
          className="ark-hero__meta"
          items={[
            { label: "LOCATION", value: identity.location },
            { label: "STATUS", value: identity.status },
          ]}
        />
        <span className="ark-hero__scrollHint"><AsciiText text={copy.scrollHint} /></span>
      </section>

      {sections.map((section) => (
        <section className="ark-psection" id={section.id} key={section.id}>
          <div className="ark-psection__rail">
            <div className="ark-psection__railInner">
              <span className="ark-psection__railNumber"><AsciiText text={section.number} /></span>
              <span className="ark-psection__railTitle"><AsciiText text={section.title} /></span>
              <span className="ark-psection__railBar" aria-hidden="true" />
            </div>
          </div>
          <div className="ark-psection__body">
            <>
              <SectionHeader title={section.title} subtitle={section.subtitle} />
            </>
            <>
              <p className="ark-psection__summary"><AsciiText text={section.summary} /></p>
            </>
            {section.details.length > 0 ? (
              <>
                <div>
                  <p className="ark-psection__blockLabel"><AsciiText text={copy.profile.detailLabel} /></p>
                  <ul className="ark-linelist">
                    {section.details.map((line) => (
                      <ProfileLine key={line} line={line} language={language} />
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
            {section.fill.length > 0 ? (
              <>
                <div>
                  <p className="ark-psection__blockLabel"><AsciiText text={copy.profile.fillLabel} /></p>
                  <ul className="ark-linelist">
                    {section.fill.map((line) => (
                      <ProfileLine key={line} line={line} language={language} />
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
            {section.spaceUse && section.spaceUse !== section.summary ? (
              <>
                <div>
                  <p className="ark-psection__blockLabel"><AsciiText text={copy.profile.spaceUseLabel} /></p>
                  <p className="ark-psection__spaceUse"><AsciiText text={section.spaceUse} /></p>
                </div>
              </>
            ) : null}
            <TagRow tags={section.tags} />
          </div>
        </section>
      ))}

      {links.length > 0 ? (
        <section className="ark-links ark-section--lined" id="profile-links">
          <>
            <SectionHeader title={copy.profile.linksTitle} />
          </>
          <div className="ark-links__grid">
            {links.map((link) => {
              const inner = (
                <>
                  <span className="ark-links__label"><AsciiText text={link.label} /></span>
                  <span className="ark-links__value">
                    <AsciiText text={link.value} />
                    {link.href ? (
                      <span className="ark-links__arrow" aria-hidden="true">↗</span>
                    ) : null}
                  </span>
                </>
              );
              return link.href ? (
                <a
                  key={`${link.label}-${link.value}`}
                  className="ark-links__item"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArkGlassTile className="ark-links__glass" variant="link">
                    {inner}
                  </ArkGlassTile>
                </a>
              ) : (
                <div key={`${link.label}-${link.value}`} className="ark-links__item">
                  <ArkGlassTile className="ark-links__glass" variant="link">
                    {inner}
                  </ArkGlassTile>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
