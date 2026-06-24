import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateField from "./DateField";
import { colors, radius, typography } from "../theme";
import { space, ui } from "../mobileUi";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { expenseFieldsForRole } from "../utils/tripExpenseEdit";
import { buildTripUpdatePayload, expenseDraftFromTotals, toDateInputValue } from "../utils/tripUpdate";
import { tripDriverEarning } from "../utils/driverEarnings";

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

function DetailItem({ label, value, valueStyle }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ExpenseStat({ label, value, editing, draftValue, onChange }) {
  return (
    <View style={styles.expenseStat}>
      <Text style={styles.expenseLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.expenseInput}
          value={draftValue}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      ) : (
        <Text style={styles.expenseValue}>{formatCurrency(value)}</Text>
      )}
    </View>
  );
}

export default function TripDetailPanel({
  trip,
  expenses,
  drivers = [],
  lorries = [],
  language = "en",
  userRole = "user",
  onUpdateTrip,
  allowTripUpdate = true
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const isDriver = userRole === "driver";
  const visibleExpenseFields = expenseFieldsForRole(userRole);
  const myEarning = tripDriverEarning(expenses);
  const [isEditing, setIsEditing] = useState(false);
  const [statusDraft, setStatusDraft] = useState(trip?.status || "Loading");
  const [loadingDateDraft, setLoadingDateDraft] = useState("");
  const [unloadingDateDraft, setUnloadingDateDraft] = useState("");
  const [expenseDraft, setExpenseDraft] = useState(() => expenseDraftFromTotals(expenses));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trip) {
      setStatusDraft(trip.status || "Loading");
      setLoadingDateDraft(toDateInputValue(trip.loading_date));
      setUnloadingDateDraft(toDateInputValue(trip.unloading_date));
      setExpenseDraft(expenseDraftFromTotals(expenses));
      setIsEditing(false);
    }
  }, [trip?.id, trip?.status, trip?.loading_date, trip?.unloading_date, expenses]);

  if (!trip) return null;

  const lorryName = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `#${trip.lorry_id}`;
  const driverName = drivers.find((item) => item.id === trip.driver_id)?.name || "-";
  const canUpdate = allowTripUpdate && typeof onUpdateTrip === "function";
  const updatePayload = buildTripUpdatePayload(trip, {
    status: statusDraft,
    loadingDate: loadingDateDraft,
    unloadingDate: unloadingDateDraft,
    expenseDraft: isEditing ? expenseDraft : null,
    expenses
  });
  const hasChanges = Object.keys(updatePayload).length > 0;

  function resetDrafts() {
    setStatusDraft(trip.status || "Loading");
    setLoadingDateDraft(toDateInputValue(trip.loading_date));
    setUnloadingDateDraft(toDateInputValue(trip.unloading_date));
    setExpenseDraft(expenseDraftFromTotals(expenses));
    setIsEditing(false);
  }

  function updateExpenseField(key, value) {
    setExpenseDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!canUpdate || !hasChanges) return;
    try {
      setIsSaving(true);
      await onUpdateTrip(trip.id, updatePayload);
      setIsEditing(false);
    } catch (error) {
      const message = error?.message || t("Failed to update trip", "ట్రిప్ అప్డేట్ విఫలమైంది");
      Alert.alert(t("Error", "లోపం"), message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={ui.card}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={ui.screenTitle}>{isDriver ? t("My Trip Details", "నా ట్రిప్ వివరాలు") : t("Complete Trip Details", "పూర్తి ట్రిప్ వివరాలు")}</Text>
          <Text style={ui.meta}>
            {trip.load_location} → {trip.unload_location}
          </Text>
        </View>
        <View style={styles.headActions}>
          <Text style={ui.status}>{tripStatusLabel(trip.status, language)}</Text>
          {canUpdate ? (
            <Pressable style={styles.editBtn} onPress={() => (isEditing ? resetDrafts() : setIsEditing(true))}>
              <Text style={styles.editBtnText}>{isEditing ? t("Cancel", "రద్దు") : t("Edit", "సవరించు")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.detailGrid}>
        <DetailItem label={t("Lorry", "లారీ")} value={lorryName} />
        <DetailItem label={t("Driver", "డ్రైవర్")} value={driverName} />
        <DetailItem label={t("Load Type", "లోడ్ రకం")} value={trip.load_type || "-"} />
        <DetailItem
          label={t("Contact", "సంప్రదింపు")}
          value={`${trip.contact_person_name || "-"} (${trip.contact_person_phone || "-"})`}
        />
        {isEditing ? (
          <>
            <View style={styles.dateFieldWrap}>
              <DateField
                label={t("Loading Date", "లోడ్ తేదీ")}
                value={loadingDateDraft}
                onChange={setLoadingDateDraft}
              />
            </View>
            <View style={styles.dateFieldWrap}>
              <DateField
                label={t("Unloading Date", "అన్‌లోడ్ తేదీ")}
                value={unloadingDateDraft}
                onChange={setUnloadingDateDraft}
              />
            </View>
          </>
        ) : (
          <>
            <DetailItem label={t("Loading Date", "లోడ్ తేదీ")} value={trip.loading_date || "-"} />
            <DetailItem label={t("Unloading Date", "అన్‌లోడ్ తేదీ")} value={trip.unloading_date || "-"} />
          </>
        )}
        <DetailItem
          label={t("Completed On", "పూర్తి అయిన తేదీ")}
          value={trip.completed_at ? new Date(trip.completed_at).toLocaleString("en-IN") : "-"}
        />
        {isDriver ? (
          <DetailItem
            label={t("My Earning", "నా సంపాదన")}
            value={formatCurrency(myEarning)}
            valueStyle={{ color: colors.success }}
          />
        ) : (
          <>
            <DetailItem label={t("Load Price", "లోడ్ ధర")} value={formatCurrency(trip.load_price)} />
            <DetailItem label={t("Total Expenses", "మొత్తం ఖర్చులు")} value={formatCurrency(trip.total_expenses)} />
            <DetailItem
              label={t("Net Profit", "నికర లాభం")}
              value={formatCurrency(trip.net_profit)}
              valueStyle={{ color: Number(trip.net_profit || 0) >= 0 ? colors.success : colors.danger }}
            />
          </>
        )}
      </View>

      {canUpdate && isEditing ? (
        <View style={styles.statusUpdate}>
          <Text style={ui.label}>{t("Trip Status", "ట్రిప్ స్థితి")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
            {TRIP_STATUSES.map((status) => {
              const active = statusDraft === status;
              return (
                <Pressable
                  key={status}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  onPress={() => setStatusDraft(status)}
                >
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                    {tripStatusLabel(status, language)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.expenseBreakdown}>
        <Text style={ui.screenTitle}>{isDriver ? t("My Earnings Breakdown", "నా సంపాదన వివరాలు") : t("Expense Breakdown", "ఖర్చుల విభజన")}</Text>
        <View style={styles.expenseGrid}>
          {visibleExpenseFields.map((field) => (
            <ExpenseStat
              key={field.key}
              label={t(field.en, field.te)}
              value={expenses?.[field.key]}
              editing={isEditing}
              draftValue={expenseDraft[field.key]}
              onChange={(value) => updateExpenseField(field.key, value)}
            />
          ))}
        </View>
      </View>

      {canUpdate && isEditing ? (
        <Pressable style={[styles.saveBtn, (!hasChanges || isSaving) && styles.saveBtnDisabled]} onPress={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{t("Save Updates", "మార్పులు సేవ్")}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.sm
  },
  headCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  headActions: {
    alignItems: "flex-end",
    gap: 6
  },
  editBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  editBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm
  },
  dateFieldWrap: {
    flexBasis: "100%",
    minWidth: 0
  },
  detailItem: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 2,
    minWidth: 0
  },
  detailLabel: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase"
  },
  detailValue: {
    fontSize: typography.sm,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 18
  },
  statusUpdate: {
    gap: space.sm,
    marginTop: 2,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignSelf: "stretch"
  },
  statusScroll: {
    gap: 6,
    paddingVertical: 2
  },
  statusChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  statusChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  statusChipText: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: colors.textSoft
  },
  statusChipTextActive: {
    color: "#fff"
  },
  editHint: {
    fontSize: typography.xs,
    lineHeight: 18,
    color: colors.muted
  },
  saveBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 34,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  saveBtnDisabled: {
    opacity: 0.5
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: typography.sm
  },
  expenseBreakdown: {
    gap: space.sm,
    marginTop: 2
  },
  expenseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm
  },
  expenseStat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
    gap: 2
  },
  expenseLabel: {
    fontSize: typography.xs,
    color: colors.muted,
    fontWeight: "600"
  },
  expenseValue: {
    fontSize: typography.sm,
    fontWeight: "800",
    color: colors.text
  },
  expenseInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: typography.sm,
    color: colors.text,
    minHeight: 34
  }
});
