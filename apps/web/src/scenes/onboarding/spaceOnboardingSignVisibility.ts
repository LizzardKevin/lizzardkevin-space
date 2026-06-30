import {
  SPACE_ONBOARDING_SIGNS,
  type SpaceOnboardingSignStepId,
} from "./spaceOnboardingConfig.ts";

export const SPACE_ONBOARDING_SIGN_ENTER_MS = 500;
export const SPACE_ONBOARDING_NOTICE_ENTER_MS = 260;
export const SPACE_ONBOARDING_SIGN_DISSOLVE_MS = 950;
export const SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M = 0.45;
export const SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS = 100;
export const SPACE_ONBOARDING_SIGN_OPERATION_COMPLETE_FALLBACK_MS = 1000;
export const SPACE_ONBOARDING_NOTICE_COMPLETE_FALLBACK_MS = 0;
export const SPACE_ONBOARDING_SIGN_MIN_LINGER_MS = SPACE_ONBOARDING_SIGN_OPERATION_COMPLETE_FALLBACK_MS;

export function isSpaceOnboardingNoticeClose(cameraZ: number): boolean {
  return cameraZ >= SPACE_ONBOARDING_SIGNS.notice.position[2] - SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M;
}

export type SpaceOnboardingVisibleSignStatus = "enter" | "visible" | "exiting";

export type SpaceOnboardingVisibleSign = {
  id: SpaceOnboardingSignStepId;
  status: SpaceOnboardingVisibleSignStatus;
  firstSeenAtMs: number;
  exitStartedAtMs: number | null;
  operationCompletedAtMs: number | null;
};

export type SpaceOnboardingVisibleSignUpdate = {
  activeSignId: SpaceOnboardingSignStepId | null;
  cameraZ: number;
  nowMs: number;
};

export type SpaceOnboardingSignQueueState = {
  signs: SpaceOnboardingVisibleSign[];
  nextSignAllowedAtMs: number | null;
  pendingSignId: SpaceOnboardingSignStepId | null;
};

export function createInitialSpaceOnboardingSignQueueState(): SpaceOnboardingSignQueueState {
  return {
    signs: [],
    nextSignAllowedAtMs: null,
    pendingSignId: null,
  };
}

function isWithinDissolveLead(id: SpaceOnboardingSignStepId, cameraZ: number): boolean {
  return cameraZ >= SPACE_ONBOARDING_SIGNS[id].position[2] - SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M;
}

function operationCompleteFallbackMs(id: SpaceOnboardingSignStepId): number {
  return id === "notice"
    ? SPACE_ONBOARDING_NOTICE_COMPLETE_FALLBACK_MS
    : SPACE_ONBOARDING_SIGN_OPERATION_COMPLETE_FALLBACK_MS;
}

export function enterMsForSign(id: SpaceOnboardingSignStepId): number {
  return id === "notice" ? SPACE_ONBOARDING_NOTICE_ENTER_MS : SPACE_ONBOARDING_SIGN_ENTER_MS;
}

function createVisibleSign(
  id: SpaceOnboardingSignStepId,
  nowMs: number,
): SpaceOnboardingVisibleSign {
  return {
    id,
    status: "enter",
    firstSeenAtMs: nowMs,
    exitStartedAtMs: null,
    operationCompletedAtMs: null,
  };
}

function normalizeSign(sign: SpaceOnboardingVisibleSign): SpaceOnboardingVisibleSign {
  return {
    ...sign,
    operationCompletedAtMs: sign.operationCompletedAtMs ?? null,
  };
}

function swapEscToRelock(
  current: readonly SpaceOnboardingVisibleSign[],
  update: SpaceOnboardingVisibleSignUpdate,
): SpaceOnboardingVisibleSign[] {
  const currentSign = current[0];
  if (
    update.activeSignId !== "relock" ||
    current.length !== 1 ||
    currentSign === undefined ||
    currentSign.id !== "esc" ||
    currentSign.status === "exiting"
  ) {
    return [...current];
  }

  return [
    {
      id: "relock",
      status: "visible",
      firstSeenAtMs: update.nowMs,
      exitStartedAtMs: null,
      operationCompletedAtMs: null,
    },
  ];
}

