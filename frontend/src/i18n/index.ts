import de from "./locales/de";
import en from "./locales/en";

export type Locale = "de" | "en";

export const LOCALES: Locale[] = ["de", "en"];

export const LOCALE_STORAGE_KEY = "promptdb-locale";

const messages = { de, en } as const;

type MessageTree = typeof de;

export type TranslationKey = string;

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function detectLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "de" || stored === "en") {
    return stored;
  }
  return "en";
}

export function createTranslator(locale: Locale) {
  const tree = messages[locale] as MessageTree;

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = getNested(tree as unknown as Record<string, unknown>, key) ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{{${name}}}`, String(value));
      }
    }
    return text;
  }

  function translateApiError(message: string): string {
    if (locale === "de") {
      return message;
    }
    const apiErrors = tree.apiErrors as Record<string, string>;
    return apiErrors[message] ?? message;
  }

  function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
    const tag = locale === "de" ? "de-DE" : "en-US";
    return new Date(iso).toLocaleDateString(tag, options);
  }

  function formatDateTime(iso: string): string {
    const tag = locale === "de" ? "de-DE" : "en-US";
    return new Date(iso).toLocaleDateString(tag, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDay(iso: string): string {
    const tag = locale === "de" ? "de-DE" : "en-US";
    return new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "2-digit" });
  }

  function taskLabel(task: string): string {
    return getNested(tree.tasks as unknown as Record<string, unknown>, task) ?? task;
  }

  function ruleLabel(group: "passwordRules" | "usernameRules", id: string): string {
    return getNested(tree[group] as unknown as Record<string, unknown>, id) ?? id;
  }

  return { t, translateApiError, formatDate, formatDateTime, formatDay, taskLabel, ruleLabel };
}

export type Translator = ReturnType<typeof createTranslator>;
