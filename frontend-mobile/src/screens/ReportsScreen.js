import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { space, ui } from "../mobileUi";
import { getPeriodLabel } from "../utils/periodFilter";

export default function ReportsScreen({ dashboard, trips, language = "en", periodFilter = "last_month" }) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);

  if (!trips.length) {
    return (
      <View style={ui.page}>
        <View style={ui.screenHead}>
          <Text style={ui.screenTitle}>{t("Reports", "రిపోర్ట్స్")}</Text>
          <Text style={ui.screenBadge}>{periodLabel}</Text>
        </View>
        <View style={ui.empty}>
          <Text style={ui.emptyTitle}>{t("No data for this period", "ఈ కాలంలో డేటా లేదు")}</Text>
          <Text style={ui.emptyText}>{t("Change period or driver filter.", "కాలం లేదా డ్రైవర్ ఫిల్టర్ మార్చండి.")}</Text>
        </View>
      </View>
    );
  }

  const barHeights = trips.slice(0, 5).map((trip) => Math.max(16, Math.min(72, Number(trip.net_profit || trip.load_price || 0) / 1000)));

  return (
    <View style={ui.page}>
      <View style={ui.screenHead}>
        <Text style={ui.screenTitle}>{t("Reports", "రిపోర్ట్స్")}</Text>
        <Text style={ui.screenBadge}>{trips.length} · {periodLabel}</Text>
      </View>

      <View style={ui.card}>
        <Summary label={t("Trips", "ట్రిప్స్")} value={String(trips.length)} />
        <Summary label={t("Income", "ఆదాయం")} value={`₹${(dashboard?.total_income || 0).toFixed(0)}`} />
        <Summary label={t("Expenses", "ఖర్చులు")} value={`₹${(dashboard?.total_expenses || 0).toFixed(0)}`} />
        <Summary label={t("Profit", "లాభం")} value={`₹${(dashboard?.total_profit || 0).toFixed(0)}`} profit />
      </View>

      <View style={ui.card}>
        <Text style={ui.screenTitle}>{t("Trip Profit Trend", "ట్రిప్ లాభ ట్రెండ్")}</Text>
        <View style={styles.barWrap}>
          {barHeights.map((h, i) => (
            <View key={String(i)} style={styles.barCol}>
              <View style={[styles.bar, { height: h }]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Summary({ label, value, profit }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={ui.meta}>{label}</Text>
      <Text style={[styles.summaryValue, profit && styles.summaryProfit]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  summaryValue: { fontSize: 13, fontWeight: "800", color: colors.text },
  summaryProfit: { color: colors.success },
  barWrap: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, height: 80, marginTop: space.sm },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "72%", borderRadius: 6, backgroundColor: colors.primary }
});
