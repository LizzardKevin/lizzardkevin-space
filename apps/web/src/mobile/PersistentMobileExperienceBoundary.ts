import { Fragment, createElement, type ReactNode } from "react";

export function PersistentMobileExperienceBoundary({ experience }: { experience: ReactNode }) {
  return createElement(Fragment, null, experience);
}
