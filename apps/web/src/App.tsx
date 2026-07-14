import { Suspense, lazy } from "react";
import type { ClientPlatform } from "./platform/clientPlatform";

const DesktopApp = lazy(() => import("./app/DesktopApp"));
const MobileApp = lazy(() => import("./app/MobileApp"));

export default function App({ platform }: { platform: ClientPlatform }) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          style={{
            height: "100vh",
            width: "100vw",
            background: "#ffffff",
            color: "#050505",
            display: "grid",
            placeItems: "center",
          }}
        >
          Loading application…
        </div>
      }
    >
      {platform === "desktop" ? <DesktopApp /> : <MobileApp />}
    </Suspense>
  );
}
