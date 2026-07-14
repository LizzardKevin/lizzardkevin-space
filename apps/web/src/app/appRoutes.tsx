import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

export function SpaceAliasRoute() {
  return <Navigate replace to="/" />;
}

export function ProfileAliasRoute() {
  return <Navigate replace to="/profile" />;
}

export function NotFound({ terminal = false }: { terminal?: boolean }) {
  const { t } = useTranslation();
  return (
    <main
      role="main"
      data-route-not-found="true"
      className={terminal ? "mobile-site mobile-terminal-site" : "app-route-layer app-route-message"}
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff" }}
    >
      <p>{terminal ? t("route.notFoundTerminal") : t("route.notFound")}</p>
    </main>
  );
}
