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
  notifications = [],
  onClearAllNotifications = async () => {}
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
      <div className="mu-page ff-page ff-dashboard--mobile">
        <div className="ff-page-header">
          <h2 className="mu-screen-title">{t("Reports", "రిపోర్ట్స్")}</h2>
          <span className="mu-screen-badge">{periodLabel}</span>
        </div>
        <div className="ff-glass-card mu-empty">
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
    <div className="mu-page ff-page ff-dashboard--mobile">
      <div className="ff-page-header">
        <div>
          <h2 className="mu-screen-title">{isDriver ? t("My Earnings", "నా సంపాదన") : t("Reports", "రిపోర్ట్స్")}</h2>
          <p className="mu-section-sub">
            {isDriver
              ? t("Your trip earnings for the selected period.", "ఎంచుకున్న కాలంలో మీ ట్రిప్ సంపాదన.")
              : t("Business summary and driver activity.", "వ్యాపార సారాంశం మరియు డ్రైవర్ కార్యకలాపం.")}
          </p>
        </div>
        <span className="mu-screen-badge">
          {trips.length} · {periodLabel}
        </span>
      </div>

      <div className="ff-kpi-row">
        {isDriver ? (
          <>
            <article className="ff-glass-card ff-kpi-card">
              <span className="ff-kpi-label">{t("My Trips", "నా ట్రిప్స్")}</span>
              <div className="ff-kpi-value">{driverEarnings.tripCount}</div>
            </article>
            <article className="ff-glass-card ff-kpi-card ff-kpi-card--accent">
              <span className="ff-kpi-label">{t("Earnings", "సంపాదన")}</span>
              <div className="ff-kpi-value">₹{driverEarnings.totalEarning.toFixed(0)}</div>
            </article>
            <article className="ff-glass-card ff-kpi-card">
              <span className="ff-kpi-label">{t("Wage", "వేతనం")}</span>
              <div className="ff-kpi-value">₹{driverEarnings.totalDailyWage.toFixed(0)}</div>
            </article>
            <article className="ff-glass-card ff-kpi-card">
              <span className="ff-kpi-label">{t("Commission", "కమిషన్")}</span>
              <div className="ff-kpi-value">₹{driverEarnings.totalCommission.toFixed(0)}</div>
            </article>
          </>
        ) : (
          <>
            <article className="ff-glass-card ff-kpi-card">
              <span className="ff-kpi-label">{t("Trips", "ట్రిప్స్")}</span>
              <div className="ff-kpi-value">{trips.length}</div>
            </article>
            <article className="ff-glass-card ff-kpi-card">
              <span className="ff-kpi-label">{t("Income", "ఆదాయం")}</span>
              <div className="ff-kpi-value">₹{(dashboard?.total_income || 0).toFixed(0)}</div>
            </article>
            <article className="ff-glass-card ff-kpi-card">
              <span className="ff-kpi-label">{t("Expenses", "ఖర్చులు")}</span>
              <div className="ff-kpi-value">₹{(dashboard?.total_expenses || 0).toFixed(0)}</div>
            </article>
            <article className="ff-glass-card ff-kpi-card ff-kpi-card--accent">
              <span className="ff-kpi-label">{t("Profit", "లాభం")}</span>
              <div className="ff-kpi-value">₹{(dashboard?.total_profit || 0).toFixed(0)}</div>
            </article>
          </>
        )}
      </div>

      {!isDriver && notifications.length ? (
        <div className="ff-glass-card">
          <div className="mu-screen-head">
            <h3 className="mu-screen-title">{t("Driver Activity", "డ్రైవర్ కార్యకలాపం")}</h3>
            <button type="button" className="mu-link-btn notification-clear-inline" onClick={onClearAllNotifications}>
              {t("Clear all", "అన్నీ తొలగించు")}
            </button>
          </div>
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

      <div className="ff-glass-card">
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
