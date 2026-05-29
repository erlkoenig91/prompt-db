import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import BrandLogo from "../components/BrandLogo";
import AppVersion from "../components/AppVersion";

export default function LoginPage() {
  const { login } = useAuth();
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
      setError(err instanceof ApiError ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <BrandLogo size="lg" showText={false} />
      <div className="auth-card card">
        <h2>Anmelden</h2>
        <p className="muted">Prompt-Verwaltung für LLM-Workflows</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Benutzername</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
        <p className="muted">
          {allowRegistration ? (
            <>
              Noch kein Konto? <Link to="/register">Registrieren</Link>
            </>
          ) : (
            "Registrierung ist derzeit deaktiviert."
          )}
        </p>
      </div>
      <AppVersion />
    </div>
  );
}
