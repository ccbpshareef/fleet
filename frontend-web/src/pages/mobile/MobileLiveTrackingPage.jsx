export default function MobileLiveTrackingPage({ language = "en", onBack }) {
  const t = (en, te) => (language === "te" ? te : en);

  return (
    <div className="mu-page">
      <div className="mu-screen-head">
        <div>
          <button type="button" className="mu-back-btn" onClick={onBack}>
            ← {t("More", "మరిన్ని")}
          </button>
          <h2 className="mu-screen-title">{t("Live Tracking", "లైవ్ ట్రాకింగ్")}</h2>
          <p className="mu-section-sub">
            {t("Follow route progress and fleet movement.", "రూట్ ప్రగతి మరియు ఫ్లీట్ కదలికను అనుసరించండి.")}
          </p>
        </div>
      </div>

      <div className="mu-card mu-map-card">
        <div className="map-box mu-map-box">
          <div className="overlay-top">
            <strong>{t("Lorry", "లారీ")} AP16AB1234</strong>
            <p>{t("Driver", "డ్రైవర్")}: Ramesh</p>
            <p>
              {t("Status", "స్థితి")}: {t("On Route", "ప్రయాణంలో")}
            </p>
          </div>
          <div className="overlay-bottom">
            <h4>{t("Trip Details", "ట్రిప్ వివరాలు")}</h4>
            <p>Hyderabad → Vijayawada</p>
            <a className="mu-primary-btn mu-call-link" href="tel:+919876543210">
              {t("Quick Call Driver", "డ్రైవర్‌కు కాల్ చేయండి")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
