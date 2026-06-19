import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LORRY_TYPES, lorryTypeLabel } from "../utils/fleetLabels";
import { colors } from "../theme";

export default function AddLorryScreen({
  form,
  setForm,
  drivers,
  lorries = [],
  selectedLorryHistory = null,
  onSelectLorry = () => {},
  onToggleLorryStatus = () => {},
  onSave,
  onCancel,
  language = "en"
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLorries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return lorries;
    return lorries.filter((lorry) => lorry.vehicle_number?.toLowerCase().includes(query));
  }, [lorries, searchTerm]);

  return (
    <View style={styles.page}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>{t("Fleet Setup", "ఫ్లీట్ సెటప్")}</Text>
        <Text style={styles.title}>{t("Add Lorry", "లారీ చేర్చు")}</Text>
        <Text style={styles.subTitle}>
          {t("Register vehicles, assign drivers, and keep a cleaner fleet list for everyday operations.", "వాహనాలు నమోదు చేయండి, డ్రైవర్లను కేటాయించండి, మరియు ఫ్లీట్ జాబితాను సులభంగా నిర్వహించండి.")}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("Vehicle Details", "వాహన వివరాలు")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("Vehicle Number", "వాహనం నంబర్")}
          placeholderTextColor={colors.mutedSoft}
          value={form.vehicle_number}
          onChangeText={(value) => setForm({ ...form, vehicle_number: value })}
        />

        <View style={styles.compactField}>
          <Text style={styles.label}>{t("Lorry Type", "లారీ రకం")}</Text>
          <View style={styles.rowWrap}>
            {LORRY_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, form.lorry_type === type && styles.chipActive]}
                onPress={() => setForm({ ...form, lorry_type: type })}
              >
                <Text style={[styles.chipText, form.lorry_type === type && styles.chipTextActive]}>{lorryTypeLabel(type, language)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.compactField}>
          <Text style={styles.label}>{t("Assign Driver", "డ్రైవర్ కేటాయించు")}</Text>
          <View style={styles.rowWrap}>
            {drivers.map((driver) => (
              <Pressable
                key={driver.id}
                style={[styles.chip, form.driver_id === driver.id && styles.chipActive]}
                onPress={() => setForm({ ...form, driver_id: driver.id })}
              >
                <Text style={[styles.chipText, form.driver_id === driver.id && styles.chipTextActive]}>{driver.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryBtn} onPress={onCancel}>
            <Text style={styles.secondaryText}>{t("Clear", "క్లియర్")}</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={onSave}>
            <Text style={styles.primaryText}>{t("Save Lorry", "లారీ సేవ్ చేయి")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.listHead}>
          <Text style={styles.cardTitle}>{t("Fleet List", "లారీ జాబితా")}</Text>
          <Text style={styles.listMeta}>{filteredLorries.length}/{lorries.length}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t("Search vehicle number", "వాహనం నంబర్ సెర్చ్")}
          placeholderTextColor={colors.mutedSoft}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {filteredLorries.map((lorry) => (
          <Pressable key={lorry.id} style={styles.listCard} onPress={() => onSelectLorry(lorry)}>
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleText}>{lorry.vehicle_number}</Text>
                <Text style={styles.cardMeta}>#{lorry.id}</Text>
              </View>
              <Text style={[styles.statusBadge, lorry.is_active ? styles.statusActive : styles.statusInactive]}>
                {lorry.is_active ? t("Active", "యాక్టివ్") : t("Inactive", "ఇనాక్టివ్")}
              </Text>
            </View>
            <Pressable style={styles.secondaryBtn} onPress={() => onToggleLorryStatus(lorry)}>
              <Text style={styles.secondaryText}>
                {lorry.is_active ? t("Disable", "డిసేబుల్") : t("Enable", "ఎనేబుల్")}
              </Text>
            </Pressable>
          </Pressable>
        ))}

        {selectedLorryHistory ? (
          <View style={styles.historyCard}>
            <Text style={styles.cardTitleText}>{t("History", "చరిత్ర")} - {selectedLorryHistory.vehicle_number}</Text>
            <Text style={styles.cardMeta}>{t("Trips", "ట్రిప్స్")}: {selectedLorryHistory.total_trips}</Text>
            <Text style={styles.profitMeta}>{t("Profit", "లాభం")}: Rs.{Number(selectedLorryHistory.total_profit || 0).toFixed(2)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 8 },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  kicker: { fontSize: 11, letterSpacing: 1.2, color: "#0F766E", fontWeight: "800" },
  title: { fontSize: 16, fontWeight: "900", color: colors.text },
  subTitle: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 10, gap: 10, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13,
    color: colors.text
  },
  label: { color: colors.textSoft, fontSize: 12, fontWeight: "800" },
  compactField: { gap: 7 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primaryDark, fontSize: 11.5, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 12.5 },
  secondaryBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryText: { fontWeight: "800", color: colors.primaryDark, fontSize: 12 },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  listMeta: { color: colors.muted, fontSize: 11.5, fontWeight: "800" },
  listCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, borderRadius: 18, padding: 13, gap: 9 },
  historyCard: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.primarySoft, borderRadius: 18, padding: 13, gap: 5 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitleText: { fontSize: 15, color: colors.text, fontWeight: "900" },
  cardMeta: { fontSize: 12.5, color: colors.textSoft, fontWeight: "600" },
  profitMeta: { fontSize: 12.5, color: colors.success, fontWeight: "800" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: "800" },
  statusActive: { backgroundColor: colors.successSoft, color: colors.success },
  statusInactive: { backgroundColor: colors.surfaceMuted, color: colors.muted }
});

