export default function ProfitSummaryPage({ trips, language = "en" }) {
  const t = (en, te) => (language === "te" ? te : en);
  const trip = trips[0];
  if (!trip) return <section className="panel"><h2>{t("Profit Summary", "లాభం సారాంశం")}</h2><p className="muted">{t("No trip data yet.", "ఇంకా ట్రిప్ డేటా లేదు.")}</p></section>;

  const loadPrice = Number(trip.load_price || 0);
  const totalExpenses = Number(trip.total_expenses || 0);
  const net = loadPrice - totalExpenses;

  return (
    <section className="panel">
      <h2>{t("Profit Summary", "లాభం సారాంశం")}</h2>
      <div className="card">
        <Row label={t("Load Price", "లోడ్ ధర")} value={`Rs ${loadPrice.toFixed(2)}`} />
        <Row label={t("Total Expenses", "మొత్తం ఖర్చులు")} value={`Rs ${totalExpenses.toFixed(2)}`} />
        <Row label={t("Net Profit", "నికర లాభం")} value={`Rs ${net.toFixed(2)}`} className={net >= 0 ? "profit" : "loss"} />
      </div>
    </section>
  );
}

function Row({ label, value, className = "" }) {
  return (
    <div className="row-line">
      <span>{label}</span>
      <strong className={className}>{value}</strong>
    </div>
  );
}
