import { useState } from "react";
import TripDetailPanel from "../components/TripDetailPanel";
import { getPeriodLabel } from "../utils/periodFilter";

export default function DoneTripsPage({
  trips,
  drivers,
  lorries,
  language = "en",
  expenseTotalsByTrip = {},
  periodFilter = "complete",
  userRole = "user",
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const doneTrips = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const selectedTrip = trips.find((item) => item.id === selectedTripId) || null;
  const selectedExpense = selectedTripId ? expenseTotalsByTrip[selectedTripId] : null;

  return (
    <section className="panel">
      <div className="section-head">
        <h2>{t("Done Trips", "పూర్తైన ట్రిప్స్")}</h2>
        <span className="status-pill status-neutral">
          {doneTrips.length} · {periodLabel}
        </span>
      </div>
      <div className="cards-list">
        {doneTrips.map((trip) => (
          <button className="mini-card as-btn" key={trip.id} onClick={() => setSelectedTripId(trip.id)}>
            <h4>{lorries.find((l) => l.id === trip.lorry_id)?.vehicle_number || `${t("Lorry", "లారీ")} #${trip.lorry_id}`}</h4>
            <p>
              {t("Driver", "డ్రైవర్")}: {drivers.find((d) => d.id === trip.driver_id)?.name || "N/A"}
            </p>
            <p>
              {t("Contact", "సంప్రదింపు")}: {trip.contact_person_name || "-"} ({trip.contact_person_phone || "-"})
            </p>
            <p>
              {t("Loading", "లోడింగ్")}: {trip.load_location}
            </p>
            <p>
              {t("Unloading", "అన్‌లోడింగ్")}: {trip.unload_location}
            </p>
            <p>
              {t("Completed On", "పూర్తి అయిన తేదీ")}: {trip.completed_at ? new Date(trip.completed_at).toLocaleString() : "-"}
            </p>
          </button>
        ))}
        {!doneTrips.length && <p className="muted">{t("No done trips yet.", "ఇంకా పూర్తైన ట్రిప్స్ లేవు.")}</p>}
      </div>
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
