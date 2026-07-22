import { useMemo } from "react";
import { getLizzardKevinProfile } from "../../content/lizzardKevinProfile";
import { getScrollPagesCopy } from "../../content/scrollPagesCopy";
import { ScrollPageShell } from "../../scroll/ScrollPageShell";
import { usePageLanguage } from "../../scroll/usePageLanguage";
import { useScrubSections } from "../../scroll/useScrubSections";
import { Reveal } from "../../scroll/Reveal";
import { MosaicTitle } from "../../scroll/MosaicTitle";
import { DataStrip, SectionHeader, TagRow } from "../../scroll/primitives";

/**
 * /profile 个人信息页：垂直滚动流。
 * 数据全部来自 generatedProfileByLanguage（xlsx 内容管线生成）。
 */
export default function ProfileScrollPage() {
  const language = usePageLanguage();
  const copy = getScrollPagesCopy(language);
  const profile = useMemo(() => getLizzardKevinProfile(language), [language]);
  const { identity, links, sections } = profile;

  const anchors = useMemo(
    () => [
      ...sections.map((section) => ({ id: section.id, label: section.number })),
      { id: "profile-links", label: "LNK" },
    ],
    [sections],
  );

  useScrubSections(
    [{ selector: ".ark-psection", drift: 56 }],
    [sections],
  );

  return (
    <ScrollPageShell
      accent="teal"
      pageCode={copy.profile.pageCode}
      eyebrow={copy.profile.eyebrow}
      anchors={anchors}
      footerMeta={[identity.location, identity.status]}
      switchTarget={{
        href: "/devstories",
        code: "02",
        label: copy.switchToDevStories,
        side: "right",
        accent: "orange",
      }}
    >
      <section className="ark-hero" id="profile-hero">
        <p className="ark-hero__eyebrow">{copy.profile.eyebrow}</p>
        <MosaicTitle text={identity.displayName} className="ark-hero__title" as="h1" />
        <p className="ark-hero__subtitle">{identity.bio}</p>
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
        <span className="ark-hero__scrollHint">{copy.scrollHint}</span>
      </section>

      {sections.map((section) => (
        <section className="ark-psection" id={section.id} key={section.id}>
          <div className="ark-psection__rail">
            <span className="ark-psection__railNumber">{section.number}</span>
            <span className="ark-psection__railBar" aria-hidden="true" />
          </div>
          <div className="ark-psection__body">
            <Reveal>
              <SectionHeader title={section.title} subtitle={section.subtitle} />
            </Reveal>
            <Reveal>
              <p className="ark-psection__summary">{section.summary}</p>
            </Reveal>
            {section.details.length > 0 ? (
              <Reveal>
                <div>
                  <p className="ark-psection__blockLabel">{copy.profile.detailLabel}</p>
                  <ul className="ark-linelist">
                    {section.details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}
            {section.fill.length > 0 ? (
              <Reveal>
                <div>
                  <p className="ark-psection__blockLabel">{copy.profile.fillLabel}</p>
                  <ul className="ark-linelist">
                    {section.fill.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}
            {section.spaceUse ? (
              <Reveal>
                <div>
                  <p className="ark-psection__blockLabel">{copy.profile.spaceUseLabel}</p>
                  <p className="ark-psection__spaceUse">{section.spaceUse}</p>
                </div>
              </Reveal>
            ) : null}
            <TagRow tags={section.tags} />
          </div>
        </section>
      ))}

      {links.length > 0 ? (
        <section className="ark-links ark-section--lined" id="profile-links">
          <Reveal>
            <SectionHeader title={copy.profile.linksTitle} />
          </Reveal>
          <div className="ark-links__grid">
            {links.map((link) => {
              const inner = (
                <>
                  <span className="ark-links__label">{link.label}</span>
                  <span className="ark-links__value">
                    {link.value}
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
                  {inner}
                </a>
              ) : (
                <div key={`${link.label}-${link.value}`} className="ark-links__item">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </ScrollPageShell>
  );
}
