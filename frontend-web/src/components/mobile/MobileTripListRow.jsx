import { tripStatusClass, tripStatusLabel } from "../../utils/fleetLabels";

export default function MobileTripListRow({
  trip,
  language = "en",
  active = false,
  onClick,
  metaLines = []
}) {
  return (
    <button type="button" className={`mu-row mu-row-tappable ${active ? "active" : ""}`} onClick={onClick}>
      <div className="mu-row-main">
        <div className="mu-row-top">
          <span className="mu-row-title">
            {trip.load_location} → {trip.unload_location}
          </span>
          <span className={`mu-status-pill ${tripStatusClass(trip.status)}`}>
            {tripStatusLabel(trip.status, language)}
          </span>
        </div>
        {metaLines.map((line, index) => (
          <p className="mu-row-meta" key={index}>
            {line}
          </p>
        ))}
      </div>
      <span className="mu-row-chevron" aria-hidden="true" />
    </button>
  );
}
