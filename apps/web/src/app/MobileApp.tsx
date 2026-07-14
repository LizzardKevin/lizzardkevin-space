import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { mobileProjectItems } from "../mobile/mobileArchiveData";
import { MobileStartMenu } from "../mobile/MobileStartMenu";
import { PersistentMobileExperienceBoundary } from "../mobile/PersistentMobileExperienceBoundary";
import { resolveMobileRouteView } from "../mobile/mobileRouteView";
import { MobileExperience } from "../pages/MobileExperience";
import { resolveAppRoute, workRoute } from "./routeConfig";

export default function MobileApp() {
  const [mobileStarted, setMobileStarted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const route = resolveAppRoute(location.pathname);
  const aliasRedirectTo =
    route.kind === "space-alias" ? "/" : route.kind === "profile-alias" ? "/profile" : null;

  const handleEnter = () => {
    setMobileStarted(true);
  };

  if (!mobileStarted) {
    if (aliasRedirectTo) return <Navigate replace to={aliasRedirectTo} />;
    return <MobileStartMenu onEnter={handleEnter} />;
  }

  const resolvedView = resolveMobileRouteView(route);
  const view = resolvedView.kind === "work" && !mobileProjectItems.some((item) => item.id === resolvedView.projectId)
    ? { kind: "not-found" as const }
    : resolvedView;

  return (
    <div style={{ minHeight: "100dvh", width: "100vw", background: "#ffffff" }}>
      <PersistentMobileExperienceBoundary
        experience={
          <MobileExperience
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
