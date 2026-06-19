import { StyleSheet, Text, View } from "react-native";
import { formatMoneyShort, t } from "../utils/i18n";
import { colors } from "../theme";
import { ui } from "../mobileUi";

export default function ProfitSummaryScreen({ trip, expense, language = "en" }) {
  const loadPrice = Number(trip?.load_price || 0);
  const diesel = Number(expense?.diesel || 0);
  const toll = Number(expense?.toll || 0);
  const driver = Number(expense?.driver_bata || 0);
  const others = Number(expense?.maintenance || 0) + Number(expense?.other || 0);
  const totalExpenses = diesel + toll + driver + others;
  const net = loadPrice - totalExpenses;

  return (
    <View style={ui.page}>
      <View style={ui.screenHead}>
        <Text style={ui.screenTitle}>{t(language, "Profit", "లాభం")}</Text>
        <Text style={[ui.screenBadge, net >= 0 ? styles.good : styles.bad]}>{formatMoneyShort(language, net)}</Text>
      </View>

      <View style={ui.card}>
        <Row language={language} label={t(language, "Load", "లోడ్")} value={formatMoneyShort(language, loadPrice)} />
        <Row language={language} label={t(language, "Expenses", "ఖర్చులు")} value={formatMoneyShort(language, totalExpenses)} />
        <Row
          language={language}
          label={t(language, "Net", "నికర")}
          value={formatMoneyShort(language, net)}
          strong={net >= 0}
        />
      </View>

      <View style={ui.card}>
        <Text style={ui.screenTitle}>{t(language, "Breakdown", "విభజన")}</Text>
        <Row language={language} label={t(language, "Diesel", "డీజిల్")} value={formatMoneyShort(language, diesel)} />
        <Row language={language} label={t(language, "Toll", "టోల్")} value={formatMoneyShort(language, toll)} />
        <Row language={language} label={t(language, "Driver", "డ్రైవర్")} value={formatMoneyShort(language, driver)} />
        <Row language={language} label={t(language, "Other", "ఇతర")} value={formatMoneyShort(language, others)} />
      </View>
    </View>
  );
}

function Row({ language, label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={ui.meta}>{label}</Text>
      <Text style={[styles.value, strong && styles.valueGood]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  value: { fontSize: 12, fontWeight: "800", color: colors.text },
  valueGood: { color: colors.success },
  good: { color: colors.success },
  bad: { color: colors.danger }
});
