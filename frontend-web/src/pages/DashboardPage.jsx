import { useEffect, useMemo, useState } from "react";
import TripDetailPanel from "../components/TripDetailPanel";
import DonutChart from "../components/fleetflow/DonutChart";
import { DashboardSkeleton } from "../components/fleetflow/Skeleton";
import StatusChip from "../components/fleetflow/StatusChip";
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
  onAcceptAssignment = async () => {},
  isLoading = false,
  searchQuery = ""
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const isDriver = userRole === "driver";
  const scopedTrips = useMemo(
    () => filterTripsBySearch(trips, searchQuery, drivers, lorries),
    [trips, searchQuery, drivers, lorries]
  );
  const activeTrips = scopedTrips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const completedTripsList = scopedTrips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
  const completedTrips = completedTripsList.length;
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
  const featuredTrip = activeTrips[0] || null;
  const expenseBreakdown = useMemo(() => aggregateExpenseBreakdown(expenseTotalsByTrip), [expenseTotalsByTrip]);
  const donutSegments = useMemo(
    () =>
      TRIP_STATUSES.map((status) => ({
        label: tripStatusLabel(status, language),
        value: scopedTrips.filter((trip) => trip.status === status).length
      })).filter((item) => item.value > 0),
    [scopedTrips, language]
  );
  const recentTrips = useMemo(() => [...scopedTrips].slice(0, 5), [scopedTrips]);
  const tableCompletedTrips = useMemo(() => completedTripsList.slice(0, 8), [completedTripsList]);
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
  const selectedTrip = scopedTrips.find((trip) => trip.id === selectedTripId) || activeTrips[0] || null;
  const statusSummary = TRIP_STATUSES.map((status) => ({
    status,
    count: scopedTrips.filter((trip) => trip.status === status).length
  })).filter((item) => item.count > 0);

  useEffect(() => {
    if (selectedTripId && scopedTrips.some((trip) => trip.id === selectedTripId)) {
      return;
    }
    setSelectedTripId(activeTrips[0]?.id || null);
  }, [selectedTripId, activeTrips, scopedTrips]);

  useEffect(() => {
    setShowAllActiveTrips(false);
  }, [activeTrips.length]);

  const visibleActiveTrips = showAllActiveTrips ? activeTrips : activeTrips.slice(0, 5);
  const secondaryActiveTrips = activeTrips.filter((trip) => trip.id !== featuredTrip?.id);
  const visibleSecondaryTrips = showAllActiveTrips ? secondaryActiveTrips : secondaryActiveTrips.slice(0, 4);

  if (!scopedTrips.length && !(isDriver && (assignmentPay.periodCount > 0 || needsAccept)) && !isLoading) {
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

  if (isLoading && !isDriver) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="ff-dashboard">
      <div className="ff-dashboard-hero ff-glass-card">
        <div>
          <span className="ff-status-chip ff-status-chip--neutral">{today}</span>
          <h2>
            {t("Welcome", "స్వాగతం")}, {userName || t("Owner", "యజమాని")}
          </h2>
          <p>
            {periodLabel} · {today}
          </p>
        </div>
        <div className="ff-hero-actions">
          <button type="button" className="ff-btn ff-btn-primary" onClick={onAddTrip}>
            {t("Create Trip", "ట్రిప్ సృష్టించు")}
          </button>
          <button type="button" className="ff-btn" onClick={onAddExpense}>
            {t("Add Expense", "ఖర్చు చేర్చు")}
          </button>
        </div>
      </div>

      <div className="ff-kpi-row">
        <KpiCard icon="🚚" label={t("Total Trips", "మొత్తం ట్రిప్స్")} value={scopedTrips.length} trend={`${completedTrips} ${t("done", "పూర్తి")}`} />
        <KpiCard icon="📡" label={t("Live Trips", "లైవ్ ట్రిప్స్")} value={activeTrips.length} trend={t("On route now", "ప్రస్తుతం నడుస్తున్నవి")} live />
        <KpiCard icon="👤" label={t("Total Drivers", "మొత్తం డ్రైవర్లు")} value={drivers.length} trend={`${lorries.length} ${t("lorries", "లారీలు")}`} />
        <KpiCard icon="💰" label={t("Total Profit", "మొత్తం లాభం")} value={formatCurrency(totalProfit)} trend={formatCurrency(totalTransported)} accent />
      </div>

      <div className="ff-dashboard-grid">
        <div className="ff-dashboard-main">
          {featuredTrip ? (
            <article className="ff-glass-card ff-active-trip-card">
              <div className="ff-active-trip-top">
                <div>
                  <p className="ff-kpi-label">{t("Active Trip", "యాక్టివ్ ట్రిప్")}</p>
                  <p className="ff-active-trip-id">
                    {lorries.find((item) => item.id === featuredTrip.lorry_id)?.vehicle_number || `#${featuredTrip.lorry_id}`}
                  </p>
                  <p className="ff-active-trip-route">
                    {featuredTrip.load_location} → {featuredTrip.unload_location}
                  </p>
                </div>
                <StatusChip status={featuredTrip.status} language={language} live />
              </div>
              <div className="ff-meta-grid">
                <div className="ff-meta-item">
                  <span>{t("Driver", "డ్రైవర్")}</span>
                  <strong>{drivers.find((item) => item.id === featuredTrip.driver_id)?.name || "N/A"}</strong>
                </div>
                <div className="ff-meta-item">
                  <span>{t("Contact", "సంప్రదింపు")}</span>
                  <strong>{featuredTrip.contact_person_phone || featuredTrip.contact_person_name || "-"}</strong>
                </div>
                <div className="ff-meta-item">
                  <span>{t("Loading", "లోడింగ్")}</span>
                  <strong>{featuredTrip.loading_date || "-"}</strong>
                </div>
                <div className="ff-meta-item">
                  <span>{t("Unloading", "అన్‌లోడింగ్")}</span>
                  <strong>{featuredTrip.unloading_date || "-"}</strong>
                </div>
              </div>
              <button type="button" className="ff-btn ff-btn-primary" onClick={() => setSelectedTripId(featuredTrip.id)}>
                {t("View Details", "వివరాలు చూడండి")}
              </button>
            </article>
          ) : (
            <article className="ff-glass-card dashboard-empty">
              <h4>{t("No active trips yet", "ఇప్పటికి యాక్టివ్ ట్రిప్స్ లేవు")}</h4>
              <p>{t("Create a trip to start tracking routes and driver progress.", "రూట్లు మరియు డ్రైవర్ పురోగతిని ట్రాక్ చేయడానికి ఒక ట్రిప్ సృష్టించండి.")}</p>
            </article>
          )}

          {secondaryActiveTrips.length ? (
            <div className="ff-glass-card">
              <div className="ff-section-head">
                <div>
                  <h3>{t("More Active Trips", "మరిన్ని యాక్టివ్ ట్రిప్స్")}</h3>
                  <p>{activeTrips.length} {t("running", "నడుస్తున్నవి")}</p>
                </div>
              </div>
              <div className="trip-card-list">
                {visibleSecondaryTrips.map((trip) => {
                  const lorryName = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `${t("Lorry", "లారీ")} #${trip.lorry_id}`;
                  return (
                    <button
                      className={`trip-card ${selectedTripId === trip.id ? "selected" : ""}`}
                      key={trip.id}
                      onClick={() => setSelectedTripId(trip.id)}
                      type="button"
                    >
                      <div className="trip-card-top">
                        <div>
                          <p className="trip-card-label">{lorryName}</p>
                          <h4>{trip.load_location} → {trip.unload_location}</h4>
                        </div>
                        <StatusChip status={trip.status} language={language} live />
                      </div>
                    </button>
                  );
                })}
                {secondaryActiveTrips.length > 4 ? (
                  <button type="button" className="ff-btn" onClick={() => setShowAllActiveTrips((prev) => !prev)}>
                    {showAllActiveTrips
                      ? t("Show less", "తక్కువ చూపించు")
                      : t(`Show all (${secondaryActiveTrips.length})`, `అన్నీ చూపించు (${secondaryActiveTrips.length})`)}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="ff-glass-card">
            <div className="ff-section-head">
              <div>
                <h3>{t("Recent Trips", "ఇటీవలి ట్రిప్స్")}</h3>
                <p>{t("Latest movement across your fleet.", "మీ ఫ్లీట్‌లో ఇటీవలి కదలిక.")}</p>
              </div>
            </div>
            <div className="ff-recent-list">
              {recentTrips.length ? (
                recentTrips.map((trip) => (
                  <button type="button" key={trip.id} className="ff-recent-row" onClick={() => setSelectedTripId(trip.id)}>
                    <div>
                      <strong>{trip.load_location} → {trip.unload_location}</strong>
                      <span>{lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `#${trip.lorry_id}`}</span>
                    </div>
                    <StatusChip status={trip.status} language={language} live={trip.status === "On route"} />
                  </button>
                ))
              ) : (
                <p>{t("No trips yet.", "ఇంకా ట్రిప్స్ లేవు.")}</p>
              )}
            </div>
          </div>
        </div>

        <div className="ff-dashboard-side">
          <div className="ff-glass-card">
            <div className="ff-section-head">
              <div>
                <h3>{t("Trip Status Mix", "ట్రిప్ స్టేటస్ మిక్స్")}</h3>
                <p>{t("Where your work is sitting right now.", "ప్రస్తుతం మీ పనుల స్థితి.")}</p>
              </div>
            </div>
            {donutSegments.length ? (
              <DonutChart segments={donutSegments} size={132} centerLabel={t("trips", "ట్రిప్స్")} />
            ) : (
              <p>{t("No trip data yet.", "ఇంకా ట్రిప్ డేటా లేదు.")}</p>
            )}
          </div>

          <div className="ff-glass-card">
            <div className="ff-section-head">
              <div>
                <h3>{t("Operations Snapshot", "ఆపరేషన్స్ స్నాప్‌షాట్")}</h3>
                <p>{t("Your quick morning checklist.", "మీ త్వరిత తనిఖీ.")}</p>
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
                <strong>{formatCurrency(scopedTrips.length ? totalProfit / scopedTrips.length : 0)}</strong>
              </div>
            </div>
          </div>

          <div className="ff-glass-card">
            <div className="ff-section-head">
              <div>
                <h3>{t("Expense Breakdown", "ఖర్చు విభజన")}</h3>
                <p>{t("Category totals for this period.", "ఈ కాలానికి వర్గీకరణ మొత్తాలు.")}</p>
              </div>
            </div>
            <div className="ff-expense-list">
              <div className="ff-expense-row"><span>{t("Diesel", "డీజిల్")}</span><strong>{formatCurrency(expenseBreakdown.diesel)}</strong></div>
              <div className="ff-expense-row"><span>{t("Toll", "టోల్")}</span><strong>{formatCurrency(expenseBreakdown.toll)}</strong></div>
              <div className="ff-expense-row"><span>{t("Driver Bata", "డ్రైవర్ బాటా")}</span><strong>{formatCurrency(expenseBreakdown.driver_bata)}</strong></div>
              <div className="ff-expense-row"><span>{t("Maintenance", "నిర్వహణ")}</span><strong>{formatCurrency(expenseBreakdown.maintenance)}</strong></div>
              <div className="ff-expense-row"><span>{t("Other", "ఇతర")}</span><strong>{formatCurrency(expenseBreakdown.other)}</strong></div>
              <div className="ff-expense-total">
                <span>{t("Total Expenses", "మొత్తం ఖర్చులు")}</span>
                <strong>{formatCurrency(totalExpenses || expenseBreakdown.total)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ff-glass-card">
        <div className="ff-section-head">
          <div>
            <h3>{t("Completed Trips", "పూర్తైన ట్రిప్స్")}</h3>
            <p>{t("Recent deliveries and outcomes.", "ఇటీవలి డెలివరీలు మరియు ఫలితాలు.")}</p>
          </div>
        </div>
        {tableCompletedTrips.length ? (
          <div className="ff-table-wrap">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>{t("Lorry", "లారీ")}</th>
                  <th>{t("Driver", "డ్రైవర్")}</th>
                  <th>{t("Route", "రూట్")}</th>
                  <th>{t("Load", "లోడ్")}</th>
                  <th>{t("Date", "తేదీ")}</th>
                  <th>{t("Status", "స్థితి")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tableCompletedTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `#${trip.lorry_id}`}</td>
                    <td>{drivers.find((item) => item.id === trip.driver_id)?.name || "-"}</td>
                    <td>{trip.load_location} → {trip.unload_location}</td>
                    <td>{trip.load_type || "-"}</td>
                    <td>{trip.unloading_date || trip.loading_date || "-"}</td>
                    <td><StatusChip status={trip.status} language={language} /></td>
                    <td>
                      <button type="button" className="ff-btn" onClick={() => setSelectedTripId(trip.id)}>
                        {t("View", "చూడండి")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t("No completed trips in this period.", "ఈ కాలంలో పూర్తైన ట్రిప్స్ లేవు.")}</p>
        )}
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

function KpiCard({ icon, label, value, trend, live = false, accent = false }) {
  return (
    <article className={`ff-glass-card ff-kpi-card ${accent ? "ff-kpi-card--accent" : ""}`}>
      <div className="ff-kpi-card-top">
        <span className="ff-kpi-label">{label}</span>
        <span className="ff-kpi-icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="ff-kpi-value">{value}</div>
      <div className={`ff-kpi-trend ${live ? "ff-kpi-trend--live" : ""}`}>
        {live ? <span className="ff-status-live-dot" aria-hidden="true" /> : null}
        {trend}
      </div>
    </article>
  );
}

function filterTripsBySearch(trips, query, drivers, lorries) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return trips;
  return trips.filter((trip) => {
    const driverName = drivers.find((item) => item.id === trip.driver_id)?.name || "";
    const lorryNumber = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || "";
    const haystack = [
      trip.id,
      trip.load_location,
      trip.unload_location,
      trip.load_type,
      trip.contact_person_name,
      trip.contact_person_phone,
      trip.status,
      driverName,
      lorryNumber
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function aggregateExpenseBreakdown(expenseTotalsByTrip) {
  const totals = {
    diesel: 0,
    toll: 0,
    driver_bata: 0,
    maintenance: 0,
    other: 0,
    total: 0
  };
  Object.values(expenseTotalsByTrip || {}).forEach((item) => {
    totals.diesel += Number(item.diesel || 0);
    totals.toll += Number(item.toll || 0);
    totals.driver_bata += Number(item.driver_bata || 0);
    totals.maintenance += Number(item.maintenance || 0);
    totals.other += Number(item.other || 0);
  });
  totals.total = totals.diesel + totals.toll + totals.driver_bata + totals.maintenance + totals.other;
  return totals;
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
