export function Skeleton({ className = "", style = {} }) {
  return <div className={`ff-skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return (
    <div className="ff-dashboard ff-dashboard--loading">
      <div className="ff-kpi-row">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="ff-kpi-skeleton" />
        ))}
      </div>
      <div className="ff-dashboard-grid">
        <Skeleton className="ff-card-skeleton ff-card-skeleton--tall" />
        <div className="ff-dashboard-side">
          <Skeleton className="ff-card-skeleton" />
          <Skeleton className="ff-card-skeleton" />
          <Skeleton className="ff-card-skeleton" />
        </div>
      </div>
      <Skeleton className="ff-card-skeleton ff-card-skeleton--wide" />
    </div>
  );
}
