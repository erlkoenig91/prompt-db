import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import { useLocale } from "../LocaleContext";
import AppHeader from "../components/AppHeader";
import type { AppSettings, UserPreferences } from "../types";
import { saveViewMode, useScopes, useViewModes, type ViewMode } from "../viewMode";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t, translateApiError } = useLocale();
  const viewModes = useViewModes();
  const scopes = useScopes();
  const [preferences, setPreferences] = useState<UserPreferences>({
    default_view_mode: "list",
    default_scope: "all",
  });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getSettings();
        if (!active) return;
        setPreferences(data.preferences);
        setAppSettings(data.app);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : t("settings.loadFailed");
        setError(err instanceof ApiError ? translateApiError(message) : message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t, translateApiError]);

  async function handlePreferencesSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingPrefs(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updatePreferences(preferences);
      setPreferences(updated);
      saveViewMode(updated.default_view_mode as ViewMode);
      await refreshUser();
      setSuccess(t("settings.savedPrefs"));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("common.saveFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleAppSubmit(e: FormEvent) {
    e.preventDefault();
    if (!appSettings) return;
    setSavingApp(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateAppSettings(appSettings);
      setAppSettings(updated);
      setSuccess(t("settings.appSaved"));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("common.saveFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    } finally {
      setSavingApp(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    setError("");
    setSuccess("");
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t("settings.passwordChanged"));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("settings.passwordChangeFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="layout">
      <AppHeader subtitle={t("settings.subtitle")} />

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading ? (
        <p className="muted">{t("settings.loading")}</p>
      ) : (
        <div className="settings-grid">
          <section className="card settings-section">
            <h2>{t("settings.mySettings")}</h2>
            <p className="muted">{t("settings.mySettingsHint")}</p>
            <form onSubmit={handlePreferencesSubmit}>
              <label htmlFor="default-view-mode">{t("settings.defaultView")}</label>
              <select
                id="default-view-mode"
                value={preferences.default_view_mode}
                onChange={(e) =>
                  setPreferences({ ...preferences, default_view_mode: e.target.value as ViewMode })
                }
              >
                {viewModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label} – {mode.hint}
                  </option>
                ))}
              </select>

              <label htmlFor="default-scope">{t("settings.defaultScope")}</label>
              <select
                id="default-scope"
                value={preferences.default_scope}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    default_scope: e.target.value as UserPreferences["default_scope"],
                  })
                }
              >
                {scopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>

              <button type="submit" disabled={savingPrefs}>
                {savingPrefs ? t("common.saving") : t("common.save")}
              </button>
            </form>
          </section>

          <section className="card settings-section">
            <h2>{t("settings.changePassword")}</h2>
            <form onSubmit={handlePasswordSubmit}>
              <label htmlFor="current-password">{t("settings.currentPassword")}</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <label htmlFor="new-password">{t("settings.newPassword")}</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
              />
              <label htmlFor="confirm-password">{t("settings.confirmPassword")}</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
              />
              <button type="submit" disabled={savingPassword}>
                {savingPassword ? t("common.saving") : t("settings.changePassword")}
              </button>
            </form>
          </section>

          {user?.is_admin && appSettings && (
            <section className="card settings-section settings-section-wide">
              <h2>{t("settings.application")}</h2>
              <p className="muted">{t("settings.applicationHint")}</p>
              <form onSubmit={handleAppSubmit}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={appSettings.allow_registration}
                    onChange={(e) =>
                      setAppSettings({ ...appSettings, allow_registration: e.target.checked })
                    }
                  />
                  <span>{t("settings.allowRegistration")}</span>
                </label>

                <label htmlFor="default-visibility">{t("settings.defaultVisibility")}</label>
                <select
                  id="default-visibility"
                  value={appSettings.default_prompt_visibility}
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      default_prompt_visibility: e.target.value as "private" | "public",
                    })
                  }
                >
                  <option value="private">{t("common.private")}</option>
                  <option value="public">{t("common.public")}</option>
                </select>

                <p className="muted hint">
                  {t("common.environment")}: {appSettings.environment}
                </p>

                <button type="submit" disabled={savingApp}>
                  {savingApp ? t("common.saving") : t("settings.saveApp")}
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
