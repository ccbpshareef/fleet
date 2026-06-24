import { useMemo } from "react";
import { getPeriodLabel } from "../../utils/periodFilter";
import { computeDriverEarningsSummary } from "../../utils/driverEarnings";

export default function MobileReportsPage({
  dashboard,
  trips,
  language = "en",
  periodFilter = "complete",
  userRole = "user",
  expenseTotalsByTrip = {},
  notifications = []
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const isDriver = userRole === "driver";
  const driverEarnings = useMemo(
    () => computeDriverEarningsSummary(trips, expenseTotalsByTrip),
    [trips, expenseTotalsByTrip]
  );

  if (!trips.length) {
    return (
      <div className="mu-page">
        <div className="mu-screen-head">
          <h2 className="mu-screen-title">{t("Reports", "రిపోర్ట్స్")}</h2>
          <span className="mu-screen-badge">{periodLabel}</span>
        </div>
        <div className="mu-empty">
          <p className="mu-empty-title">{t("No data for this period", "ఈ కాలంలో డేటా లేదు")}</p>
          <p className="mu-empty-text">{t("Change the period filter.", "కాలం ఫిల్టర్ మార్చండి.")}</p>
        </div>
      </div>
    );
  }

  const barHeights = isDriver
    ? driverEarnings.tripEarnings
        .slice(0, 5)
        .map((item) => Math.max(16, Math.min(72, item.earning / 500)))
    : trips
        .slice(0, 5)
        .map((trip) => Math.max(16, Math.min(72, Number(trip.net_profit || trip.load_price || 0) / 1000)));

  return (
    <div className="mu-page">
      <div className="mu-screen-head">
        <h2 className="mu-screen-title">{isDriver ? t("My Earnings", "నా సంపాదన") : t("Reports", "రిపోర్ట్స్")}</h2>
        <span className="mu-screen-badge">
          {trips.length} · {periodLabel}
        </span>
      </div>

      <div className="mu-card">
        {isDriver ? (
          <>
            <div className="mu-summary-row">
              <span className="mu-row-meta">{t("My Trips", "నా ట్రిప్స్")}</span>
              <span>{driverEarnings.tripCount}</span>
            </div>
            <div className="mu-summary-row">
              <span className="mu-row-meta">{t("Period Earnings", "కాలం సంపాదన")}</span>
              <span className="profit">₹{driverEarnings.totalEarning.toFixed(0)}</span>
            </div>
            <div className="mu-summary-row">
              <span className="mu-row-meta">{t("Daily Wage", "రోజువారీ వేతనం")}</span>
              <span>₹{driverEarnings.totalDailyWage.toFixed(0)}</span>
            </div>
            <div className="mu-summary-row">
              <span className="mu-row-meta">{t("Commission", "కమిషన్")}</span>
              <span>₹{driverEarnings.totalCommission.toFixed(0)}</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {!isDriver && notifications.length ? (
        <div className="mu-card">
          <h3 className="mu-screen-title">{t("Driver Activity", "డ్రైవర్ కార్యకలాపం")}</h3>
          {notifications.slice(0, 8).map((item) => (
            <div className="mu-row" key={item.id} style={{ cursor: "default" }}>
              <div className="mu-row-top">
                <span className="mu-row-title">{item.title}</span>
                {!item.is_read ? <span className="mu-status-pill">New</span> : null}
              </div>
              <p className="mu-row-meta">{item.message}</p>
              {item.driver_name ? (
                <p className="mu-row-meta">
                  {t("Driver", "డ్రైవర్")}: {item.driver_name}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mu-card">
        <h3 className="mu-screen-title">
          {isDriver ? t("Trip Earnings Trend", "ట్రిప్ సంపాదన ట్రెండ్") : t("Trip Profit Trend", "ట్రిప్ లాభ ట్రెండ్")}
        </h3>
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
