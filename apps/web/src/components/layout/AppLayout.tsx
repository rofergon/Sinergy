import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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

export function AppLayout({ children, loading, message, session, onLogout }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img className="sidebar-logo" src="/sinergysoldark.png" alt="Sinergy Sol" />
          </div>
          <div className="sidebar-ops-section">
            <p className="eyebrow sidebar-section-label">Ops Core</p>
            <a className="sidebar-sub-link sidebar-sub-link-active" href="#">
              Finance Ops
            </a>
            <a className="sidebar-sub-link" href="#">
              Finance Operator
            </a>
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
          <strong>{session.user.name}</strong>
          <i />
        </button>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operational Workspace</p>
            <h1>Global companies paying talent in Colombia and Mexico</h1>
          </div>
          <div className="status-box">
            <span className="dot live" />
            {loading ? "Syncing" : "Ready"}
          </div>
        </header>

        {message && message !== "Failed to fetch" ? <div className="banner">{message}</div> : null}

        {children}
      </main>
    </div>
  );
}
