import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import BrandLogo from "../components/BrandLogo";
import AppVersion from "../components/AppVersion";
import { allRulesMet, checkPasswordRule, checkUsernameRule, PolicyHint } from "../PolicyHint";
import type { Meta } from "../types";

const FALLBACK_META: Meta = {
  version: __APP_VERSION__,
  models: [],
  tasks: [],
  password_rules: [
    { id: "length", label: "Mindestens 12 Zeichen" },
    { id: "uppercase", label: "Mindestens ein Großbuchstabe (A–Z)" },
    { id: "lowercase", label: "Mindestens ein Kleinbuchstabe (a–z)" },
    { id: "digit", label: "Mindestens eine Zahl (0–9)" },
  ],
  username_rules: [
    { id: "length", label: "3–64 Zeichen" },
    { id: "charset", label: "Nur Buchstaben, Zahlen, _ und -" },
  ],
};

export default function RegisterPage() {
  const { register } = useAuth();
  const [meta, setMeta] = useState<Meta>(FALLBACK_META);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMeta(FALLBACK_META));
  }, []);

  const passwordOk = allRulesMet(meta.password_rules, password, checkPasswordRule);
  const usernameOk = allRulesMet(meta.username_rules, username, checkUsernameRule);
  const canSubmit = passwordOk && usernameOk;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await register(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <BrandLogo size="lg" showText={false} />
      <div className="auth-card card">
        <h2>Registrieren</h2>
        <p className="muted">Erstelle ein Konto für die Prompt-Verwaltung.</p>
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
        <PolicyHint
          title="Benutzername"
          rules={meta.username_rules}
          value={username}
          check={checkUsernameRule}
        />

        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <PolicyHint
          title="Passwort-Anforderungen"
          rules={meta.password_rules}
          value={password}
          check={checkPasswordRule}
        />

        <button type="submit" disabled={loading || !canSubmit}>
          {loading ? "Erstellen…" : "Konto erstellen"}
        </button>
      </form>
      <p className="muted">
        Bereits registriert? <Link to="/login">Anmelden</Link>
      </p>
      </div>
      <AppVersion />
    </div>
  );
}
