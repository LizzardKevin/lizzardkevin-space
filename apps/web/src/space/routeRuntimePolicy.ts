export type SpaceRouteKind = "space" | "work" | "profile" | "devstories" | "not-found";

export function resolveSpaceRouteRuntimePolicy(route: SpaceRouteKind) {
  const routeBlocked = route !== "space";
  return {
    routeBlocked,
    pauseMainAudio: routeBlocked,
    pauseContentPlayback: false,
  } as const;
}
