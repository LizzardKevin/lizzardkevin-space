import type { SpacePlayerPose } from "./spaceDailyResume";

export function flushSpacePoseOnPageHide({
  dailyResumeEnabled,
  pose,
  writeDaily,
  writeSession,
}: {
  dailyResumeEnabled: boolean;
  pose: SpacePlayerPose | null;
  writeDaily: (pose: SpacePlayerPose) => void;
  writeSession: (pose: SpacePlayerPose) => void;
}) {
  if (!pose) return;
  writeSession(pose);
  if (dailyResumeEnabled) writeDaily(pose);
}
