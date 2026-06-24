import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../api";
import { assignmentStatusLabel, formatMoney } from "../utils/i18n";
import { colors } from "../theme";

export default function DriverManagementScreen({
  drivers,
  lorries,
  assignments = [],
  form,
  setForm,
  onAddDriver,
  onOpenDetail,
  onToggleDriverStatus,
  onDeleteDriver,
  assignmentForm,
  setAssignmentForm,
  onAssign,
  onAddAssignmentLeave,
  onCompleteAssignment,
  language = "en",
  saveError = ""
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const [leaveForms, setLeaveForms] = useState({});
  const [completeForms, setCompleteForms] = useState({});
  const [loginIdCheck, setLoginIdCheck] = useState({
    checking: false,
    available: null,
    suggestions: [],
    message: ""
  });

  useEffect(() => {
    const raw = (form.login_identifier || "").trim().toLowerCase();
    if (raw.length < 3) {
      setLoginIdCheck({ checking: false, available: null, suggestions: [], message: "" });
      return;
    }
    setLoginIdCheck((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkUserId(raw);
        setLoginIdCheck({
          checking: false,
          available: result.available,
          suggestions: result.suggestions || [],
          message: result.message || ""
        });
      } catch {
        setLoginIdCheck({ checking: false, available: null, suggestions: [], message: "" });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [form.login_identifier]);

  const updateLeaveForm = (assignmentId, field, value) => {
    setLeaveForms((current) => ({
      ...current,
      [assignmentId]: {
        leave_start: "",
        leave_end: "",
        reason: "",
        ...(current[assignmentId] || {}),
        [field]: value
      }
    }));
  };

  return (
    <View style={styles.page}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>{t("Driver Desk", "డ్రైవర్ డెస్క్")}</Text>
        <Text style={styles.title}>{t("Driver Management", "డ్రైవర్ నిర్వహణ")}</Text>
        <Text style={styles.subTitle}>
          {t("Manage driver onboarding, lorry assignments, and shift closures from one clean workspace.", "డ్రైవర్ చేరికలు, లారీ కేటాయింపులు, మరియు అసైన్‌మెంట్ ముగింపులు ఇక్కడ నిర్వహించండి.")}
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t("Drivers", "డ్రైవర్లు")}</Text>
            <Text style={styles.heroStatValue}>{drivers.length}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t("Active Assignments", "యాక్టివ్ అసైన్‌మెంట్స్")}</Text>
            <Text style={styles.heroStatValue}>
              {assignments.filter((item) => item.status === "Active").length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("Add Driver", "డ్రైవర్ చేర్చు")}</Text>
        <Text style={styles.hint}>
          {t("Login ID and password are optional. Leave blank for auto-generated credentials.", "లాగిన్ ID మరియు పాస్‌వర్డ్ ఐచ్ఛికం. ఖాళీగా ఉంటే ఆటోమేటిక్‌గా సృష్టిస్తాం.")}
        </Text>
        <TextInput style={styles.input} placeholder={t("Driver Name", "డ్రైవర్ పేరు")} placeholderTextColor={colors.mutedSoft} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <TextInput style={styles.input} placeholder={t("Phone", "ఫోన్")} placeholderTextColor={colors.mutedSoft} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
        <TextInput style={styles.input} placeholder={t("License Number", "లైసెన్స్ నంబర్")} placeholderTextColor={colors.mutedSoft} value={form.license_number} onChangeText={(v) => setForm({ ...form, license_number: v })} />
        <TextInput
          style={[
            styles.input,
            loginIdCheck.available === false && styles.inputBad,
            loginIdCheck.available === true && styles.inputOk
          ]}
          placeholder={t("Login ID (optional)", "లాగిన్ ID (ఐచ్ఛికం)")}
          placeholderTextColor={colors.mutedSoft}
          value={form.login_identifier || ""}
          onChangeText={(v) =>
            setForm({ ...form, login_identifier: v.replace(/\s/g, "_").toLowerCase() })
          }
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loginIdCheck.checking ? (
          <Text style={styles.idStatusMuted}>{t("Checking login ID...", "లాగిన్ ID తనిఖీ...")}</Text>
        ) : null}
        {loginIdCheck.available === true ? (
          <Text style={styles.idStatusOk}>{t("Login ID is available", "లాగిన్ ID అందుబాటులో ఉంది")}</Text>
        ) : null}
        {loginIdCheck.available === false ? (
          <View style={styles.suggestBlock}>
            <Text style={styles.idStatusBad}>
              {loginIdCheck.message || t("Login ID already exists", "లాగిన్ ID ఇప్పటికే ఉంది")}
            </Text>
            {loginIdCheck.suggestions.length ? (
              <>
                <Text style={styles.suggestLabel}>{t("Try one of these:", "ఇవి ప్రయత్నించండి:")}</Text>
                <View style={styles.suggestRow}>
                  {loginIdCheck.suggestions.map((item) => (
                    <Pressable
                      key={item}
                      style={styles.suggestChip}
                      onPress={() => setForm({ ...form, login_identifier: item })}
                    >
                      <Text style={styles.suggestChipText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
        <TextInput style={styles.input} placeholder={t("Password (optional)", "పాస్‌వర్డ్ (ఐచ్ఛికం)")} placeholderTextColor={colors.mutedSoft} value={form.password || ""} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />
        {saveError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorMark}>!</Text>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        ) : null}
        <Pressable
          style={[
            styles.primaryBtn,
            loginIdCheck.available === false && styles.primaryBtnDisabled
          ]}
          onPress={onAddDriver}
          disabled={loginIdCheck.available === false}
        >
          <Text style={styles.primaryBtnText}>{t("Save Driver", "డ్రైవర్ సేవ్ చేయి")}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("Assign Driver to Lorry", "లారీకి డ్రైవర్ కేటాయింపు")}</Text>
        <TextInput style={styles.input} placeholder={t("Lorry ID", "లారీ ఐడి")} placeholderTextColor={colors.mutedSoft} value={assignmentForm.lorry_id} onChangeText={(v) => setAssignmentForm({ ...assignmentForm, lorry_id: v })} />
        <TextInput style={styles.input} placeholder={t("Driver ID", "డ్రైవర్ ఐడి")} placeholderTextColor={colors.mutedSoft} value={assignmentForm.driver_id} onChangeText={(v) => setAssignmentForm({ ...assignmentForm, driver_id: v })} />
        <TextInput style={styles.input} placeholder={t("Start (YYYY-MM-DDTHH:mm)", "ప్రారంభ సమయం")} placeholderTextColor={colors.mutedSoft} value={assignmentForm.assigned_at} onChangeText={(v) => setAssignmentForm({ ...assignmentForm, assigned_at: v })} />
        <TextInput style={styles.input} placeholder={t("Daily Wage", "రోజువారీ వేతనం")} placeholderTextColor={colors.mutedSoft} value={assignmentForm.daily_wage} onChangeText={(v) => setAssignmentForm({ ...assignmentForm, daily_wage: v })} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder={t("Commission %", "కమిషన్ %")} placeholderTextColor={colors.mutedSoft} value={assignmentForm.commission_percent} onChangeText={(v) => setAssignmentForm({ ...assignmentForm, commission_percent: v })} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder={t("Notes", "నోట్లు")} placeholderTextColor={colors.mutedSoft} value={assignmentForm.notes} onChangeText={(v) => setAssignmentForm({ ...assignmentForm, notes: v })} />
        <Pressable style={styles.primaryBtn} onPress={onAssign}>
          <Text style={styles.primaryBtnText}>{t("Assign Driver", "డ్రైవర్ కేటాయించు")}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("Drivers", "డ్రైవర్లు")}</Text>
        {drivers.map((driver) => (
          <Pressable key={driver.id} style={styles.driverCard} onPress={() => onOpenDetail(driver)}>
            <View style={styles.driverHead}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={[styles.driverStatus, driver.is_active ? styles.driverStatusActive : styles.driverStatusInactive]}>
                {driver.is_active ? t("Active", "యాక్టివ్") : t("Inactive", "ఇనాక్టివ్")}
              </Text>
            </View>
            <Text style={styles.driverMeta}>{t("Phone", "ఫోన్")}: {driver.phone}</Text>
            <Text style={styles.driverMeta}>
              {t("Assigned Lorry", "కేటాయించిన లారీ")}: {lorries.find((l) => l.driver_id === driver.id)?.vehicle_number || t("Not assigned", "కేటాయించలేదు")}
            </Text>
            <Pressable
              style={styles.secondaryBtn}
              onPress={(event) => {
                event.stopPropagation();
                onToggleDriverStatus(driver);
              }}
            >
              <Text style={styles.secondaryText}>
                {driver.is_active ? t("Set Inactive", "ఇనాక్టివ్ చేయి") : t("Set Active", "యాక్టివ్ చేయి")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={(event) => {
                event.stopPropagation();
                onDeleteDriver(driver);
              }}
            >
              <Text style={styles.deleteText}>{t("Delete", "తొలగించు")}</Text>
            </Pressable>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("Assignment Ledger", "అసైన్‌మెంట్ లెడ్జర్")}</Text>
        {assignments.map((item) => (
          <View key={item.id} style={styles.driverCard}>
            <Text style={styles.driverMeta}>{t("Lorry", "లారీ")}: {lorries.find((l) => l.id === item.lorry_id)?.vehicle_number || item.lorry_id}</Text>
            <Text style={styles.driverMeta}>{t("Driver", "డ్రైవర్")}: {drivers.find((d) => d.id === item.driver_id)?.name || item.driver_id}</Text>
            <Text style={styles.driverMeta}>
              {t("Status", "స్థితి")}: {assignmentStatusLabel(language, item.status)}
            </Text>
            <Text style={styles.driverMeta}>
              {t("Start", "ప్రారంభం")}: {new Date(item.assigned_at).toLocaleString(language === "te" ? "te-IN" : "en-IN")}
            </Text>
            <Text style={styles.driverMeta}>
              {t("End", "ముగింపు")}:{" "}
              {item.completed_at
                ? new Date(item.completed_at).toLocaleString(language === "te" ? "te-IN" : "en-IN")
                : "-"}
            </Text>
            <Text style={styles.driverMeta}>{t("Working Days", "పని రోజులు")}: {item.working_days}</Text>
            <Text style={styles.driverMeta}>{t("Leave Days", "లీవ్ రోజులు")}: {item.leave_days}</Text>
            <Text style={styles.driverMeta}>
              {t("Transport Amount", "రవాణా మొత్తం")}: {formatMoney(language, item.total_transport_amount)}
            </Text>
            <Text style={styles.driverMeta}>
              {t("Daily Wage", "రోజువారీ వేతనం")}: {formatMoney(language, item.daily_wage)} ({t("locked", "లాక్")})
            </Text>
            <Text style={styles.driverMeta}>
              {t("Wage Amount", "వేతన మొత్తం")}: {formatMoney(language, item.wage_amount)} ({item.working_days} {t("days", "రోజులు")} × {formatMoney(language, item.daily_wage)})
            </Text>
            <Text style={styles.driverMeta}>
              {t("Commission", "కమిషన్")}: {formatMoney(language, item.commission_amount)}
            </Text>
            <Text style={styles.driverMetaStrong}>
              {t("Total Earning", "మొత్తం సంపాదన")}: {formatMoney(language, item.total_earning)}
            </Text>

            {item.trips?.length ? (
              <View style={styles.leaveList}>
                <Text style={styles.cardTitle}>{t("Trip-wise Commission", "ట్రిప్ వారీ కమిషన్")}</Text>
                {item.trips.map((trip) => (
                  <Text key={trip.trip_id} style={styles.driverMeta}>
                    {trip.route}: {formatMoney(language, trip.load_price)} × {trip.commission_percent}% = {formatMoney(language, trip.commission_amount)}
                  </Text>
                ))}
              </View>
            ) : null}

            {item.leaves?.length ? (
              <View style={styles.leaveList}>
                {item.leaves.map((leave) => (
                  <Text key={leave.id} style={styles.driverMeta}>
                    {new Date(leave.leave_start).toLocaleDateString()} - {new Date(leave.leave_end).toLocaleDateString()}
                    {leave.reason ? ` (${leave.reason})` : ""}
                  </Text>
                ))}
              </View>
            ) : null}

            {item.status === "Active" ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t("Leave Start (YYYY-MM-DD)", "లీవ్ ప్రారంభం")}
                  placeholderTextColor={colors.mutedSoft}
                  value={leaveForms[item.id]?.leave_start || ""}
                  onChangeText={(value) => updateLeaveForm(item.id, "leave_start", value)}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Leave End (YYYY-MM-DD)", "లీవ్ ముగింపు")}
                  placeholderTextColor={colors.mutedSoft}
                  value={leaveForms[item.id]?.leave_end || ""}
                  onChangeText={(value) => updateLeaveForm(item.id, "leave_end", value)}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Leave Reason", "లీవ్ కారణం")}
                  placeholderTextColor={colors.mutedSoft}
                  value={leaveForms[item.id]?.reason || ""}
                  onChangeText={(value) => updateLeaveForm(item.id, "reason", value)}
                />
                <Pressable style={styles.secondaryBtn} onPress={() => onAddAssignmentLeave(item.id, leaveForms[item.id] || {})}>
                  <Text style={styles.secondaryText}>{t("Add Leave", "లీవ్ చేర్చు")}</Text>
                </Pressable>
                <TextInput
                  style={styles.input}
                  placeholder={t("End (YYYY-MM-DDTHH:mm)", "ముగింపు సమయం")}
                  placeholderTextColor={colors.mutedSoft}
                  value={completeForms[item.id] || ""}
                  onChangeText={(value) => setCompleteForms((current) => ({ ...current, [item.id]: value }))}
                />
                <Pressable style={styles.primaryBtn} onPress={() => onCompleteAssignment(item.id, { completed_at: completeForms[item.id] || null })}>
                  <Text style={styles.primaryBtnText}>{t("Complete Assignment", "అసైన్‌మెంట్ ముగించు")}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ))}
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
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  kicker: { fontSize: 11, letterSpacing: 1.2, color: "#0F766E", fontWeight: "800" },
  title: { fontSize: 16, fontWeight: "900", color: colors.text },
  subTitle: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  heroStatsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  heroStatCard: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  heroStatLabel: { color: colors.muted, fontSize: 11.5 },
  heroStatValue: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  hint: { fontSize: 12, lineHeight: 18, color: colors.muted, marginBottom: 10 },
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
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5 },
  driverCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    padding: 13,
    gap: 6
  },
  driverHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  driverName: { fontWeight: "900", fontSize: 15, color: colors.text, flex: 1 },
  driverStatus: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800"
  },
  driverStatusActive: { backgroundColor: colors.successSoft, color: colors.success },
  driverStatusInactive: { backgroundColor: colors.surfaceMuted, color: colors.muted },
  driverMeta: { color: colors.textSoft, fontSize: 12.5, lineHeight: 18 },
  driverMetaStrong: { color: colors.text, fontSize: 13, fontWeight: "900" },
  leaveList: { gap: 4, paddingVertical: 2 },
  secondaryBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryText: { color: colors.primaryDark, fontWeight: "800", fontSize: 12 },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  deleteText: { color: colors.danger, fontWeight: "800", fontSize: 12 },
  inputOk: { borderColor: colors.success },
  inputBad: { borderColor: colors.danger },
  idStatusMuted: { fontSize: 11, fontWeight: "700", color: colors.muted },
  idStatusOk: { fontSize: 11, fontWeight: "800", color: colors.success },
  idStatusBad: { fontSize: 11, fontWeight: "700", color: colors.danger, lineHeight: 15 },
  suggestBlock: { gap: 6 },
  suggestLabel: { fontSize: 11, fontWeight: "800", color: colors.textSoft },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  suggestChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  suggestChipText: { fontSize: 11, fontWeight: "800", color: colors.primaryDark },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  errorMark: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.danger,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 18
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#B91C1C", lineHeight: 16 },
  primaryBtnDisabled: { opacity: 0.55 }
});

