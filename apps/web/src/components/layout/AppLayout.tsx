import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { SessionState } from "../../hooks/useSession";
import { navItems } from "../../constants/navigation";
import { NavIcon } from "../icons";

type AppLayoutProps = {
  children: ReactNode;
  loading: boolean;
  message: string;
  session: NonNullable<SessionState>;
  onLogout: () => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isDemoSuccessMessage(message: string) {
  return message === "Success! Payments have been made.";
}

export function AppLayout({ children, loading, message, session, onLogout }: AppLayoutProps) {
  const location = useLocation();
  const isMonitoring = location.pathname === "/";
  const showTopbar = !isMonitoring && location.pathname !== "/beneficiaries";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img className="sidebar-logo" src="/sinergysoldark.trimmed.png" alt="Sinergy Sol" />
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-profile" onClick={onLogout}>
          <span>{getInitials(session.user.name)}</span>
          <span className="sidebar-profile-copy">
            <strong>{session.user.name}</strong>
            <small>{session.user.role.replace(/_/g, " ")}</small>
          </span>
          <i />
        </button>
      </aside>
      <main className="main-panel">
        {showTopbar ? (
          <header className="topbar">
            <div>
              <p className="eyebrow">Operations Workspace</p>
              <h1>Funded projects to pay talent in LATAM</h1>
            </div>
            <div className="status-box">
              <span className="dot live" />
              {loading ? "Syncing" : "Ready"}
            </div>
          </header>
        ) : null}

        {message && message !== "Failed to fetch" ? (
          <div className={isDemoSuccessMessage(message) ? "banner demo-success-banner" : "banner"}>{message}</div>
        ) : null}

        {children}
      </main>
    </div>
  );
}
