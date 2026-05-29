import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import BrandLogo from "./BrandLogo";
import AppVersion from "./AppVersion";

interface AppHeaderProps {
  subtitle?: string;
}

export default function AppHeader({ subtitle }: AppHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header>
      <BrandLogo size="md" subtitle={subtitle ?? `Angemeldet als ${user?.username}`} />
      <nav className="app-nav" aria-label="Hauptnavigation">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} end>
          Prompts
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Statistik
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Einstellungen
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Benutzer
          </NavLink>
        )}
      </nav>
      <div className="header-actions">
        <AppVersion />
        <button className="secondary" onClick={logout}>
          Abmelden
        </button>
      </div>
    </header>
  );
}
