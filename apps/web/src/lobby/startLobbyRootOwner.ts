export type StartLobbyRootOwner<T> = {
  mount: () => T;
  scheduleUnmount: () => void;
  dispose: (onReleased: () => void) => void;
};

type ReleaseStartLobbyRoot<T> = (root: T, onReleased?: () => void) => void;

export function createStartLobbyRootOwner<T>(
  createRoot: () => T,
  releaseRoot: ReleaseStartLobbyRoot<T>,
): StartLobbyRootOwner<T> {
  let root: T | null = null;
  let mounted = false;
  let disposalStarted = false;
  let cleanupToken = 0;

  return {
    mount() {
      mounted = true;
      cleanupToken += 1;
      root ??= createRoot();
      return root;
    },

    scheduleUnmount() {
      mounted = false;
      const token = ++cleanupToken;
      queueMicrotask(() => {
        if (mounted || disposalStarted || token !== cleanupToken) return;
        const ownedRoot = root;
        root = null;
        if (ownedRoot !== null) releaseRoot(ownedRoot);
      });
    },

    dispose(onReleased) {
      if (disposalStarted) return;
      disposalStarted = true;
      mounted = false;
      cleanupToken += 1;
      const ownedRoot = root;
      root = null;
      if (ownedRoot === null) {
        onReleased();
        return;
      }
      releaseRoot(ownedRoot, onReleased);
    },
  };
}
