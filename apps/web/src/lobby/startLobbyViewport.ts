type StartLobbyViewportStore = {
  getState: () => {
    size: { width: number; height: number };
    setSize: (width: number, height: number, top?: number, left?: number) => void;
    invalidate: () => void;
  };
};

export function syncStartLobbyViewport(
  store: StartLobbyViewportStore | null,
  width: number,
  height: number,
) {
  if (!store || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  const state = store.getState();
  if (state.size.width === width && state.size.height === height) return false;
  state.setSize(width, height, 0, 0);
  state.invalidate();
  return true;
}
