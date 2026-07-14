export type IdlePrefetchPhase = "idle" | "booting" | "running" | "failed";

type IdleApi = Readonly<{
  request: (callback: () => void) => number;
  cancel: (handle: number) => void;
}>;

type IdlePrefetchScope = Readonly<{
  attemptId: number;
  phase: IdlePrefetchPhase;
}>;

type PendingIdlePrefetch = {
  active: boolean;
  attemptId: number;
  handle: number;
};

export function createIdleRoutePrefetchController({
  idleApi,
  importers,
}: {
  idleApi: IdleApi | null;
  importers: readonly (() => Promise<unknown>)[];
}) {
  let completed = false;
  let pending: PendingIdlePrefetch | null = null;

  const cancel = () => {
    if (!pending) return;
    pending.active = false;
    idleApi?.cancel(pending.handle);
    pending = null;
  };

  const update = ({ attemptId, phase }: IdlePrefetchScope) => {
    if (phase !== "running") {
      cancel();
      return;
    }
    if (!idleApi || completed || pending?.attemptId === attemptId) return;
    cancel();

    const scheduled: PendingIdlePrefetch = {
      active: true,
      attemptId,
      handle: 0,
    };
    scheduled.handle = idleApi.request(() => {
      if (!scheduled.active || completed) return;
      scheduled.active = false;
      pending = null;
      completed = true;
      void Promise.allSettled(importers.map((load) => Promise.resolve().then(load)));
    });
    pending = scheduled;
  };

  return { cancel, update } as const;
}
