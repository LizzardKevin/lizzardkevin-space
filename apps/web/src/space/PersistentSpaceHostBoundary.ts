import { Fragment, createElement, type ReactNode } from "react";

export function PersistentSpaceHostBoundary({
  routeSurface,
  startedHost,
}: {
  routeSurface: ReactNode;
  startedHost: ReactNode;
}) {
  return createElement(Fragment, null, routeSurface, startedHost);
}
