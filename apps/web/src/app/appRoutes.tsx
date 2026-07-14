import { Navigate } from "react-router-dom";

export function SpaceAliasRoute() {
  return <Navigate replace to="/" />;
}

export function ProfileAliasRoute() {
  return <Navigate replace to="/profile" />;
}

export function NotFound({ terminal = false }: { terminal?: boolean }) {
  return (
    <main
      role="main"
      data-route-not-found="true"
      className={terminal ? "mobile-site mobile-terminal-site" : undefined}
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff" }}
    >
      <p>{terminal ? "$ route: 404 not found" : "404 — Page not found"}</p>
    </main>
  );
}
