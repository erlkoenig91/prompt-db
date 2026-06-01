import { useMemo } from "react";
import { useLocale } from "./LocaleContext";

export type ViewMode = "list" | "grid" | "compact";

const STORAGE_KEY = "promptdb-view-mode";

export const VIEW_MODE_IDS: ViewMode[] = ["list", "grid", "compact"];

export function useViewModes() {
  const { t } = useLocale();
  return useMemo(
    () => [
      { id: "list" as ViewMode, label: t("viewMode.list"), hint: t("viewMode.listHint") },
      { id: "grid" as ViewMode, label: t("viewMode.grid"), hint: t("viewMode.gridHint") },
      { id: "compact" as ViewMode, label: t("viewMode.compact"), hint: t("viewMode.compactHint") },
    ],
    [t],
  );
}

export function useScopes() {
  const { t } = useLocale();
  return useMemo(
    () =>
      [
        { value: "all", label: t("scope.all") },
        { value: "mine", label: t("scope.mine") },
        { value: "public", label: t("scope.public") },
      ] as const,
    [t],
  );
}

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
