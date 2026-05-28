declare global {
  interface Window {
    __PROMPT_DB_CONFIG__?: {
      apiUrl?: string;
    };
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** API-Basis-URL: Laufzeit (config.js) schlägt Build-Zeit. Leer = Same-Origin (/api). */
export function getApiUrl(): string {
  const runtime = window.__PROMPT_DB_CONFIG__?.apiUrl;
  if (runtime !== undefined) {
    return normalizeBaseUrl(runtime);
  }

  if (import.meta.env.DEV) {
    return normalizeBaseUrl(import.meta.env.VITE_API_URL ?? "http://localhost:8000");
  }

  const buildTime = import.meta.env.VITE_API_URL ?? "";
  if (!buildTime || isLocalUrl(buildTime)) {
    return "";
  }

  return normalizeBaseUrl(buildTime);
}
