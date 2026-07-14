import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import type { OverlayTab } from "../overlay/OverlayState";

function captureSpaceWordSourceRect() {
  const element = document.querySelector<HTMLElement>("[data-space-word-origin='true']");
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { height: rect.height, width: rect.width, x: rect.left, y: rect.top };
}

export function DesktopTopBar({ onNavigateToSpace }: { onNavigateToSpace: () => void }) {
  const navigate = useNavigate();
  const navigateToOverlay = (tab: Exclude<OverlayTab, null>) => {
    navigate(tab === "devStories" ? "/devstories" : "/profile", {
      state: { spaceWordSourceRect: captureSpaceWordSourceRect() },
    });
  };

  return <TopBar onOpenTab={navigateToOverlay} onCloseTab={onNavigateToSpace} />;
}
