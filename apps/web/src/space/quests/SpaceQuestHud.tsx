import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { SPACE_QUEST_IDS, type SpaceQuestStore } from "./spaceQuests";

/** 全部完成后停留展开态的时长,之后收成单行徽章保持安静。 */
const SPACE_QUESTS_SETTLE_MS = 5200;

/**
 * 左上角探索目标面板:被动展示(pointer-events: none),完成即时打勾。
 * 动效只由状态翻转触发;reduced-motion 由 CSS 媒体查询收掉。
 */
export function SpaceQuestHud({
  store,
  visible,
}: {
  store: SpaceQuestStore;
  visible: boolean;
}) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getState);
  const { t } = useTranslation();
  const [settled, setSettled] = useState(false);

  // store 的完成态单调递增,allDone 不会回落,故只需一次性展开→收拢定时器。
  useEffect(() => {
    if (!snapshot.allDone) return;
    const timer = window.setTimeout(() => setSettled(true), SPACE_QUESTS_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [snapshot.allDone]);

  const currentId = SPACE_QUEST_IDS.find((id) => snapshot.quests[id].status !== "done") ?? null;

  return (
    <aside
      className="space-quests"
      data-visible={visible || undefined}
      data-settled={settled || undefined}
      aria-hidden={!visible}
    >
      <div className="space-quests__frame">
        <div className="space-quests__title">
          <span>{snapshot.allDone ? t("space.quests.allDone") : t("space.quests.title")}</span>
          <span className="space-quests__count">
            {snapshot.doneCount}/{snapshot.totalCount}
          </span>
        </div>
        <ul className="space-quests__list" aria-live="polite">
          {SPACE_QUEST_IDS.map((id) => {
            const quest = snapshot.quests[id];
            const done = quest.status === "done";
            const label =
              id === "exhibitTour"
                ? t("space.quests.exhibitTour", { count: quest.progress, target: quest.target })
                : id === "projectorControl"
                  ? t("space.quests.projectorControl")
                  : id === "skyGaze"
                    ? t("space.quests.skyGaze")
                    : t("space.quests.jumpUnlock");
            return (
              <li
                key={id}
                className="space-quests__row"
                data-done={done || undefined}
                data-current={id === currentId || undefined}
              >
                <span className="space-quests__check" aria-hidden />
                <span className="space-quests__label">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
