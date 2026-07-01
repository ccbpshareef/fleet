import MobileProfitPage from "./MobileProfitPage";
import MobileLiveTrackingPage from "./MobileLiveTrackingPage";

export default function MobileMorePage({
  subview = null,
  onSubviewChange,
  dashboard,
  trips,
  language = "en",
  periodFilter = "complete"
}) {
  const t = (en, te) => (language === "te" ? te : en);

  if (subview === "profit") {
    return (
      <MobileProfitPage
        dashboard={dashboard}
        trips={trips}
        language={language}
        periodFilter={periodFilter}
        onBack={() => onSubviewChange(null)}
      />
    );
  }

  if (subview === "tracking") {
    return (
      <MobileLiveTrackingPage language={language} onBack={() => onSubviewChange(null)} />
    );
  }

  const items = [
    {
      id: "profit",
      icon: "💰",
      title: t("Profit Summary", "లాభం సారాంశం"),
      desc: t("Revenue, expenses, and trip-wise profit.", "ఆదాయం, ఖర్చులు మరియు ట్రిప్ వారీగా లాభం.")
    },
    {
      id: "tracking",
      icon: "📍",
      title: t("Live Tracking", "లైవ్ ట్రాకింగ్"),
      desc: t("See which lorries are on route right now.", "ఏ లారీలు ప్రయాణంలో ఉన్నాయో చూడండి.")
    }
  ];

  return (
    <div className="mu-page">
      <div className="mu-screen-head">
        <div>
          <h2 className="mu-screen-title">{t("More", "మరిన్ని")}</h2>
          <p className="mu-section-sub">
            {t("Extra fleet tools from the desktop app.", "డెస్క్‌టాప్ యాప్‌లోని అదనపు ఫ్లీట్ టూల్స్.")}
          </p>
        </div>
      </div>

      <div className="mu-more-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="mu-more-tile"
            onClick={() => onSubviewChange(item.id)}
          >
            <span className="mu-more-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mu-more-title">{item.title}</span>
            <span className="mu-more-desc">{item.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
