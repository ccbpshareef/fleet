import { Fragment, useDeferredValue, useMemo, useState } from "react";
import {
  FleetCalendarIcon,
  FleetInactiveIcon,
  FleetPlateIcon,
  FleetSearchIcon,
  FleetTrashIcon,
  FleetTruckIcon,
  FleetUserIcon
} from "../components/FleetIcons";
import { LORRY_TYPES, lorryTypeLabel } from "../utils/fleetLabels";

function FleetInputField({ icon: Icon, children, className = "" }) {
  return (
    <label className={`fleet-input-field ${className}`.trim()}>
      <span className="fleet-input-icon" aria-hidden="true">
        <Icon />
      </span>
      {children}
    </label>
  );
}

function formatAssignedDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AddLorryPage({
  form,
  setForm,
  drivers,
  lorries = [],
  assignments = [],
  selectedLorryHistory = null,
  onSelectLorry = () => {},
  onToggleLorryStatus = () => {},
  onDeleteLorry = () => {},
  onUpdateAssignment = () => {},
  onSubmit,
  language = "en",
  compact = false
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const types = LORRY_TYPES;
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState({ driver_id: "", assigned_at: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const activeAssignmentsByLorry = useMemo(() => {
    const map = new Map();
    assignments
      .filter((item) => item.status === "Active")
      .forEach((item) => {
        if (!map.has(item.lorry_id)) map.set(item.lorry_id, item);
      });
    return map;
  }, [assignments]);

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredLorries = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return lorries.filter((lorry) => {
      const activeAssignment = activeAssignmentsByLorry.get(lorry.id);
      const driverName = drivers.find((item) => item.id === (activeAssignment?.driver_id ?? lorry.driver_id))?.name || "";
      const matchesSearch =
        !query ||
        lorry.vehicle_number?.toLowerCase().includes(query) ||
        driverName.toLowerCase().includes(query) ||
        String(lorry.id).includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && lorry.is_active) ||
        (statusFilter === "inactive" && !lorry.is_active) ||
        (statusFilter === "assigned" && activeAssignment) ||
        (statusFilter === "unassigned" && !activeAssignment);

      return matchesSearch && matchesStatus;
    });
  }, [activeAssignmentsByLorry, deferredSearch, drivers, lorries, statusFilter]);

  const fleetStats = useMemo(() => {
    const assignedCount = lorries.filter((lorry) => activeAssignmentsByLorry.has(lorry.id)).length;
    const activeCount = lorries.filter((lorry) => lorry.is_active).length;
    return {
      total: lorries.length,
      active: activeCount,
      inactive: lorries.length - activeCount,
      assigned: assignedCount
    };
  }, [activeAssignmentsByLorry, lorries]);

  const startEditing = (assignment) => {
    setEditingAssignmentId(assignment.id);
    setEditingAssignment({
      driver_id: String(assignment.driver_id || ""),
      assigned_at: assignment.assigned_at ? String(assignment.assigned_at).slice(0, 10) : ""
    });
  };

  const saveAssignmentEdit = async () => {
    if (!editingAssignmentId || !editingAssignment.driver_id) return;
    await onUpdateAssignment(editingAssignmentId, {
      driver_id: Number(editingAssignment.driver_id),
      assigned_at: editingAssignment.assigned_at || null
    });
    setEditingAssignmentId(null);
    setEditingAssignment({ driver_id: "", assigned_at: "" });
  };

  const selectedVehicleNumber = selectedLorryHistory?.vehicle_number || null;

  const renderLorryRow = (lorry) => {
    const activeAssignment = activeAssignmentsByLorry.get(lorry.id);
    const driverName = drivers.find((item) => item.id === (activeAssignment?.driver_id ?? lorry.driver_id))?.name || "-";
    const isEditing = editingAssignmentId === activeAssignment?.id;
    const assignedLabel = activeAssignment?.assigned_at ? formatAssignedDate(activeAssignment.assigned_at) : "-";
    const isActive = Boolean(lorry.is_active);

    return (
      <Fragment key={lorry.id}>
        <tr
          className={`fleet-row ${selectedVehicleNumber === lorry.vehicle_number ? "selected" : ""}`}
          onClick={() => onSelectLorry(lorry)}
        >
          <td data-label={t("Vehicle", "వాహనం")}>
            <div className="fleet-vehicle-cell">
              <span className="fleet-vehicle-avatar" aria-hidden="true">
                <FleetTruckIcon />
              </span>
              <div>
                <strong>{lorry.vehicle_number}</strong>
                <span>{t("Tap to inspect history", "చరిత్ర చూడటానికి నొక్కండి")}</span>
              </div>
            </div>
          </td>
          <td data-label={t("Type", "రకం")}>{lorryTypeLabel(lorry.lorry_type || form.lorry_type, language) || "-"}</td>
          <td data-label={t("Driver & Assigned", "డ్రైవర్ & కేటాయింపు")}>
            <div className="fleet-driver-assigned">
              <span>{driverName}</span>
              <small>{assignedLabel}</small>
            </div>
          </td>
          <td data-label={t("Status", "స్థితి")}>
            <span className={`fleet-status-pill ${isActive ? "is-active" : "is-inactive"}`}>
              <span className="fleet-status-dot" aria-hidden="true" />
              {isActive ? t("Active", "యాక్టివ్") : t("Inactive", "ఇనాక్టివ్")}
            </span>
          </td>
          <td data-label={t("Actions", "చర్యలు")}>
            <div className="fleet-row-actions" onClick={(event) => event.stopPropagation()}>
              {activeAssignment ? (
                <button type="button" className="ghost fleet-inline-btn fleet-inline-btn-soft" onClick={() => startEditing(activeAssignment)}>
                  {t("Edit", "ఎడిట్")}
                </button>
              ) : null}
              <button
                type="button"
                className="ghost fleet-inline-btn fleet-inline-btn-alert"
                onClick={() => onToggleLorryStatus(lorry)}
              >
                {isActive ? t("Disable", "డిసేబుల్") : t("Enable", "ఎనేబుల్")}
              </button>
              <button
                type="button"
                className="ghost fleet-inline-btn fleet-inline-btn-danger"
                onClick={() => onDeleteLorry(lorry)}
              >
                <FleetTrashIcon />
                {t("Delete", "తొలగించు")}
              </button>
            </div>
          </td>
        </tr>
        {isEditing ? (
          <tr className="fleet-edit-row">
            <td colSpan="5">
              <div className="fleet-edit-grid">
                <select
                  className="fleet-compact-input"
                  value={editingAssignment.driver_id}
                  onChange={(e) => setEditingAssignment((current) => ({ ...current, driver_id: e.target.value }))}
                >
                  <option value="">{t("Select Driver", "డ్రైవర్ ఎంచుకోండి")}</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
                <input
                  className="fleet-compact-input"
                  type="date"
                  value={editingAssignment.assigned_at}
                  onChange={(e) => setEditingAssignment((current) => ({ ...current, assigned_at: e.target.value }))}
                />
                <button type="button" className="fleet-inline-btn" onClick={saveAssignmentEdit}>
                  {t("Update Assignment", "కేటాయింపు అప్డేట్")}
                </button>
                <button
                  type="button"
                  className="ghost fleet-inline-btn"
                  onClick={() => {
                    setEditingAssignmentId(null);
                    setEditingAssignment({ driver_id: "", assigned_at: "" });
                  }}
                >
                  {t("Cancel", "రద్దు")}
                </button>
              </div>
            </td>
          </tr>
        ) : null}
      </Fragment>
    );
  };

  const statItems = [
    {
      key: "total",
      value: fleetStats.total,
      label: compact ? t("Total", "మొత్తం") : t("TOTAL", "మొత్తం"),
      icon: FleetTruckIcon,
      tone: "blue"
    },
    {
      key: "assigned",
      value: fleetStats.assigned,
      label: compact ? t("Assigned", "కేటా") : t("ASSIGNED", "కేటాయించబడిన"),
      icon: FleetUserIcon,
      tone: "teal"
    },
    {
      key: "inactive",
      value: fleetStats.inactive,
      label: compact ? t("Inactive", "ఆఫ్") : t("INACTIVE", "ఇనాక్టివ్"),
      icon: FleetInactiveIcon,
      tone: "amber"
    }
  ];

  return (
    <section className={`panel fleet-ops-shell${compact ? " fleet-ops-shell--compact" : ""}`}>
      <div className={`fleet-header-row${compact ? " fleet-header-row--compact" : ""}`}>
        {!compact ? (
          <div className="fleet-header-copy">
            <h2 className="fleet-page-title">{t("Add Lorry", "లారీ చేర్చు")}</h2>
            <p className="muted">
              {t(
                "Register new vehicles and connect them to your active team.",
                "కొత్త వాహనాలను నమోదు చేసి మీ బృందంతో అనుసంధానించండి."
              )}
            </p>
          </div>
        ) : null}

        <div className={compact ? "fleet-stat-strip" : "fleet-stats-grid"}>
          {statItems.map((item) => {
            const Icon = item.icon;
            if (compact) {
              return (
                <div className="fleet-stat-mini" key={item.key}>
                  <span className={`fleet-stat-icon fleet-stat-icon-${item.tone}`} aria-hidden="true">
                    <Icon />
                  </span>
                  <div className="fleet-stat-mini-copy">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="fleet-stat-card" key={item.key}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <span className={`fleet-stat-icon fleet-stat-icon-${item.tone}`} aria-hidden="true">
                  <Icon />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card fleet-quick-panel">
        <div className="fleet-panel-head">
          <div>
            <h3>{t("Quick Add", "త్వరగా చేర్చు")}</h3>
            {!compact ? (
              <p className="muted">
                {t("Register a new lorry in one compact row.", "ఒక కాంపాక్ట్ రోలో కొత్త లారీ నమోదు చేయండి.")}
              </p>
            ) : null}
          </div>
          <div className="fleet-helper-chips">
            <span className="fleet-helper-chip">{t("Compact input", "కాంపాక్ట్ ఇన్పుట్")}</span>
            <span className="fleet-helper-chip soft">{t("Large fleet ready", "పెద్ద ఫ్లీట్ కి సిద్ధం")}</span>
          </div>
        </div>
        <form className="fleet-quick-form" onSubmit={onSubmit}>
          <FleetInputField icon={FleetPlateIcon} className="fleet-field-vehicle">
            <input
              className="fleet-compact-input"
              placeholder={t("Vehicle Number", "వాహన నంబర్")}
              value={form.vehicle_number}
              onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
              required
            />
          </FleetInputField>
          <FleetInputField icon={FleetTruckIcon} className="fleet-field-type">
            <select
              className="fleet-compact-input"
              value={form.lorry_type}
              onChange={(e) => setForm({ ...form, lorry_type: e.target.value })}
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {lorryTypeLabel(type, language)}
                </option>
              ))}
            </select>
          </FleetInputField>
          <FleetInputField icon={FleetUserIcon} className="fleet-field-driver">
            <select
              className="fleet-compact-input"
              value={form.driver_id}
              onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
            >
              <option value="">{t("Assign Driver", "డ్రైవర్ కేటాయించు")}</option>
              {drivers.map((driver) => (
                <option value={driver.id} key={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </FleetInputField>
          <FleetInputField icon={FleetCalendarIcon} className="fleet-field-date">
            <input
              className="fleet-compact-input"
              type="date"
              value={form.assigned_at ? String(form.assigned_at).slice(0, 10) : ""}
              onChange={(e) => setForm({ ...form, assigned_at: e.target.value })}
            />
          </FleetInputField>
          <button type="submit" className="fleet-save-btn">
            {t("Save", "సేవ్")}
          </button>
        </form>
      </div>

      <div className="card fleet-list-shell">
        <div className="fleet-list-toolbar">
          <div className="fleet-list-title-block">
            <h3>{t("Fleet List", "లారీ జాబితా")}</h3>
            <p className="muted">
              {t("Showing", "చూపిస్తున్నది")} {filteredLorries.length} / {lorries.length}{" "}
              {t("vehicles", "వాహనాలు")}
            </p>
          </div>

          <div className="fleet-list-summary">
            <span className="fleet-summary-pill">
              {fleetStats.active} {t("Active", "యాక్టివ్")}
            </span>
            <span className="fleet-summary-pill soft">
              {fleetStats.assigned} {t("Assigned", "కేటాయించబడిన")}
            </span>
          </div>

          <div className="fleet-list-controls">
            <FleetInputField icon={FleetSearchIcon} className="fleet-search-field">
              <input
                className="fleet-compact-input"
                placeholder={t("Search by number or driver", "నంబర్ లేదా డ్రైవర్ ద్వారా శోధించు")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </FleetInputField>
            <select
              className="fleet-compact-input fleet-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("All", "అన్ని")}</option>
              <option value="active">{t("Active", "యాక్టివ్")}</option>
              <option value="inactive">{t("Inactive", "ఇనాక్టివ్")}</option>
              <option value="assigned">{t("Assigned", "కేటాయించబడిన")}</option>
              <option value="unassigned">{t("Unassigned", "కేటాయించనివి")}</option>
            </select>
          </div>
        </div>

        <div className="fleet-table-wrap">
          <table className="data-table fleet-table">
            <thead>
              <tr>
                <th>{t("Vehicle", "వాహనం")}</th>
                <th>{t("Type", "రకం")}</th>
                <th>{t("Driver & Assigned", "డ్రైవర్ & కేటాయింపు")}</th>
                <th>{t("Status", "స్థితి")}</th>
                <th>{t("Actions", "చర్యలు")}</th>
              </tr>
            </thead>
            <tbody>{filteredLorries.map(renderLorryRow)}</tbody>
          </table>
          {!filteredLorries.length ? (
            <p className="fleet-empty-state muted">{t("No lorries matched your search.", "మీ శోధనకు సరిపోయే లారీలు లేవు.")}</p>
          ) : null}
        </div>
      </div>

      {selectedLorryHistory ? (
        <div className="card fleet-history-shell">
          <div className="fleet-panel-head">
            <div>
              <h3>
                {t("Lorry History", "లారీ చరిత్ర")} - {selectedLorryHistory.vehicle_number}
              </h3>
              <p className="muted">
                {t("Performance snapshot for the selected vehicle.", "ఎంపిక చేసిన వాహనం కోసం పనితీరు సారాంశం.")}
              </p>
            </div>
            <span className="fleet-summary-pill">
              {selectedLorryHistory.total_trips} {t("trips", "ట్రిప్స్")}
            </span>
          </div>
          <div className="fleet-history-grid">
            <div className="detail-card">
              <span>{t("Total Trips", "మొత్తం ట్రిప్స్")}</span>
              <strong>{selectedLorryHistory.total_trips}</strong>
            </div>
            <div className="detail-card">
              <span>{t("Total Income", "మొత్తం ఆదాయం")}</span>
              <strong>Rs.{selectedLorryHistory.total_income?.toFixed(2)}</strong>
            </div>
            <div className="detail-card">
              <span>{t("Total Expenses", "మొత్తం ఖర్చులు")}</span>
              <strong>Rs.{selectedLorryHistory.total_expenses?.toFixed(2)}</strong>
            </div>
            <div className="detail-card">
              <span>{t("Total Profit", "మొత్తం లాభం")}</span>
              <strong>Rs.{selectedLorryHistory.total_profit?.toFixed(2)}</strong>
            </div>
          </div>
          <div className="cards-list">
            {selectedLorryHistory.trips?.map((trip) => (
              <div className="mini-card" key={trip.trip_id}>
                <p>
                  #{trip.trip_id} - {trip.route}
                </p>
                <p>
                  {t("Driver", "డ్రైవర్")}: {trip.driver_name || trip.driver_id}
                </p>
                <p>
                  {t("Income", "ఆదాయం")}: Rs.{trip.load_price?.toFixed(2)}
                </p>
                <p>
                  {t("Expense", "ఖర్చు")}: Rs.{trip.trip_expenses?.toFixed(2)}
                </p>
                <p>
                  {t("Profit", "లాభం")}: Rs.{trip.lorry_profit?.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="fleet-footer-banner" aria-hidden="true">
          <div className="fleet-footer-copy">
            <strong>{t("Move Smart. Move Easy.", "స్మార్ట్‌గా. సులభంగా.")}</strong>
            <p>
              {t(
                "Manage your fleet efficiently and keep your business moving forward.",
                "మీ ఫ్లీట్‌ను సమర్థవంతంగా నిర్వహించండి మరియు మీ వ్యాపారాన్ని ముందుకు నడపండి."
              )}
            </p>
          </div>
          <span className="fleet-footer-truck">
            <FleetTruckIcon />
          </span>
        </div>
      ) : null}
    </section>
  );
}
