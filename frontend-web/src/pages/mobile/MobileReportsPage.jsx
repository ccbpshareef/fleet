import { getPeriodLabel } from "../../utils/periodFilter";

export default function MobileReportsPage({ dashboard, trips, language = "en", periodFilter = "complete" }) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);

  if (!trips.length) {
    return (
      <div className="mu-page">
        <div className="mu-screen-head">
          <h2 className="mu-screen-title">{t("Reports", "రిపోర్ట్స్")}</h2>
          <span className="mu-screen-badge">{periodLabel}</span>
        </div>
        <div className="mu-empty">
          <p className="mu-empty-title">{t("No data for this period", "ఈ కాలంలో డేటా లేదు")}</p>
          <p className="mu-empty-text">{t("Change period or driver filter.", "కాలం లేదా డ్రైవర్ ఫిల్టర్ మార్చండి.")}</p>
        </div>
      </div>
    );
  }

  const barHeights = trips
    .slice(0, 5)
    .map((trip) => Math.max(16, Math.min(72, Number(trip.net_profit || trip.load_price || 0) / 1000)));

  return (
    <div className="mu-page">
      <div className="mu-screen-head">
        <h2 className="mu-screen-title">{t("Reports", "రిపోర్ట్స్")}</h2>
        <span className="mu-screen-badge">
          {trips.length} · {periodLabel}
        </span>
      </div>

      <div className="mu-card">
        <div className="mu-summary-row">
          <span className="mu-row-meta">{t("Trips", "ట్రిప్స్")}</span>
          <span>{trips.length}</span>
        </div>
        <div className="mu-summary-row">
          <span className="mu-row-meta">{t("Income", "ఆదాయం")}</span>
          <span>₹{(dashboard?.total_income || 0).toFixed(0)}</span>
        </div>
        <div className="mu-summary-row">
          <span className="mu-row-meta">{t("Expenses", "ఖర్చులు")}</span>
          <span>₹{(dashboard?.total_expenses || 0).toFixed(0)}</span>
        </div>
        <div className="mu-summary-row">
          <span className="mu-row-meta">{t("Profit", "లాభం")}</span>
          <span className="profit">₹{(dashboard?.total_profit || 0).toFixed(0)}</span>
        </div>
      </div>

      <div className="mu-card">
        <h3 className="mu-screen-title">{t("Trip Profit Trend", "ట్రిప్ లాభ ట్రెండ్")}</h3>
        <div className="mu-bar-wrap">
          {barHeights.map((height, index) => (
            <div key={index} className="mu-bar-col">
              <div className="mu-bar" style={{ height }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
