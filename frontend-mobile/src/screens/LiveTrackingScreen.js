import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export default function LiveTrackingScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.pinIcon}>📌</Text>
        <Text style={styles.mapText}>Live Location Map</Text>
        <Text style={styles.mapSubText}>Real-time lorry location and route will appear here</Text>
      </View>

      <View style={styles.topOverlay}>
        <Text style={styles.overlayTitle}>Lorry AP16AB1234</Text>
        <Text style={styles.overlayMeta}>Driver: Ramesh</Text>
        <Text style={styles.overlayMeta}>Status: On Route</Text>
      </View>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Trip Details</Text>
        <Text style={styles.sheetMeta}>Hyderabad {"->"} Vijayawada</Text>
        <Text style={styles.sheetMeta}>ETA: 2h 10m</Text>
        <Pressable style={styles.callBtn}>
          <Text style={styles.callBtnText}>Quick Call Driver</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { minHeight: 420, borderRadius: 14, overflow: "hidden", backgroundColor: "#E2E8F0" },
  mapPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#DCEBFF" },
  pinIcon: { fontSize: 32, marginBottom: 4 },
  mapText: { fontSize: 17, fontWeight: "800", color: "#1E3A8A" },
  mapSubText: { fontSize: 12, color: "#334155" },
  topOverlay: { position: "absolute", top: 10, left: 10, right: 10, backgroundColor: "#FFFFFFEE", borderRadius: 11, padding: 9, gap: 2 },
  overlayTitle: { fontWeight: "800", color: colors.text, fontSize: 13 },
  overlayMeta: { color: "#475569", fontSize: 12 },
  bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 12, gap: 6 },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  sheetMeta: { color: "#475569", fontSize: 12 },
  callBtn: { backgroundColor: colors.primary, borderRadius: 11, paddingVertical: 7, alignItems: "center", marginTop: 2 },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 11.5 }
});
