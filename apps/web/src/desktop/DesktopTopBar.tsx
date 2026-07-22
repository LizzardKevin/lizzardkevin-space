import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";

export function DesktopTopBar({ onNavigateToSpace }: { onNavigateToSpace: () => void }) {
  const navigate = useNavigate();
  return (
    <TopBar
      onOpenTab={(tab) => navigate(tab === "devStories" ? "/devstories" : "/profile")}
      onCloseTab={onNavigateToSpace}
    />
  );
}
