import { ScrollView, StyleSheet, Text, View } from "react-native";
import { activeLabel, formatMoney, na, t } from "../utils/i18n";
import { colors } from "../theme";

export default function DriverDetailScreen({ driver, history, language = "en" }) {
  if (!driver) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t(language, "DRIVER PROFILE", "డ్రైవర్ ప్రొఫైల్")}</Text>
      <Text style={styles.title}>{driver.name}</Text>
      <Text style={styles.row}>
        {t(language, "Phone", "ఫోన్")}: {driver.phone}
      </Text>
      <Text style={styles.row}>
        {t(language, "License", "లైసెన్స్")}: {driver.license_number || na(language)}
      </Text>
      <Text style={styles.row}>
        {t(language, "Status", "స్థితి")}: {activeLabel(language, driver.is_active)}
      </Text>

      {history ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.row}>
              {t(language, "Total Trips", "మొత్తం ట్రిప్స్")}: {history.total_trips}
            </Text>
            <Text style={styles.row}>
              {t(language, "Total Working Days", "మొత్తం పని రోజులు")}: {history.total_working_days || 0}
            </Text>
            <Text style={styles.row}>
              {t(language, "Total Transport Amount", "మొత్తం రవాణా మొత్తం")}:{" "}
              {formatMoney(language, history.total_transport_amount)}
            </Text>
            <Text style={styles.row}>
              {t(language, "Total Commission", "మొత్తం కమిషన్")}:{" "}
              {formatMoney(language, history.total_commission_amount)}
            </Text>
            <Text style={styles.earning}>
              {t(language, "Total Earning", "మొత్తం సంపాదన")}:{" "}
              {formatMoney(language, history.total_driver_earning)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            {t(language, "Recent Trip Ledger", "ఇటీవలి ట్రిప్ లెడ్జర్")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.historyRow}>
              {history.trips?.map((trip) => (
                <View key={trip.trip_id} style={styles.tripCard}>
                  <Text style={styles.tripTitle}>
                    #{trip.trip_id} {trip.route}
                  </Text>
                  <Text style={styles.tripText}>
                    {t(language, "Lorry", "లారీ")}: {trip.lorry_number || trip.lorry_id}
                  </Text>
                  <Text style={styles.tripText}>
                    {t(language, "Working Days", "పని రోజులు")}: {trip.working_days || 0}
                  </Text>
                  <Text style={styles.tripText}>
                    {t(language, "Transport", "రవాణా")}:{" "}
                    {formatMoney(language, trip.transport_amount ?? trip.load_price)}
                  </Text>
                  <Text style={styles.tripText}>
                    {t(language, "Commission", "కమిషన్")}: {formatMoney(language, trip.commission_amount)}
                  </Text>
                  <Text style={styles.tripText}>
                    {t(language, "Trip Total", "ట్రిప్ మొత్తం")}:{" "}
                    {formatMoney(language, trip.trip_total_earning ?? trip.driver_earned)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : (
        <Text style={styles.loading}>{t(language, "Loading history...", "చరిత్ర లోడ్ అవుతోంది...")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8 },
  kicker: { fontSize: 11, letterSpacing: 1.2, color: "#0F766E", fontWeight: "800" },
  title: { fontSize: 20, fontWeight: "900", color: colors.text },
  row: { color: colors.textSoft, fontSize: 12.5, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: colors.text, marginTop: 4 },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
    backgroundColor: colors.surfaceSoft,
    gap: 5
  },
  earning: { color: colors.text, fontSize: 13.5, fontWeight: "900" },
  loading: { color: colors.muted, fontSize: 12, fontStyle: "italic" },
  historyRow: { flexDirection: "row", gap: 10 },
  tripCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
    backgroundColor: colors.surfaceSoft,
    minWidth: 210,
    gap: 4
  },
  tripTitle: { fontSize: 13, color: colors.text, fontWeight: "900" },
  tripText: { fontSize: 12.5, color: colors.textSoft, lineHeight: 18 }
});
