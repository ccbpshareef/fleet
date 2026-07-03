import StatusChip from "../fleetflow/StatusChip";

export default function MobileTripListRow({
  trip,
  language = "en",
  active = false,
  onClick,
  metaLines = []
}) {
  return (
    <button type="button" className={`mu-row mu-row-tappable ff-trip-row ${active ? "active" : ""}`} onClick={onClick}>
      <div className="mu-row-main">
        <div className="mu-row-top">
          <span className="mu-row-title">
            {trip.load_location} → {trip.unload_location}
          </span>
          <StatusChip status={trip.status} language={language} live={trip.status === "On route"} />
        </div>
        {metaLines.map((line, index) => (
          <p className="mu-row-meta" key={index}>
            {line}
          </p>
        ))}
      </div>
      <span className="mu-row-chevron" aria-hidden="true">›</span>
    </button>
  );
}
