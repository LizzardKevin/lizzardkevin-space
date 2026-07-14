import type { SpacePlayerPose } from "./spaceDailyResume";

export const SPACE_SESSION_POSE_STORAGE_KEY = "spaceSessionPoseV1";

type SpaceSessionPoseRecord = {
  version: 1;
  position: [number, number, number];
  yaw: number;
  pitch: number;
};

type SpaceSessionStorage = Pick<Storage, "getItem" | "setItem"> | null | undefined;
const MAX_POSITION_MAGNITUDE = 500;
const MAX_ABS_YAW = Math.PI * 8;
const MAX_ABS_PITCH = Math.PI / 2;

function defaultSessionStorage(): SpaceSessionStorage {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function finiteWithin(value: unknown, maxMagnitude: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= maxMagnitude;
}

function isRecord(value: unknown): value is SpaceSessionPoseRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SpaceSessionPoseRecord>;
  return (
    record.version === 1 &&
    Array.isArray(record.position) &&
    record.position.length === 3 &&
    record.position.every((coordinate) => finiteWithin(coordinate, MAX_POSITION_MAGNITUDE)) &&
    finiteWithin(record.yaw, MAX_ABS_YAW) &&
    finiteWithin(record.pitch, MAX_ABS_PITCH)
  );
}

export function readSpaceSessionPose(
  storage: SpaceSessionStorage = defaultSessionStorage(),
): SpacePlayerPose | null {
  try {
    const raw = storage?.getItem(SPACE_SESSION_POSE_STORAGE_KEY);
    if (!raw) return null;
    const record: unknown = JSON.parse(raw);
    if (!isRecord(record)) return null;
    return {
      position: [...record.position],
      yawRad: record.yaw,
      pitchRad: record.pitch,
    };
  } catch {
    return null;
  }
}

export function writeSpaceSessionPose(
  storage: SpaceSessionStorage = defaultSessionStorage(),
  pose: SpacePlayerPose,
) {
  try {
    const record: SpaceSessionPoseRecord = {
      version: 1,
      position: [...pose.position],
      yaw: pose.yawRad,
      pitch: pose.pitchRad,
    };
    if (!isRecord(record)) return;
    storage?.setItem(SPACE_SESSION_POSE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Semantic pose restoration is optional and must never interrupt SPACE.
  }
}
