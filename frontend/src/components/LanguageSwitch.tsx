import { useLocale } from "../LocaleContext";
import type { Locale } from "../i18n";

export default function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale();

  function select(next: Locale) {
    if (next !== locale) {
      setLocale(next);
    }
  }

  return (
    <div className="lang-switch" role="group" aria-label={t("language.switch")}>
      <button
        type="button"
        className={`lang-switch-btn ${locale === "de" ? "active" : ""}`}
        onClick={() => select("de")}
        aria-pressed={locale === "de"}
      >
        {t("language.de")}
      </button>
      <button
        type="button"
        className={`lang-switch-btn ${locale === "en" ? "active" : ""}`}
        onClick={() => select("en")}
        aria-pressed={locale === "en"}
      >
        {t("language.en")}
      </button>
    </div>
  );
}
