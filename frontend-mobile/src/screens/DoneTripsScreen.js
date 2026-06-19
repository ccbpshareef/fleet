import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import TripDetailPanel from "../components/TripDetailPanel";
import { ui } from "../mobileUi";
import { getPeriodLabel } from "../utils/periodFilter";
import { tripStatusLabel } from "../utils/fleetLabels";

export default function DoneTripsScreen({
  trips,
  drivers,
  lorries = [],
  language = "en",
  expenseTotalsByTrip = {},
  periodFilter = "last_month",
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const doneTrips = useMemo(
    () => trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done"),
    [trips]
  );
  const driverNameById = useMemo(() => {
    const map = {};
    drivers.forEach((driver) => {
      map[driver.id] = driver.name;
    });
    return map;
  }, [drivers]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const selectedTrip = trips.find((item) => item.id === selectedTripId);
  const selectedExpense = selectedTripId ? expenseTotalsByTrip[selectedTripId] : null;

  return (
    <View style={ui.page}>
      <View style={ui.screenHead}>
        <Text style={ui.screenTitle}>{t("Done Trips", "పూర్తైన ట్రిప్స్")}</Text>
        <Text style={ui.screenBadge}>{doneTrips.length} · {getPeriodLabel(periodFilter, language)}</Text>
      </View>

      <View style={ui.card}>
        {doneTrips.length ? (
          doneTrips.map((trip) => (
            <Pressable
              key={trip.id}
              style={[ui.row, selectedTripId === trip.id && ui.rowActive]}
              onPress={() => setSelectedTripId(trip.id)}
            >
              <View style={ui.rowTop}>
                <Text style={ui.title}>#{trip.lorry_id} · {trip.load_location} → {trip.unload_location}</Text>
                <Text style={ui.status}>{tripStatusLabel(trip.status, language)}</Text>
              </View>
              <Text style={ui.meta}>
                {driverNameById[trip.driver_id] || "-"} · {trip.contact_person_phone || "-"}
              </Text>
              <Text style={ui.meta}>
                {trip.completed_at ? new Date(trip.completed_at).toLocaleDateString("en-IN") : "-"}
              </Text>
            </Pressable>
          ))
        ) : (
          <View style={ui.empty}>
            <Text style={ui.emptyTitle}>{t("No done trips in this period", "ఈ కాలంలో పూర్తైన ట్రిప్స్ లేవు")}</Text>
            <Text style={ui.emptyText}>{t("Try Last Month or change driver filter.", "గత నెల లేదా డ్రైవర్ ఫిల్టర్ మార్చండి.")}</Text>
          </View>
        )}
      </View>

      {selectedTrip ? (
        <TripDetailPanel
          trip={selectedTrip}
          expenses={selectedExpense}
          drivers={drivers}
          lorries={lorries}
          language={language}
          onUpdateTrip={onUpdateTripStatus}
        />
      ) : null}
    </View>
  );
}
