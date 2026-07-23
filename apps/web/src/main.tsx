import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AudioProvider } from "./audio/AudioContext";
import { PlaybackProvider } from "./media/PlaybackContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { detectClientPlatform, type ClientPlatform } from "./platform/clientPlatform";
import App from "./App";
import { normalizeRouterBasename } from "./app/routeConfig";
import "./i18n/i18n";
import "./styles/global.css";
import "./styles/scroll-pages.css";

const platform: ClientPlatform = detectClientPlatform();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter basename={normalizeRouterBasename(import.meta.env.BASE_URL)}>
        <AudioProvider>
          <PlaybackProvider>
            <App platform={platform} />
          </PlaybackProvider>
        </AudioProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
