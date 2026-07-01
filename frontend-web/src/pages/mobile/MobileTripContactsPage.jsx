import { tripStatusClass, tripStatusLabel } from "../../utils/fleetLabels";
import { getPeriodLabel } from "../../utils/periodFilter";

export default function MobileTripContactsPage({ trips, drivers, language = "en", periodFilter = "complete" }) {
  const t = (en, te) => (language === "te" ? te : en);

  return (
    <div className="mu-page">
      <div className="mu-screen-head">
        <div>
          <h2 className="mu-screen-title">{t("Trip Contacts", "ట్రిప్ సంప్రదింపులు")}</h2>
          <p className="mu-section-sub">{t("Tap to call consignee contacts.", "సంప్రదింపులకు కాల్ చేయడానికి ట్యాప్ చేయండి.")}</p>
        </div>
        <span className="mu-screen-badge">
          {trips.length} · {getPeriodLabel(periodFilter, language)}
        </span>
      </div>

      <div className="mu-card">
        {trips.length ? (
          trips.map((trip) => {
            const phone = (trip.contact_person_phone || "").replace(/\s+/g, "");
            const driverName = drivers.find((d) => d.id === trip.driver_id)?.name || "-";
            return (
              <div className="mu-row mu-contact-row" key={trip.id}>
                <div className="mu-row-main">
                  <div className="mu-row-top">
                    <span className="mu-row-title">
                      {trip.load_location} → {trip.unload_location}
                    </span>
                    <span className={`mu-status-pill ${tripStatusClass(trip.status)}`}>
                      {tripStatusLabel(trip.status, language)}
                    </span>
                  </div>
                  <p className="mu-row-meta">
                    {t("Driver", "డ్రైవర్")}: {driverName}
                  </p>
                  <p className="mu-row-meta">{trip.contact_person_name || t("No name", "పేరు లేదు")}</p>
                </div>
                {phone ? (
                  <a className="mu-call-btn" href={`tel:${phone}`} aria-label={t("Call contact", "సంప్రదింపుకు కాల్")}>
                    📞
                  </a>
                ) : (
                  <span className="mu-call-btn disabled" aria-hidden="true">
                    —
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="mu-empty">
            <p className="mu-empty-title">{t("No contacts in this period", "ఈ కాలంలో సంప్రదింపులు లేవు")}</p>
            <p className="mu-empty-text">{t("Change period or driver filter.", "కాలం లేదా డ్రైవర్ ఫిల్టర్ మార్చండి.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
