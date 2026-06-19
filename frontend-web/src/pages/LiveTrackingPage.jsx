export default function LiveTrackingPage({ language = "en" }) {
  const t = (en, te) => (language === "te" ? te : en);
  return (
    <section className="panel">
      <h2>📌 {t("Live Tracking", "లైవ్ ట్రాకింగ్")}</h2>
      <div className="map-box">
        <div className="overlay-top">
          <strong>{t("Lorry", "లారీ")} AP16AB1234</strong>
          <p>{t("Driver", "డ్రైవర్")}: Ramesh</p>
          <p>{t("Status", "స్థితి")}: {t("On Route", "ప్రయాణంలో")}</p>
        </div>
        <div className="overlay-bottom">
          <h4>{t("Trip Details", "ట్రిప్ వివరాలు")}</h4>
          <p>Hyderabad -&gt; Vijayawada</p>
          <button>{t("Quick Call Driver", "డ్రైవర్‌కు కాల్ చేయండి")}</button>
        </div>
      </div>
    </section>
  );
}
