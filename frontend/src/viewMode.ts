export type ViewMode = "list" | "grid" | "compact";

const STORAGE_KEY = "promptdb-view-mode";

export const VIEW_MODES: { id: ViewMode; label: string; hint: string }[] = [
  { id: "list", label: "Liste", hint: "Ausführliche Einzelansicht" },
  { id: "grid", label: "Kacheln", hint: "Mehrspaltige Kachelansicht" },
  { id: "compact", label: "Kompakt", hint: "Dichte Tabellenansicht" },
];

export function loadViewMode(): ViewMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "list" || stored === "grid" || stored === "compact") {
    return stored;
  }
  return "list";
}

export function saveViewMode(mode: ViewMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}
