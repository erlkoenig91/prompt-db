import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import { useLocale } from "../LocaleContext";
import BrandLogo from "../components/BrandLogo";
import AppVersion from "../components/AppVersion";
import LanguageSwitch from "../components/LanguageSwitch";

export default function LoginPage() {
  const { login } = useAuth();
  const { t, translateApiError } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);

  useEffect(() => {
    api.publicSettings().then((s) => setAllowRegistration(s.allow_registration)).catch(() => {
      setAllowRegistration(true);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("auth.loginFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <BrandLogo size="lg" showText={false} />
      <div className="auth-card card">
        <div className="auth-card-top">
          <h2>{t("auth.login")}</h2>
          <LanguageSwitch />
        </div>
        <p className="muted">{t("auth.tagline")}</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">{t("auth.username")}</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? t("auth.loginLoading") : t("auth.login")}
          </button>
        </form>
        <p className="muted">
          {allowRegistration ? (
            <>
              {t("auth.noAccount")} <Link to="/register">{t("auth.register")}</Link>
            </>
          ) : (
            t("auth.registrationDisabled")
          )}
        </p>
      </div>
      <AppVersion />
    </div>
  );
}
