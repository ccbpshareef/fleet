import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateField from "../components/DateField";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { colors } from "../theme";
import { moneyInputValue, roundMoney } from "../utils/money";

export default function CreateTripScreen({ form, setForm, lorries, drivers, onStartTrip, language = "en", lockedDriverId = null }) {
  const t = (en, te) => (language === "te" ? te : en);
  const statusOptions = TRIP_STATUSES;
  const [activeExpenseKey, setActiveExpenseKey] = useState("diesel");
  const totalExpenses =
    Number(form.diesel || 0) +
    Number(form.toll || 0) +
    Number(form.driver_bata || 0) +
    Number(form.driver_daily_wage || 0) +
    Number(form.driver_commission_amount || 0) +
    Number(form.puncture || 0) +
    Number(form.repair || 0) +
    Number(form.other_expense || 0);
  const expenseTypeOptions = [
    { key: "diesel", icon: "⛽", label: t("Diesel", "డీజిల్"), field: "diesel", imageField: "diesel_image_url" },
    { key: "toll", icon: "🛣️", label: t("Toll", "టోల్"), field: "toll", imageField: "toll_image_url" },
    { key: "puncture", icon: "🛞", label: t("Puncture", "పంచర్"), field: "puncture", imageField: "puncture_image_url" },
    { key: "repair", icon: "🛠️", label: t("Repair", "రిపేర్"), field: "repair", imageField: "repair_image_url" },
    { key: "other", icon: "🧾", label: t("Other", "ఇతర"), field: "other_expense", imageField: "other_image_url" }
  ];
  const activeExpense = expenseTypeOptions.find((item) => item.key === activeExpenseKey) || expenseTypeOptions[0];
  const activeImageUri = activeExpense.imageField ? form[activeExpense.imageField] : "";

  async function setExpenseImage(field, source = "library") {
    try {
      if (source === "camera") {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert("Permission needed", language === "te" ? "కెమెరా అనుమతి అవసరం." : "Camera permission is required.");
          return;
        }
      } else {
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaPermission.granted) {
          Alert.alert("Permission needed", language === "te" ? "గ్యాలరీ అనుమతి అవసరం." : "Gallery permission is required.");
          return;
        }
      }

      const pickerResult = source === "camera"
        ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
          base64: true
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true
        });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      let imageValue = asset.uri;
      if (asset.base64) {
        const mime = asset.mimeType || "image/jpeg";
        imageValue = `data:${mime};base64,${asset.base64}`;
      }
      setForm({ ...form, [field]: imageValue });
    } catch (_error) {
      Alert.alert("Error", language === "te" ? "చిత్రం ఎంచుకోవడం విఫలమైంది." : "Failed to select image.");
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>{t("Trip Workspace", "ట్రిప్ వర్క్‌స్పేస్")}</Text>
        <Text style={styles.title}>{t("Create Trip + Expense", "ట్రిప్ + ఖర్చు నమోదు")}</Text>
        <Text style={styles.subTitle}>
          {t("Capture route, customer contact, and every major expense in one professional mobile flow.", "రూట్, కాంటాక్ట్, మరియు ఖర్చు వివరాలను ఒకే స్క్రీన్‌లో నమోదు చేయండి.")}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("Trip Setup", "ట్రిప్ సెటప్")}</Text>

        <Text style={styles.label}>{t("Select Lorry", "లారీ ఎంచుకోండి")}</Text>
        <View style={styles.rowWrap}>
          {lorries.map((lorry) => (
            <Pressable
              key={lorry.id}
              style={[styles.chip, form.lorry_id === String(lorry.id) && styles.chipActive]}
              onPress={() => setForm({ ...form, lorry_id: String(lorry.id) })}
            >
              <Text style={[styles.chipText, form.lorry_id === String(lorry.id) && styles.chipTextActive]}>{lorry.vehicle_number}</Text>
            </Pressable>
          ))}
        </View>

        {lockedDriverId ? (
          <Text style={styles.lockedDriver}>
            {t("Driver", "డ్రైవర్")}: {drivers.find((d) => String(d.id) === String(lockedDriverId))?.name || `#${lockedDriverId}`}
          </Text>
        ) : (
          <>
            <Text style={styles.label}>{t("Select Driver", "డ్రైవర్ ఎంచుకోండి")}</Text>
            <View style={styles.rowWrap}>
              {drivers.map((driver) => (
                <Pressable
                  key={driver.id}
                  style={[styles.chip, form.driver_id === String(driver.id) && styles.chipActive]}
                  onPress={() => setForm({ ...form, driver_id: String(driver.id) })}
                >
                  <Text style={[styles.chipText, form.driver_id === String(driver.id) && styles.chipTextActive]}>{driver.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <TextInput style={styles.input} placeholder={t("Load Location", "లోడ్ స్థలం")} placeholderTextColor={colors.mutedSoft} value={form.load_location} onChangeText={(v) => setForm({ ...form, load_location: v })} />
        <Pressable style={styles.mapBtn}><Text style={styles.mapBtnText}>{t("Pick on Map", "మ్యాప్‌లో ఎంచుకోండి")}</Text></Pressable>
        <TextInput style={styles.input} placeholder={t("Unload Location", "అన్‌లోడ్ స్థలం")} placeholderTextColor={colors.mutedSoft} value={form.unload_location} onChangeText={(v) => setForm({ ...form, unload_location: v })} />
        <Pressable style={styles.mapBtn}><Text style={styles.mapBtnText}>{t("Pick on Map", "మ్యాప్‌లో ఎంచుకోండి")}</Text></Pressable>
        <TextInput style={styles.input} placeholder={t("Contact Person Name", "సంప్రదింపు వ్యక్తి పేరు")} placeholderTextColor={colors.mutedSoft} value={form.contact_person_name || ""} onChangeText={(v) => setForm({ ...form, contact_person_name: v })} />
        <TextInput style={styles.input} placeholder={t("Contact Person Phone", "సంప్రదింపు ఫోన్")} placeholderTextColor={colors.mutedSoft} value={form.contact_person_phone || ""} onChangeText={(v) => setForm({ ...form, contact_person_phone: v })} />
        <DateField
          label={t("Loading Date", "లోడింగ్ తేదీ")}
          value={form.loading_date || ""}
          onChange={(nextDate) => setForm((prev) => ({ ...prev, loading_date: nextDate }))}
        />
        <DateField
          label={t("Expected Unloading Date", "అంచనా అన్‌లోడ్ తేదీ")}
          value={form.unloading_date || ""}
          onChange={(nextDate) => setForm((prev) => ({ ...prev, unloading_date: nextDate }))}
        />
        <TextInput style={styles.input} placeholder={t("Load Type (optional)", "లోడ్ రకం (ఐచ్చికం)")} placeholderTextColor={colors.mutedSoft} value={form.load_type || ""} onChangeText={(v) => setForm({ ...form, load_type: v })} />
        <TextInput style={styles.inputImportant} placeholder={t("Load Price (Rs)", "లోడ్ ధర (రూ)")} placeholderTextColor={colors.primaryDark} keyboardType="numeric" value={form.load_price} onChangeText={(v) => setForm({ ...form, load_price: v })} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("Expense Entries", "ఖర్చు నమోదు")}</Text>
        <Text style={styles.sectionSubTitle}>
          {t("Add amount and upload one or more images in the same card.", "ఒకే కార్డులో మొత్తం మరియు చిత్రం జోడించండి.")}
        </Text>
        <View style={styles.expenseTypeGrid}>
          {expenseTypeOptions.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.expenseTypeBtn, activeExpense.key === item.key && styles.expenseTypeBtnActive]}
              onPress={() => setActiveExpenseKey(item.key)}
            >
              <Text style={[styles.expenseTypeBtnText, activeExpense.key === item.key && styles.expenseTypeBtnTextActive]}>
                {item.icon} {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.expenseEntryCard}>
          <View style={styles.expenseEntryHead}>
            <Text style={styles.expenseEntryTitle}>{activeExpense.icon} {activeExpense.label}</Text>
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountBadgeText}>{activeImageUri ? "1" : "0"} {t("Images", "చిత్రాలు")}</Text>
            </View>
          </View>

          <Text style={styles.label}>{t("Amount", "మొత్తం")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t(`${activeExpense.label} amount`, `${activeExpense.label} మొత్తం`)}
            placeholderTextColor={colors.mutedSoft}
            keyboardType="numeric"
            value={form[activeExpense.field] || ""}
            onChangeText={(v) => setForm({ ...form, [activeExpense.field]: v })}
          />

          {activeExpense.imageField ? (
            <>
              <Pressable style={styles.uploadBtn} onPress={() => setExpenseImage(activeExpense.imageField, "library")}>
                <Text style={styles.uploadBtnText}>🖼️ {t("Add Images", "చిత్రాలు జోడించండి")}</Text>
              </Pressable>
              {activeImageUri ? (
                <View style={styles.uploadPreviewRow}>
                  <Image source={{ uri: activeImageUri }} style={styles.uploadPreviewImage} />
                  <Pressable
                    style={styles.proofClearBtn}
                    onPress={() => setForm({ ...form, [activeExpense.imageField]: "" })}
                  >
                    <Text style={styles.proofClearBtnText}>{t("Remove", "తొలగించు")}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <TextInput style={styles.input} placeholder={t("Driver Bata", "డ్రైవర్ బాటా")} placeholderTextColor={colors.mutedSoft} keyboardType="numeric" value={form.driver_bata || ""} onChangeText={(v) => setForm({ ...form, driver_bata: v })} />
        <TextInput style={styles.input} placeholder={t("Driver Daily Wage (optional)", "డ్రైవర్ రోజువారీ వేతనం (ఐచ్చికం)")} placeholderTextColor={colors.mutedSoft} keyboardType="numeric" value={form.driver_daily_wage || ""} onChangeText={(v) => setForm({ ...form, driver_daily_wage: v })} />
        <TextInput
          style={styles.input}
          placeholder={t("Commission % (optional)", "కమిషన్ % (ఐచ్చికం)")}
          placeholderTextColor={colors.mutedSoft}
          keyboardType="numeric"
          value={form.driver_commission_percent || ""}
          onChangeText={(v) => {
            const percent = Number(v || 0);
            const loadPrice = Number(form.load_price || 0);
            setForm({
              ...form,
              driver_commission_percent: v,
              driver_commission_amount: percent > 0 ? moneyInputValue(roundMoney((loadPrice * percent) / 100)) : ""
            });
          }}
        />
        <TextInput style={styles.input} placeholder={t("Commission Amount", "కమిషన్ మొత్తం")} placeholderTextColor={colors.mutedSoft} keyboardType="numeric" value={form.driver_commission_amount || ""} onChangeText={(v) => setForm({ ...form, driver_commission_amount: v })} />

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>{t("Total Expenses", "మొత్తం ఖర్చులు")}</Text>
          <Text style={styles.totalValue}>Rs {totalExpenses.toFixed(0)}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t("Trip Status", "ట్రిప్ స్థితి")}</Text>
        <Text style={styles.label}>{t("Status", "స్థితి")}</Text>
        <View style={styles.rowWrap}>
          {statusOptions.map((status) => (
            <Pressable
              key={status}
              style={[styles.chip, form.status === status && styles.chipActive]}
              onPress={() => setForm({ ...form, status })}
            >
              <Text style={[styles.chipText, form.status === status && styles.chipTextActive]}>{tripStatusLabel(status, language)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.primaryBtn} onPress={onStartTrip}>
          <Text style={styles.primaryBtnText}>{t("Save Trip With Expense", "ట్రిప్ + ఖర్చు సేవ్ చేయండి")}</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 6 },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  kicker: { fontSize: 11, letterSpacing: 1.2, color: "#0F766E", fontWeight: "800" },
  title: { fontSize: 21, fontWeight: "900", color: colors.text },
  subTitle: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    gap: 11,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  label: { color: colors.textSoft, fontSize: 12, fontWeight: "800", marginTop: 2 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "#EEF6FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  chipText: { color: colors.primaryDark, fontSize: 11.5, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  lockedDriver: { fontSize: 13, fontWeight: "700", color: colors.primaryDark, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#D5E1F5", borderRadius: 14, backgroundColor: "#FFFFFF", paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, color: colors.text },
  inputImportant: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: "#E8F3FF",
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13,
    fontWeight: "800",
    color: colors.text
  },
  sectionTitle: { marginTop: 2, fontSize: 17, fontWeight: "900", color: colors.text },
  sectionSubTitle: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginBottom: 2 },
  mapBtn: { backgroundColor: "#F1F7FF", borderRadius: 14, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#D5E1F5" },
  mapBtnText: { color: colors.primaryDark, fontWeight: "800", fontSize: 12 },
  expenseTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  expenseTypeBtn: {
    width: "48%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFD3F4",
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    paddingVertical: 8.5
  },
  expenseTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark
  },
  expenseTypeBtnText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 12
  },
  expenseTypeBtnTextActive: {
    color: "#fff"
  },
  expenseEntryCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 12.5,
    gap: 6
  },
  expenseEntryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  expenseEntryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  imageCountBadge: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  imageCountBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  uploadBtn: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12
  },
  uploadBtnText: {
    color: colors.primaryDark,
    fontWeight: "900",
    fontSize: 12.5
  },
  uploadPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  uploadPreviewImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong
  },
  totalBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  totalLabel: { color: colors.primaryDark, fontWeight: "800", fontSize: 12.5 },
  totalValue: { color: colors.text, fontWeight: "900", fontSize: 15 },
  proofClearBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F4C7A5",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  proofClearBtnText: {
    color: "#9A3412",
    fontWeight: "800",
    fontSize: 11
  },
  primaryBtn: {
    marginTop: 2,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5 }
});

