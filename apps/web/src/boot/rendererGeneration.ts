export type RendererGeneration = Readonly<{
  attemptId: number;
  requestedProfile: "full" | "simplified";
  nonce: number;
}>;

export function createRendererGeneration(
  attemptId: number,
  requestedProfile: RendererGeneration["requestedProfile"],
): RendererGeneration {
  return { attemptId, requestedProfile, nonce: 0 };
}

export function resolveRendererGeneration(
  current: RendererGeneration,
  attemptId: number,
  requestedProfile: RendererGeneration["requestedProfile"],
): RendererGeneration {
  if (current.attemptId === attemptId && current.requestedProfile === requestedProfile) {
    return current;
  }
  return { attemptId, requestedProfile, nonce: current.nonce + 1 };
}

export function runForActiveRendererGeneration(
  active: RendererGeneration,
  candidate: RendererGeneration,
  callback: () => void,
) {
  if (
    active.attemptId !== candidate.attemptId ||
    active.requestedProfile !== candidate.requestedProfile ||
    active.nonce !== candidate.nonce
  ) {
    return false;
  }
  callback();
  return true;
}
