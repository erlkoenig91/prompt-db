import { useViewModes, type ViewMode } from "../viewMode";
import { useLocale } from "../LocaleContext";

interface ViewModeSwitchProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeSwitch({ value, onChange }: ViewModeSwitchProps) {
  const { t } = useLocale();
  const viewModes = useViewModes();

  return (
    <div className="view-switch" role="group" aria-label={t("viewMode.choose")}>
      <span className="view-switch-label">{t("viewMode.label")}</span>
      {viewModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`view-switch-btn ${value === mode.id ? "active" : ""}`}
          onClick={() => onChange(mode.id)}
          title={mode.hint}
          aria-pressed={value === mode.id}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
