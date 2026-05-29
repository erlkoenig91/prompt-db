import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import AppHeader from "../components/AppHeader";
import type { UserAdmin } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [savingReset, setSavingReset] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Benutzer konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.is_admin) {
      loadUsers();
    }
  }, [user?.is_admin]);

  if (!user?.is_admin) {
    return <Navigate to="/settings" replace />;
  }

  async function toggleActive(target: UserAdmin) {
    setError("");
    try {
      const updated = await api.updateUser(target.id, { is_active: !target.is_active });
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktualisierung fehlgeschlagen");
    }
  }

  async function toggleAdmin(target: UserAdmin) {
    setError("");
    try {
      const updated = await api.updateUser(target.id, { is_admin: !target.is_admin });
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktualisierung fehlgeschlagen");
    }
  }

  async function handleDelete(target: UserAdmin) {
    if (!confirm(`Benutzer „${target.username}" wirklich löschen? Alle Prompts werden mitgelöscht.`)) {
      return;
    }
    setError("");
    try {
      await api.deleteUser(target.id);
      setUsers((current) => current.filter((u) => u.id !== target.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Löschen fehlgeschlagen");
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    if (resetPassword !== resetConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setSavingReset(true);
    setError("");
    try {
      await api.resetUserPassword(resetUserId, resetPassword);
      setResetUserId(null);
      setResetPassword("");
      setResetConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Passwort konnte nicht gesetzt werden");
    } finally {
      setSavingReset(false);
    }
  }

  return (
    <div className="layout">
      <AppHeader subtitle="Benutzerverwaltung" />

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Lade Benutzer…</p>
      ) : (
        <section className="card users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>Status</th>
                <th>Rolle</th>
                <th>Prompts</th>
                <th>Erstellt</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => {
                const isSelf = entry.id === user.id;
                return (
                  <tr key={entry.id}>
                    <td>
                      {entry.username}
                      {isSelf && <span className="badge self-badge">Du</span>}
                    </td>
                    <td>
                      <span className={`badge ${entry.is_active ? "public" : ""}`}>
                        {entry.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${entry.is_admin ? "admin" : ""}`}>
                        {entry.is_admin ? "Admin" : "Benutzer"}
                      </span>
                    </td>
                    <td>{entry.prompt_count}</td>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={isSelf}
                          onClick={() => toggleActive(entry)}
                        >
                          {entry.is_active ? "Deaktivieren" : "Aktivieren"}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={isSelf}
                          onClick={() => toggleAdmin(entry)}
                        >
                          {entry.is_admin ? "Admin entziehen" : "Zum Admin machen"}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setResetUserId(entry.id);
                            setResetPassword("");
                            setResetConfirm("");
                          }}
                        >
                          Passwort
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={isSelf}
                          onClick={() => handleDelete(entry)}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {resetUserId && (
        <div className="modal-backdrop" onClick={() => setResetUserId(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>Passwort zurücksetzen</h2>
            <p className="muted">
              Neues Passwort für {users.find((u) => u.id === resetUserId)?.username}
            </p>
            <form onSubmit={handleResetSubmit}>
              <label htmlFor="reset-password">Neues Passwort</label>
              <input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={12}
                required
              />
              <label htmlFor="reset-confirm">Passwort bestätigen</label>
              <input
                id="reset-confirm"
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                minLength={12}
                required
              />
              <div className="toolbar">
                <button type="submit" disabled={savingReset}>
                  {savingReset ? "Speichern…" : "Passwort setzen"}
                </button>
                <button type="button" className="secondary" onClick={() => setResetUserId(null)}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
