import { useEffect, useRef, useState } from "react";
import { TRIP_STATUSES, tripStatusLabel } from "../utils/fleetLabels";
import { commissionRuleText } from "../utils/commission";
import { moneyInputValue, roundMoney, tripCalendarDays } from "../utils/money";

function formatStorageDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDisplayInput(text) {
  const cleaned = (text || "").trim();
  if (!cleaned) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const match = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return formatStorageDate(date);
}

function DatePickerField({ label, value, onChange, placeholder = "dd-mm-yyyy" }) {
  const [text, setText] = useState(() => (value ? formatDisplayDate(value) : ""));
  const dateInputRef = useRef(null);

  useEffect(() => {
    setText(value ? formatDisplayDate(value) : "");
  }, [value]);

  function openCalendar() {
    const node = dateInputRef.current;
    if (!node) return;
    try {
      if (typeof node.showPicker === "function") {
        node.showPicker();
        return;
      }
    } catch (_error) {
      // ignore
    }
    node.click();
  }

  function handleBlur() {
    const parsed = parseDisplayInput(text);
    if (parsed !== null) {
      onChange(parsed);
      setText(parsed ? formatDisplayDate(parsed) : "");
    } else {
      setText(value ? formatDisplayDate(value) : "");
    }
  }

  return (
    <div className="field-stack date-picker-field">
      <label className="date-picker-label" htmlFor={`date-text-${label.replace(/\s/g, "-")}`}>
        {label}
      </label>
      <div className="date-picker-row">
        <input
          id={`date-text-${label.replace(/\s/g, "-")}`}
          type="text"
          className="date-picker-text-input"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            const parsed = parseDisplayInput(next);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={handleBlur}
          aria-label={label}
        />
        <button type="button" className="date-picker-icon-btn" onClick={openCalendar} aria-label={`${label} calendar`}>
          <span aria-hidden>📅</span>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="date-picker-hidden-input"
          value={value || ""}
          onChange={(event) => {
            const iso = event.target.value || "";
            onChange(iso);
            setText(iso ? formatDisplayDate(iso) : "");
          }}
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  );
}

const expenseCategories = [
  { key: "diesel", amountField: "diesel", label: "Diesel", labelTe: "డీజిల్", icon: "⛽" },
  { key: "toll", amountField: "toll", label: "Toll", labelTe: "టోల్", icon: "🛣" },
  { key: "puncture", amountField: "puncture", label: "Puncture", labelTe: "పంచర్", icon: "🛞" },
  { key: "repair", amountField: "repair", label: "Repair", labelTe: "రిపేర్", icon: "🛠" },
  { key: "other", amountField: "other_expense", label: "Other", labelTe: "ఇతర", icon: "🧾" }
];

