import { useMemo, useState } from "react";
import { TRIP_STATUSES, tripStatusLabel } from "../../utils/fleetLabels";
import { getPeriodLabel } from "../../utils/periodFilter";
import MobileTripDetailPanel from "../../components/mobile/MobileTripDetailPanel";

export default function MobileDashboardPage({
  dashboard,
  trips,
  drivers,
  lorries = [],
  language = "en",
  expenseTotalsByTrip = {},
  periodFilter = "complete",
  userName = "",
  userRole = "user",
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const doneTrips = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showAllActiveTrips, setShowAllActiveTrips] = useState(false);
  const visibleActiveTrips = showAllActiveTrips ? activeTrips : activeTrips.slice(0, 5);
  const totalProfit = Number(dashboard?.total_profit || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const totalIncome = Number(dashboard?.total_income || 0);

  const statusSummary = useMemo(
    () =>
      TRIP_STATUSES.map((status) => ({
        status,
        count: trips.filter((trip) => trip.status === status).length
      })).filter((item) => item.count > 0),
    [trips]
  );

  if (!trips.length) {
    return (
      <div className="mu-page">
        <div className="mu-user-card">
          <h2 className="mu-user-title">{userName || t("Fleet User", "ఫ్లీట్ యూజర్")}</h2>
          <p className="mu-user-meta">
            {periodLabel} · {t("No trips found", "ట్రిప్స్ లేవు")}
          </p>
          <p className="mu-empty-text">
            {t(
              "No trips in this period. Try Complete Period or another filter.",
              "ఈ కాలంలో ట్రిప్స్ లేవు. పూర్తి కాలం లేదా వేరే ఫిల్టర్ ఎంచుకోండి."
            )}
          </p>
        </div>
      </div>
    );
  }

  const selectedTrip = trips.find((item) => item.id === selectedTripId);
  const selectedExpense = selectedTripId ? expenseTotalsByTrip[selectedTripId] : null;

  return (
    <div className="mu-page">
      {userRole === "user" ? (
        <div className="mu-user-card">
          <h2 className="mu-user-title">
            {t("Hello", "నమస్కారం")}, {userName || t("User", "యూజర్")}
          </h2>
          <p className="mu-user-meta">{periodLabel}</p>
          <div className="mu-user-stats">
            <span>
              {t("Trips", "ట్రిప్స్")}: <strong>{trips.length}</strong>
            </span>
            <span>
              {t("Live", "లైవ్")}: <strong>{activeTrips.length}</strong>
            </span>
            <span>
              {t("Done", "పూర్తి")}: <strong>{doneTrips.length}</strong>
            </span>
          </div>
        </div>
      ) : null}

      <div className="mu-stat-grid">
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Lorries", "లారీలు")}</span>
          <span className="mu-stat-value">{dashboard?.total_lorries ?? 0}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Live", "లైవ్")}</span>
          <span className="mu-stat-value">{activeTrips.length}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Drivers", "డ్రైవర్లు")}</span>
          <span className="mu-stat-value">{drivers.length}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Income", "ఆదాయం")}</span>
          <span className="mu-stat-value">₹{totalIncome.toFixed(0)}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Expense", "ఖర్చు")}</span>
          <span className="mu-stat-value">₹{totalExpenses.toFixed(0)}</span>
        </div>
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Profit", "లాభం")}</span>
          <span className="mu-stat-value success">₹{totalProfit.toFixed(0)}</span>
        </div>
      </div>

      <div className="mu-card">
        <div className="mu-screen-head">
          <h3 className="mu-screen-title">{t("Active Trips", "యాక్టివ్ ట్రిప్స్")}</h3>
          <span className="mu-screen-badge">{activeTrips.length}</span>
        </div>

        {activeTrips.length ? (
          visibleActiveTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              className={`mu-row ${selectedTripId === trip.id ? "active" : ""}`}
              onClick={() => setSelectedTripId(trip.id)}
            >
              <div className="mu-row-top">
                <span className="mu-row-title">
                  {trip.load_location} → {trip.unload_location}
                </span>
                <span className="mu-status-pill">{tripStatusLabel(trip.status, language)}</span>
              </div>
              <p className="mu-row-meta">
                {t("Lorry", "లారీ")} #{trip.lorry_id} · {drivers.find((d) => d.id === trip.driver_id)?.name || "-"}
              </p>
              <p className="mu-row-meta">
                {trip.contact_person_phone || "-"} · {trip.loading_date || "-"}
              </p>
            </button>
          ))
        ) : (
          <div className="mu-empty">
            <p className="mu-empty-title">{t("No active trips in this period", "ఈ కాలంలో యాక్టివ్ ట్రిప్స్ లేవు")}</p>
          </div>
        )}

        {activeTrips.length > 5 ? (
          <button type="button" className="mu-link-btn" onClick={() => setShowAllActiveTrips((prev) => !prev)}>
            {showAllActiveTrips
              ? t("Show less", "తక్కువ")
              : t(`All ${activeTrips.length}`, `అన్నీ ${activeTrips.length}`)}
          </button>
        ) : null}
      </div>

      {selectedTrip ? (
        <MobileTripDetailPanel
          trip={selectedTrip}
          expenses={selectedExpense}
          drivers={drivers}
          lorries={lorries}
          language={language}
          onUpdateTrip={onUpdateTrip}
        />
      ) : null}

      {statusSummary.length ? (
        <div className="mu-card">
          <h3 className="mu-screen-title">{t("Status", "స్థితి")}</h3>
          {statusSummary.map((item) => (
            <div className="mu-status-line" key={item.status}>
              <span className="mu-row-meta">{tripStatusLabel(item.status, language)}</span>
              <div className="mu-meter">
                <div
                  className="mu-meter-fill"
                  style={{ width: `${Math.max(12, (item.count / Math.max(trips.length, 1)) * 100)}%` }}
                />
              </div>
              <span className="mu-status-count">{item.count}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
