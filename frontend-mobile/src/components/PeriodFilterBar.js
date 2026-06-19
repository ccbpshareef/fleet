import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { PERIOD_KEYS, getPeriodLabel } from "../utils/periodFilter";
import { colors } from "../theme";

export default function PeriodFilterBar({ value, onChange, language = "en" }) {
  const t = (en, te) => (language === "te" ? te : en);

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>{t("Period", "కాల వ్యవధి")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PERIOD_KEYS.map((period) => {
          const active = value === period;
          return (
            <Pressable
              key={period}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(period)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{getPeriodLabel(period, language)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  caption: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase" },
  row: { gap: 6, paddingRight: 4 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSoft
  },
  chipTextActive: {
    color: "#fff"
  }
});