export default function CreateTripPage({ form, setForm, lorries, drivers, onSubmit, language = "en", lockedDriverId = null }) {
  const [activeExpenseKey, setActiveExpenseKey] = useState(expenseCategories[0].key);
  const [previewImage, setPreviewImage] = useState(null);
  const t = (en, te) => (language === "te" ? te : en);
  const workingDays = tripCalendarDays(form.loading_date, form.unloading_date);
  const totalExpenses =
    Number(form.diesel || 0) +
    Number(form.toll || 0) +
    Number(form.driver_bata || 0) +
    Number(form.driver_daily_wage || 0) +
    Number(form.driver_commission_amount || 0) +
    Number(form.puncture || 0) +
    Number(form.repair || 0) +
    Number(form.other_expense || 0);
  const tripProfit = Number(form.load_price || 0) - totalExpenses;

  const proofImages = form.proof_images || [];
  const activeExpense = expenseCategories.find((item) => item.key === activeExpenseKey) || expenseCategories[0];

  const getProofs = (category) => proofImages.filter((item) => item.category === category);

  function updateField(field, value) {
    const nextForm = { ...form, [field]: value };
    if (field === "load_price" || field === "driver_commission_percent") {
      // Commission is calculated on the backend when stint transport reaches ₹1,20,000.
      nextForm.driver_commission_amount = "0";
    }
    if (
      field === "driver_daily_rate" ||
      ((field === "loading_date" || field === "unloading_date") && nextForm.driver_daily_rate)
    ) {
      const dailyRate = roundMoney(field === "driver_daily_rate" ? value : nextForm.driver_daily_rate || 0);
      const days = tripCalendarDays(
        field === "loading_date" ? value : nextForm.loading_date,
        field === "unloading_date" ? value : nextForm.unloading_date
      );
      nextForm.driver_daily_wage = moneyInputValue(roundMoney(dailyRate * days));
    }
    setForm(nextForm);
  }

  function preventScrollNumberChange(event) {
    event.currentTarget.blur();
  }

  function removeProofImage(imageId) {
    setForm({
      ...form,
      proof_images: proofImages.filter((item) => item.id !== imageId)
    });
  }

  function handleProofUpload(category, event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => {
          const existing = prev.proof_images || [];
          return {
            ...prev,
            proof_images: [
              ...existing,
              {
                id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                category,
                name: file.name,
                data_url: String(reader.result || "")
              }
            ]
          };
        });
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  }

  return (
    <section className="panel create-trip-shell">
      <div className="create-trip-head">
        <div>
          <h2>{t("Create Trip + Expense", "ట్రిప్ + ఖర్చు నమోదు")}</h2>
          <p className="muted">
            {t(
              "Create the trip, add expenses, and attach image files for each expense type.",
              "ట్రిప్ సృష్టించండి, ఖర్చులు నమోదు చేయండి, ప్రతి ఖర్చు రకానికి చిత్రాలు జతచేయండి."
            )}
          </p>
        </div>
        <div className="total-box compact-total-box">
          {t("Total Expenses", "మొత్తం ఖర్చులు")}: Rs {totalExpenses.toFixed(2)}
        </div>
        <div className="total-box compact-total-box">
          {t("Trip Profit", "ట్రిప్ లాభం")}: Rs {tripProfit.toFixed(2)}
        </div>
      </div>

      <form className="form-grid create-trip-grid compact-create-trip-grid" onSubmit={onSubmit}>
        <h3 className="create-trip-full create-trip-section-title">{t("Trip Details", "ట్రిప్ వివరాలు")}</h3>
        <div className="field-stack">
          <label>{t("Select Lorry", "లారీ ఎంచుకోండి")}</label>
          <select value={form.lorry_id} onChange={(e) => updateField("lorry_id", e.target.value)} required>
            <option value="">{t("Select Lorry", "లారీ ఎంచుకోండి")}</option>
            {lorries.map((lorry) => <option key={lorry.id} value={lorry.id}>{lorry.vehicle_number}</option>)}
          </select>
        </div>

        {lockedDriverId ? (
          <div className="field-stack">
            <label>{t("Driver", "డ్రైవర్")}</label>
            <input value={drivers.find((d) => String(d.id) === String(lockedDriverId))?.name || `#${lockedDriverId}`} readOnly />
          </div>
        ) : (
          <div className="field-stack">
            <label>{t("Select Driver", "డ్రైవర్ ఎంచుకోండి")}</label>
            <select value={form.driver_id} onChange={(e) => updateField("driver_id", e.target.value)} required>
              <option value="">{t("Select Driver", "డ్రైవర్ ఎంచుకోండి")}</option>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
            </select>
          </div>
        )}

        <div className="field-stack">
          <label>{t("Load Location", "లోడ్ స్థలం")}</label>
          <div className="location-input-row">
            <input value={form.load_location} onChange={(e) => updateField("load_location", e.target.value)} required />
            <button type="button" className="ghost compact-map-inline-btn">{t("Map", "మ్యాప్")}</button>
          </div>
        </div>

        <div className="field-stack">
          <label>{t("Unload Location", "అన్‌లోడ్ స్థలం")}</label>
          <div className="location-input-row">
            <input value={form.unload_location} onChange={(e) => updateField("unload_location", e.target.value)} required />
            <button type="button" className="ghost compact-map-inline-btn">{t("Map", "మ్యాప్")}</button>
          </div>
        </div>

        <div className="field-stack">
          <label>{t("Contact Person Name", "లోడ్ వ్యక్తి పేరు")}</label>
          <input value={form.contact_person_name || ""} onChange={(e) => updateField("contact_person_name", e.target.value)} />
        </div>

        <div className="field-stack">
          <label>{t("Contact Person Phone", "లోడ్ వ్యక్తి ఫోన్")}</label>
          <input value={form.contact_person_phone || ""} onChange={(e) => updateField("contact_person_phone", e.target.value)} />
        </div>

        <DatePickerField
          label={t("Loading Date", "లోడింగ్ తేదీ")}
          value={form.loading_date || ""}
          onChange={(nextDate) => updateField("loading_date", nextDate)}
        />

        <DatePickerField
          label={t("Expected Unloading Date", "అన్‌లోడ్ తేదీ")}
          value={form.unloading_date || ""}
          onChange={(nextDate) => updateField("unloading_date", nextDate)}
        />

        <div className="field-stack">
          <label>{t("Trip Days", "ట్రిప్ రోజులు")}</label>
          <input type="number" value={workingDays} disabled />
        </div>

        <div className="field-stack">
          <label>{t("Load Type", "లోడ్ రకం")}</label>
          <input value={form.load_type || ""} onChange={(e) => updateField("load_type", e.target.value)} />
        </div>

        <div className="field-stack">
          <label>{t("Load Price", "లోడ్ ధర")}</label>
          <input
            className="highlight"
            type="number"
            step="1"
            value={form.load_price}
            onChange={(e) => updateField("load_price", e.target.value)}
            onWheel={preventScrollNumberChange}
            required
          />
        </div>

        <div className="field-stack">
          <label>{t("Driver Commission %", "డ్రైవర్ కమిషన్ %")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.driver_commission_percent || "6"}
            onChange={(e) => updateField("driver_commission_percent", e.target.value)}
            onWheel={preventScrollNumberChange}
          />
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>{commissionRuleText(language)}</p>
        </div>

        <div className="field-stack">
          <label>{t("Driver Daily Charge (Rs)", "డ్రైవర్ రోజువారీ చార్జ్ (రూ)")}</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.driver_daily_rate || ""}
            onChange={(e) => updateField("driver_daily_rate", e.target.value)}
            onWheel={preventScrollNumberChange}
            placeholder={t("Example: 1000", "ఉదాహరణ: 1000")}
          />
          {form.driver_daily_rate ? (
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
              {t(
                `Trip driver wage: Rs ${moneyInputValue(form.driver_daily_wage || 0)} (${moneyInputValue(form.driver_daily_rate)} × ${workingDays} ${workingDays === 1 ? "day" : "days"})`,
                `ట్రిప్ డ్రైవర్ వేతనం: Rs ${moneyInputValue(form.driver_daily_wage || 0)} (${moneyInputValue(form.driver_daily_rate)} × ${workingDays} రోజులు)`
              )}
            </p>
          ) : null}
        </div>

        <div className="create-trip-full expense-proof-section">
          <div className="section-head">
            <div>
              <h3>{t("Expense Entries", "ఖర్చు నమోదు")}</h3>
              <p className="muted">{t("Add amount and upload one or more images in the same card.", "ఒకే కార్డ్‌లో మొత్తం మరియు ఒకటి లేదా అంతకంటే ఎక్కువ చిత్రాలు జోడించండి.")}</p>
            </div>
          </div>

          <div className="expense-category-tabs">
            {expenseCategories.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`ghost expense-tab-btn ${activeExpenseKey === item.key ? "active" : ""}`}
                onClick={() => setActiveExpenseKey(item.key)}
              >
                {item.icon} {t(item.label, item.labelTe)}
              </button>
            ))}
          </div>

          <div className="proof-card expense-entry-card">
            {(() => {
              const item = activeExpense;
              const proofs = getProofs(item.key);
              const inputId = `expense-image-${item.key}`;
              return (
                <>
                  <div className="proof-card-head">
                    <strong>{item.icon} {t(item.label, item.labelTe)}</strong>
                    <span className="status-pill status-neutral">{proofs.length} {t("Images", "చిత్రాలు")}</span>
                  </div>
                  <div className="field-stack">
                    <label>{t("Amount", "మొత్తం")}</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form[item.amountField] || ""}
                      onChange={(event) => updateField(item.amountField, event.target.value)}
                      onWheel={preventScrollNumberChange}
                    />
                  </div>
                  {item.imageUpload !== false ? (
                    <>
                      <label className="proof-upload-card" htmlFor={inputId}>
                        <span className="proof-upload-icon">🖼</span>
                        <span>{t("Add Images", "చిత్రాలు జోడించండి")}</span>
                      </label>
                      <input
                        id={inputId}
                        className="proof-file-input-hidden"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => handleProofUpload(item.key, event)}
                      />
                      {proofs.length ? (
                        <div className="proof-preview-grid">
                          {proofs.map((proof) => (
                            <div className="proof-preview" key={proof.id}>
                              <button
                                type="button"
                                className="proof-image-btn"
                                onClick={() => setPreviewImage({ src: proof.data_url, name: proof.name || t("Image", "చిత్రం") })}
                              >
                                <img src={proof.data_url} alt={proof.name || item.label} />
                              </button>
                              <div className="proof-preview-meta">
                                <span>{proof.name || t("Image", "చిత్రం")}</span>
                                <button type="button" className="ghost proof-remove-btn" onClick={() => removeProofImage(proof.id)}>
                                  {t("Remove", "తొలగించు")}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>

        <div className="field-stack create-trip-full">
          <label>{t("Status", "స్థితి")}</label>
          <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
            {TRIP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tripStatusLabel(status, language)}
              </option>
            ))}
          </select>
        </div>

        <button className="create-trip-full" type="submit">{t("Save Trip With Expense", "ట్రిప్ + ఖర్చు సేవ్ చేయండి")}</button>
      </form>
      {previewImage ? (
        <div className="image-preview-modal" role="dialog" aria-modal="true" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="image-preview-modal-head">
              <strong>{previewImage.name}</strong>
              <button type="button" className="ghost image-preview-close-btn" onClick={() => setPreviewImage(null)}>
                {t("Close", "మూసివేయండి")}
              </button>
            </div>
            <img src={previewImage.src} alt={previewImage.name} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
