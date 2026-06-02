import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";
import { useLocale } from "../LocaleContext";
import PromptCard from "../components/PromptCard";
import ViewModeSwitch from "../components/ViewModeSwitch";
import AppHeader from "../components/AppHeader";
import type { Meta, Prompt, PromptInput } from "../types";
import { loadViewMode, saveViewMode, useScopes, type ViewMode } from "../viewMode";
import { copyToClipboard } from "../clipboard";

const emptyForm: PromptInput = {
  title: "",
  content: "",
  description: "",
  model: "gpt-4o",
  task: "architecture",
  visibility: "private",
  tags: "",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, translateApiError, taskLabel: translateTask } = useLocale();
  const scopes = useScopes();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [defaultVisibility, setDefaultVisibility] = useState<"private" | "public">("private");
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

  const resolveTaskLabel = useCallback(
    (task: string) => translateTask(task),
    [translateTask],
  );

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
      const message = err instanceof ApiError ? err.message : t("common.loadFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
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
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const settings = await api.getSettings();
        if (!active) return;
        setDefaultVisibility(settings.default_prompt_visibility);
        const prefs = user.preferences ?? settings.preferences;
        setScope(prefs.default_scope);
        setViewMode(prefs.default_view_mode);
        saveViewMode(prefs.default_view_mode);
      } catch {
        /* preferences optional */
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    loadPrompts();
  }, [scope, search, taskFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, visibility: defaultVisibility });
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
      setError(t("dashboard.modelRequired"));
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
      const message = err instanceof ApiError ? err.message : t("common.saveFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("dashboard.deleteConfirm"))) return;
    try {
      await api.deletePrompt(id);
      await loadPrompts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("common.deleteFailed");
      setError(err instanceof ApiError ? translateApiError(message) : message);
    }
  }

  async function copyPrompt(prompt: Prompt) {
    try {
      await copyToClipboard(prompt.content);
      setCopiedId(prompt.id);
      window.setTimeout(() => setCopiedId((current) => (current === prompt.id ? null : current)), 2000);
      api
        .registerCopy(prompt.id)
        .then((res) =>
          setPrompts((current) =>
            current.map((p) => (p.id === prompt.id ? { ...p, copy_count: res.copy_count } : p)),
          ),
        )
        .catch(() => {
          /* Copy-Tracking ist best effort */
        });
    } catch {
      setError(t("dashboard.copyFailed"));
    }
  }

  const hasActiveFilters = search.length > 0 || taskFilter.length > 0;

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    saveViewMode(mode);
  }

  const hitsLabel =
    prompts.length === 1 ? t("common.hitsOne") : t("common.hitsMany");

  return (
    <div className={`layout ${viewMode === "grid" ? "layout-wide" : ""}`}>
      <AppHeader />

      <section className="search-panel card">
        <div className="search-panel-header">
          <h2>{t("dashboard.search")}</h2>
          {!loading && (
            <span className="muted">
              {prompts.length} {hitsLabel}
            </span>
          )}
        </div>
        <div className="search-fields">
          <div className="search-input-wrap">
            <label htmlFor="search">{t("dashboard.textSearch")}</label>
            <input
              id="search"
              type="search"
              placeholder={t("dashboard.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="task-filter">{t("dashboard.task")}</label>
            <select id="task-filter" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
              <option value="">{t("dashboard.allTasks")}</option>
              {(meta?.tasks ?? []).map((taskOption) => (
                <option key={taskOption.value} value={taskOption.value}>
                  {resolveTaskLabel(taskOption.value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="scope">{t("dashboard.scope")}</label>
            <select id="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              {scopes.map((scopeOption) => (
                <option key={scopeOption.value} value={scopeOption.value}>
                  {scopeOption.label}
                </option>
              ))}
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
            {t("dashboard.resetFilters")}
          </button>
        )}
      </section>

      <div className="toolbar toolbar-main">
        <button onClick={openCreate}>{t("dashboard.newPrompt")}</button>
        <ViewModeSwitch value={viewMode} onChange={handleViewModeChange} />
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">{t("dashboard.loadingPrompts")}</p>
      ) : prompts.length === 0 ? (
        <p className="muted">
          {hasActiveFilters ? t("dashboard.noSearchResults") : t("dashboard.noPrompts")}
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
                taskLabel={resolveTaskLabel}
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? t("dashboard.editPrompt") : t("dashboard.newPrompt")}</h2>
            <form onSubmit={handleSubmit}>
              <label htmlFor="title">{t("dashboard.title")}</label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <label htmlFor="content">{t("dashboard.promptText")}</label>
              <textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
              <label htmlFor="description">{t("dashboard.description")}</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid-2">
                <div>
                  <label htmlFor="model-mode">{t("dashboard.model")}</label>
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
                    <option value="__new__">{t("dashboard.newModel")}</option>
                  </select>
                  {useNewModel && (
                    <>
                      <label htmlFor="new-model" className="inline-label">
                        {t("dashboard.modelName")}
                      </label>
                      <input
                        id="new-model"
                        list="model-suggestions"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder={t("dashboard.modelPlaceholder")}
                        required
                      />
                      <datalist id="model-suggestions">
                        {modelOptions.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      <p className="muted hint">{t("dashboard.modelHint")}</p>
                    </>
                  )}
                </div>
                <div>
                  <label htmlFor="task">{t("dashboard.task")}</label>
                  <select
                    id="task"
                    value={form.task}
                    onChange={(e) => setForm({ ...form, task: e.target.value })}
                  >
                    {(meta?.tasks ?? [{ value: form.task, label: form.task }]).map((taskOption) => (
                      <option key={taskOption.value} value={taskOption.value}>
                        {resolveTaskLabel(taskOption.value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="visibility">{t("dashboard.visibility")}</label>
                  <select
                    id="visibility"
                    value={form.visibility}
                    onChange={(e) =>
                      setForm({ ...form, visibility: e.target.value as "private" | "public" })
                    }
                  >
                    <option value="private">{t("common.private")}</option>
                    <option value="public">{t("common.public")}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tags">{t("dashboard.tags")}</label>
                  <input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
              </div>
              <div className="toolbar">
                <button type="submit">{editing ? t("common.save") : t("common.create")}</button>
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>
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
