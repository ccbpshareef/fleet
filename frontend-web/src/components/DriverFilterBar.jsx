export default function DriverFilterBar({ drivers, value, onChange, language = "en", tripCounts = {} }) {
  const t = (en, te) => (language === "te" ? te : en);
  const list = drivers || [];

  return (
    <div className="m-filter-bar">
      <p className="m-filter-caption">{t("Driver", "డ్రైవర్")}</p>
      <div className="m-filter-scroll" role="tablist" aria-label={t("Driver", "డ్రైవర్")}>
        <button
          type="button"
          role="tab"
          aria-selected={!value}
          className={`m-filter-chip ${!value ? "active soft" : ""}`}
          onClick={() => onChange("")}
        >
          {t("All Drivers", "అందరు")}
        </button>
        {list.map((driver) => {
          const active = String(value) === String(driver.id);
          const count = tripCounts[driver.id] || 0;
          return (
            <button
              key={driver.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`m-filter-chip ${active ? "active soft" : ""}`}
              onClick={() => onChange(String(driver.id))}
            >
              {driver.name}
              {count ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
