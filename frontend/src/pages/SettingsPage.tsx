import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import AppHeader from "../components/AppHeader";
import type { AppSettings, UserPreferences } from "../types";
import { VIEW_MODES, saveViewMode, type ViewMode } from "../viewMode";

const SCOPES = [
  { value: "all", label: "Alle sichtbaren" },
  { value: "mine", label: "Meine" },
  { value: "public", label: "Öffentliche" },
] as const;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
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
        setError(err instanceof ApiError ? err.message : "Einstellungen konnten nicht geladen werden");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
      setSuccess("Persönliche Einstellungen gespeichert.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
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
      setSuccess("Anwendungseinstellungen gespeichert.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingApp(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Die neuen Passwörter stimmen nicht überein.");
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
      setSuccess("Passwort geändert.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Passwortänderung fehlgeschlagen");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="layout">
      <AppHeader subtitle="Einstellungen" />

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading ? (
        <p className="muted">Lade Einstellungen…</p>
      ) : (
        <div className="settings-grid">
          <section className="card settings-section">
            <h2>Meine Einstellungen</h2>
            <p className="muted">Diese Einstellungen gelten nur für dein Konto.</p>
            <form onSubmit={handlePreferencesSubmit}>
              <label htmlFor="default-view-mode">Standard-Ansicht</label>
              <select
                id="default-view-mode"
                value={preferences.default_view_mode}
                onChange={(e) =>
                  setPreferences({ ...preferences, default_view_mode: e.target.value as ViewMode })
                }
              >
                {VIEW_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label} – {mode.hint}
                  </option>
                ))}
              </select>

              <label htmlFor="default-scope">Standard-Bereich</label>
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
                {SCOPES.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>

              <button type="submit" disabled={savingPrefs}>
                {savingPrefs ? "Speichern…" : "Speichern"}
              </button>
            </form>
          </section>

          <section className="card settings-section">
            <h2>Passwort ändern</h2>
            <form onSubmit={handlePasswordSubmit}>
              <label htmlFor="current-password">Aktuelles Passwort</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <label htmlFor="new-password">Neues Passwort</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
              />
              <label htmlFor="confirm-password">Neues Passwort bestätigen</label>
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
                {savingPassword ? "Speichern…" : "Passwort ändern"}
              </button>
            </form>
          </section>

          {user?.is_admin && appSettings && (
            <section className="card settings-section settings-section-wide">
              <h2>Anwendung</h2>
              <p className="muted">Diese Einstellungen gelten für alle Benutzer.</p>
              <form onSubmit={handleAppSubmit}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={appSettings.allow_registration}
                    onChange={(e) =>
                      setAppSettings({ ...appSettings, allow_registration: e.target.checked })
                    }
                  />
                  <span>Registrierung neuer Benutzer erlauben</span>
                </label>

                <label htmlFor="default-visibility">Standard-Sichtbarkeit neuer Prompts</label>
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
                  <option value="private">Privat</option>
                  <option value="public">Öffentlich</option>
                </select>

                <p className="muted hint">Umgebung: {appSettings.environment}</p>

                <button type="submit" disabled={savingApp}>
                  {savingApp ? "Speichern…" : "Anwendungseinstellungen speichern"}
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
