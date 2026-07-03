const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#94a3b8", "#8b5cf6"];

export default function DonutChart({ segments = [], size = 120, centerLabel = "trips" }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="ff-donut-wrap">
    <div className="ff-donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="ff-donut-svg" aria-hidden="true">
        <circle className="ff-donut-track" cx="18" cy="18" r={radius} />
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={segment.label}
              className="ff-donut-segment"
              cx="18"
              cy="18"
              r={radius}
              stroke={COLORS[index % COLORS.length]}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="ff-donut-center">
        <strong>{total}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
    <div className="ff-legend">
      {segments.map((segment, index) => (
        <div className="ff-legend-item" key={segment.label}>
          <span>
            <span className="ff-legend-dot" style={{ background: COLORS[index % COLORS.length] }} />
            {segment.label}
          </span>
          <strong>{segment.value}</strong>
        </div>
      ))}
    </div>
  </div>
  );
}
