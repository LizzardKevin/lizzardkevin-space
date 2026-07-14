import type { AppRoute } from "../app/routeConfig";

export type MobileRouteView =
  | { kind: "root" }
  | { kind: "work"; projectId: string }
  | { kind: "profile" }
  | { kind: "not-found" };

export function resolveMobileRouteView(route: AppRoute): MobileRouteView {
  if (route.kind === "space") return { kind: "root" };
  if (route.kind === "work") return { kind: "work", projectId: route.exhibitId };
  if (route.kind === "profile") return { kind: "profile" };
  return { kind: "not-found" };
}
