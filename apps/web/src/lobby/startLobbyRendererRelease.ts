export type StartLobbyRouteRenderer = {
  forceContextLoss: () => void;
  dispose: () => void;
};

export function releaseStartLobbyRouteRenderer(renderer: StartLobbyRouteRenderer) {
  const forceContextLoss = renderer.forceContextLoss.bind(renderer);
  let contextLost = false;
  renderer.forceContextLoss = () => {
    if (contextLost) return;
    contextLost = true;
    forceContextLoss();
  };
  renderer.forceContextLoss();
  renderer.dispose();
}
