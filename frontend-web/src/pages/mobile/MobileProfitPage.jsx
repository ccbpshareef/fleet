import { getPeriodLabel } from "../../utils/periodFilter";

export default function MobileProfitPage({
  dashboard,
  trips,
  language = "en",
  periodFilter = "complete",
  onBack
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const totalIncome = Number(dashboard?.total_income || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const totalProfit = Number(dashboard?.total_profit || 0);

  return (
    <div className="mu-page">
      <div className="mu-screen-head">
        <div>
          <button type="button" className="mu-back-btn" onClick={onBack}>
            ← {t("More", "మరిన్ని")}
          </button>
          <h2 className="mu-screen-title">{t("Profit Summary", "లాభం సారాంశం")}</h2>
          <p className="mu-section-sub">
            {t("Revenue, expenses, and trip-wise profit for the selected period.", "ఎంచుకున్న కాలానికి ఆదాయం, ఖర్చులు మరియు ట్రిప్ వారీగా లాభం.")}
          </p>
        </div>
        <span className="mu-screen-badge">{periodLabel}</span>
      </div>

      <div className="mu-stat-grid mu-stat-grid-compact">
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Income", "ఆదాయం")}</span>
          <span className="mu-stat-value">₹{totalIncome.toFixed(0)}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Expenses", "ఖర్చులు")}</span>
          <span className="mu-stat-value">₹{totalExpenses.toFixed(0)}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Net Profit", "నికర లాభం")}</span>
          <span className={`mu-stat-value ${totalProfit >= 0 ? "success" : "loss"}`}>₹{totalProfit.toFixed(0)}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Trips", "ట్రిప్స్")}</span>
          <span className="mu-stat-value">{trips.length}</span>
        </div>
      </div>

      <div className="mu-card">
        <h3 className="mu-screen-title">{t("Trip-wise Profit", "ట్రిప్ వారీగా లాభం")}</h3>
        {trips.length ? (
          trips.map((trip) => {
            const loadPrice = Number(trip.load_price || 0);
            const expenses = Number(
              trip.total_expenses ?? (trip.net_profit != null ? loadPrice - Number(trip.net_profit) : 0)
            );
            const net = Number(trip.net_profit ?? loadPrice - expenses);
            return (
              <div className="mu-row" key={trip.id}>
                <div className="mu-row-top">
                  <span className="mu-row-title">
                    {trip.load_location} → {trip.unload_location}
                  </span>
                  <strong className={net >= 0 ? "profit" : "loss"}>₹{net.toFixed(0)}</strong>
                </div>
                <p className="mu-row-meta">
                  {t("Load", "లోడ్")}: ₹{loadPrice.toFixed(0)} · {t("Expenses", "ఖర్చులు")}: ₹{expenses.toFixed(0)}
                </p>
              </div>
            );
          })
        ) : (
          <div className="mu-empty">
            <p className="mu-empty-title">{t("No trip data yet", "ఇంకా ట్రిప్ డేటా లేదు")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
