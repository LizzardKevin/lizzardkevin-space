import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AudioProvider } from "./audio/AudioContext";
import { PlaybackProvider } from "./media/PlaybackContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import App from "./App";
import "./i18n/i18n";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AudioProvider>
          <PlaybackProvider>
            <App />
          </PlaybackProvider>
        </AudioProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
