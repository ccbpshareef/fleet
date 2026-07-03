import { tripStatusLabel } from "../../utils/fleetLabels";

const STATUS_CLASS = {
  Loading: "loading",
  "On route": "route",
  Unloading: "unloading",
  Delivered: "delivered",
  "Trip Done": "done"
};

export default function StatusChip({ status, language = "en", live = false, className = "" }) {
  const slug = STATUS_CLASS[status] || "neutral";
  return (
    <span className={`ff-status-chip ff-status-chip--${slug} ${className}`.trim()}>
      {live ? <span className="ff-status-live-dot" aria-hidden="true" /> : null}
      {tripStatusLabel(status, language)}
    </span>
  );
}
