export const SPACE_DAILY_RESUME_STORAGE_KEY = "spaceDailyResumeV1";

export type SpacePlayerPose = {
  position: [number, number, number];
  yawRad: number;
  pitchRad: number;
};

type SpaceDailyResumeRecord = {
  version: 1;
  localDate: string;
  savedAtMs: number;
  pose: SpacePlayerPose;
};

type SpaceResumeStorage = Pick<Storage, "getItem" | "setItem"> | null | undefined;
type ClearableSpaceResumeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined;

function getDefaultStorage(): SpaceResumeStorage {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPose(value: unknown): value is SpacePlayerPose {
  if (!value || typeof value !== "object") return false;
  const pose = value as SpacePlayerPose;
  return (
    Array.isArray(pose.position) &&
    pose.position.length === 3 &&
    pose.position.every(isFiniteNumber) &&
    isFiniteNumber(pose.yawRad) &&
    isFiniteNumber(pose.pitchRad)
  );
}

export function formatSpaceResumeLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shouldSaveSpaceDailyResume({
  onboardingCompleted,
  restoredFromDailyResume,
}: {
  onboardingCompleted: boolean;
  restoredFromDailyResume: boolean;
}) {
  return onboardingCompleted || restoredFromDailyResume;
}

export function readSpaceDailyResume(
  storage: SpaceResumeStorage = getDefaultStorage(),
  now = new Date(),
): SpacePlayerPose | null {
  try {
    const raw = storage?.getItem(SPACE_DAILY_RESUME_STORAGE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<SpaceDailyResumeRecord>;
    if (record.version !== 1) return null;
    if (record.localDate !== formatSpaceResumeLocalDate(now)) return null;
    if (!isFiniteNumber(record.savedAtMs)) return null;
    if (!isPose(record.pose)) return null;
    return record.pose;
  } catch {
    return null;
  }
}

export function writeSpaceDailyResume(
  storage: SpaceResumeStorage = getDefaultStorage(),
  pose: SpacePlayerPose,
  now = new Date(),
) {
  try {
    const record: SpaceDailyResumeRecord = {
      version: 1,
      localDate: formatSpaceResumeLocalDate(now),
      savedAtMs: now.getTime(),
      pose,
    };
    storage?.setItem(SPACE_DAILY_RESUME_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Daily resume is a convenience feature; storage failures should never interrupt SPACE.
  }
}

export function clearSpaceDailyResume(
  storage: ClearableSpaceResumeStorage = getDefaultStorage() as ClearableSpaceResumeStorage,
) {
  try {
    storage?.removeItem(SPACE_DAILY_RESUME_STORAGE_KEY);
  } catch {
    // Silent reset: debugging/replay should never interrupt SPACE.
  }
}
