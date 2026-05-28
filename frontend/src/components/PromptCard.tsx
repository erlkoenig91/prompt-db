import type { Prompt } from "../types";
import type { ViewMode } from "../viewMode";

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
  const preview =
    viewMode === "compact"
      ? prompt.content.replace(/\s+/g, " ").trim().slice(0, 140)
      : prompt.content;

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
          title="Prompt-Text kopieren"
          aria-label="Prompt-Text kopieren"
        >
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>

      <div className="meta-row">
        <span className="badge">{prompt.model}</span>
        <span className="badge">{taskLabel(prompt.task)}</span>
        <span className={`badge ${prompt.visibility}`}>{prompt.visibility}</span>
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
            Bearbeiten
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Löschen
          </button>
        </div>
      )}
    </article>
  );
}
