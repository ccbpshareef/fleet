import { PERIOD_KEYS, getPeriodLabel } from "../utils/periodFilter";

export default function PeriodFilterBar({ value, onChange, language = "en" }) {
  const t = (en, te) => (language === "te" ? te : en);

  return (
    <div className="m-filter-bar">
      <p className="m-filter-caption">{t("Period", "కాల వ్యవధి")}</p>
      <div className="m-filter-scroll" role="tablist" aria-label={t("Period", "కాల వ్యవధి")}>
        {PERIOD_KEYS.map((period) => {
          const active = value === period;
          return (
            <button
              key={period}
              type="button"
              role="tab"
              aria-selected={active}
              className={`m-filter-chip ${active ? "active primary" : ""}`}
              onClick={() => onChange(period)}
            >
              {getPeriodLabel(period, language)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
