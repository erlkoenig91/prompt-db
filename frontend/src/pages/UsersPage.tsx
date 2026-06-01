import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import { useLocale } from "../LocaleContext";
import AppHeader from "../components/AppHeader";
import type { UserAdmin } from "../types";

export default function UsersPage() {
  const { user } = useAuth();
  const { t, translateApiError, formatDateTime } = useLocale();
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
      const message = err instanceof ApiError ? err.message : t("users.loadFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
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
      const message = err instanceof ApiError ? err.message : t("common.updateFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    }
  }

  async function toggleAdmin(target: UserAdmin) {
    setError("");
    try {
      const updated = await api.updateUser(target.id, { is_admin: !target.is_admin });
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("common.updateFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    }
  }

  async function handleDelete(target: UserAdmin) {
    if (!confirm(t("users.deleteConfirm", { username: target.username }))) {
      return;
    }
    setError("");
    try {
      await api.deleteUser(target.id);
      setUsers((current) => current.filter((u) => u.id !== target.id));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("common.deleteFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;
    if (resetPassword !== resetConfirm) {
      setError(t("users.passwordMismatch"));
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
      const message = err instanceof ApiError ? err.message : t("users.passwordSetFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    } finally {
      setSavingReset(false);
    }
  }

  const resetUsername = users.find((u) => u.id === resetUserId)?.username ?? "";

  return (
    <div className="layout">
      <AppHeader subtitle={t("users.subtitle")} />

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">{t("users.loading")}</p>
      ) : (
        <section className="card users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>{t("users.username")}</th>
                <th>{t("users.status")}</th>
                <th>{t("users.role")}</th>
                <th>{t("users.prompts")}</th>
                <th>{t("users.created")}</th>
                <th>{t("users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => {
                const isSelf = entry.id === user.id;
                return (
                  <tr key={entry.id}>
                    <td>
                      {entry.username}
                      {isSelf && <span className="badge self-badge">{t("common.you")}</span>}
                    </td>
                    <td>
                      <span className={`badge ${entry.is_active ? "public" : ""}`}>
                        {entry.is_active ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${entry.is_admin ? "admin" : ""}`}>
                        {entry.is_admin ? t("common.admin") : t("common.user")}
                      </span>
                    </td>
                    <td>{entry.prompt_count}</td>
                    <td>{formatDateTime(entry.created_at)}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={isSelf}
                          onClick={() => toggleActive(entry)}
                        >
                          {entry.is_active ? t("users.deactivate") : t("users.activate")}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={isSelf}
                          onClick={() => toggleAdmin(entry)}
                        >
                          {entry.is_admin ? t("users.revokeAdmin") : t("users.makeAdmin")}
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
                          {t("users.password")}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={isSelf}
                          onClick={() => handleDelete(entry)}
                        >
                          {t("common.delete")}
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
            <h2>{t("users.resetPassword")}</h2>
            <p className="muted">{t("users.resetPasswordFor", { username: resetUsername })}</p>
            <form onSubmit={handleResetSubmit}>
              <label htmlFor="reset-password">{t("settings.newPassword")}</label>
              <input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={12}
                required
              />
              <label htmlFor="reset-confirm">{t("users.confirmPassword")}</label>
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
                  {savingReset ? t("common.saving") : t("users.setPassword")}
                </button>
                <button type="button" className="secondary" onClick={() => setResetUserId(null)}>
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
