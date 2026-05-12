// Ce fichier demarre l application et branche tous les providers.
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { AuthProvider } from "./core/auth/AuthProvider";
import { ThemeProvider } from "./core/theme/ThemeProvider";
import { I18nProvider } from "./core/i18n/I18nProvider";
import { ToastProvider } from "./shared/components/ui/toast";
import { NotificationsProvider } from "./core/notifications/NotificationsProvider";
import "./styles/globals.css";

// On recupere l'element HTML qui va accueillir toute l'application.
const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

// On bloque le rendu si la SPA est chargee dans une iframe de previsualisation.
if (window.self !== window.top) {
  root.innerHTML = '<div style="display:flex;align-items:center;justify-center;height:100%;color:#666;font-family:sans-serif;">Loading preview...</div>';
  throw new Error("App instance blocked in iframe");
}

// On monte l'application avec tous les providers globaux.
createRoot(root).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <I18nProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </I18nProvider>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
