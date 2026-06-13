import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type WheelEvent,
} from "react";
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
  direction: WheelPagingDirection | null;
  fromItem: SplitArchiveItem | null;
  mode: "idle" | "tracking" | "settling" | "transition" | "rebound";
  nonce: number;
  toItem: SplitArchiveItem | null;
  trackingProgress: number;
};

function createIdleStageMotion(nonce = 0): StageMotion {
  return {
    direction: null,
    fromItem: null,
    mode: "idle",
    nonce,
    toItem: null,
    trackingProgress: 0,
  };
}

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

function getStageTrackOffset(direction: WheelPagingDirection | null, progress: number) {
  if (!direction) return 0;
  const distance = Math.min(Math.max(progress, 0), 1) * 46;
  return direction === "down" ? -distance : distance;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
            <strong className="frosted-split__detailToggle" aria-hidden="true" />
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
            <strong className="frosted-split__detailToggle" aria-hidden="true" />
          </summary>
          <p>{item.note.body}</p>
        </details>
      ) : null}
    </div>
  );
}

function StageContent({ item }: { item: SplitArchiveItem }) {
  return (
    <>
      <div className="frosted-split__stageMeta">
        <span>{item.number}</span>
        <span>{item.subtitle}</span>
      </div>
      <h2>{item.title}</h2>
      <p>{item.summary}</p>
      <div className="frosted-split__tags" aria-label={`${item.title} tags`}>
        {item.tags.slice(0, 5).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </>
  );
}

function getFoldedDetailCopy(tab: SplitArchiveTab) {
  return tab === "devStories" ? "Process detail is folded." : "Archive detail is folded.";
}

function ArchivePanel({
  panel,
  active,
  detailExpanded,
  motion,
  selectedItem,
  onSelectItem,
  onActivate,
  onToggleDetail,
  onStageWheel,
}: {
  panel: SplitArchivePanel;
  active: boolean;
  detailExpanded: boolean;
  motion: StageMotion;
  selectedItem: SplitArchiveItem;
  onSelectItem: (itemId: string) => void;
  onActivate: () => void;
  onToggleDetail: () => void;
  onStageWheel: (event: WheelEvent<HTMLElement>) => void;
}) {
  const stageMotionClass =
    motion.mode === "transition" && motion.direction
      ? ` frosted-split__stage--transition frosted-split__stage--transition-${motion.direction}`
      : motion.mode === "rebound" && motion.direction
        ? ` frosted-split__stage--rebound-${motion.direction}`
        : motion.mode === "tracking"
          ? " frosted-split__stage--tracking"
          : motion.mode === "settling"
            ? " frosted-split__stage--settling"
            : "";
  const stageStyle = {
    "--stage-track-y": `${getStageTrackOffset(motion.direction, motion.trackingProgress)}px`,
  } as CSSProperties;

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
            style={stageStyle}
            onWheel={onStageWheel}
            aria-live="polite"
          >
            {motion.mode === "transition" && motion.fromItem && motion.toItem ? (
              <>
                <div
                  key={`out-${motion.fromItem.id}-${motion.nonce}`}
                  className="frosted-split__stageLayer frosted-split__stageLayer--out"
                >
                  <StageContent item={motion.fromItem} />
                </div>
                <div
                  key={`in-${motion.toItem.id}-${motion.nonce}`}
                  className="frosted-split__stageLayer frosted-split__stageLayer--in"
                >
                  <StageContent item={motion.toItem} />
                </div>
              </>
            ) : (
              <div className="frosted-split__stageLayer frosted-split__stageLayer--single">
                <StageContent item={selectedItem} />
              </div>
            )}
          </main>

          <aside className="frosted-split__details" aria-label={`${selectedItem.title} details`}>
            <button
              type="button"
              className="frosted-split__detailsTop frosted-split__detailsTop--button"
              aria-expanded={detailExpanded}
              onClick={onToggleDetail}
            >
              <span>Detail</span>
              <strong className="frosted-split__detailMasterToggle" aria-hidden="true" />
            </button>
            {detailExpanded ? (
              <DetailGroups item={selectedItem} />
            ) : (
              <p className="frosted-split__detailFolded">{getFoldedDetailCopy(panel.tab)}</p>
            )}
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
    lizzardkevin: createIdleStageMotion(),
    devStories: createIdleStageMotion(),
  }));
  const [detailExpanded, setDetailExpanded] = useState<Record<SplitArchiveTab, boolean>>({
    lizzardkevin: true,
    devStories: true,
  });
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

  const toggleDetail = useCallback((tab: SplitArchiveTab) => {
    setDetailExpanded((current) => ({
      ...current,
      [tab]: !current[tab],
    }));
  }, []);

  const clearMotionTimer = useCallback((tab: SplitArchiveTab) => {
    const currentTimer = motionTimerRefs.current[tab];
    if (currentTimer !== null) {
      window.clearTimeout(currentTimer);
      motionTimerRefs.current[tab] = null;
    }
  }, []);

  const resetStageMotion = useCallback(
    (tab: SplitArchiveTab) => {
      clearMotionTimer(tab);
      setStageMotion((current) => ({
        ...current,
        [tab]: createIdleStageMotion(current[tab].nonce + 1),
      }));
    },
    [clearMotionTimer],
  );

  const selectArchiveItem = useCallback(
    (tab: SplitArchiveTab, itemId: string) => {
      wheelPagingRefs.current[tab] = createWheelPagingState();
      resetStageMotion(tab);
      setSelectedItem(tab, itemId);
    },
    [resetStageMotion, setSelectedItem],
  );

  const queueTrackingMotion = useCallback(
    (tab: SplitArchiveTab, direction: WheelPagingDirection, progress: number) => {
      const currentTimer = motionTimerRefs.current[tab];
      if (currentTimer !== null) window.clearTimeout(currentTimer);

      setStageMotion((current) => ({
        ...current,
        [tab]: {
          ...current[tab],
          direction,
          fromItem: null,
          mode: "tracking",
          toItem: null,
          trackingProgress: progress,
        },
      }));

      motionTimerRefs.current[tab] = window.setTimeout(() => {
        setStageMotion((current) => ({
          ...current,
          [tab]: {
            ...current[tab],
            mode: "settling",
            trackingProgress: 0,
          },
        }));

        motionTimerRefs.current[tab] = window.setTimeout(() => {
          motionTimerRefs.current[tab] = null;
          setStageMotion((current) => ({
            ...current,
            [tab]: createIdleStageMotion(current[tab].nonce),
          }));
        }, 260);
      }, 220);
    },
    [],
  );

  const queueReboundMotion = useCallback(
    (tab: SplitArchiveTab, direction: WheelPagingDirection) => {
      clearMotionTimer(tab);

      setStageMotion((current) => ({
        ...current,
        [tab]: {
          ...createIdleStageMotion(current[tab].nonce + 1),
          direction,
          mode: "rebound",
        },
      }));

      motionTimerRefs.current[tab] = window.setTimeout(() => {
        motionTimerRefs.current[tab] = null;
        setStageMotion((current) => ({
          ...current,
          [tab]: createIdleStageMotion(current[tab].nonce),
        }));
      }, 420);
    },
    [clearMotionTimer],
  );

  const queueStageTransition = useCallback(
    (
      tab: SplitArchiveTab,
      direction: WheelPagingDirection,
      fromItem: SplitArchiveItem,
      toItem: SplitArchiveItem,
    ) => {
      clearMotionTimer(tab);
      setSelectedItem(tab, toItem.id);

      if (prefersReducedMotion()) {
        setStageMotion((current) => ({
          ...current,
          [tab]: createIdleStageMotion(current[tab].nonce + 1),
        }));
        return;
      }

      setStageMotion((current) => ({
        ...current,
        [tab]: {
          direction,
          fromItem,
          mode: "transition",
          nonce: current[tab].nonce + 1,
          toItem,
          trackingProgress: 0,
        },
      }));

      motionTimerRefs.current[tab] = window.setTimeout(() => {
        motionTimerRefs.current[tab] = null;
        setStageMotion((current) => ({
          ...current,
          [tab]: createIdleStageMotion(current[tab].nonce),
        }));
      }, 560);
    },
    [clearMotionTimer, setSelectedItem],
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

      if (stageMotion[tab].mode === "transition") return;
      if (outcome.kind === "idle" || outcome.kind === "locked") return;
      if (outcome.kind === "track") {
        queueTrackingMotion(tab, outcome.direction, outcome.progress);
        return;
      }

      if (outcome.kind === "rebound") {
        queueReboundMotion(tab, outcome.direction);
        return;
      }

      if (outcome.kind === "select") {
        const next = panel.items[outcome.nextIndex];
        if (next) queueStageTransition(tab, outcome.direction, selectedItem, next);
      }
    },
    [activeTab, queueReboundMotion, queueStageTransition, queueTrackingMotion, selectedItems, stageMotion],
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
        detailExpanded={detailExpanded.lizzardkevin}
        motion={stageMotion.lizzardkevin}
        selectedItem={selectedItems.lizzardkevin}
        onSelectItem={(itemId) => selectArchiveItem("lizzardkevin", itemId)}
        onActivate={() => selectTab("lizzardkevin")}
        onToggleDetail={() => toggleDetail("lizzardkevin")}
        onStageWheel={(event) => handleStageWheel("lizzardkevin", event)}
      />
      <ArchivePanel
        panel={splitArchivePanels.devStories}
        active={activeTab === "devStories"}
        detailExpanded={detailExpanded.devStories}
        motion={stageMotion.devStories}
        selectedItem={selectedItems.devStories}
        onSelectItem={(itemId) => selectArchiveItem("devStories", itemId)}
        onActivate={() => selectTab("devStories")}
        onToggleDetail={() => toggleDetail("devStories")}
        onStageWheel={(event) => handleStageWheel("devStories", event)}
      />
    </div>
  );
}
