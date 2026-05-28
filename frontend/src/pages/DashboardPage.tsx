import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import PromptCard from "../components/PromptCard";
import ViewModeSwitch from "../components/ViewModeSwitch";
import BrandLogo from "../components/BrandLogo";
import AppVersion from "../components/AppVersion";
import type { Meta, Prompt, PromptInput } from "../types";
import { loadViewMode, saveViewMode, type ViewMode } from "../viewMode";

const emptyForm: PromptInput = {
  title: "",
  content: "",
  description: "",
  model: "gpt-4o",
  task: "architecture",
  visibility: "private",
  tags: "",
};

function taskLabel(meta: Meta | null, task: string) {
  return meta?.tasks.find((t) => t.value === task)?.label ?? task;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [scope, setScope] = useState<"all" | "mine" | "public">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [form, setForm] = useState<PromptInput>(emptyForm);
  const [newModel, setNewModel] = useState("");
  const [useNewModel, setUseNewModel] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());

  const modelOptions = useMemo(() => meta?.models ?? [], [meta]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function loadPrompts() {
    setLoading(true);
    setError("");
    try {
      setPrompts(await api.listPrompts(scope, search || undefined, taskFilter || undefined));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function refreshMeta() {
    try {
      setMeta(await api.meta());
    } catch {
      setMeta(null);
    }
  }

  useEffect(() => {
    refreshMeta();
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [scope, search, taskFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setNewModel("");
    setUseNewModel(false);
    setShowForm(true);
  }

  function openEdit(prompt: Prompt) {
    setEditing(prompt);
    const knownModel = modelOptions.includes(prompt.model);
    setUseNewModel(!knownModel);
    setNewModel(knownModel ? "" : prompt.model);
    setForm({
      title: prompt.title,
      content: prompt.content,
      description: prompt.description ?? "",
      model: knownModel ? prompt.model : modelOptions[0] ?? prompt.model,
      task: prompt.task,
      visibility: prompt.visibility,
      tags: prompt.tags ?? "",
    });
    setShowForm(true);
  }

  function resolvedModel() {
    return useNewModel ? newModel.trim() : form.model;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const model = resolvedModel();
    if (!model) {
      setError("Bitte ein Modell auswählen oder einen Namen eingeben.");
      return;
    }
    const payload: PromptInput = {
      ...form,
      model,
      description: form.description || undefined,
      tags: form.tags || undefined,
    };
    try {
      if (editing) {
        await api.updatePrompt(editing.id, payload);
      } else {
        await api.createPrompt(payload);
      }
      setShowForm(false);
      await refreshMeta();
      await loadPrompts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Prompt wirklich löschen?")) return;
    try {
      await api.deletePrompt(id);
      await loadPrompts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Löschen fehlgeschlagen");
    }
  }

  async function copyPrompt(prompt: Prompt) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      window.setTimeout(() => setCopiedId((current) => (current === prompt.id ? null : current)), 2000);
    } catch {
      setError("Kopieren in die Zwischenablage fehlgeschlagen");
    }
  }

  const hasActiveFilters = search.length > 0 || taskFilter.length > 0;

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    saveViewMode(mode);
  }

  return (
    <div className={`layout ${viewMode === "grid" ? "layout-wide" : ""}`}>
      <header>
        <BrandLogo size="md" subtitle={`Angemeldet als ${user?.username}`} />
        <div className="header-actions">
          <AppVersion />
          <button className="secondary" onClick={logout}>
            Abmelden
          </button>
        </div>
      </header>

      <section className="search-panel card">
        <div className="search-panel-header">
          <h2>Suche</h2>
          {!loading && (
            <span className="muted">
              {prompts.length} {prompts.length === 1 ? "Treffer" : "Treffer"}
            </span>
          )}
        </div>
        <div className="search-fields">
          <div className="search-input-wrap">
            <label htmlFor="search">Textsuche</label>
            <input
              id="search"
              type="search"
              placeholder="Titel, Inhalt, Tags, Modell…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="task-filter">Aufgabe</label>
            <select id="task-filter" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
              <option value="">Alle Aufgaben</option>
              {(meta?.tasks ?? []).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="scope">Bereich</label>
            <select id="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="all">Alle sichtbaren</option>
              <option value="mine">Meine</option>
              <option value="public">Öffentliche</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="secondary search-clear"
            onClick={() => {
              setSearchInput("");
              setTaskFilter("");
            }}
          >
            Filter zurücksetzen
          </button>
        )}
      </section>

      <div className="toolbar toolbar-main">
        <button onClick={openCreate}>Neuer Prompt</button>
        <ViewModeSwitch value={viewMode} onChange={handleViewModeChange} />
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Lade Prompts…</p>
      ) : prompts.length === 0 ? (
        <p className="muted">
          {hasActiveFilters ? "Keine Prompts zu deiner Suche gefunden." : "Keine Prompts gefunden."}
        </p>
      ) : (
        <div className={`prompt-collection prompt-collection--${viewMode}`}>
          {prompts.map((prompt) => {
            const isOwner = prompt.owner_id === user?.id;
            return (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                viewMode={viewMode}
                isOwner={isOwner}
                copied={copiedId === prompt.id}
                onCopy={() => copyPrompt(prompt)}
                onEdit={() => openEdit(prompt)}
                onDelete={() => handleDelete(prompt.id)}
                taskLabel={(task) => taskLabel(meta, task)}
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? "Prompt bearbeiten" : "Neuer Prompt"}</h2>
            <form onSubmit={handleSubmit}>
              <label htmlFor="title">Titel</label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <label htmlFor="content">Prompt-Text</label>
              <textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
              <label htmlFor="description">Beschreibung</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid-2">
                <div>
                  <label htmlFor="model-mode">Modell</label>
                  <select
                    id="model-mode"
                    value={useNewModel ? "__new__" : form.model}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setUseNewModel(true);
                        setNewModel("");
                      } else {
                        setUseNewModel(false);
                        setForm({ ...form, model: e.target.value });
                      }
                    }}
                  >
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__new__">+ Neues Modell…</option>
                  </select>
                  {useNewModel && (
                    <>
                      <label htmlFor="new-model" className="inline-label">
                        Modellname
                      </label>
                      <input
                        id="new-model"
                        list="model-suggestions"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder="z. B. mistral-large"
                        required
                      />
                      <datalist id="model-suggestions">
                        {modelOptions.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      <p className="muted hint">Neue Modelle stehen danach für alle zur Auswahl.</p>
                    </>
                  )}
                </div>
                <div>
                  <label htmlFor="task">Aufgabe</label>
                  <select
                    id="task"
                    value={form.task}
                    onChange={(e) => setForm({ ...form, task: e.target.value })}
                  >
                    {(meta?.tasks ?? [{ value: form.task, label: form.task }]).map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="visibility">Sichtbarkeit</label>
                  <select
                    id="visibility"
                    value={form.visibility}
                    onChange={(e) =>
                      setForm({ ...form, visibility: e.target.value as "private" | "public" })
                    }
                  >
                    <option value="private">Privat</option>
                    <option value="public">Öffentlich</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tags">Tags (kommagetrennt)</label>
                  <input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
              </div>
              <div className="toolbar">
                <button type="submit">{editing ? "Speichern" : "Erstellen"}</button>
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>
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
