import { useMemo, useState } from "react";
import { getPeriodLabel } from "../../utils/periodFilter";
import MobileTripDetailPanel from "../../components/mobile/MobileTripDetailPanel";
import MobileTripListRow from "../../components/mobile/MobileTripListRow";
import MobileTripSheet from "../../components/mobile/MobileTripSheet";

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
        <div>
          <h2 className="mu-screen-title">{t("Done Trips", "పూర్తైన ట్రిప్స్")}</h2>
          <p className="mu-section-sub">{t("Completed deliveries and trip history.", "పూర్తైన డెలివరీలు మరియు ట్రిప్ చరిత్ర.")}</p>
        </div>
        <span className="mu-screen-badge">
          {doneTrips.length} · {getPeriodLabel(periodFilter, language)}
        </span>
      </div>

      <div className="mu-card">
        {doneTrips.length ? (
          doneTrips.map((trip) => (
            <MobileTripListRow
              key={trip.id}
              trip={trip}
              language={language}
              active={selectedTripId === trip.id}
              onClick={() => setSelectedTripId(trip.id)}
              metaLines={[
                `${driverNameById[trip.driver_id] || "-"} · ${trip.contact_person_phone || "-"}`,
                trip.completed_at ? new Date(trip.completed_at).toLocaleDateString("en-IN") : "-"
              ]}
            />
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

      <MobileTripSheet open={Boolean(selectedTrip)} onClose={() => setSelectedTripId(null)} language={language}>
        {selectedTrip ? (
          <MobileTripDetailPanel
            trip={selectedTrip}
            expenses={selectedExpense}
            drivers={drivers}
            lorries={lorries}
            language={language}
            userRole={userRole}
            onUpdateTrip={onUpdateTrip}
            inSheet
          />
        ) : null}
      </MobileTripSheet>
    </div>
  );
}
