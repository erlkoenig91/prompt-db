import type { Meta, Prompt, PromptInput, User } from "./types";
import { getApiUrl } from "./config";

type Tokens = { access_token: string; refresh_token: string };

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getTokens(): Tokens | null {
  const raw = localStorage.getItem("promptdb_tokens");
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

function setTokens(tokens: Tokens | null) {
  if (tokens) {
    localStorage.setItem("promptdb_tokens", JSON.stringify(tokens));
  } else {
    localStorage.removeItem("promptdb_tokens");
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (tokens?.access_token) {
    headers.Authorization = `Bearer ${tokens.access_token}`;
  }

  const response = await fetch(`${getApiUrl()}${path}`, { ...options, headers });

  if (response.status === 401 && retry && tokens?.refresh_token) {
    const refreshed = await fetch(`${getApiUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
    if (refreshed.ok) {
      const newTokens = (await refreshed.json()) as Tokens;
      setTokens(newTokens);
      return request<T>(path, options, false);
    }
    setTokens(null);
  }

  if (!response.ok) {
    let message = "Anfrage fehlgeschlagen";
    try {
      const body = (await response.json()) as { detail?: string | { msg: string }[] };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((d) => d.msg).join(", ");
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  getTokens,
  setTokens,
  logout() {
    setTokens(null);
  },

  register(username: string, password: string) {
    return request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async login(username: string, password: string) {
    const tokens = await request<Tokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setTokens(tokens);
    return tokens;
  },

  me() {
    return request<User>("/api/auth/me");
  },

  meta() {
    return request<Meta>("/api/meta");
  },

  listPrompts(scope: "all" | "mine" | "public", search?: string, task?: string) {
    const params = new URLSearchParams({ scope });
    if (search) params.set("search", search);
    if (task) params.set("task", task);
    return request<Prompt[]>(`/api/prompts?${params}`);
  },

  createPrompt(data: PromptInput) {
    return request<Prompt>("/api/prompts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePrompt(id: string, data: Partial<PromptInput>) {
    return request<Prompt>(`/api/prompts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deletePrompt(id: string) {
    return request<void>(`/api/prompts/${id}`, { method: "DELETE" });
  },
};

export { ApiError };
