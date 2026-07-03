import { useMemo, useState } from "react";
import TripDetailPanel from "../components/TripDetailPanel";
import StatusChip from "../components/fleetflow/StatusChip";
import { getPeriodLabel } from "../utils/periodFilter";

export default function DoneTripsPage({
  trips,
  drivers,
  lorries,
  language = "en",
  expenseTotalsByTrip = {},
  periodFilter = "complete",
  userRole = "user",
  onUpdateTrip,
  searchQuery = ""
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const doneTrips = useMemo(() => {
    const list = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
    const needle = String(searchQuery || "").trim().toLowerCase();
    if (!needle) return list;
    return list.filter((trip) => {
      const driverName = drivers.find((d) => d.id === trip.driver_id)?.name || "";
      const lorryNumber = lorries.find((l) => l.id === trip.lorry_id)?.vehicle_number || "";
      const haystack = [trip.load_location, trip.unload_location, driverName, lorryNumber, trip.contact_person_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [trips, searchQuery, drivers, lorries]);

  const [selectedTripId, setSelectedTripId] = useState(null);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const selectedTrip = trips.find((item) => item.id === selectedTripId) || null;
  const selectedExpense = selectedTripId ? expenseTotalsByTrip[selectedTripId] : null;

  return (
    <section className="ff-page panel">
      <div className="ff-page-header section-head">
        <div>
          <h2>{t("Done Trips", "పూర్తైన ట్రిప్స్")}</h2>
          <p>{t("Completed deliveries and trip history for the selected period.", "ఎంచుకున్న కాలానికి పూర్తైన డెలివరీలు మరియు ట్రిప్ చరిత్ర.")}</p>
        </div>
        <StatusChip status="Trip Done" language={language} />
      </div>

      {doneTrips.length ? (
        <div className="ff-table-wrap">
          <table className="ff-table">
            <thead>
              <tr>
                <th>{t("Lorry", "లారీ")}</th>
                <th>{t("Driver", "డ్రైవర్")}</th>
                <th>{t("Route", "రూట్")}</th>
                <th>{t("Contact", "సంప్రదింపు")}</th>
                <th>{t("Completed", "పూర్తి")}</th>
                <th>{t("Status", "స్థితి")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {doneTrips.map((trip) => (
                <tr key={trip.id} className={selectedTripId === trip.id ? "ff-table-row--active" : ""}>
                  <td>{lorries.find((l) => l.id === trip.lorry_id)?.vehicle_number || `#${trip.lorry_id}`}</td>
                  <td>{drivers.find((d) => d.id === trip.driver_id)?.name || "N/A"}</td>
                  <td>{trip.load_location} → {trip.unload_location}</td>
                  <td>{trip.contact_person_name || "-"}</td>
                  <td>{trip.completed_at ? new Date(trip.completed_at).toLocaleDateString("en-IN") : "-"}</td>
                  <td><StatusChip status={trip.status} language={language} /></td>
                  <td>
                    <button type="button" className="ff-btn" onClick={() => setSelectedTripId(trip.id)}>
                      {t("View", "చూడండి")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-empty">
          <h4>{t("No done trips yet", "ఇంకా పూర్తైన ట్రిప్స్ లేవు")}</h4>
          <p className="muted">{periodLabel} · {t("Try another period or clear search.", "వేరే కాలం లేదా శోధన తొలగించండి.")}</p>
        </div>
      )}

      {selectedTrip ? (
        <TripDetailPanel
          trip={selectedTrip}
          expenses={selectedExpense}
          drivers={drivers}
          lorries={lorries}
          language={language}
          userRole={userRole}
          onUpdateTrip={onUpdateTrip}
        />
      ) : null}
    </section>
  );
}
