import { useMemo, useState } from "react";
import { TRIP_STATUSES, tripStatusLabel } from "../../utils/fleetLabels";
import { computeDriverEarningsSummary, computeAssignmentPaySummary, formatAssignmentPeriod, driverNeedsAssignmentAccept, getDriverActiveAssignment } from "../../utils/driverEarnings";
import { getPeriodLabel } from "../../utils/periodFilter";
import MobileHeroBanner from "../../components/mobile/MobileHeroBanner";
import MobileTripDetailPanel from "../../components/mobile/MobileTripDetailPanel";
import MobileTripListRow from "../../components/mobile/MobileTripListRow";
import MobileTripSheet from "../../components/mobile/MobileTripSheet";

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
  driverAssignments = [],
  driverId = null,
  onAcceptAssignment = async () => {},
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const isDriver = userRole === "driver";
  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const doneTrips = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showAllActiveTrips, setShowAllActiveTrips] = useState(false);
  const visibleActiveTrips = showAllActiveTrips ? activeTrips : activeTrips.slice(0, 5);
  const totalProfit = Number(dashboard?.total_profit || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const totalIncome = Number(dashboard?.total_income || 0);
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

  const statusSummary = useMemo(
    () =>
      TRIP_STATUSES.map((status) => ({
        status,
        count: trips.filter((trip) => trip.status === status).length
      })).filter((item) => item.count > 0),
    [trips]
  );

  const heroStats = isDriver
    ? [
        { label: t("My Trips", "నా ట్రిప్స్"), value: driverEarnings.tripCount },
        { label: t("Live", "లైవ్"), value: driverEarnings.activeTripCount },
        { label: t("Done", "పూర్తి"), value: driverEarnings.doneTripCount }
      ]
    : [
        { label: t("Trips", "ట్రిప్స్"), value: trips.length },
        { label: t("Live", "లైవ్"), value: activeTrips.length },
        { label: t("Done", "పూర్తి"), value: doneTrips.length }
      ];

  if (!trips.length && !(isDriver && (assignmentPay.periodCount > 0 || needsAccept))) {
    return (
      <div className="mu-page">
        <MobileHeroBanner
          userName={userName}
          periodLabel={periodLabel}
          stats={heroStats}
          language={language}
          subtitle={t("No trips in this period.", "ఈ కాలంలో ట్రిప్స్ లేవు.")}
        />
      </div>
    );
  }

  const selectedTrip = trips.find((item) => item.id === selectedTripId);
  const selectedExpense = selectedTripId ? expenseTotalsByTrip[selectedTripId] : null;

  function closeTripSheet() {
    setSelectedTripId(null);
  }

  if (isDriver) {
    const highlight = assignmentPay.currentStint || assignmentPay.active || assignmentPay.latest;
    const stintNote = t(
      "Pay is for this work stint only. Gap days between stints are not paid.",
      "చెల్లింపు ఈ పని కాలానికి మాత్రమే. కాలాల మధ్య గ్యాప్ రోజులకు చెల్లింపు లేదు."
    );
    return (
      <div className="mu-page">
        <MobileHeroBanner
          userName={userName || t("Driver", "డ్రైవర్")}
          periodLabel={periodLabel}
          stats={heroStats}
          language={language}
          subtitle={t("Your trips and earnings for this period.", "ఈ కాలానికి మీ ట్రిప్స్ మరియు సంపాదన.")}
        />

        {needsAccept && pendingAssignment ? (
          <div className="mu-card assignment-accept-card">
            <h3 className="mu-screen-title">{t("Accept work assignment", "పని అసైన్‌మెంట్ అంగీకరించండి")}</h3>
            <p className="mu-row-meta">
              {t(
                `Daily wage Rs ${Number(pendingAssignment.daily_wage || 0).toFixed(0)} and ${Number(pendingAssignment.commission_percent || 0).toFixed(0)}% commission. Accept to view earnings.`,
                `రోజువారీ వేతనం Rs ${Number(pendingAssignment.daily_wage || 0).toFixed(0)} మరియు ${Number(pendingAssignment.commission_percent || 0).toFixed(0)}% కమిషన్. సంపాదన చూడడానికి అంగీకరించండి.`
              )}
            </p>
            <button type="button" className="mu-primary-btn" onClick={() => onAcceptAssignment(pendingAssignment.id)}>
              {t("Accept assignment", "అసైన్‌మెంట్ అంగీకరించు")}
            </button>
          </div>
        ) : null}

        {showAssignmentPay ? (
          <>
            <div className="mu-stat-grid mu-driver-earnings-grid">
              <div className="mu-stat-box">
                <span className="mu-stat-label">{t("Current Stint Pay", "ప్రస్తుత పని చెల్లింపు")}</span>
                <span className="mu-stat-value success">₹{assignmentPay.totalEarning.toFixed(0)}</span>
              </div>
              <div className="mu-stat-box">
                <span className="mu-stat-label">{t("Stint Days", "ఈ కాలం రోజులు")}</span>
                <span className="mu-stat-value">{assignmentPay.totalWorkingDays}</span>
              </div>
              <div className="mu-stat-box">
                <span className="mu-stat-label">{t("Stint Wage", "ఈ కాలం వేతనం")}</span>
                <span className="mu-stat-value">₹{assignmentPay.totalWage.toFixed(0)}</span>
              </div>
              <div className="mu-stat-box">
                <span className="mu-stat-label">{t("Stint Commission", "ఈ కాలం కమిషన్")}</span>
                <span className="mu-stat-value">₹{assignmentPay.totalCommission.toFixed(0)}</span>
              </div>
            </div>
            <p className="mu-row-meta">{stintNote}</p>

            {highlight ? (
              <div className="mu-card">
                <div className="mu-screen-head">
                  <h3 className="mu-screen-title">
                    {highlight.status === "Active"
                      ? t("Current Work Period", "ప్రస్తుత పని కాలం")
                      : t("Latest Work Period", "ఇటీవలి పని కాలం")}
                  </h3>
                  <span className="mu-screen-badge">{highlight.status}</span>
                </div>
                <p className="mu-row-meta">{formatAssignmentPeriod(highlight, language)}</p>
                <p className="mu-row-meta">
                  {highlight.working_days} {t("days", "రోజులు")} × ₹{Number(highlight.daily_wage || 0).toFixed(0)} + {t("commission", "కమిషన్")}
                </p>
                <p className="mu-row-meta">
                  {t("Total", "మొత్తం")}: <strong>₹{Number(highlight.total_earning || 0).toFixed(0)}</strong>
                </p>
              </div>
            ) : null}

            <div className="mu-card">
              <div className="mu-screen-head">
                <h3 className="mu-screen-title">{t("Previous Stints", "మునుపటి కాలాలు")}</h3>
              </div>
              {assignmentPay.pastPeriods.length ? (
                assignmentPay.pastPeriods.map((assignment) => (
                  <div key={assignment.id} className="mu-row">
                    <span className="mu-row-title">{formatAssignmentPeriod(assignment, language)}</span>
                    <p className="mu-row-meta">
                      {assignment.working_days} {t("days", "రోజులు")} · ₹{Number(assignment.total_earning || 0).toFixed(0)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="mu-row-meta">{t("No previous stints", "మునుపటి కాలాలు లేవు")}</p>
              )}
            </div>
          </>
        ) : !needsAccept ? (
          <div className="mu-card">
            <p className="mu-row-meta">{t("No accepted work period in this filter yet.", "ఈ ఫిల్టర్‌లో అంగీకరించిన పని కాలం ఇంకా లేదు.")}</p>
          </div>
        ) : null}

        {!needsAccept ? (
          <div className="mu-card">
            <div className="mu-screen-head">
              <h3 className="mu-screen-title">{t("Trip-wise Earnings", "ట్రిప్ వారీగా సంపాదన")}</h3>
              <span className="mu-screen-badge">{periodLabel}</span>
            </div>
            {driverEarnings.tripEarnings.map(({ trip, earning }) => (
              <MobileTripListRow
                key={trip.id}
                trip={trip}
                language={language}
                active={selectedTripId === trip.id}
                onClick={() => setSelectedTripId(trip.id)}
                metaLines={[`${trip.loading_date || "-"} · ${t("Earning", "సంపాదన")}: ₹${earning.toFixed(0)}`]}
              />
            ))}
          </div>
        ) : null}

        <MobileTripSheet open={Boolean(selectedTrip)} onClose={closeTripSheet} language={language}>
          {selectedTrip ? (
            <MobileTripDetailPanel
              trip={selectedTrip}
              expenses={selectedExpense}
              drivers={drivers}
              lorries={lorries}
              language={language}
              userRole={userRole}
              onUpdateTrip={onUpdateTrip}
              inSheet
            />
          ) : null}
        </MobileTripSheet>
      </div>
    );
  }

  return (
    <div className="mu-page">
      <MobileHeroBanner
        userName={userName}
        periodLabel={periodLabel}
        stats={heroStats}
        language={language}
        subtitle={t("Fleet overview for the selected period.", "ఎంచుకున్న కాలానికి ఫ్లీట్ అవలోకనం.")}
      />

      <div className="mu-stat-grid mu-stat-grid-compact">
        <div className="mu-stat-box">
          <span className="mu-stat-label">{t("Lorries", "లారీలు")}</span>
          <span className="mu-stat-value">{dashboard?.total_lorries ?? 0}</span>
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
          <span className="mu-stat-label">{t("Profit", "లాభం")}</span>
          <span className="mu-stat-value success">₹{totalProfit.toFixed(0)}</span>
        </div>
      </div>

      <div className="mu-card">
        <div className="mu-screen-head">
          <div>
            <h3 className="mu-screen-title">{t("Active Trips", "యాక్టివ్ ట్రిప్స్")}</h3>
            <p className="mu-section-sub">{t("Tap a trip for details.", "వివరాల కోసం ట్రిప్‌ను ట్యాప్ చేయండి.")}</p>
          </div>
          <span className="mu-screen-badge">{activeTrips.length}</span>
        </div>

        {activeTrips.length ? (
          visibleActiveTrips.map((trip) => (
            <MobileTripListRow
              key={trip.id}
              trip={trip}
              language={language}
              active={selectedTripId === trip.id}
              onClick={() => setSelectedTripId(trip.id)}
              metaLines={[
                `${t("Lorry", "లారీ")} #${trip.lorry_id} · ${drivers.find((d) => d.id === trip.driver_id)?.name || "-"}`,
                `${trip.contact_person_phone || "-"} · ${trip.loading_date || "-"}`
              ]}
            />
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

      <MobileTripSheet open={Boolean(selectedTrip)} onClose={closeTripSheet} language={language}>
        {selectedTrip ? (
          <MobileTripDetailPanel
            trip={selectedTrip}
            expenses={selectedExpense}
            drivers={drivers}
            lorries={lorries}
            language={language}
            userRole={userRole}
            onUpdateTrip={onUpdateTrip}
            inSheet
          />
        ) : null}
      </MobileTripSheet>

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
