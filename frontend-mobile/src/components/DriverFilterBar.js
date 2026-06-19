import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export default function DriverFilterBar({ drivers, value, onChange, language = "en", tripCounts = {} }) {
  const t = (en, te) => (language === "te" ? te : en);
  const list = drivers || [];

  if (!list.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>{t("Driver", "డ్రైవర్")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable style={[styles.chip, !value && styles.chipActive]} onPress={() => onChange("")}>
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>{t("All Drivers", "అందరు డ్రైవర్లు")}</Text>
        </Pressable>
        {list.map((driver) => {
          const active = String(value) === String(driver.id);
          const count = tripCounts[driver.id] || 0;
          return (
            <Pressable key={driver.id} style={[styles.chip, active && styles.chipActive]} onPress={() => onChange(String(driver.id))}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {driver.name} {count ? `(${count})` : ""}
              </Text>
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
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSoft
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800"
  }
});
