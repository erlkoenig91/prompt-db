import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import { useLocale } from "../LocaleContext";
import BrandLogo from "../components/BrandLogo";
import AppVersion from "../components/AppVersion";
import LanguageSwitch from "../components/LanguageSwitch";
import { allRulesMet, checkPasswordRule, checkUsernameRule, PolicyHint } from "../PolicyHint";
import type { RuleHint } from "../types";

export default function RegisterPage() {
  const { register } = useAuth();
  const { t, translateApiError, ruleLabel } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null);

  useEffect(() => {
    api.publicSettings().then((s) => setAllowRegistration(s.allow_registration)).catch(() => {
      setAllowRegistration(true);
    });
  }, []);

  const passwordRules: RuleHint[] = useMemo(
    () => [
      { id: "length", label: ruleLabel("passwordRules", "length") },
      { id: "uppercase", label: ruleLabel("passwordRules", "uppercase") },
      { id: "lowercase", label: ruleLabel("passwordRules", "lowercase") },
      { id: "digit", label: ruleLabel("passwordRules", "digit") },
    ],
    [ruleLabel],
  );

  const usernameRules: RuleHint[] = useMemo(
    () => [
      { id: "length", label: ruleLabel("usernameRules", "length") },
      { id: "charset", label: ruleLabel("usernameRules", "charset") },
    ],
    [ruleLabel],
  );

  const passwordOk = allRulesMet(passwordRules, password, checkPasswordRule);
  const usernameOk = allRulesMet(usernameRules, username, checkUsernameRule);
  const canSubmit = passwordOk && usernameOk;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await register(username, password);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("auth.registerFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    } finally {
      setLoading(false);
    }
  }

  if (allowRegistration === false) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="auth-page">
      <BrandLogo size="lg" showText={false} />
      <div className="auth-card card">
        <div className="auth-card-top">
          <h2>{t("auth.registerTitle")}</h2>
          <LanguageSwitch />
        </div>
        <p className="muted">{t("auth.registerSubtitle")}</p>
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
          <PolicyHint
            title={t("auth.username")}
            rules={usernameRules}
            value={username}
            check={checkUsernameRule}
          />

          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <PolicyHint
            title={t("auth.passwordRequirements")}
            rules={passwordRules}
            value={password}
            check={checkPasswordRule}
          />

          <button type="submit" disabled={loading || !canSubmit}>
            {loading ? t("auth.creating") : t("auth.createAccount")}
          </button>
        </form>
        <p className="muted">
          {t("auth.alreadyRegistered")} <Link to="/login">{t("auth.login")}</Link>
        </p>
      </div>
      <AppVersion />
    </div>
  );
}
