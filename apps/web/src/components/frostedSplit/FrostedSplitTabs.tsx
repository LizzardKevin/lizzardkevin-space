import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type WheelEvent } from "react";
import { splitArchivePanels } from "./splitArchiveData";
import type {
  SplitArchiveItem,
  SplitArchivePanel,
  SplitArchiveTab,
} from "./splitArchiveTypes";
import {
  createWheelPagingState,
  resolveWheelPaging,
  type WheelPagingDirection,
  type WheelPagingState,
} from "./wheelPaging";

type FrostedSplitTabsProps = {
  initialTab: SplitArchiveTab;
  onSelectTab?: (tab: SplitArchiveTab) => void;
};

type StageMotion = {
  nonce: number;
  pageDirection: WheelPagingDirection | null;
  reboundDirection: WheelPagingDirection | null;
};

function getInitialItemId(panel: SplitArchivePanel) {
  return panel.defaultItemId || panel.items[0]?.id || "";
}

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0;
  if (index < 0) return total - 1;
  if (index >= total) return 0;
  return index;
}

function getNextIndex(currentIndex: number, total: number, key: string) {
  if (key === "Home") return 0;
  if (key === "End") return Math.max(0, total - 1);
  if (key === "ArrowDown" || key === "ArrowRight") return clampIndex(currentIndex + 1, total);
  if (key === "ArrowUp" || key === "ArrowLeft") return clampIndex(currentIndex - 1, total);
  return currentIndex;
}

