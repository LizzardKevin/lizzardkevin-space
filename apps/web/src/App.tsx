import { Suspense, lazy } from "react";
import type { ClientPlatform } from "./platform/clientPlatform";

const DesktopApp = lazy(() => import("./app/DesktopApp"));
const MobileApp = lazy(() => import("./app/MobileApp"));

export default function App({ platform }: { platform: ClientPlatform }) {
  return (
    <Suspense
      fallback={<div aria-label="Loading application" style={{ height: "100vh", width: "100vw" }} />}
    >
      {platform === "desktop" ? <DesktopApp /> : <MobileApp />}
    </Suspense>
  );
}
