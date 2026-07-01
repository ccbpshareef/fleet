export default function MobileHeroBanner({
  userName = "",
  periodLabel = "",
  stats = [],
  language = "en",
  subtitle = ""
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const today = new Date().toLocaleDateString(language === "te" ? "te-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });

  return (
    <section className="mu-hero-banner" aria-label={t("Overview", "అవలోకనం")}>
      <div className="mu-hero-banner-top">
        <span className="mu-hero-date">{today}</span>
        {periodLabel ? <span className="mu-hero-period">{periodLabel}</span> : null}
      </div>
      <h2 className="mu-hero-title">
        {t("Welcome", "స్వాగతం")}, {userName || t("User", "యూజర్")}
      </h2>
      {subtitle ? <p className="mu-hero-sub">{subtitle}</p> : null}
      {stats.length ? (
        <div className="mu-hero-stats">
          {stats.map((item) => (
            <div className="mu-hero-stat" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
