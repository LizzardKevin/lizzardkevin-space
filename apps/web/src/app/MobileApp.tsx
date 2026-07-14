import { useCallback } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAudioDirector } from "../audio/useAudioDirector";
import { EntrySplash } from "../components/entry/EntrySplash";
import { useEntryTransition } from "../hooks/useEntryTransition";
import { mobileProjectItems, type MobileTabId } from "../mobile/mobileArchiveData";
import { MobileExperience } from "../pages/MobileExperience";
import { NotFound, ProfileAliasRoute, SpaceAliasRoute } from "./appRoutes";
import { workRoute } from "./routeConfig";

function MobileRoute({
  entry,
  routeTab = null,
}: {
  entry: ReturnType<typeof useEntryTransition>;
  routeTab?: MobileTabId | null;
}) {
  const navigate = useNavigate();
  return (
    <MobileExperience
      key={routeTab ?? "root"}
      entry={entry}
      routeProjectId={null}
      routeTab={routeTab}
      onNavigateToProject={(id) => navigate(workRoute(id))}
      onNavigateToRoot={() => navigate("/")}
    />
  );
}

function MobileWorkRoute({ entry }: { entry: ReturnType<typeof useEntryTransition> }) {
  const navigate = useNavigate();
  const { exhibitId = "" } = useParams();
  const decodedId = decodeURIComponent(exhibitId);
  if (!mobileProjectItems.some((item) => item.id === decodedId)) return <NotFound terminal />;
  return (
    <MobileExperience
      key={decodedId}
      entry={entry}
      routeProjectId={decodedId}
      routeTab="projects"
      onNavigateToProject={(id) => navigate(workRoute(id))}
      onNavigateToRoot={() => navigate("/")}
    />
  );
}

export default function MobileApp() {
  const entry = useEntryTransition();
  const audio = useAudioDirector();

  const handleEnter = useCallback(() => {
    entry.freezeButtonFloat();
    entry.beginLoading();
    audio.unlock();
    entry.startFade();
  }, [audio, entry]);

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {entry.showSplash ? <EntrySplash entry={entry} onEnter={handleEnter} /> : null}
      <Routes>
        <Route path="/" element={<MobileRoute entry={entry} />} />
        <Route path="/works/:exhibitId" element={<MobileWorkRoute entry={entry} />} />
        <Route path="/profile" element={<MobileRoute entry={entry} routeTab="soul" />} />
        <Route path="/devstories" element={<NotFound terminal />} />
        <Route path="/space" element={<SpaceAliasRoute />} />
        <Route path="/lizzardkevin" element={<ProfileAliasRoute />} />
        <Route path="*" element={<NotFound terminal />} />
      </Routes>
    </div>
  );
}
