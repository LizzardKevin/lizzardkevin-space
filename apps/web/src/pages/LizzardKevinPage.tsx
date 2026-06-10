import { useEffect, useState } from "react";
import {
  lizzardKevinIdentity,
  lizzardKevinLinks,
  lizzardKevinSections,
} from "../content/lizzardKevinProfile";

export function LizzardKevinPage() {
  const [activeSectionId, setActiveSectionId] = useState(lizzardKevinSections[0]?.id ?? "");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-profile-section]"));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextId = visible?.target.id;
        if (nextId) setActiveSectionId(nextId);
      },
      {
        root: null,
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0.18, 0.35, 0.55, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveSectionId(sectionId);
  };

  return (
    <div className="overlay-tab-content overlay-tab-content--profile">
      <header className="profile-page__header">
        <div>
          <p className="profile-page__label">Personal Resume</p>
          <h1>{lizzardKevinIdentity.name}</h1>
        </div>

        <div className="profile-page__identity">
          <p>{lizzardKevinIdentity.bio}</p>
          <div className="profile-page__roles" aria-label="LizzardKevin roles">
            {lizzardKevinIdentity.roles.map((role) => (
              <span key={role}>{role}</span>
            ))}
          </div>
          <div className="profile-page__status">
            <span>{lizzardKevinIdentity.location}</span>
            <span>{lizzardKevinIdentity.status}</span>
          </div>
        </div>
      </header>

      <section className="profile-page__links" aria-label="Contact and profile links">
        {lizzardKevinLinks.map((link) => (
          <a
            key={link.label}
            href={link.href ?? undefined}
            aria-disabled={!link.href}
            onClick={(event) => {
              if (!link.href) event.preventDefault();
            }}
          >
            <span>{link.label}</span>
            <strong>{link.value}</strong>
          </a>
        ))}
      </section>

      <div className="profile-page__layout">
        <nav className="profile-page__rail" aria-label="LizzardKevin profile sections">
          {lizzardKevinSections.map((section) => {
            const isActive = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                className={`profile-page__railButton${isActive ? " profile-page__railButton--active" : ""}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => scrollToSection(section.id)}
              >
                <span>{section.number}</span>
                <strong>{section.title}</strong>
                <small>{section.subtitle}</small>
              </button>
            );
          })}
        </nav>

        <main className="profile-page__feed">
          {lizzardKevinSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="profile-section"
              data-profile-section
            >
              <div className="profile-section__meta">
                <span>{section.number}</span>
                <span>{section.subtitle}</span>
              </div>
              <h2>{section.title}</h2>
              <p className="profile-section__summary">{section.summary}</p>

              <div className="profile-section__tags" aria-label={`${section.title} tags`}>
                {section.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="profile-section__columns">
                <ProfileList title="Show" items={section.details} />
                <ProfileList title="Fill In" items={section.fill} />
              </div>

              <div className="profile-section__space">
                <span>SPACE</span>
                <p>{section.spaceUse}</p>
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

function ProfileList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="profile-section__list" aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
