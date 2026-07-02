import { useEffect, useState } from "react";
import { useToast } from "../ToastProvider";
import { TRIP_STATUSES, tripStatusLabel } from "../../utils/fleetLabels";
import { expenseFieldsForRole } from "../../utils/tripExpenseEdit";
import { buildTripUpdatePayload, expenseDraftFromTotals, toDateInputValue } from "../../utils/tripUpdate";
import { tripDriverEarning } from "../../utils/driverEarnings";

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

export default function MobileTripDetailPanel({
  trip,
  expenses,
  drivers = [],
  lorries = [],
  language = "en",
  userRole = "user",
  onUpdateTrip,
  allowTripUpdate = true,
  inSheet = false
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const showToast = useToast();
  const isDriver = userRole === "driver";
  const visibleExpenseFields = expenseFieldsForRole(userRole);
  const myEarning = tripDriverEarning(expenses);
  const [isEditing, setIsEditing] = useState(false);
  const [statusDraft, setStatusDraft] = useState(trip?.status || "Loading");
  const [loadingDateDraft, setLoadingDateDraft] = useState("");
  const [unloadingDateDraft, setUnloadingDateDraft] = useState("");
  const [expenseDraft, setExpenseDraft] = useState(() => expenseDraftFromTotals(expenses));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trip) {
      setStatusDraft(trip.status || "Loading");
      setLoadingDateDraft(toDateInputValue(trip.loading_date));
      setUnloadingDateDraft(toDateInputValue(trip.unloading_date));
      setExpenseDraft(expenseDraftFromTotals(expenses));
      setIsEditing(false);
    }
  }, [trip?.id, trip?.status, trip?.loading_date, trip?.unloading_date, expenses]);

  if (!trip) return null;

  const lorryName = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || `#${trip.lorry_id}`;
  const driverName = drivers.find((item) => item.id === trip.driver_id)?.name || "-";
  const canUpdate = allowTripUpdate && typeof onUpdateTrip === "function";
  const updatePayload = buildTripUpdatePayload(trip, {
    status: statusDraft,
    loadingDate: loadingDateDraft,
    unloadingDate: unloadingDateDraft,
    expenseDraft: isEditing ? expenseDraft : null,
    expenses
  });
  const hasChanges = Object.keys(updatePayload).length > 0;

  function resetDrafts() {
    setStatusDraft(trip.status || "Loading");
    setLoadingDateDraft(toDateInputValue(trip.loading_date));
    setUnloadingDateDraft(toDateInputValue(trip.unloading_date));
    setExpenseDraft(expenseDraftFromTotals(expenses));
    setIsEditing(false);
  }

  function updateExpenseField(key, value) {
    setExpenseDraft((prev) => ({ ...prev, [key]: value }));
  }

  function preventScrollNumberChange(event) {
    event.currentTarget.blur();
  }

  async function handleSave() {
    if (!canUpdate || !hasChanges) return;
    try {
      setIsSaving(true);
      await onUpdateTrip(trip.id, updatePayload);
      setIsEditing(false);
    } catch (error) {
      showToast(error.message || t("Failed to update trip", "ట్రిప్ అప్డేట్ విఫలమైంది"), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={inSheet ? "mu-trip-detail mu-trip-detail-sheet" : "mu-card mu-trip-detail"}>
      <div className="mu-trip-detail-head">
        <div className="mu-trip-detail-copy">
          <h3 className="mu-screen-title">{isDriver ? t("My Trip Details", "నా ట్రిప్ వివరాలు") : t("Complete Trip Details", "పూర్తి ట్రిప్ వివరాలు")}</h3>
          <p className="mu-row-meta">
            {trip.load_location} → {trip.unload_location}
          </p>
        </div>
        <div className="mu-trip-detail-actions">
          <span className="mu-status-pill">{tripStatusLabel(trip.status, language)}</span>
          {canUpdate ? (
            <button type="button" className="mu-trip-edit-btn" onClick={() => (isEditing ? resetDrafts() : setIsEditing(true))}>
              {isEditing ? t("Cancel", "రద్దు") : t("Edit", "సవరించు")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mu-detail-grid">
        <div className="mu-detail-item">
          <span>{t("Lorry", "లారీ")}</span>
          <strong>{lorryName}</strong>
        </div>
        <div className="mu-detail-item">
          <span>{t("Driver", "డ్రైవర్")}</span>
          <strong>{driverName}</strong>
        </div>
        <div className="mu-detail-item">
          <span>{t("Load Type", "లోడ్ రకం")}</span>
          <strong>{trip.load_type || "-"}</strong>
        </div>
        <div className="mu-detail-item">
          <span>{t("Contact", "సంప్రదింపు")}</span>
          <strong>
            {trip.contact_person_name || "-"} ({trip.contact_person_phone || "-"})
          </strong>
        </div>
        <div className="mu-detail-item">
          <span>{t("Loading Date", "లోడ్ తేదీ")}</span>
          {isEditing ? (
            <input type="date" className="mu-trip-date-input" value={loadingDateDraft} onChange={(e) => setLoadingDateDraft(e.target.value)} />
          ) : (
            <strong>{trip.loading_date || "-"}</strong>
          )}
        </div>
        <div className="mu-detail-item">
          <span>{t("Unloading Date", "అన్‌లోడ్ తేదీ")}</span>
          {isEditing ? (
            <input type="date" className="mu-trip-date-input" value={unloadingDateDraft} onChange={(e) => setUnloadingDateDraft(e.target.value)} />
          ) : (
            <strong>{trip.unloading_date || "-"}</strong>
          )}
        </div>
        <div className="mu-detail-item">
          <span>{t("Completed On", "పూర్తి అయిన తేదీ")}</span>
          <strong>{trip.completed_at ? new Date(trip.completed_at).toLocaleString("en-IN") : "-"}</strong>
        </div>
        {isDriver ? (
          <div className="mu-detail-item">
            <span>{t("My Earning", "నా సంపాదన")}</span>
            <strong className="profit">{formatCurrency(myEarning)}</strong>
          </div>
        ) : (
          <>
            <div className="mu-detail-item">
              <span>{t("Load Price", "లోడ్ ధర")}</span>
              <strong>{formatCurrency(trip.load_price)}</strong>
            </div>
            <div className="mu-detail-item">
              <span>{t("Total Expenses", "మొత్తం ఖర్చులు")}</span>
              <strong>{formatCurrency(trip.total_expenses)}</strong>
            </div>
            <div className="mu-detail-item">
              <span>{t("Net Profit", "నికర లాభం")}</span>
              <strong className={Number(trip.net_profit || 0) >= 0 ? "profit" : "loss"}>{formatCurrency(trip.net_profit)}</strong>
            </div>
            <p className="mu-row-meta mu-profit-hint">
              {t(
                "Driver wage and commission are trip expenses, so they reduce net profit.",
                "డ్రైవర్ వేతనం మరియు కమిషన్ ట్రిప్ ఖర్చులు — అవి నికర లాభాన్ని తగ్గిస్తాయి."
              )}
            </p>
          </>
        )}
      </div>

      {canUpdate && isEditing ? (
        <div className="mu-status-update">
          <p className="mu-filter-caption">{t("Trip Status", "ట్రిప్ స్థితి")}</p>
          <div className="m-filter-scroll" role="tablist" aria-label={t("Trip Status", "ట్రిప్ స్థితి")}>
            {TRIP_STATUSES.map((status) => {
              const active = statusDraft === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`m-filter-chip ${active ? "active primary" : ""}`}
                  onClick={() => setStatusDraft(status)}
                >
                  {tripStatusLabel(status, language)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mu-expense-breakdown">
        <h4 className="mu-expense-title">{isDriver ? t("My Earnings Breakdown", "నా సంపాదన వివరాలు") : t("Expense Breakdown", "ఖర్చుల విభజన")}</h4>
        <div className="mu-expense-grid">
          {visibleExpenseFields.map((field) => (
            <div className="mu-expense-stat" key={field.key}>
              <span>{t(field.en, field.te)}</span>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mu-expense-input"
                  value={expenseDraft[field.key]}
                  onChange={(e) => updateExpenseField(field.key, e.target.value)}
                  onWheel={preventScrollNumberChange}
                  placeholder="0"
                />
              ) : (
                <strong>₹{Number(expenses?.[field.key] || 0).toFixed(0)}</strong>
              )}
            </div>
          ))}
        </div>
      </div>

      {canUpdate && isEditing ? (
        <button type="button" className="mu-trip-save-btn" onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? t("Saving...", "సేవ్ అవుతోంది...") : t("Save Updates", "మార్పులు సేవ్")}
        </button>
      ) : null}
    </div>
  );
}
