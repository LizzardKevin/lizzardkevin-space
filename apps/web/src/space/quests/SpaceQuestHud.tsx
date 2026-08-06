import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { spaceExplorationStore } from "./spaceQuests";

/**
 * 左上角探索提示:只显示暗示性名称,永不显示完成条件/进度/奖励。
 * 空心方格(未完成)→ 橙色实底 + 粗体 35% 文字(完成);无删除线、不重排、不隐藏。
 * 仅在 store active(引导完成 + 进入下坡走廊)且外层可见门允许时显示。
 */
export function SpaceQuestHud({ visible }: { visible: boolean }) {
  const snapshot = useSyncExternalStore(spaceExplorationStore.subscribe, spaceExplorationStore.getState);
  const { t } = useTranslation();
  const shown = visible && snapshot.phase === "active";

  return (
    <aside className="space-quests" data-visible={shown || undefined} aria-hidden={!shown}>
      <div className="space-quests__frame">
        <div className="space-quests__title">
          <span>{t("space.exploration.label")}</span>
          <span className="space-quests__count">
            {snapshot.doneCount}/{snapshot.totalCount}
          </span>
        </div>
        <ul className="space-quests__list" aria-live="polite">
          {snapshot.tasks.map((task) => {
            const done = task.status === "done";
            return (
              <li key={task.id} className="space-quests__row" data-done={done || undefined}>
                <span className="space-quests__check" aria-hidden />
                <span className="space-quests__label">{t(`space.exploration.tasks.${task.id}`)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
