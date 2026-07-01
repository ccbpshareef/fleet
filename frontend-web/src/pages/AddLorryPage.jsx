import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { LORRY_TYPES, lorryTypeLabel } from "../utils/fleetLabels";

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
  language = "en"
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
      assigned_at: assignment.assigned_at ? String(assignment.assigned_at).slice(0, 16) : ""
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

  return (
    <section className="panel fleet-ops-shell">
      <div className="fleet-header-row">
        <div className="fleet-header-copy">
          <div className="fleet-kicker-row">
            <span className="fleet-kicker">{t("Fleet control", "\u0c2b\u0c4d\u0c32\u0c40\u0c1f\u0c4d \u0c15\u0c02\u0c1f\u0c4d\u0c30\u0c4b\u0c32\u0c4d")}</span>
            <span className="fleet-kicker soft">{t("Quick dispatch ready", "\u0c24\u0c4d\u0c35\u0c30\u0c3f\u0c24 \u0c21\u0c3f\u0c38\u0c4d\u0c2a\u0c3e\u0c1a\u0c4d \u0c15\u0c3f \u0c38\u0c3f\u0c26\u0c4d\u0c27\u0c02")}</span>
          </div>
          <h2>{t("Add Lorry", "\u0c32\u0c3e\u0c30\u0c40 \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c41")}</h2>
          <p className="muted">
            {t(
              "For large fleets, keep input quick and manage the lorry list through search, filters, and a dense operations table.",
              "\u0c2a\u0c46\u0c26\u0c4d\u0c26 \u0c2b\u0c4d\u0c32\u0c40\u0c1f\u0c4d\u0c32\u0c15\u0c41 \u0c35\u0c3e\u0c39\u0c28\u0c3e\u0c32 \u0c1a\u0c47\u0c30\u0c4d\u0c2a\u0c41 \u0c35\u0c47\u0c17\u0c02\u0c17\u0c3e \u0c09\u0c02\u0c21\u0c3e\u0c32\u0c3f, \u0c15\u0c3e\u0c28\u0c40 \u0c32\u0c3f\u0c38\u0c4d\u0c1f\u0c4d\u200c\u0c28\u0c41 \u0c38\u0c46\u0c30\u0c4d\u0c1a\u0c4d, \u0c2b\u0c3f\u0c32\u0c4d\u0c1f\u0c30\u0c4d, \u0c15\u0c3e\u0c02\u0c2a\u0c3e\u0c15\u0c4d\u0c1f\u0c4d \u0c1f\u0c47\u0c2c\u0c41\u0c32\u0c4d\u200c\u0c24\u0c4b \u0c28\u0c3f\u0c30\u0c4d\u0c35\u0c39\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f."
            )}
          </p>
        </div>

        <div className="fleet-stats-grid">
          <div className="workspace-metric">
            <span>{t("Total", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02")}</span>
            <strong>{fleetStats.total}</strong>
          </div>
          <div className="workspace-metric">
            <span>{t("Assigned", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f\u0c28\u0c35\u0c3f")}</span>
            <strong>{fleetStats.assigned}</strong>
          </div>
          <div className="workspace-metric">
            <span>{t("Inactive", "\u0c07\u0c28\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d")}</span>
            <strong>{fleetStats.inactive}</strong>
          </div>
        </div>
      </div>

      <div className="card fleet-quick-panel">
        <div className="fleet-panel-head">
          <div>
            <h3>{t("Quick Add", "\u0c24\u0c4d\u0c35\u0c30\u0c17\u0c3e \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c41")}</h3>
            <p className="muted">{t("Register a new lorry in one compact row.", "\u0c12\u0c15 \u0c15\u0c3e\u0c02\u0c2a\u0c3e\u0c15\u0c4d\u0c1f\u0c4d \u0c30\u0c4b\u0c32\u0c4b \u0c15\u0c4a\u0c24\u0c4d\u0c24 \u0c32\u0c3e\u0c30\u0c40 \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c02\u0c21\u0c3f.")}</p>
          </div>
          <div className="fleet-helper-chips">
            <span className="fleet-helper-chip">{t("Compact input", "\u0c15\u0c3e\u0c02\u0c2a\u0c3e\u0c15\u0c4d\u0c1f\u0c4d \u0c07\u0c28\u0c4d\u0c2a\u0c41\u0c1f\u0c4d")}</span>
            <span className="fleet-helper-chip soft">{t("Large fleet ready", "\u0c2a\u0c46\u0c26\u0c4d\u0c26 \u0c2b\u0c4d\u0c32\u0c40\u0c1f\u0c4d \u0c15\u0c3f \u0c38\u0c3f\u0c26\u0c4d\u0c27\u0c02")}</span>
          </div>
        </div>
        <form className="fleet-quick-form" onSubmit={onSubmit}>
          <input
            className="fleet-compact-input"
            placeholder={t("Vehicle Number", "\u0c35\u0c3e\u0c39\u0c28\u0c02 \u0c28\u0c02\u0c2c\u0c30\u0c4d")}
            value={form.vehicle_number}
            onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
            required
          />
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
          <select
            className="fleet-compact-input"
            value={form.driver_id}
            onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
          >
            <option value="">{t("Assign Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c41")}</option>
            {drivers.map((driver) => (
              <option value={driver.id} key={driver.id}>{driver.name}</option>
            ))}
          </select>
          <input
            className="fleet-compact-input"
            type="datetime-local"
            value={form.assigned_at || ""}
            onChange={(e) => setForm({ ...form, assigned_at: e.target.value })}
            placeholder={t("Assigned At", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f\u0c28 \u0c38\u0c2e\u0c2f\u0c02")}
          />
          <button type="submit" className="fleet-save-btn">{t("Save", "\u0c38\u0c47\u0c35\u0c4d")}</button>
        </form>
      </div>

      <div className="card fleet-list-shell">
        <div className="fleet-list-toolbar">
          <div>
            <h3>{t("Fleet List", "\u0c32\u0c3e\u0c30\u0c40 \u0c1c\u0c3e\u0c2c\u0c3f\u0c24\u0c3e")}</h3>
            <p className="muted">
              {t("Showing", "\u0c1a\u0c42\u0c2a\u0c3f\u0c38\u0c4d\u0c24\u0c41\u0c28\u0c4d\u0c28\u0c35\u0c3f")} {filteredLorries.length} / {lorries.length}
            </p>
          </div>

          <div className="fleet-list-summary">
            <span className="fleet-summary-pill">{fleetStats.active} {t("active", "\u0c2f\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d")}</span>
            <span className="fleet-summary-pill soft">{fleetStats.assigned} {t("assigned", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f\u0c28")}</span>
          </div>

          <div className="fleet-list-controls">
            <input
              className="fleet-compact-input"
              placeholder={t("Search by number or driver", "\u0c28\u0c02\u0c2c\u0c30\u0c4d \u0c32\u0c47\u0c26\u0c3e \u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c26\u0c4d\u0c35\u0c3e\u0c30\u0c3e \u0c38\u0c46\u0c30\u0c4d\u0c1a\u0c4d")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="fleet-compact-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("All", "\u0c05\u0c28\u0c4d\u0c28\u0c3f")}</option>
              <option value="active">{t("Active", "\u0c2f\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d")}</option>
              <option value="inactive">{t("Inactive", "\u0c07\u0c28\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d")}</option>
              <option value="assigned">{t("Assigned", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f\u0c28\u0c35\u0c3f")}</option>
              <option value="unassigned">{t("Unassigned", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c28\u0c3f\u0c35\u0c3f")}</option>
            </select>
          </div>
        </div>

        <div className="fleet-table-wrap">
          <table className="data-table fleet-table">
            <thead>
              <tr>
                <th>{t("Vehicle", "\u0c35\u0c3e\u0c39\u0c28\u0c02")}</th>
                <th>{t("Type", "\u0c30\u0c15\u0c02")}</th>
                <th>{t("Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d")}</th>
                <th>{t("Assigned", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f\u0c28\u0c26\u0c3f")}</th>
                <th>{t("Status", "\u0c38\u0c4d\u0c25\u0c3f\u0c24\u0c3f")}</th>
                <th>{t("Actions", "\u0c1a\u0c30\u0c4d\u0c2f\u0c32\u0c41")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLorries.map((lorry) => {
                const activeAssignment = activeAssignmentsByLorry.get(lorry.id);
                const driverName = drivers.find((item) => item.id === (activeAssignment?.driver_id ?? lorry.driver_id))?.name || "-";
                const isEditing = editingAssignmentId === activeAssignment?.id;
                return (
                  <Fragment key={lorry.id}>
                    <tr
                      className={`fleet-row ${selectedVehicleNumber === lorry.vehicle_number ? "selected" : ""}`}
                      onClick={() => onSelectLorry(lorry)}
                    >
                      <td>
                        <div className="fleet-vehicle-cell">
                          <strong>{lorry.vehicle_number}</strong>
                          <span>{t("Tap to inspect history", "\u0c1a\u0c30\u0c3f\u0c24\u0c4d\u0c30 \u0c1a\u0c42\u0c21\u0c1f\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c28\u0c4a\u0c15\u0c4d\u0c15\u0c02\u0c21\u0c3f")}</span>
                        </div>
                      </td>
                      <td>{lorryTypeLabel(lorry.lorry_type || form.lorry_type, language) || "-"}</td>
                      <td>{driverName}</td>
                      <td>{activeAssignment?.assigned_at ? new Date(activeAssignment.assigned_at).toLocaleDateString() : "-"}</td>
                      <td>
                        <span className={`status-pill ${lorry.is_active ? "status-done" : "status-neutral"}`}>
                          {lorry.is_active ? t("Active", "\u0c2f\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d") : t("Inactive", "\u0c07\u0c28\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d")}
                        </span>
                      </td>
                      <td>
                        <div className="fleet-row-actions" onClick={(event) => event.stopPropagation()}>
                          {activeAssignment ? (
                            <button type="button" className="ghost fleet-inline-btn fleet-inline-btn-soft" onClick={() => startEditing(activeAssignment)}>
                              {t("Edit", "\u0c0e\u0c21\u0c3f\u0c1f\u0c4d")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="ghost fleet-inline-btn fleet-inline-btn-alert"
                            onClick={() => onToggleLorryStatus(lorry)}
                          >
                            {lorry.is_active ? t("Disable", "\u0c21\u0c3f\u0c38\u0c47\u0c2c\u0c41\u0c32\u0c4d") : t("Enable", "\u0c0e\u0c28\u0c47\u0c2c\u0c41\u0c32\u0c4d")}
                          </button>
                          <button
                            type="button"
                            className="ghost fleet-inline-btn driver-delete-btn"
                            onClick={() => onDeleteLorry(lorry)}
                          >
                            {t("Delete", "తొలగించు")}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing ? (
                      <tr className="fleet-edit-row">
                        <td colSpan="6">
                          <div className="fleet-edit-grid">
                            <select
                              className="fleet-compact-input"
                              value={editingAssignment.driver_id}
                              onChange={(e) => setEditingAssignment((current) => ({ ...current, driver_id: e.target.value }))}
                            >
                              <option value="">{t("Select Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f")}</option>
                              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                            </select>
                            <input
                              className="fleet-compact-input"
                              type="datetime-local"
                              value={editingAssignment.assigned_at}
                              onChange={(e) => setEditingAssignment((current) => ({ ...current, assigned_at: e.target.value }))}
                            />
                            <button type="button" className="fleet-inline-btn" onClick={saveAssignmentEdit}>
                              {t("Update Assignment", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c2a\u0c41 \u0c05\u0c2a\u0c4d\u0c21\u0c47\u0c1f\u0c4d")}
                            </button>
                            <button
                              type="button"
                              className="ghost fleet-inline-btn"
                              onClick={() => {
                                setEditingAssignmentId(null);
                                setEditingAssignment({ driver_id: "", assigned_at: "" });
                              }}
                            >
                              {t("Cancel", "\u0c30\u0c26\u0c4d\u0c26\u0c41")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!filteredLorries.length ? <p className="muted">{t("No lorries matched your search.", "\u0c2e\u0c40 \u0c38\u0c46\u0c30\u0c4d\u0c1a\u0c4d\u200c\u0c15\u0c41 \u0c24\u0c17\u0c4d\u0c17 \u0c32\u0c3e\u0c30\u0c40\u0c32\u0c41 \u0c32\u0c47\u0c35\u0c41.")}</p> : null}
        </div>
      </div>

      {selectedLorryHistory ? (
        <div className="card fleet-history-shell">
          <div className="fleet-panel-head">
            <div>
              <h3>{t("Lorry History", "\u0c32\u0c3e\u0c30\u0c40 \u0c1a\u0c30\u0c3f\u0c24\u0c4d\u0c30")} - {selectedLorryHistory.vehicle_number}</h3>
              <p className="muted">{t("Performance snapshot for the selected vehicle.", "\u0c0e\u0c02\u0c2a\u0c3f\u0c15 \u0c1a\u0c47\u0c38\u0c3f\u0c28 \u0c35\u0c3e\u0c39\u0c28\u0c02 \u0c15\u0c4b\u0c38\u0c02 \u0c2a\u0c28\u0c3f\u0c24\u0c40\u0c30\u0c41 \u0c1a\u0c3f\u0c9f\u0c4d\u0c30\u0c02.")}</p>
            </div>
            <span className="fleet-summary-pill">{selectedLorryHistory.total_trips} {t("trips", "\u0c1f\u0c4d\u0c30\u0c3f\u0c2a\u0c4d\u0c38\u0c4d")}</span>
          </div>
          <div className="fleet-history-grid">
            <div className="detail-card">
              <span>{t("Total Trips", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c1f\u0c4d\u0c30\u0c3f\u0c2a\u0c4d\u0c38\u0c4d")}</span>
              <strong>{selectedLorryHistory.total_trips}</strong>
            </div>
            <div className="detail-card">
              <span>{t("Total Income", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c06\u0c26\u0c3e\u0c2f\u0c02")}</span>
              <strong>Rs.{selectedLorryHistory.total_income?.toFixed(2)}</strong>
            </div>
            <div className="detail-card">
              <span>{t("Total Expenses", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c16\u0c30\u0c4d\u0c1a\u0c41\u0c32\u0c41")}</span>
              <strong>Rs.{selectedLorryHistory.total_expenses?.toFixed(2)}</strong>
            </div>
            <div className="detail-card">
              <span>{t("Total Profit", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c32\u0c3e\u0c2d\u0c02")}</span>
              <strong>Rs.{selectedLorryHistory.total_profit?.toFixed(2)}</strong>
            </div>
          </div>
          <div className="cards-list">
            {selectedLorryHistory.trips?.map((trip) => (
              <div className="mini-card" key={trip.trip_id}>
                <p>#{trip.trip_id} - {trip.route}</p>
                <p>{t("Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d")}: {trip.driver_name || trip.driver_id}</p>
                <p>{t("Income", "\u0c06\u0c26\u0c3e\u0c2f\u0c02")}: Rs.{trip.load_price?.toFixed(2)}</p>
                <p>{t("Expense", "\u0c16\u0c30\u0c4d\u0c1a\u0c41")}: Rs.{trip.trip_expenses?.toFixed(2)}</p>
                <p>{t("Profit", "\u0c32\u0c3e\u0c2d\u0c02")}: Rs.{trip.lorry_profit?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
