import { useCallback } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAudioDirector } from "../audio/useAudioDirector";
import { EntrySplash } from "../components/entry/EntrySplash";
import { useEntryTransition } from "../hooks/useEntryTransition";
import { mobileProjectItems } from "../mobile/mobileArchiveData";
import { PersistentMobileExperienceBoundary } from "../mobile/PersistentMobileExperienceBoundary";
import { resolveMobileRouteView } from "../mobile/mobileRouteView";
import { MobileExperience } from "../pages/MobileExperience";
import { NotFound } from "./appRoutes";
import { resolveAppRoute, workRoute } from "./routeConfig";

export default function MobileApp() {
  const entry = useEntryTransition();
  const audio = useAudioDirector();
  const location = useLocation();
  const navigate = useNavigate();
  const route = resolveAppRoute(location.pathname);
  const aliasRedirectTo =
    route.kind === "space-alias" ? "/" : route.kind === "profile-alias" ? "/profile" : null;

  const handleEnter = useCallback(() => {
    entry.freezeButtonFloat();
    entry.beginLoading();
    audio.unlock();
    entry.startFade();
  }, [audio, entry]);

  if (route.kind === "not-found") return <NotFound terminal />;

  const resolvedView = resolveMobileRouteView(route);
  const view = resolvedView.kind === "work" && !mobileProjectItems.some((item) => item.id === resolvedView.projectId)
    ? { kind: "not-found" as const }
    : resolvedView;

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {entry.showSplash ? <EntrySplash entry={entry} onEnter={handleEnter} /> : null}
      <PersistentMobileExperienceBoundary
        experience={
          <MobileExperience
            entry={entry}
            routeView={view}
            onNavigateToProject={(id) => navigate(workRoute(id))}
            onNavigateToProfile={() => navigate("/profile")}
            onNavigateToRoot={() => navigate("/")}
          />
        }
      />
      {aliasRedirectTo ? <Navigate replace to={aliasRedirectTo} /> : null}
    </div>
  );
}