function ArchiveIndex({
  panel,
  selectedItem,
  onSelectItem,
}: {
  panel: SplitArchivePanel;
  selectedItem: SplitArchiveItem;
  onSelectItem: (itemId: string) => void;
}) {
  const selectedIndex = Math.max(
    0,
    panel.items.findIndex((item) => item.id === selectedItem.id),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = panel.items[getNextIndex(selectedIndex, panel.items.length, event.key)];
    if (next) onSelectItem(next.id);
  };

  return (
    <nav className="frosted-split__index" aria-label={`${panel.title} index`} onKeyDown={onKeyDown}>
      <div className="frosted-split__indexHeader">
        <span>Index</span>
        <strong>{panel.items.length.toString().padStart(2, "0")}</strong>
      </div>
      <div className="frosted-split__indexList">
        {panel.items.map((item) => {
          const active = item.id === selectedItem.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`frosted-split__indexButton${active ? " frosted-split__indexButton--active" : ""}`}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelectItem(item.id)}
            >
              <span>{item.number}</span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DetailGroups({ item }: { item: SplitArchiveItem }) {
  return (
    <div className="frosted-split__detailGroups">
      {item.detailGroups.map((group) => (
        <details key={group.title} className="frosted-split__detailGroup">
          <summary>
            <span>{group.title}</span>
            <strong>{group.items.length.toString().padStart(2, "0")}</strong>
          </summary>
          <ul>
            {group.items.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </details>
      ))}
      {item.note ? (
        <details className="frosted-split__detailGroup frosted-split__detailGroup--note">
          <summary>
            <span>{item.note.title}</span>
            <strong>01</strong>
          </summary>
          <p>{item.note.body}</p>
        </details>
      ) : null}
    </div>
  );
}

function ArchivePanel({
  panel,
  active,
  motion,
  selectedItem,
  onSelectItem,
  onActivate,
  onStageWheel,
}: {
  panel: SplitArchivePanel;
  active: boolean;
  motion: StageMotion;
  selectedItem: SplitArchiveItem;
  onSelectItem: (itemId: string) => void;
  onActivate: () => void;
  onStageWheel: (event: WheelEvent<HTMLElement>) => void;
}) {
  const stageMotionClass = motion.reboundDirection
    ? ` frosted-split__stage--rebound-${motion.reboundDirection}`
    : motion.pageDirection
      ? ` frosted-split__stage--page-${motion.pageDirection}`
      : "";

  return (
    <section
      className={`frosted-split__panel frosted-split__panel--${panel.tab}${active ? " frosted-split__panel--active" : " frosted-split__panel--strip"}`}
      data-cursor-tone={panel.tab === "lizzardkevin" ? "light" : "dark"}
      aria-label={panel.title}
    >
      <button
        type="button"
        className="frosted-split__stripButton"
        aria-label={`Open ${panel.title}`}
        onClick={onActivate}
        tabIndex={active ? -1 : 0}
      >
        <strong>{panel.title}</strong>
      </button>

      <div className="frosted-split__content" aria-hidden={active ? undefined : "true"}>
        <header className="frosted-split__header">
          <p>{panel.eyebrow}</p>
          <h1>{panel.title}</h1>
          <span>{panel.description}</span>
        </header>

        <div className="frosted-split__body">
          <ArchiveIndex panel={panel} selectedItem={selectedItem} onSelectItem={onSelectItem} />

          <main
            className={`frosted-split__stage${stageMotionClass}`}
            key={`${selectedItem.id}-${motion.nonce}`}
            onWheel={onStageWheel}
            aria-live="polite"
          >
            <div className="frosted-split__stageMeta">
              <span>{selectedItem.number}</span>
              <span>{selectedItem.subtitle}</span>
            </div>
            <h2>{selectedItem.title}</h2>
            <p>{selectedItem.summary}</p>
            <div className="frosted-split__tags" aria-label={`${selectedItem.title} tags`}>
              {selectedItem.tags.slice(0, 5).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </main>

          <aside className="frosted-split__details" aria-label={`${selectedItem.title} details`}>
            <div className="frosted-split__detailsTop">
              <span>Detail</span>
              <strong>{selectedItem.number}</strong>
            </div>
            <DetailGroups item={selectedItem} />
          </aside>
        </div>
      </div>
    </section>
  );
}

export function FrostedSplitTabs({ initialTab, onSelectTab }: FrostedSplitTabsProps) {
  const [activeTab, setActiveTab] = useState<SplitArchiveTab>(initialTab);
  const [selectedIds, setSelectedIds] = useState<Record<SplitArchiveTab, string>>(() => ({
    lizzardkevin: getInitialItemId(splitArchivePanels.lizzardkevin),
    devStories: getInitialItemId(splitArchivePanels.devStories),
  }));
  const [stageMotion, setStageMotion] = useState<Record<SplitArchiveTab, StageMotion>>(() => ({
    lizzardkevin: { nonce: 0, pageDirection: null, reboundDirection: null },
    devStories: { nonce: 0, pageDirection: null, reboundDirection: null },
  }));
  const wheelPagingRefs = useRef<Record<SplitArchiveTab, WheelPagingState>>({
    lizzardkevin: createWheelPagingState(),
    devStories: createWheelPagingState(),
  });
  const motionTimerRefs = useRef<Record<SplitArchiveTab, number | null>>({
    lizzardkevin: null,
    devStories: null,
  });

  useEffect(() => {
    const timers = motionTimerRefs.current;
    return () => {
      if (timers.lizzardkevin !== null) window.clearTimeout(timers.lizzardkevin);
      if (timers.devStories !== null) window.clearTimeout(timers.devStories);
    };
  }, []);

  const selectedItems = useMemo(() => {
    return {
      lizzardkevin:
        splitArchivePanels.lizzardkevin.items.find((item) => item.id === selectedIds.lizzardkevin) ??
        splitArchivePanels.lizzardkevin.items[0],
      devStories:
        splitArchivePanels.devStories.items.find((item) => item.id === selectedIds.devStories) ??
        splitArchivePanels.devStories.items[0],
    };
  }, [selectedIds]);

  const setSelectedItem = useCallback((tab: SplitArchiveTab, itemId: string) => {
    setSelectedIds((current) => ({
      ...current,
      [tab]: itemId,
    }));
  }, []);

  const queueStageMotion = useCallback(
    (tab: SplitArchiveTab, direction: WheelPagingDirection, kind: "page" | "rebound") => {
      const currentTimer = motionTimerRefs.current[tab];
      if (currentTimer !== null) window.clearTimeout(currentTimer);

      setStageMotion((current) => ({
        ...current,
        [tab]: {
          nonce: current[tab].nonce + 1,
          pageDirection: kind === "page" ? direction : null,
          reboundDirection: kind === "rebound" ? direction : null,
        },
      }));

      motionTimerRefs.current[tab] = window.setTimeout(() => {
        motionTimerRefs.current[tab] = null;
        setStageMotion((current) => ({
          ...current,
          [tab]: {
            ...current[tab],
            pageDirection: null,
            reboundDirection: null,
          },
        }));
      }, kind === "page" ? 520 : 420);
    },
    [],
  );

  const handleStageWheel = useCallback(
    (tab: SplitArchiveTab, event: WheelEvent<HTMLElement>) => {
      if (activeTab !== tab) return;
      event.preventDefault();

      const panel = splitArchivePanels[tab];
      const selectedItem = selectedItems[tab];
      const currentIndex = Math.max(
        0,
        panel.items.findIndex((item) => item.id === selectedItem.id),
      );
      const outcome = resolveWheelPaging(wheelPagingRefs.current[tab], {
        currentIndex,
        deltaY: event.deltaY,
        nowMs: performance.now(),
        total: panel.items.length,
      });

      if (outcome.kind === "idle") return;
      queueStageMotion(tab, outcome.direction, outcome.kind === "select" ? "page" : "rebound");

      if (outcome.kind === "select") {
        const next = panel.items[outcome.nextIndex];
        if (next) setSelectedItem(tab, next.id);
      }
    },
    [activeTab, queueStageMotion, selectedItems, setSelectedItem],
  );

  const selectTab = (nextTab: SplitArchiveTab) => {
    setActiveTab(nextTab);
    onSelectTab?.(nextTab);
  };

  return (
    <div className={`frosted-split frosted-split--${activeTab}`}>
      <ArchivePanel
        panel={splitArchivePanels.lizzardkevin}
        active={activeTab === "lizzardkevin"}
        motion={stageMotion.lizzardkevin}
        selectedItem={selectedItems.lizzardkevin}
        onSelectItem={(itemId) => setSelectedItem("lizzardkevin", itemId)}
        onActivate={() => selectTab("lizzardkevin")}
        onStageWheel={(event) => handleStageWheel("lizzardkevin", event)}
      />
      <ArchivePanel
        panel={splitArchivePanels.devStories}
        active={activeTab === "devStories"}
        motion={stageMotion.devStories}
        selectedItem={selectedItems.devStories}
        onSelectItem={(itemId) => setSelectedItem("devStories", itemId)}
        onActivate={() => selectTab("devStories")}
        onStageWheel={(event) => handleStageWheel("devStories", event)}
      />
    </div>
  );
}
