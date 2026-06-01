import type { Prompt } from "../types";
import type { ViewMode } from "../viewMode";
import { useLocale } from "../LocaleContext";

interface PromptCardProps {
  prompt: Prompt;
  viewMode: ViewMode;
  isOwner: boolean;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  taskLabel: (task: string) => string;
}

export default function PromptCard({
  prompt,
  viewMode,
  isOwner,
  copied,
  onCopy,
  onEdit,
  onDelete,
  taskLabel,
}: PromptCardProps) {
  const { t } = useLocale();
  const preview =
    viewMode === "compact"
      ? prompt.content.replace(/\s+/g, " ").trim().slice(0, 140)
      : prompt.content;

  const visibilityLabel =
    prompt.visibility === "public" ? t("common.public") : t("common.private");

  return (
    <article className={`card prompt-card prompt-card--${viewMode}`}>
      <div className="prompt-card-header">
        <div className="prompt-card-title-block">
          <h3>{prompt.title}</h3>
          {viewMode === "compact" && prompt.description && (
            <p className="muted prompt-card-subtitle">{prompt.description}</p>
          )}
        </div>
        <button
          type="button"
          className={`copy-btn ${copied ? "copied" : ""}`}
          onClick={onCopy}
          title={t("dashboard.copyPrompt")}
          aria-label={t("dashboard.copyPrompt")}
        >
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      </div>

      <div className="meta-row">
        <span className="badge">{prompt.model}</span>
        <span className="badge">{taskLabel(prompt.task)}</span>
        <span className={`badge ${prompt.visibility}`}>{visibilityLabel}</span>
        {prompt.owner_username && <span className="badge">@{prompt.owner_username}</span>}
      </div>

      {viewMode !== "compact" && prompt.description && (
        <p className="muted prompt-card-description">{prompt.description}</p>
      )}

      <pre className={`prompt-preview prompt-preview--${viewMode}`}>
        {preview}
        {viewMode === "compact" && prompt.content.length > 140 ? "…" : ""}
      </pre>

      {isOwner && (
        <div className="prompt-actions">
          <button type="button" className="secondary" onClick={onEdit}>
            {t("common.edit")}
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            {t("common.delete")}
          </button>
        </div>
      )}
    </article>
  );
}
