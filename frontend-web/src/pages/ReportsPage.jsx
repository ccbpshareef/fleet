import { getPeriodLabel } from "../utils/periodFilter";

export default function ReportsPage({ dashboard, trips, language = "en", periodFilter = "complete" }) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);

  return (
    <section className="panel reports-shell">
      <div className="reports-head">
        <div>
          <h2>{t("Reports", "\u0c30\u0c3f\u0c2a\u0c4b\u0c30\u0c4d\u0c1f\u0c4d\u0c38\u0c4d")}</h2>
          <p className="muted reports-subtitle">
            {periodLabel} · {trips.length} {t("trips", "ట్రిప్స్")}
          </p>
          <p className="muted reports-subtitle">
            {t(
              "A lighter summary of your business numbers and profit trends.",
              "\u0c35\u0c4d\u0c2f\u0c3e\u0c2a\u0c3e\u0c30 \u0c05\u0c02\u0c15\u0c46\u0c32\u0c41, \u0c32\u0c3e\u0c2d \u0c27\u0c4b\u0c30\u0c23\u0c41\u0c32 \u0c24\u0c4d\u0c35\u0c30\u0c3f\u0c24 \u0c38\u0c3e\u0c30\u0c3e\u0c02\u0c36\u0c02."
            )}
          </p>
        </div>
      </div>

      <div className="cards-row reports-cards">
        <Card
          tone="blue"
          title={t("Total Trips", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c1f\u0c4d\u0c30\u0c3f\u0c2a\u0c4d\u0c38\u0c4d")}
          value={trips.length}
        />
        <Card
          tone="teal"
          title={t("Total Income", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c06\u0c26\u0c3e\u0c2f\u0c02")}
          value={`Rs ${(dashboard?.total_income || 0).toFixed(2)}`}
        />
        <Card
          tone="amber"
          title={t("Total Expenses", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c16\u0c30\u0c4d\u0c1a\u0c41\u0c32\u0c41")}
          value={`Rs ${(dashboard?.total_expenses || 0).toFixed(2)}`}
        />
        <Card
          tone="profit"
          title={t("Total Profit", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c32\u0c3e\u0c2d\u0c02")}
          value={`Rs ${(dashboard?.total_profit || 0).toFixed(2)}`}
        />
      </div>

      <div className="charts reports-charts">
        <div className="chart-card">
          <div className="chart-head">
            <h4>{t("Profit Trend", "\u0c32\u0c3e\u0c2d \u0c27\u0c4b\u0c30\u0c23\u0c3f")}</h4>
            <span className="chart-tag">{t("This period", "\u0c08 \u0c15\u0c3e\u0c32\u0c02")}</span>
          </div>
          <div className="bars">
            {[20, 45, 30, 60, 40].map((height, index) => (
              <span key={index} style={{ height: `${height}px` }} />
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <h4>{t("Expense Mix", "\u0c16\u0c30\u0c4d\u0c1a\u0c41\u0c32 \u0c2e\u0c3f\u0c15\u0c4d\u0c38\u0c4d")}</h4>
            <span className="chart-tag">{t("Overview", "\u0c05\u0c35\u0c32\u0c4b\u0c15\u0c28\u0c02")}</span>
          </div>
          <div className="pie" />
        </div>
      </div>
    </section>
  );
}

function Card({ title, value, tone = "blue" }) {
  return (
    <div className={`card report-card card-${tone}`}>
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}