function advanceSignLifecycle(
  sign: SpaceOnboardingVisibleSign,
  update: SpaceOnboardingVisibleSignUpdate,
): SpaceOnboardingVisibleSign | null {
  const normalized = normalizeSign(sign);

  if (
    normalized.status === "exiting" &&
    normalized.exitStartedAtMs !== null &&
    update.nowMs - normalized.exitStartedAtMs >= SPACE_ONBOARDING_SIGN_DISSOLVE_MS
  ) {
    return null;
  }

  if (normalized.status === "exiting") return normalized;

  const active = normalized.id === update.activeSignId;
  const entered =
    normalized.status === "enter" &&
    update.nowMs - normalized.firstSeenAtMs >= enterMsForSign(normalized.id)
      ? { ...normalized, status: "visible" as const }
      : normalized;

  if (active) {
    return entered.operationCompletedAtMs === null
      ? entered
      : { ...entered, operationCompletedAtMs: null };
  }

  const operationCompletedAtMs = entered.operationCompletedAtMs ?? update.nowMs;
  const completed = {
    ...entered,
    operationCompletedAtMs,
  };

  const fallbackElapsed =
    update.nowMs - operationCompletedAtMs >= operationCompleteFallbackMs(completed.id);
  const shouldExit =
    completed.status === "visible" &&
    (isWithinDissolveLead(completed.id, update.cameraZ) || fallbackElapsed);

  return shouldExit
    ? {
        ...completed,
        status: "exiting",
        exitStartedAtMs: update.nowMs,
      }
    : completed;
}

function sameVisibleSigns(
  a: readonly SpaceOnboardingVisibleSign[],
  b: readonly SpaceOnboardingVisibleSign[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((sign, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      sign.id === other.id &&
      sign.status === other.status &&
      sign.firstSeenAtMs === other.firstSeenAtMs &&
      sign.exitStartedAtMs === other.exitStartedAtMs &&
      (sign.operationCompletedAtMs ?? null) === (other.operationCompletedAtMs ?? null)
    );
  });
}

function sameSignQueueState(
  a: SpaceOnboardingSignQueueState,
  b: SpaceOnboardingSignQueueState,
): boolean {
  return (
    sameVisibleSigns(a.signs, b.signs) &&
    a.nextSignAllowedAtMs === b.nextSignAllowedAtMs &&
    a.pendingSignId === b.pendingSignId
  );
}

export function updateSpaceOnboardingSignQueue(
  current: SpaceOnboardingSignQueueState,
  update: SpaceOnboardingVisibleSignUpdate,
): SpaceOnboardingSignQueueState {
  const currentOrSwapped = swapEscToRelock(current.signs, update);
  const updated = currentOrSwapped
    .map((sign) => advanceSignLifecycle(sign, update))
    .filter((sign): sign is SpaceOnboardingVisibleSign => sign !== null);
  const removedPreviousSign = currentOrSwapped.length > 0 && updated.length === 0;

  let next: SpaceOnboardingSignQueueState;

  if (updated.length > 0) {
    next = {
      signs: updated,
      nextSignAllowedAtMs: null,
      pendingSignId: null,
    };
  } else if (!update.activeSignId) {
    next = createInitialSpaceOnboardingSignQueueState();
  } else if (removedPreviousSign) {
    next = {
      signs: [],
      nextSignAllowedAtMs: update.nowMs + SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS,
      pendingSignId: update.activeSignId,
    };
  } else if (current.nextSignAllowedAtMs !== null) {
    const pendingSignId = update.activeSignId;
    const nextSignAllowedAtMs =
      current.pendingSignId === pendingSignId
        ? current.nextSignAllowedAtMs
        : update.nowMs + SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS;

    next =
      update.nowMs >= nextSignAllowedAtMs
        ? {
            signs: [createVisibleSign(pendingSignId, update.nowMs)],
            nextSignAllowedAtMs: null,
            pendingSignId: null,
          }
        : {
            signs: [],
            nextSignAllowedAtMs,
            pendingSignId,
          };
  } else {
    next = {
      signs: [createVisibleSign(update.activeSignId, update.nowMs)],
      nextSignAllowedAtMs: null,
      pendingSignId: null,
    };
  }

  return sameSignQueueState(current, next) ? current : next;
}

export function updateSpaceOnboardingVisibleSigns(
  current: SpaceOnboardingVisibleSign[],
  update: SpaceOnboardingVisibleSignUpdate,
): SpaceOnboardingVisibleSign[] {
  return updateSpaceOnboardingSignQueue(
    {
      signs: current,
      nextSignAllowedAtMs: null,
      pendingSignId: null,
    },
    update,
  ).signs;
}
