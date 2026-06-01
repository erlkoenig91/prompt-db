import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useLocale } from "../LocaleContext";
import BrandLogo from "./BrandLogo";
import AppVersion from "./AppVersion";
import LanguageSwitch from "./LanguageSwitch";

interface AppHeaderProps {
  subtitle?: string;
}

export default function AppHeader({ subtitle }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useLocale();

  const defaultSubtitle = user
    ? t("auth.loggedInAs", { username: user.username })
    : undefined;

  return (
    <header>
      <BrandLogo size="md" subtitle={subtitle ?? defaultSubtitle} />
      <nav className="app-nav" aria-label={t("nav.main")}>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} end>
          {t("nav.prompts")}
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          {t("nav.stats")}
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          {t("nav.settings")}
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            {t("nav.users")}
          </NavLink>
        )}
      </nav>
      <div className="header-actions">
        <LanguageSwitch />
        <AppVersion />
        <button className="secondary" onClick={logout}>
          {t("nav.logout")}
        </button>
      </div>
    </header>
  );
}
