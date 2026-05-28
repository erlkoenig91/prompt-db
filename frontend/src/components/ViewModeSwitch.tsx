import { VIEW_MODES, type ViewMode } from "../viewMode";

interface ViewModeSwitchProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeSwitch({ value, onChange }: ViewModeSwitchProps) {
  return (
    <div className="view-switch" role="group" aria-label="Ansicht wählen">
      <span className="view-switch-label">Ansicht</span>
      {VIEW_MODES.map((mode) => (
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
