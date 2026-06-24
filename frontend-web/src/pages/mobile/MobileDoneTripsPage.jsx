import { useMemo, useState } from "react";
import { tripStatusLabel } from "../../utils/fleetLabels";
import { getPeriodLabel } from "../../utils/periodFilter";
import MobileTripDetailPanel from "../../components/mobile/MobileTripDetailPanel";

export default function MobileDoneTripsPage({
  trips,
  drivers,
  lorries = [],
  language = "en",
  expenseTotalsByTrip = {},
  periodFilter = "complete",
  userRole = "user",
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
    <div className="mu-page">
      <div className="mu-screen-head">
        <h2 className="mu-screen-title">{t("Done Trips", "పూర్తైన ట్రిప్స్")}</h2>
        <span className="mu-screen-badge">
          {doneTrips.length} · {getPeriodLabel(periodFilter, language)}
        </span>
      </div>

      <div className="mu-card">
        {doneTrips.length ? (
          doneTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              className={`mu-row ${selectedTripId === trip.id ? "active" : ""}`}
              onClick={() => setSelectedTripId(trip.id)}
            >
              <div className="mu-row-top">
                <span className="mu-row-title">
                  #{trip.lorry_id} · {trip.load_location} → {trip.unload_location}
                </span>
                <span className="mu-status-pill">{tripStatusLabel(trip.status, language)}</span>
              </div>
              <p className="mu-row-meta">
                {driverNameById[trip.driver_id] || "-"} · {trip.contact_person_phone || "-"}
              </p>
              <p className="mu-row-meta">
                {trip.completed_at ? new Date(trip.completed_at).toLocaleDateString("en-IN") : "-"}
              </p>
            </button>
          ))
        ) : (
          <div className="mu-empty">
            <p className="mu-empty-title">{t("No done trips in this period", "ఈ కాలంలో పూర్తైన ట్రిప్స్ లేవు")}</p>
            <p className="mu-empty-text">
              {t("Try Complete Period or change driver filter.", "పూర్తి కాలం లేదా డ్రైవర్ ఫిల్టర్ మార్చండి.")}
            </p>
          </div>
        )}
      </div>

      {selectedTrip ? (
        <MobileTripDetailPanel
          trip={selectedTrip}
          expenses={selectedExpense}
          drivers={drivers}
          lorries={lorries}
          language={language}
          userRole={userRole}
          onUpdateTrip={onUpdateTrip}
        />
      ) : null}
    </div>
  );
}
