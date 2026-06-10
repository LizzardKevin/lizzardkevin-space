import { useEffect, useState } from "react";
import { devStories } from "../content/devStories";

export function DevStoriesPage() {
  const [activeStoryId, setActiveStoryId] = useState(devStories[0]?.id ?? "");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-dev-story]"));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextId = visible?.target.id;
        if (nextId) setActiveStoryId(nextId);
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

  const scrollToStory = (storyId: string) => {
    document.getElementById(storyId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveStoryId(storyId);
  };

  return (
    <div className="overlay-tab-content overlay-tab-content--dev-stories">
      <header className="dev-stories__header">
        <p className="dev-stories__label">Development Stories</p>
        <h1>DevStories</h1>
        <p>
          这里不是一份只记录成果的 changelog。它把 LizzardKevin Space 从第一天到 Codex
          接管后的四段开发过程串起来，也保留那些性能问题、交互回退、资源加载失败和资产流程踩坑。
        </p>
      </header>

      <div className="dev-stories__layout">
        <nav className="dev-stories__rail" aria-label="DevStories timeline">
          {devStories.map((story) => {
            const isActive = story.id === activeStoryId;
            return (
              <button
                key={story.id}
                type="button"
                className={`dev-stories__railButton${isActive ? " dev-stories__railButton--active" : ""}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => scrollToStory(story.id)}
              >
                <span>{story.number}</span>
                <strong>{story.title}</strong>
                <small>{story.period}</small>
              </button>
            );
          })}
        </nav>

        <main className="dev-stories__feed">
          {devStories.map((story) => (
            <section key={story.id} id={story.id} className="dev-story" data-dev-story>
              <div className="dev-story__meta">
                <span>DevLog {story.number}</span>
                <span>{story.period}</span>
              </div>
              <h2>{story.title}</h2>
              <p className="dev-story__summary">{story.summary}</p>

              <div className="dev-story__tags" aria-label={`DevLog ${story.number} tags`}>
                {story.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="dev-story__columns">
                <StoryList title="Built" items={story.built} />
                <StoryList title="Trouble / Rollback" items={story.trouble} />
              </div>

              <div className="dev-story__next">
                <span>Next</span>
                <p>{story.next}</p>
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

function StoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="dev-story__list" aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
