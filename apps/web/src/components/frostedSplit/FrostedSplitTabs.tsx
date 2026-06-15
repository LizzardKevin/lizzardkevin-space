import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { splitArchivePanels } from "./splitArchiveData";
import type {
  SplitArchiveItem,
  SplitArchivePanel,
  SplitArchiveTab,
} from "./splitArchiveTypes";
import {
  beginDragPaging,
  createDragPagingState,
  createWheelPagingState,
  getRelativeSelectionDirection,
  releaseDragPaging,
  resolveDragPaging,
  resolveWheelPaging,
  type DragPagingState,
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

function toDetailPanelId(id: string) {
  return `detail-${id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
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
  const [closedGroupIds, setClosedGroupIds] = useState<Set<string>>(() => new Set());

  const rows = useMemo(() => {
    const detailRows = item.detailGroups.map((group) => ({
      id: `${item.id}:group:${group.title}`,
      title: group.title,
      kind: "list" as const,
      items: group.items,
    }));

    if (!item.note) return detailRows;
    return [
      ...detailRows,
      {
        id: `${item.id}:note:${item.note.title}`,
        title: item.note.title,
        kind: "note" as const,
        body: item.note.body,
      },
    ];
  }, [item]);

  const toggleGroup = useCallback((groupId: string) => {
    setClosedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  return (
    <div className="frosted-split__detailGroups">
      {rows.map((row) => {
        const closed = closedGroupIds.has(row.id);
        const panelId = toDetailPanelId(row.id);
        return (
          <section
            key={row.id}
            className={`frosted-split__detailGroup${row.kind === "note" ? " frosted-split__detailGroup--note" : ""}${closed ? "" : " frosted-split__detailGroup--open"}`}
          >
            <button
              type="button"
              className="frosted-split__detailButton"
              aria-expanded={!closed}
              aria-controls={panelId}
              onClick={() => toggleGroup(row.id)}
            >
              <span>{row.title}</span>
              <strong className="frosted-split__detailToggle" aria-hidden="true" />
            </button>
            <div id={panelId} className="frosted-split__detailPanel">
              <div className="frosted-split__detailPanelInner">
                {row.kind === "list" ? (
                  <ul>
                    {row.items.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{row.body}</p>
                )}
              </div>
            </div>
          </section>
        );
      })}
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

function ArchivePanel({
  panel,
  active,
  motion,
  selectedItem,
  onSelectItem,
  onActivate,
  onStagePointerCancel,
  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp,
  onStageWheel,
}: {
  panel: SplitArchivePanel;
  active: boolean;
  motion: StageMotion;
  selectedItem: SplitArchiveItem;
  onSelectItem: (itemId: string) => void;
  onActivate: () => void;
  onStagePointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onStagePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onStagePointerMove: (event: PointerEvent<HTMLElement>) => void;
  onStagePointerUp: (event: PointerEvent<HTMLElement>) => void;
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
            onPointerCancel={onStagePointerCancel}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
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
            <DetailGroups key={selectedItem.id} item={selectedItem} />
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
  const wheelPagingRefs = useRef<Record<SplitArchiveTab, WheelPagingState>>({
    lizzardkevin: createWheelPagingState(),
    devStories: createWheelPagingState(),
  });
  const dragPagingRefs = useRef<Record<SplitArchiveTab, DragPagingState>>({
    lizzardkevin: createDragPagingState(),
    devStories: createDragPagingState(),
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

  const clearMotionTimer = useCallback((tab: SplitArchiveTab) => {
    const currentTimer = motionTimerRefs.current[tab];
    if (currentTimer !== null) {
      window.clearTimeout(currentTimer);
      motionTimerRefs.current[tab] = null;
    }
  }, []);

  const queueTrackingMotion = useCallback(
    (tab: SplitArchiveTab, direction: WheelPagingDirection, progress: number, autoSettle = true) => {
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

      if (!autoSettle) return;

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

  const queueSettleMotion = useCallback((tab: SplitArchiveTab) => {
    const currentTimer = motionTimerRefs.current[tab];
    if (currentTimer !== null) window.clearTimeout(currentTimer);

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
  }, []);

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

  const selectArchiveItem = useCallback(
    (tab: SplitArchiveTab, itemId: string) => {
      const panel = splitArchivePanels[tab];
      const selectedItem = selectedItems[tab];
      const currentIndex = Math.max(
        0,
        panel.items.findIndex((item) => item.id === selectedItem.id),
      );
      const nextIndex = panel.items.findIndex((item) => item.id === itemId);
      const next = panel.items[nextIndex];
      const direction = getRelativeSelectionDirection(currentIndex, nextIndex);
      if (!next || !direction || stageMotion[tab].mode === "transition") return;

      wheelPagingRefs.current[tab] = createWheelPagingState();
      dragPagingRefs.current[tab] = createDragPagingState();
      queueStageTransition(tab, direction, selectedItem, next);
    },
    [queueStageTransition, selectedItems, stageMotion],
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
      if (outcome.kind === "idle" || outcome.kind === "locked" || outcome.kind === "settle") return;
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

  const handleStagePointerDown = useCallback(
    (tab: SplitArchiveTab, event: PointerEvent<HTMLElement>) => {
      if (activeTab !== tab || event.button !== 0 || stageMotion[tab].mode === "transition") return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragPagingRefs.current[tab] = createDragPagingState();
      beginDragPaging(dragPagingRefs.current[tab], {
        nowMs: performance.now(),
        pointerY: event.clientY,
      });
    },
    [activeTab, stageMotion],
  );

  const handleStagePointerMove = useCallback(
    (tab: SplitArchiveTab, event: PointerEvent<HTMLElement>) => {
      if (activeTab !== tab || stageMotion[tab].mode === "transition") return;

      const panel = splitArchivePanels[tab];
      const selectedItem = selectedItems[tab];
      const currentIndex = Math.max(
        0,
        panel.items.findIndex((item) => item.id === selectedItem.id),
      );
      const outcome = resolveDragPaging(dragPagingRefs.current[tab], {
        currentIndex,
        pointerY: event.clientY,
        total: panel.items.length,
      });

      if (outcome.kind === "idle" || outcome.kind === "locked" || outcome.kind === "settle") return;
      if (outcome.kind === "track") {
        queueTrackingMotion(tab, outcome.direction, outcome.progress, false);
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

  const handleStagePointerUp = useCallback(
    (tab: SplitArchiveTab, event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const outcome = releaseDragPaging(dragPagingRefs.current[tab]);
      if (outcome.kind === "settle" && stageMotion[tab].mode === "tracking") {
        queueSettleMotion(tab);
      }
    },
    [queueSettleMotion, stageMotion],
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
        onSelectItem={(itemId) => selectArchiveItem("lizzardkevin", itemId)}
        onActivate={() => selectTab("lizzardkevin")}
        onStagePointerCancel={(event) => handleStagePointerUp("lizzardkevin", event)}
        onStagePointerDown={(event) => handleStagePointerDown("lizzardkevin", event)}
        onStagePointerMove={(event) => handleStagePointerMove("lizzardkevin", event)}
        onStagePointerUp={(event) => handleStagePointerUp("lizzardkevin", event)}
        onStageWheel={(event) => handleStageWheel("lizzardkevin", event)}
      />
      <ArchivePanel
        panel={splitArchivePanels.devStories}
        active={activeTab === "devStories"}
        motion={stageMotion.devStories}
        selectedItem={selectedItems.devStories}
        onSelectItem={(itemId) => selectArchiveItem("devStories", itemId)}
        onActivate={() => selectTab("devStories")}
        onStagePointerCancel={(event) => handleStagePointerUp("devStories", event)}
        onStagePointerDown={(event) => handleStagePointerDown("devStories", event)}
        onStagePointerMove={(event) => handleStagePointerMove("devStories", event)}
        onStagePointerUp={(event) => handleStagePointerUp("devStories", event)}
        onStageWheel={(event) => handleStageWheel("devStories", event)}
      />
    </div>
  );
}
