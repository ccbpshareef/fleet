import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme";

export default function ExpenseEntryScreen({ form, setForm, trips, onSave }) {
  const total =
    Number(form.diesel || 0) +
    Number(form.toll || 0) +
    Number(form.driver_bata || 0) +
    Number(form.maintenance || 0) +
    Number(form.other || 0);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Expense Entry</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Select Trip</Text>
        <View style={styles.rowWrap}>
          {trips.map((trip) => (
            <Pressable key={trip.id} style={[styles.chip, form.trip_id === String(trip.id) && styles.chipActive]} onPress={() => setForm({ ...form, trip_id: String(trip.id) })}>
              <Text style={[styles.chipText, form.trip_id === String(trip.id) && styles.chipTextActive]}>Trip #{trip.id}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Diesel Cost" keyboardType="numeric" value={form.diesel} onChangeText={(v) => setForm({ ...form, diesel: v })} />
        <TextInput style={styles.input} placeholder="Toll Charges" keyboardType="numeric" value={form.toll} onChangeText={(v) => setForm({ ...form, toll: v })} />
        <TextInput style={styles.input} placeholder="Driver Bata" keyboardType="numeric" value={form.driver_bata} onChangeText={(v) => setForm({ ...form, driver_bata: v })} />
        <TextInput style={styles.input} placeholder="Maintenance" keyboardType="numeric" value={form.maintenance} onChangeText={(v) => setForm({ ...form, maintenance: v })} />
        <TextInput style={styles.input} placeholder="Other Expenses" keyboardType="numeric" value={form.other} onChangeText={(v) => setForm({ ...form, other: v })} />
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalValue}>Rs {total.toFixed(0)}</Text>
        </View>
        <Pressable style={styles.primaryBtn} onPress={onSave}>
          <Text style={styles.primaryBtnText}>Save Expense</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  card: { backgroundColor: "#fff", borderRadius: 13, padding: 12, gap: 8, elevation: 2 },
  label: { color: colors.muted, fontSize: 12 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primaryDark, fontSize: 10.5, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: "#F9FAFB", padding: 11, fontSize: 13 },
  totalBox: { backgroundColor: colors.primarySoft, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, padding: 11, flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: colors.primaryDark, fontWeight: "700" },
  totalValue: { color: colors.primary, fontWeight: "800", fontSize: 16 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 11, paddingVertical: 8, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 }
});
