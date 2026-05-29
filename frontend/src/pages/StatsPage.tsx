import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import AppHeader from "../components/AppHeader";
import type { Meta, Stats } from "../types";

function taskLabel(meta: Meta | null, task: string) {
  return meta?.tasks.find((t) => t.value === task)?.label ?? task;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [statsData, metaData] = await Promise.all([api.stats(), api.meta().catch(() => null)]);
        if (!active) return;
        setStats(statsData);
        setMeta(metaData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Statistik konnte nicht geladen werden");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const maxDayCount = useMemo(
    () => Math.max(1, ...(stats?.new_prompts_by_day.map((p) => p.count) ?? [0])),
    [stats],
  );
  const maxCopies = useMemo(
    () => Math.max(1, ...(stats?.most_copied.map((p) => p.copy_count) ?? [0])),
    [stats],
  );

  return (
    <div className="layout">
      <AppHeader subtitle="Statistik öffentlicher Prompts" />

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Lade Statistik…</p>
      ) : !stats ? (
        <p className="muted">Keine Daten verfügbar.</p>
      ) : (
        <>
          <section className="stat-kpis">
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.total_public_prompts}</span>
              <span className="stat-kpi-label">Öffentliche Prompts</span>
            </div>
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.total_copies}</span>
              <span className="stat-kpi-label">Kopiervorgänge gesamt</span>
            </div>
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.new_last_7_days}</span>
              <span className="stat-kpi-label">Neu (7 Tage)</span>
            </div>
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.new_last_30_days}</span>
              <span className="stat-kpi-label">Neu (30 Tage)</span>
            </div>
          </section>

          <section className="card stat-section">
            <h2>Meist kopierte öffentliche Prompts</h2>
            {stats.most_copied.length === 0 ? (
              <p className="muted">Noch keine Kopiervorgänge erfasst.</p>
            ) : (
              <ol className="stat-rank">
                {stats.most_copied.map((p, index) => (
                  <li key={p.id} className="stat-rank-item">
                    <span className="stat-rank-pos">{index + 1}</span>
                    <div className="stat-rank-body">
                      <div className="stat-rank-head">
                        <span className="stat-rank-title">{p.title}</span>
                        <span className="stat-rank-count">{p.copy_count}×</span>
                      </div>
                      <div className="stat-rank-bar">
                        <div
                          className="stat-rank-bar-fill"
                          style={{ width: `${(p.copy_count / maxCopies) * 100}%` }}
                        />
                      </div>
                      <div className="meta-row">
                        <span className="badge">{p.model}</span>
                        <span className="badge">{taskLabel(meta, p.task)}</span>
                        {p.owner_username && <span className="badge">@{p.owner_username}</span>}
                        <span className="badge">seit {formatDate(p.created_at)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card stat-section">
            <h2>Neue öffentliche Prompts (letzte 30 Tage)</h2>
            <div className="stat-chart" role="img" aria-label="Neue öffentliche Prompts pro Tag">
              {stats.new_prompts_by_day.map((point) => (
                <div key={point.date} className="stat-chart-col" title={`${formatDate(point.date)}: ${point.count}`}>
                  <div
                    className="stat-chart-bar"
                    style={{ height: `${(point.count / maxDayCount) * 100}%` }}
                  >
                    {point.count > 0 && <span className="stat-chart-value">{point.count}</span>}
                  </div>
                  <span className="stat-chart-label">{formatDay(point.date)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
