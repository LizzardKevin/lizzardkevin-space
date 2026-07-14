import { matchPath } from "react-router-dom";

export const APP_ROUTE_PATHS = {
  space: "/",
  work: "/works/:exhibitId",
  profile: "/profile",
  devStories: "/devstories",
} as const;

export type AppRoute =
  | { kind: "space" }
  | { kind: "work"; exhibitId: string }
  | { kind: "profile" }
  | { kind: "devstories" }
  | { kind: "space-alias" }
  | { kind: "profile-alias" }
  | { kind: "not-found" };

export function normalizeRouterBasename(baseUrl: string) {
  if (!baseUrl || baseUrl === "/") return "/";
  const withLeadingSlash = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export function resolveAppRoute(pathname: string): AppRoute {
  if (pathname === "/") return { kind: "space" };
  const workMatch = matchPath({ path: APP_ROUTE_PATHS.work, end: true }, pathname);
  if (workMatch?.params.exhibitId) {
    return { kind: "work", exhibitId: decodeURIComponent(workMatch.params.exhibitId) };
  }
  if (pathname === APP_ROUTE_PATHS.profile) return { kind: "profile" };
  if (pathname === APP_ROUTE_PATHS.devStories) return { kind: "devstories" };
  if (pathname === "/space") return { kind: "space-alias" };
  if (pathname === "/lizzardkevin") return { kind: "profile-alias" };
  return { kind: "not-found" };
}

export function workRoute(exhibitId: string) {
  return `/works/${encodeURIComponent(exhibitId)}`;
}
