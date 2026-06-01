import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useLocale } from "../LocaleContext";
import AppHeader from "../components/AppHeader";
import type { Stats } from "../types";

export default function StatsPage() {
  const { t, translateApiError, taskLabel, formatDate, formatDay } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const statsData = await api.stats();
        if (!active) return;
        setStats(statsData);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : t("stats.loadFailed");
        setError(err instanceof ApiError ? translateApiError(message) : message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t, translateApiError]);

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
      <AppHeader subtitle={t("stats.subtitle")} />

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">{t("stats.loading")}</p>
      ) : !stats ? (
        <p className="muted">{t("common.noData")}</p>
      ) : (
        <>
          <section className="stat-kpis">
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.total_public_prompts}</span>
              <span className="stat-kpi-label">{t("stats.publicPrompts")}</span>
            </div>
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.total_copies}</span>
              <span className="stat-kpi-label">{t("stats.totalCopies")}</span>
            </div>
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.new_last_7_days}</span>
              <span className="stat-kpi-label">{t("stats.new7Days")}</span>
            </div>
            <div className="card stat-kpi">
              <span className="stat-kpi-value">{stats.new_last_30_days}</span>
              <span className="stat-kpi-label">{t("stats.new30Days")}</span>
            </div>
          </section>

          <section className="card stat-section">
            <h2>{t("stats.mostCopied")}</h2>
            {stats.most_copied.length === 0 ? (
              <p className="muted">{t("stats.noCopies")}</p>
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
                        <span className="badge">{taskLabel(p.task)}</span>
                        {p.owner_username && <span className="badge">@{p.owner_username}</span>}
                        <span className="badge">
                          {t("common.since")} {formatDate(p.created_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card stat-section">
            <h2>{t("stats.newByDay")}</h2>
            <div className="stat-chart" role="img" aria-label={t("stats.chartLabel")}>
              {stats.new_prompts_by_day.map((point) => (
                <div
                  key={point.date}
                  className="stat-chart-col"
                  title={`${formatDate(point.date)}: ${point.count}`}
                >
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
