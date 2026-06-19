import { useEffect, useState } from "react";
import TripDetailPanel from "../components/TripDetailPanel";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { getPeriodLabel } from "../utils/periodFilter";

export default function DashboardPage({
  dashboard,
  trips,
  drivers,
  lorries,
  language = "en",
  expenseTotalsByTrip = {},
  onUpdateTrip,
  onAddTrip = () => {},
  onAddExpense = () => {},
  periodFilter = "complete",
  userName = "",
  userRole = "user"
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const now = new Date();
  const thisMonthTrips = trips.filter((trip) => {
    const sourceDate = trip.loading_date || trip.unloading_date || trip.completed_at;
    if (!sourceDate) return false;
    const parsed = new Date(sourceDate);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
  });
  const completedTrips = trips.length - activeTrips.length;
  const [selectedTripId, setSelectedTripId] = useState(activeTrips[0]?.id || null);
  const [showAllActiveTrips, setShowAllActiveTrips] = useState(false);
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const totalProfit = Number(dashboard?.total_profit || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const totalTransported = Number(dashboard?.total_income || 0);
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) || activeTrips[0] || null;
  const statusSummary = TRIP_STATUSES.map((status) => ({
    status,
    count: trips.filter((trip) => trip.status === status).length
  })).filter((item) => item.count > 0);

  useEffect(() => {
    if (selectedTripId && trips.some((trip) => trip.id === selectedTripId)) {
      return;
    }
    setSelectedTripId(activeTrips[0]?.id || null);
  }, [selectedTripId, activeTrips, trips]);

  useEffect(() => {
    setShowAllActiveTrips(false);
  }, [activeTrips.length]);

  const visibleActiveTrips = showAllActiveTrips ? activeTrips : activeTrips.slice(0, 4);

  if (!trips.length) {
    return (
      <section className="panel dashboard-empty-card">
        <h2>{userName || t("Fleet User", "ఫ్లీట్ యూజర్")}</h2>
        <p className="muted">
          {periodLabel} · {t("No trips found", "ట్రిప్స్ లేవు")}
        </p>
        <p className="muted">
          {t(
            "No trips in this period. Try Complete Period or another filter.",
            "ఈ కాలంలో ట్రిప్స్ లేవు. పూర్తి కాలం లేదా వేరే ఫిల్టర్ ఎంచుకోండి."
          )}
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-stack">
      {userRole === "user" ? (
        <div className="panel dashboard-user-card">
          <h2>
            {t("Hello", "నమస్కారం")}, {userName || t("User", "యూజర్")}
          </h2>
          <p className="muted">{periodLabel}</p>
          <div className="dashboard-user-stats">
            <span>
              {t("Trips", "ట్రిప్స్")}: <strong>{trips.length}</strong>
            </span>
            <span>
              {t("Live", "లైవ్")}: <strong>{activeTrips.length}</strong>
            </span>
            <span>
              {t("Done", "పూర్తి")}: <strong>{completedTrips}</strong>
            </span>
          </div>
        </div>
      ) : null}
      <div className="panel dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="status-pill status-neutral">{today}</span>
          <h2>{t("Welcome, Owner", "స్వాగతం, యజమాని")}</h2>
          <p className="muted dashboard-hero-text">
            {t(
              "Run dispatch, monitor active trips, and keep an eye on profit without jumping between screens.",
              "డిస్పాచ్, యాక్టివ్ ట్రిప్స్ మరియు లాభాన్ని ఒకే చోట నుండి సులభంగా గమనించండి."
            )}
          </p>
          <div className="dashboard-hero-actions">
            <button onClick={onAddTrip}>{t("Create Trip", "ట్రిప్ సృష్టించు")}</button>
            <button className="ghost" onClick={onAddExpense}>{t("Add Expense", "ఖర్చు చేర్చు")}</button>
          </div>
          <div className="dashboard-highlight-row">
            <div className="dashboard-highlight-card">
              <span>🚚 {t("Trips This Month", "ఈ నెల ట్రిప్స్")}</span>
              <strong>{thisMonthTrips.length}</strong>
            </div>
            <div className="dashboard-highlight-card">
              <span>🚛 {t("Live Fleet", "లైవ్ ఫ్లీట్")}</span>
              <strong>{dashboard?.total_lorries ?? lorries.length}</strong>
            </div>
            <div className="dashboard-highlight-card">
              <span>💸 {t("Profit Snapshot", "లాభ స్నాప్‌షాట్")}</span>
              <strong>{formatCurrency(totalProfit)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="cards-row cards-row-rich">
        <Card
          title={`🚛 ${t("Total Lorries", "మొత్తం లారీలు")}`}
          value={dashboard?.total_lorries ?? lorries.length}
          accent="blue"
        />
        <Card title={`🚚 ${t("Active Trips", "యాక్టివ్ ట్రిప్స్")}`} value={activeTrips.length} accent="teal" />
        <Card title={`💸 ${t("Total Profit", "మొత్తం లాభం")}`} value={formatCurrency(totalProfit)} accent="profit" />
        <Card title={`💰 ${t("Total Expenses", "మొత్తం ఖర్చులు")}`} value={formatCurrency(totalExpenses)} accent="slate" />
        <Card title={`📦 ${t("Total Transported", "మొత్తం రవాణా")}`} value={formatCurrency(totalTransported)} accent="blue" />
      </div>

      <div className="dashboard-grid">
        <div className="panel dashboard-section">
          <div className="section-head">
            <div>
              <h3>{t("Active Trips", "యాక్టివ్ ట్రిప్స్")}</h3>
              <p className="muted">
                {t(
                  "Select any live trip to inspect route, expenses, and update status quickly.",
                  "రూట్, ఖర్చులు మరియు స్టేటస్ త్వరగా చూడటానికి ఏ ట్రిప్‌నైనా ఎంచుకోండి."
                )}
              </p>
            </div>
            <span className="status-pill status-neutral">{activeTrips.length} {t("running", "నడుస్తున్నవి")}</span>
          </div>

          {activeTrips.length ? (
            <div className="trip-card-list">
              {visibleActiveTrips.map((trip) => {
                const lorryName = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `${t("Lorry", "లారీ")} #${trip.lorry_id}`;
                const driverName = drivers.find((item) => item.id === trip.driver_id)?.name || "N/A";
                return (
                  <button
                    className={`trip-card ${selectedTripId === trip.id ? "selected" : ""}`}
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    type="button"
                  >
                    <div className="trip-card-top">
                      <div>
                        <p className="trip-card-label">{t("Route", "రూట్")}</p>
                        <h4>{lorryName}</h4>
                      </div>
                      <span className={`status-pill ${getStatusClass(trip.status)}`}>{tripStatusLabel(trip.status, language)}</span>
                    </div>
                    <p className="trip-card-route">{trip.load_location} → {trip.unload_location}</p>
                    <div className="trip-card-grid">
                      <div>
                        <span>{t("Driver", "డ్రైవర్")}</span>
                        <strong>{driverName}</strong>
                      </div>
                      <div>
                        <span>{t("Contact", "సంప్రదింపు")}</span>
                        <strong>{trip.contact_person_name || "-"}</strong>
                      </div>
                      <div>
                        <span>{t("Loading", "లోడింగ్")}</span>
                        <strong>{trip.loading_date || "-"}</strong>
                      </div>
                      <div>
                        <span>{t("Unloading", "అన్‌లోడింగ్")}</span>
                        <strong>{trip.unloading_date || "-"}</strong>
                      </div>
                    </div>
                  </button>
                );
              })}
              {activeTrips.length > 4 ? (
                <button
                  type="button"
                  className="ghost dashboard-more-btn"
                  onClick={() => setShowAllActiveTrips((prev) => !prev)}
                >
                  {showAllActiveTrips
                    ? t("Show less", "తక్కువ చూపించు")
                    : t(`Show all (${activeTrips.length})`, `అన్నీ చూపించు (${activeTrips.length})`)}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="dashboard-empty">
              <h4>{t("No active trips yet", "ఇప్పటికి యాక్టివ్ ట్రిప్స్ లేవు")}</h4>
              <p className="muted">
                {t("Create a trip to start tracking routes, expenses, and driver progress.", "రూట్లు, ఖర్చులు మరియు డ్రైవర్ పురోగతిని ట్రాక్ చేయడానికి ఒక ట్రిప్ సృష్టించండి.")}
              </p>
            </div>
          )}
        </div>

        <div className="dashboard-side">
          <div className="panel dashboard-section">
            <div className="section-head">
              <div>
                <h3>{t("Trip Status Mix", "ట్రిప్ స్టేటస్ మిక్స్")}</h3>
                <p className="muted">{t("A quick look at where your work is sitting right now.", "ప్రస్తుతం మీ పనుల స్థితి ఎలా ఉందో త్వరగా చూడండి.")}</p>
              </div>
            </div>
            <div className="status-summary-list">
              {statusSummary.length ? (
                statusSummary.map((item) => (
                  <div className="status-summary-item" key={item.status}>
                    <span className={`status-pill ${getStatusClass(item.status)}`}>{tripStatusLabel(item.status, language)}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">{t("No trip data yet.", "ఇంకా ట్రిప్ డేటా లేదు.")}</p>
              )}
            </div>
          </div>

          <div className="panel dashboard-section">
            <div className="section-head">
              <div>
                <h3>{t("Operations Snapshot", "ఆపరేషన్స్ స్నాప్‌షాట్")}</h3>
                <p className="muted">{t("Use these numbers as your quick morning checklist.", "ఈ సంఖ్యలను మీ రోజువారీ త్వరిత తనిఖీగా ఉపయోగించండి.")}</p>
              </div>
            </div>
            <div className="snapshot-list">
              <div className="snapshot-item">
                <span>{t("Trips Completed", "పూర్తైన ట్రిప్స్")}</span>
                <strong>{completedTrips}</strong>
              </div>
              <div className="snapshot-item">
                <span>{t("Registered Drivers", "నమోదైన డ్రైవర్లు")}</span>
                <strong>{drivers.length}</strong>
              </div>
              <div className="snapshot-item">
                <span>{t("Average Profit per Trip", "ట్రిప్‌కు సగటు లాభం")}</span>
                <strong>{formatCurrency(trips.length ? totalProfit / trips.length : 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedTrip ? (
        <TripDetailPanel
          trip={selectedTrip}
          expenses={expenseTotalsByTrip[selectedTrip.id]}
          drivers={drivers}
          lorries={lorries}
          language={language}
          onUpdateTrip={onUpdateTrip}
        />
      ) : null}
    </section>
  );
}

function Card({ title, value, accent }) {
  const [leadingToken, ...restTokens] = String(title || "").trim().split(" ");
  const hasEmojiToken = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(leadingToken || "");
  const icon = hasEmojiToken ? leadingToken : null;
  const label = hasEmojiToken ? restTokens.join(" ") : title;

  return (
    <div className={`card card-${accent || "blue"}`}>
      <p className="card-title-row">
        {icon ? <span className="card-title-icon" aria-hidden="true">{icon}</span> : null}
        <span>{label}</span>
      </p>
      <h3>{value}</h3>
    </div>
  );
}

function ExpenseStat({ label, value }) {
  return (
    <div className="expense-stat">
      <span>{label}</span>
      <strong>{formatCurrency(Number(value || 0))}</strong>
    </div>
  );
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function getStatusClass(status) {
  const map = {
    Loading: "status-loading",
    "On route": "status-route",
    Unloading: "status-unloading",
    Delivered: "status-delivered",
    "Trip Done": "status-done"
  };
  return map[status] || "status-neutral";
}
