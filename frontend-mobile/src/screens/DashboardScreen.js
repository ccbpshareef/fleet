import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../theme";
import { space, ui } from "../mobileUi";
import { getPeriodLabel } from "../utils/periodFilter";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
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
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const doneTrips = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showAllActiveTrips, setShowAllActiveTrips] = useState(false);
  const visibleActiveTrips = showAllActiveTrips ? activeTrips : activeTrips.slice(0, 5);

  const totalProfit = Number(dashboard?.total_profit || 0);
  const totalExpenses = Number(dashboard?.total_expenses || 0);
  const totalIncome = Number(dashboard?.total_income || 0);
  const periodLabel = getPeriodLabel(periodFilter, language);

  const statusSummary = useMemo(() => {
    return TRIP_STATUSES
      .map((status) => ({ status, count: trips.filter((trip) => trip.status === status).length }))
      .filter((item) => item.count > 0);
  }, [trips]);

  if (!trips.length) {
    return (
      <View style={ui.page}>
        <View style={styles.userCard}>
          <Text style={styles.userTitle}>{userName || t("Fleet User", "ఫ్లీట్ యూజర్")}</Text>
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
                <Text style={ui.status}>{tripStatusLabel(trip.status, language)}</Text>
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
          onUpdateTrip={onUpdateTripStatus}
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
  }
});
