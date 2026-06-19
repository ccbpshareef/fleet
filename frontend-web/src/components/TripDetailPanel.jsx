import { useEffect, useState } from "react";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { EXPENSE_EDIT_FIELDS } from "../utils/tripExpenseEdit";
import { buildTripUpdatePayload, expenseDraftFromTotals, toDateInputValue } from "../utils/tripUpdate";

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function getStatusClass(status) {
  const map = {
    Loading: "status-loading",
    "On route": "status-route",
    Unloading: "status-unloading",
    Delivered: "status-delivered",
    "Trip Done": "status-done"
  };
  return map[status] || "status-neutral";
}

export default function TripDetailPanel({
  trip,
  expenses,
  drivers,
  lorries,
  language = "en",
  onUpdateTrip
}) {
  const t = (en, te) => (language === "te" ? te : en);
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

  const canUpdate = typeof onUpdateTrip === "function";
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

  async function handleSave() {
    if (!canUpdate || !hasChanges) return;
    try {
      setIsSaving(true);
      await onUpdateTrip(trip.id, updatePayload);
      setIsEditing(false);
    } catch (error) {
      alert(error.message || t("Failed to update trip", "ట్రిప్ అప్డేట్ విఫలమైంది"));
    } finally {
      setIsSaving(false);
    }
  }

  const lorryName = lorries.find((item) => item.id === trip.lorry_id)?.vehicle_number || trip.lorry_id;
  const driverName = drivers.find((item) => item.id === trip.driver_id)?.name || trip.driver_id;

  return (
    <div className="panel trip-detail-panel">
      <div className="section-head trip-detail-head">
        <div>
          <h3>{t("Complete Trip Details", "పూర్తి ట్రిప్ వివరాలు")}</h3>
          <p className="muted">
            {trip.load_location} → {trip.unload_location}
          </p>
        </div>
        <div className="trip-detail-head-actions">
          <span className={`status-pill ${getStatusClass(trip.status)}`}>{tripStatusLabel(trip.status, language)}</span>
          {canUpdate ? (
            <button type="button" className="ghost trip-edit-btn" onClick={() => (isEditing ? resetDrafts() : setIsEditing(true))}>
              {isEditing ? t("Cancel", "రద్దు") : t("Edit", "సవరించు")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="trip-detail-grid">
        <div className="detail-card">
          <span>{t("Lorry", "లారీ")}</span>
          <strong>{lorryName}</strong>
        </div>
        <div className="detail-card">
          <span>{t("Driver", "డ్రైవర్")}</span>
          <strong>{driverName}</strong>
        </div>
        <div className="detail-card">
          <span>{t("Load Type", "లోడ్ రకం")}</span>
          <strong>{trip.load_type || "-"}</strong>
        </div>
        <div className="detail-card">
          <span>{t("Contact", "సంప్రదింపు")}</span>
          <strong>
            {trip.contact_person_name || "-"} ({trip.contact_person_phone || "-"})
          </strong>
        </div>
        <div className="detail-card">
          <span>{t("Loading Date", "లోడ్ తేదీ")}</span>
          {isEditing ? (
            <input
              type="date"
              className="trip-date-input"
              value={loadingDateDraft}
              onChange={(e) => setLoadingDateDraft(e.target.value)}
            />
          ) : (
            <strong>{trip.loading_date || "-"}</strong>
          )}
        </div>
        <div className="detail-card">
          <span>{t("Unloading Date", "అన్‌లోడ్ తేదీ")}</span>
          {isEditing ? (
            <input
              type="date"
              className="trip-date-input"
              value={unloadingDateDraft}
              onChange={(e) => setUnloadingDateDraft(e.target.value)}
            />
          ) : (
            <strong>{trip.unloading_date || "-"}</strong>
          )}
        </div>
        <div className="detail-card">
          <span>{t("Completed On", "పూర్తి అయిన తేదీ")}</span>
          <strong>{trip.completed_at ? new Date(trip.completed_at).toLocaleString() : "-"}</strong>
        </div>
        <div className="detail-card">
          <span>{t("Load Price", "లోడ్ ధర")}</span>
          <strong>{formatCurrency(Number(trip.load_price || 0))}</strong>
        </div>
        <div className="detail-card">
          <span>{t("Total Expenses", "మొత్తం ఖర్చులు")}</span>
          <strong>{formatCurrency(Number(trip.total_expenses || 0))}</strong>
        </div>
        <div className="detail-card">
          <span>{t("Net Profit", "నికర లాభం")}</span>
          <strong className={Number(trip.net_profit || 0) >= 0 ? "profit" : "loss"}>
            {formatCurrency(Number(trip.net_profit || 0))}
          </strong>
        </div>
      </div>

      {canUpdate && isEditing ? (
        <div className="trip-edit-bar">
          <p className="trip-edit-label">{t("Trip Status", "ట్రిప్ స్థితి")}</p>
          <div className="trip-edit-status-row" role="tablist" aria-label={t("Trip Status", "ట్రిప్ స్థితి")}>
            {TRIP_STATUSES.map((status) => {
              const active = statusDraft === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`trip-status-chip ${active ? "active" : ""}`}
                  onClick={() => setStatusDraft(status)}
                >
                  {tripStatusLabel(status, language)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="expense-breakdown">
        <h4>{t("Expense Breakdown", "ఖర్చుల విభజన")}</h4>
        <div className="expense-grid">
          {EXPENSE_EDIT_FIELDS.map((field) => (
            <div className="expense-stat" key={field.key}>
              <span>{t(field.en, field.te)}</span>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="trip-expense-input"
                  value={expenseDraft[field.key]}
                  onChange={(e) => updateExpenseField(field.key, e.target.value)}
                  placeholder="0"
                />
              ) : (
                <strong>{formatCurrency(Number(expenses?.[field.key] || 0))}</strong>
              )}
            </div>
          ))}
        </div>
      </div>

      {canUpdate && isEditing ? (
        <button type="button" className="trip-save-btn" onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? t("Saving...", "సేవ్ అవుతోంది...") : t("Save Updates", "మార్పులు సేవ్")}
        </button>
      ) : null}
    </div>
  );
}
