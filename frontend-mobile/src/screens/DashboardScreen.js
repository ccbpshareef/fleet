import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../theme";
import { space, ui, tripStatusTone } from "../mobileUi";
import { getPeriodLabel } from "../utils/periodFilter";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { computeDriverEarningsSummary, computeAssignmentPaySummary, formatAssignmentPeriod, driverNeedsAssignmentAccept, getDriverActiveAssignment } from "../utils/driverEarnings";
import TripDetailPanel from "../components/TripDetailPanel";

export default function DashboardScreen({
  dashboard,
  trips,
  drivers,
  lorries = [],
  language = "en",
  expenseTotalsByTrip = {},
  periodFilter = "last_month",
  userName = "",
  userRole = "user",
  driverAssignments = [],
  driverId = null,
  onAcceptAssignment = async () => {},
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const isDriver = userRole === "driver";
  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const doneTrips = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showAllActiveTrips, setShowAllActiveTrips] = useState(false);
  const visibleActiveTrips = showAllActiveTrips ? activeTrips : activeTrips.slice(0, 5);

  const totalProfit = Number(dashboard?.total_profit || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const totalIncome = Number(dashboard?.total_income || 0);
  const periodLabel = getPeriodLabel(periodFilter, language);
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

  const statusSummary = useMemo(() => {
    return TRIP_STATUSES
      .map((status) => ({ status, count: trips.filter((trip) => trip.status === status).length }))
      .filter((item) => item.count > 0);
  }, [trips]);

  if (!trips.length && !(isDriver && (assignmentPay.periodCount > 0 || needsAccept))) {
    return (
      <View style={ui.page}>
        <View style={styles.userCard}>
          <Text style={styles.userTitle}>{userName || (isDriver ? t("Driver", "డ్రైవర్") : t("Fleet User", "ఫ్లీట్ యూజర్"))}</Text>
          <Text style={styles.userMeta}>{periodLabel} · {t("No trips found", "ట్రిప్స్ లేవు")}</Text>
          <Text style={ui.emptyText}>
            {t(
              "No trips in this period. Try Complete Period or another filter.",
              "ఈ కాలంలో ట్రిప్స్ లేవు. పూర్తి కాలం లేదా వేరే ఫిల్టర్ ఎంచుకోండి."
            )}
          </Text>
        </View>
      </View>
    );
  }

  if (isDriver) {
    const highlight = assignmentPay.active || assignmentPay.latest;
    return (
      <View style={ui.page}>
        <View style={ui.heroCard}>
          <Text style={ui.heroTitle}>{t("Hello", "నమస్కారం")}, {userName || t("Driver", "డ్రైవర్")}</Text>
          <Text style={ui.heroMeta}>{periodLabel}</Text>
          <View style={styles.heroStats}>
            <Text style={styles.heroStatItem}>{t("My Trips", "నా ట్రిప్స్")}: <Text style={styles.heroStatVal}>{driverEarnings.tripCount}</Text></Text>
            <Text style={styles.heroStatItem}>{t("Live", "లైవ్")}: <Text style={styles.heroStatVal}>{driverEarnings.activeTripCount}</Text></Text>
            <Text style={styles.heroStatItem}>{t("Done", "పూర్తి")}: <Text style={styles.heroStatVal}>{driverEarnings.doneTripCount}</Text></Text>
          </View>
        </View>

        {needsAccept && pendingAssignment ? (
          <View style={[ui.card, styles.acceptCard]}>
            <Text style={ui.screenTitle}>{t("Accept work assignment", "పని అసైన్‌మెంట్ అంగీకరించండి")}</Text>
            <Text style={ui.meta}>
              {t(
                `Daily wage Rs ${Number(pendingAssignment.daily_wage || 0).toFixed(0)} and ${Number(pendingAssignment.commission_percent || 0).toFixed(0)}% commission. Accept to view earnings.`,
                `రోజువారీ వేతనం Rs ${Number(pendingAssignment.daily_wage || 0).toFixed(0)} మరియు ${Number(pendingAssignment.commission_percent || 0).toFixed(0)}% కమిషన్. సంపాదన చూడడానికి అంగీకరించండి.`
              )}
            </Text>
            <Pressable style={styles.acceptBtn} onPress={() => onAcceptAssignment(pendingAssignment.id)}>
              <Text style={styles.acceptBtnText}>{t("Accept assignment", "అసైన్‌మెంట్ అంగీకరించు")}</Text>
            </Pressable>
          </View>
        ) : null}

        {showAssignmentPay ? (
          <>
            <View style={ui.statGrid}>
              <View style={ui.statBox}>
                <Text style={ui.statLabel}>{t("Work Period Pay", "పని కాలం చెల్లింపు")}</Text>
                <Text style={ui.statValueSuccess}>₹{assignmentPay.totalEarning.toFixed(0)}</Text>
              </View>
              <View style={ui.statBox}>
                <Text style={ui.statLabel}>{t("Working Days", "పని రోజులు")}</Text>
                <Text style={ui.statValue}>{assignmentPay.totalWorkingDays}</Text>
              </View>
              <View style={ui.statBox}>
                <Text style={ui.statLabel}>{t("Daily Wage", "రోజువారీ వేతనం")}</Text>
                <Text style={ui.statValue}>₹{assignmentPay.totalWage.toFixed(0)}</Text>
              </View>
              <View style={ui.statBox}>
                <Text style={ui.statLabel}>{t("Commission", "కమిషన్")}</Text>
                <Text style={ui.statValue}>₹{assignmentPay.totalCommission.toFixed(0)}</Text>
              </View>
            </View>

            {highlight ? (
              <View style={ui.card}>
                <View style={ui.screenHead}>
                  <Text style={ui.screenTitle}>
                    {highlight.status === "Active"
                      ? t("Current Work Period", "ప్రస్తుత పని కాలం")
                      : t("Latest Work Period", "ఇటీవలి పని కాలం")}
                  </Text>
                  <Text style={ui.screenBadge}>{highlight.status}</Text>
                </View>
                <Text style={ui.meta}>{formatAssignmentPeriod(highlight, language)}</Text>
                <Text style={ui.meta}>
                  {highlight.working_days} {t("days", "రోజులు")} × ₹{Number(highlight.daily_wage || 0).toFixed(0)} + {t("commission", "కమిషన్")}
                </Text>
                <Text style={ui.meta}>
                  {t("Total", "మొత్తం")}: ₹{Number(highlight.total_earning || 0).toFixed(0)}
                </Text>
              </View>
            ) : null}

            <View style={ui.card}>
              <View style={ui.screenHead}>
                <Text style={ui.screenTitle}>{t("Work Periods", "పని కాలాలు")}</Text>
                <Text style={ui.screenBadge}>{periodLabel}</Text>
              </View>
              {assignmentPay.periods.map((assignment) => (
                <View key={assignment.id} style={ui.row}>
                  <Text style={ui.title}>{formatAssignmentPeriod(assignment, language)}</Text>
                  <Text style={ui.meta}>
                    {assignment.working_days} {t("days", "రోజులు")} @ ₹{Number(assignment.daily_wage || 0).toFixed(0)} ({t("locked", "లాక్")}) · ₹{Number(assignment.total_earning || 0).toFixed(0)}
                  </Text>
                  {assignment.trips?.map((trip) => (
                    <Text key={trip.trip_id} style={ui.meta}>
                      {trip.route}: ₹{Number(trip.load_price || 0).toFixed(0)} × {trip.commission_percent}% = ₹{Number(trip.commission_amount || 0).toFixed(0)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : !needsAccept ? (
          <View style={ui.card}>
            <Text style={ui.meta}>{t("No accepted work period in this filter yet.", "ఈ ఫిల్టర్‌లో అంగీకరించిన పని కాలం ఇంకా లేదు.")}</Text>
          </View>
        ) : null}

        {!needsAccept ? (
        <View style={ui.card}>
          <View style={ui.screenHead}>
            <Text style={ui.screenTitle}>{t("Trip-wise Earnings", "ట్రిప్ వారీగా సంపాదన")}</Text>
            <Text style={ui.screenBadge}>{periodLabel}</Text>
          </View>
          {driverEarnings.tripEarnings.map(({ trip, earning }) => (
            <Pressable
              key={trip.id}
              style={[ui.row, selectedTripId === trip.id && ui.rowActive]}
              onPress={() => setSelectedTripId(trip.id)}
            >
              <View style={ui.rowTop}>
                <Text style={ui.title} numberOfLines={1}>
                  {trip.load_location} → {trip.unload_location}
                </Text>
                <Text style={[ui.status, tripStatusTone(trip.status)]}>{tripStatusLabel(trip.status, language)}</Text>
              </View>
              <Text style={ui.meta}>
                {trip.loading_date || "-"} · {t("Earning", "సంపాదన")}: ₹{earning.toFixed(0)}
              </Text>
            </Pressable>
          ))}
        </View>
        ) : null}

        {selectedTripId ? (
          <TripDetailPanel
            trip={trips.find((item) => item.id === selectedTripId)}
            expenses={expenseTotalsByTrip[selectedTripId]}
            drivers={drivers}
            lorries={lorries}
            language={language}
            userRole={userRole}
            onUpdateTrip={onUpdateTrip}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={ui.page}>
      {userRole === "user" ? (
        <View style={styles.userCard}>
          <Text style={styles.userTitle}>{t("Hello", "నమస్కారం")}, {userName || t("User", "యూజర్")}</Text>
          <Text style={styles.userMeta}>{periodLabel}</Text>
          <View style={styles.userStats}>
            <Text style={styles.userStatItem}>{t("Trips", "ట్రిప్స్")}: <Text style={styles.userStatVal}>{trips.length}</Text></Text>
            <Text style={styles.userStatItem}>{t("Live", "లైవ్")}: <Text style={styles.userStatVal}>{activeTrips.length}</Text></Text>
            <Text style={styles.userStatItem}>{t("Done", "పూర్తి")}: <Text style={styles.userStatVal}>{doneTrips.length}</Text></Text>
          </View>
        </View>
      ) : null}

      <View style={ui.statGrid}>
        <View style={ui.statBox}>
          <Text style={ui.statLabel}>{t("Lorries", "లారీలు")}</Text>
          <Text style={ui.statValue}>{dashboard?.total_lorries ?? 0}</Text>
        </View>
        <View style={ui.statBox}>
          <Text style={ui.statLabel}>{t("Live", "లైవ్")}</Text>
          <Text style={ui.statValue}>{activeTrips.length}</Text>
        </View>
        <View style={ui.statBox}>
          <Text style={ui.statLabel}>{t("Drivers", "డ్రైవర్లు")}</Text>
          <Text style={ui.statValue}>{drivers.length}</Text>
        </View>
        <View style={ui.statBox}>
          <Text style={ui.statLabel}>{t("Income", "ఆదాయం")}</Text>
          <Text style={ui.statValue}>₹{totalIncome.toFixed(0)}</Text>
        </View>
        <View style={ui.statBox}>
          <Text style={ui.statLabel}>{t("Expense", "ఖర్చు")}</Text>
          <Text style={ui.statValue}>₹{totalExpenses.toFixed(0)}</Text>
        </View>
        <View style={ui.statBox}>
          <Text style={ui.statLabel}>{t("Profit", "లాభం")}</Text>
          <Text style={ui.statValueSuccess}>₹{totalProfit.toFixed(0)}</Text>
        </View>
      </View>

      <View style={ui.card}>
        <View style={ui.screenHead}>
          <Text style={ui.screenTitle}>{t("Active Trips", "యాక్టివ్ ట్రిప్స్")}</Text>
          <Text style={ui.screenBadge}>{activeTrips.length}</Text>
        </View>

        {activeTrips.length ? (
          visibleActiveTrips.map((trip) => (
            <Pressable
              key={trip.id}
              style={[ui.row, selectedTripId === trip.id && ui.rowActive]}
              onPress={() => setSelectedTripId(trip.id)}
            >
              <View style={ui.rowTop}>
                <Text style={ui.title} numberOfLines={1}>
                  {trip.load_location} → {trip.unload_location}
                </Text>
                <Text style={[ui.status, tripStatusTone(trip.status)]}>{tripStatusLabel(trip.status, language)}</Text>
              </View>
              <Text style={ui.meta}>
                {t("Lorry", "లారీ")} #{trip.lorry_id} · {drivers.find((d) => d.id === trip.driver_id)?.name || "-"}
              </Text>
              <Text style={ui.meta}>
                {trip.contact_person_phone || "-"} · {trip.loading_date || "-"}
              </Text>
            </Pressable>
          ))
        ) : (
          <View style={ui.empty}>
            <Text style={ui.emptyTitle}>{t("No active trips in this period", "ఈ కాలంలో యాక్టివ్ ట్రిప్స్ లేవు")}</Text>
          </View>
        )}

        {activeTrips.length > 5 ? (
          <Pressable style={ui.linkBtn} onPress={() => setShowAllActiveTrips((prev) => !prev)}>
            <Text style={ui.linkBtnText}>
              {showAllActiveTrips ? t("Show less", "తక్కువ") : t(`All ${activeTrips.length}`, `అన్నీ ${activeTrips.length}`)}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {selectedTripId ? (
        <TripDetailPanel
          trip={trips.find((item) => item.id === selectedTripId)}
          expenses={expenseTotalsByTrip[selectedTripId]}
          drivers={drivers}
          lorries={lorries}
          language={language}
          userRole={userRole}
          onUpdateTrip={onUpdateTrip}
        />
      ) : null}

      {statusSummary.length ? (
        <View style={ui.card}>
          <Text style={ui.screenTitle}>{t("Status", "స్థితి")}</Text>
          {statusSummary.map((item) => (
            <View style={styles.statusLine} key={item.status}>
              <Text style={ui.meta}>{tripStatusLabel(item.status, language)}</Text>
              <View style={styles.meter}>
                <View style={[styles.meterFill, { width: `${Math.max(12, (item.count / Math.max(trips.length, 1)) * 100)}%` }]} />
              </View>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: space.lg,
    gap: 6
  },
  userTitle: {
    fontSize: typography.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2
  },
  userMeta: {
    fontSize: typography.sm,
    color: colors.primaryDark,
    fontWeight: "700"
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  heroStatItem: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: "hidden"
  },
  heroStatVal: {
    fontWeight: "800",
    color: "#fff"
  },
  userStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  userStatItem: {
    fontSize: 11,
    color: colors.textSoft
  },
  userStatVal: {
    fontWeight: "800",
    color: colors.text
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm
  },
  meter: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden"
  },
  meterFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999
  },
  statusCount: {
    width: 22,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: colors.text
  },
  acceptCard: {
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb"
  },
  acceptBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center"
  },
  acceptBtnText: {
    color: "#fff",
    fontWeight: "800"
  }
});
