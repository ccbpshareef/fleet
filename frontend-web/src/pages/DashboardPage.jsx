import { useEffect, useMemo, useState } from "react";
import TripDetailPanel from "../components/TripDetailPanel";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { computeDriverEarningsSummary, computeAssignmentPaySummary, formatAssignmentPeriod, driverNeedsAssignmentAccept, getDriverActiveAssignment } from "../utils/driverEarnings";
import { getPeriodLabel } from "../utils/periodFilter";
import { commissionProgressText, commissionRuleText } from "../utils/commission";

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
  userRole = "user",
  driverAssignments = [],
  driverId = null,
  onAcceptAssignment = async () => {}
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const isDriver = userRole === "driver";
  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
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
  const driverEarnings = useMemo(
    () => computeDriverEarningsSummary(trips, expenseTotalsByTrip),
    [trips, expenseTotalsByTrip]
  );
  const assignmentPay = useMemo(
    () =>
      computeAssignmentPaySummary(driverAssignments, {
        driverId: isDriver ? driverId : null,
        period: periodFilter,
        driverView: isDriver
      }),
    [driverAssignments, driverId, isDriver, periodFilter]
  );
  const pendingAssignment = useMemo(
    () => (isDriver ? getDriverActiveAssignment(driverAssignments, driverId) : null),
    [driverAssignments, driverId, isDriver]
  );
  const needsAccept = useMemo(
    () => (isDriver ? driverNeedsAssignmentAccept(driverAssignments, driverId) : false),
    [driverAssignments, driverId, isDriver]
  );
  const showAssignmentPay = isDriver && assignmentPay.periodCount > 0;
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

  if (!trips.length && !(isDriver && (assignmentPay.periodCount > 0 || needsAccept))) {
    return (
      <section className="panel dashboard-empty-card">
        <h2>{userName || (isDriver ? t("Driver", "డ్రైవర్") : t("Fleet User", "ఫ్లీట్ యూజర్"))}</h2>
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

  if (isDriver) {
    const highlight = assignmentPay.currentStint || assignmentPay.active || assignmentPay.latest;
    const stintNote = t(
      "Pay is for this work stint only. Gap days between old and new work are not paid.",
      "చెల్లింపు ఈ పని కాలానికి మాత్రమే. పాత మరియు కొత్త పని మధ్య గ్యాప్ రోజులకు చెల్లింపు లేదు."
    );
    return (
      <section className="dashboard-stack">
        <div className="dashboard-highlight-row dashboard-mini-stats">
          <div className="dashboard-highlight-card">
            <span>🚚 {t("My Trips", "నా ట్రిప్స్")}</span>
            <strong>{driverEarnings.tripCount}</strong>
          </div>
          <div className="dashboard-highlight-card">
            <span>📡 {t("Live", "లైవ్")}</span>
            <strong>{driverEarnings.activeTripCount}</strong>
          </div>
          <div className="dashboard-highlight-card">
            <span>✅ {t("Done", "పూర్తి")}</span>
            <strong>{driverEarnings.doneTripCount}</strong>
          </div>
        </div>

        {needsAccept && pendingAssignment ? (
          <div className="panel assignment-accept-card">
            <h3>{t("Accept work assignment", "పని అసైన్‌మెంట్ అంగీకరించండి")}</h3>
            <p className="muted">
              {t(
                `Daily wage Rs ${Number(pendingAssignment.daily_wage || 0).toFixed(0)} and ${Number(pendingAssignment.commission_percent || 0).toFixed(0)}% commission are locked for this period. Accept to view your earnings.`,
                `ఈ కాలానికి రోజువారీ వేతనం Rs ${Number(pendingAssignment.daily_wage || 0).toFixed(0)} మరియు ${Number(pendingAssignment.commission_percent || 0).toFixed(0)}% కమిషన్ లాక్ అయ్యాయి. మీ సంపాదన చూడడానికి అంగీకరించండి.`
              )}
            </p>
            <button type="button" className="compact-submit" onClick={() => onAcceptAssignment(pendingAssignment.id)}>
              {t("Accept assignment", "అసైన్‌మెంట్ అంగీకరించు")}
            </button>
          </div>
        ) : null}

        {showAssignmentPay ? (
          <>
            <div className="cards-row cards-row-rich">
              <Card
                title={`💰 ${t("Current Stint Pay", "ప్రస్తుత పని చెల్లింపు")}`}
                value={formatCurrency(assignmentPay.totalEarning)}
                accent="profit"
              />
              <Card
                title={`📅 ${t("Stint Working Days", "ఈ కాలం రోజులు")}`}
                value={String(assignmentPay.totalWorkingDays)}
                accent="blue"
              />
              <Card
                title={`💵 ${t("Stint Daily Wage", "ఈ కాలం వేతనం")}`}
                value={formatCurrency(assignmentPay.totalWage)}
                accent="teal"
              />
              <Card
                title={`📊 ${t("Stint Commission", "ఈ కాలం కమిషన్")}`}
                value={formatCurrency(assignmentPay.totalCommission)}
                accent="amber"
              />
            </div>
            <p className="assignment-pay-formula muted">{stintNote}</p>

            {highlight ? (
              <div className="panel dashboard-section assignment-highlight-card">
                <div className="section-head">
                  <div>
                    <h3>
                      {highlight.status === "Active"
                        ? t("Current Work Period", "ప్రస్తుత పని కాలం")
                        : t("Latest Work Period", "ఇటీవలి పని కాలం")}
                    </h3>
                    <p className="muted">{formatAssignmentPeriod(highlight, language)}</p>
                  </div>
                  <span className={`status-pill ${highlight.status === "Active" ? "status-loading" : "status-done"}`}>
                    {highlight.status}
                  </span>
                </div>
                <div className="assignment-pay-grid">
                  <div>
                    <span>{t("Working Days", "పని రోజులు")}</span>
                    <strong>{highlight.working_days}</strong>
                  </div>
                  <div>
                    <span>{t("Daily Wage (locked)", "రోజువారీ వేతనం (లాక్)")}</span>
                    <strong>{formatCurrency(highlight.daily_wage)}</strong>
                  </div>
                  <div>
                    <span>{t("Wage Amount", "వేతన మొత్తం")}</span>
                    <strong>{formatCurrency(highlight.wage_amount)}</strong>
                  </div>
                  <div>
                    <span>{t("Commission", "కమిషన్")} ({highlight.commission_percent}%)</span>
                    <strong>{formatCurrency(highlight.commission_amount)}</strong>
                  </div>
                </div>
                <p className="assignment-pay-formula muted">
                  {t(
                    `${highlight.working_days} days × Rs ${Number(highlight.daily_wage || 0).toFixed(0)} + trip commission`,
                    `${highlight.working_days} రోజులు × Rs ${Number(highlight.daily_wage || 0).toFixed(0)} + ట్రిప్ కమిషన్`
                  )}
                </p>
              </div>
            ) : null}

            <div className="panel dashboard-section">
              <div className="section-head">
                <div>
                  <h3>{t("Previous Work Stints", "మునుపటి పని కాలాలు")}</h3>
                  <p className="muted">
                    {t("Already settled · not added to current pay", "ఇప్పటికే పూర్తయింది · ప్రస్తుత చెల్లింపులో కలపరు")}
                  </p>
                </div>
              </div>
              <div className="assignment-period-list">
                {assignmentPay.pastPeriods.length ? (
                  assignmentPay.pastPeriods.map((assignment) => (
                    <div className="assignment-period-card assignment-period-past" key={assignment.id}>
                      <div className="assignment-period-top">
                        <div>
                          <strong>{formatAssignmentPeriod(assignment, language)}</strong>
                          <p className="muted">
                            {assignment.working_days} {t("days", "రోజులు")} × Rs {Number(assignment.daily_wage || 0).toFixed(0)}
                            {assignment.gap_days_before > 0
                              ? ` · ${t("Gap before stint", "ముందు గ్యాప్")}: ${assignment.gap_days_before} ${t("days", "రోజులు")}`
                              : ""}
                          </p>
                        </div>
                        <strong>{formatCurrency(assignment.total_earning)}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t("No previous stints", "మునుపటి పని కాలాలు లేవు")}</p>
                )}
              </div>
            </div>

            <div className="panel dashboard-section">
              <div className="section-head">
                <div>
                  <h3>{t("Current Stint Trips", "ప్రస్తుత కాలం ట్రిప్స్")}</h3>
                  <p className="muted">{periodLabel}</p>
                </div>
              </div>
              <div className="assignment-period-list">
                {highlight?.trips?.length ? (
                  highlight.trips.map((trip) => (
                    <div className="assignment-trip-row" key={trip.trip_id}>
                      <span>{trip.route}</span>
                      <span>
                        Rs {Number(trip.load_price || 0).toFixed(0)}
                        {trip.commission_eligible ? ` × ${trip.commission_percent}%` : ""}
                      </span>
                      <strong>{formatCurrency(trip.commission_amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t("No trips in current stint yet", "ప్రస్తుత కాలంలో ట్రిప్స్ లేవు")}</p>
                )}
              </div>
              {highlight && !highlight.commission_eligible ? (
                <p className="muted">{commissionProgressText(highlight.total_transport_amount, language)}</p>
              ) : null}
              <p className="muted">{commissionRuleText(language)}</p>
            </div>
          </>
        ) : !needsAccept ? (
          <div className="panel dashboard-section">
            <p className="muted">
              {t("No accepted work period in this filter yet.", "ఈ ఫిల్టర్‌లో అంగీకరించిన పని కాలం ఇంకా లేదు.")}
            </p>
          </div>
        ) : null}

        {needsAccept ? null : (
        <div className="panel dashboard-section">
          <div className="section-head">
            <div>
              <h3>{t("Trip-wise Earnings", "ట్రిప్ వారీగా సంపాదన")}</h3>
              <p className="muted">{periodLabel}</p>
            </div>
          </div>
          <div className="trip-card-list">
            {driverEarnings.tripEarnings.map(({ trip, earning }) => {
              const lorryName = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `${t("Lorry", "లారీ")} #${trip.lorry_id}`;
              return (
                <button
                  className={`trip-card ${selectedTripId === trip.id ? "selected" : ""}`}
                  key={trip.id}
                  type="button"
                  onClick={() => setSelectedTripId(trip.id)}
                >
                  <div className="trip-card-top">
                    <div>
                      <p className="trip-card-label">{lorryName}</p>
                      <h4>{trip.load_location} → {trip.unload_location}</h4>
                    </div>
                    <span className={`status-pill ${getStatusClass(trip.status)}`}>{tripStatusLabel(trip.status, language)}</span>
                  </div>
                  <div className="trip-card-grid">
                    <div>
                      <span>{t("Loading", "లోడింగ్")}</span>
                      <strong>{trip.loading_date || "-"}</strong>
                    </div>
                    <div>
                      <span>{t("My Earning", "నా సంపాదన")}</span>
                      <strong className="profit">{formatCurrency(earning)}</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {selectedTrip ? (
          <TripDetailPanel
            trip={selectedTrip}
            expenses={expenseTotalsByTrip[selectedTrip.id]}
            drivers={drivers}
            lorries={lorries}
            language={language}
            userRole={userRole}
            onUpdateTrip={onUpdateTrip}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="dashboard-stack">
      <div className="panel dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="status-pill status-neutral">{today}</span>
          <h2>
            {t("Welcome", "స్వాగతం")}, {userName || t("Owner", "యజమాని")}
          </h2>
          <p className="muted dashboard-hero-text">
            {periodLabel} ·{" "}
            {t(
              "Run dispatch, monitor active trips, and keep an eye on profit.",
              "డిస్పాచ్, యాక్టివ్ ట్రిప్స్ మరియు లాభాన్ని ఒకే చోట నుండి గమనించండి."
            )}
          </p>
          <div className="dashboard-hero-actions">
            <button onClick={onAddTrip}>{t("Create Trip", "ట్రిప్ సృష్టించు")}</button>
            <button className="ghost" onClick={onAddExpense}>{t("Add Expense", "ఖర్చు చేర్చు")}</button>
          </div>
          <div className="dashboard-highlight-row">
            <div className="dashboard-highlight-card">
              <span>🚚 {t("Trips", "ట్రిప్స్")}</span>
              <strong>{trips.length}</strong>
            </div>
            <div className="dashboard-highlight-card">
              <span>📡 {t("Live", "లైవ్")}</span>
              <strong>{activeTrips.length}</strong>
            </div>
            <div className="dashboard-highlight-card">
              <span>✅ {t("Done", "పూర్తి")}</span>
              <strong>{completedTrips}</strong>
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
          userRole={userRole}
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
