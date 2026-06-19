import { Text, View } from "react-native";
import { ui } from "../mobileUi";
import { getPeriodLabel } from "../utils/periodFilter";
import { tripStatusLabel } from "../utils/fleetLabels";

export default function TripContactsScreen({ trips, drivers, language = "en", periodFilter = "last_month" }) {
  const t = (en, te) => (language === "te" ? te : en);

  return (
    <View style={ui.page}>
      <View style={ui.screenHead}>
        <Text style={ui.screenTitle}>{t("Trip Contacts", "ట్రిప్ సంప్రదింపులు")}</Text>
        <Text style={ui.screenBadge}>{trips.length} · {getPeriodLabel(periodFilter, language)}</Text>
      </View>

      <View style={ui.card}>
        {trips.length ? (
          trips.map((trip) => (
            <View style={ui.row} key={trip.id}>
              <View style={ui.rowTop}>
                <Text style={ui.title} numberOfLines={1}>
                  {trip.load_location} → {trip.unload_location}
                </Text>
                <Text style={ui.status}>{tripStatusLabel(trip.status, language)}</Text>
              </View>
              <Text style={ui.meta}>
                {t("Driver", "డ్రైవర్")}: {drivers.find((d) => d.id === trip.driver_id)?.name || "-"}
              </Text>
              <Text style={ui.meta}>
                {trip.contact_person_name || "-"} · {trip.contact_person_phone || "-"}
              </Text>
            </View>
          ))
        ) : (
          <View style={ui.empty}>
            <Text style={ui.emptyTitle}>{t("No contacts in this period", "ఈ కాలంలో సంప్రదింపులు లేవు")}</Text>
            <Text style={ui.emptyText}>{t("Change period or driver filter.", "కాలం లేదా డ్రైవర్ ఫిల్టర్ మార్చండి.")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
