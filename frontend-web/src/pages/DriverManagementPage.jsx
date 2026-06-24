import { useEffect, useState } from "react";
import { api } from "../api";

export default function DriverManagementPage({
  drivers,
  lorries,
  assignments = [],
  form,
  setForm,
  onSubmit,
  onSelect,
  assignmentForm,
  setAssignmentForm,
  onAssign,
  onAddAssignmentLeave,
  onCompleteAssignment,
  onToggleDriverStatus,
  onDeleteDriver,
  language = "en",
  lastCreated = null,
  onDismissCreated,
  saveError = ""
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const [leaveForms, setLeaveForms] = useState({});
  const [completeForms, setCompleteForms] = useState({});
  const [loginIdCheck, setLoginIdCheck] = useState({
    checking: false,
    available: null,
    suggestions: [],
    message: ""
  });

  useEffect(() => {
    const raw = (form.login_identifier || "").trim().toLowerCase();
    if (raw.length < 3) {
      setLoginIdCheck({ checking: false, available: null, suggestions: [], message: "" });
      return;
    }
    setLoginIdCheck((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkUserId(raw);
        setLoginIdCheck({
          checking: false,
          available: result.available,
          suggestions: result.suggestions || [],
          message: result.message || ""
        });
      } catch {
        setLoginIdCheck({ checking: false, available: null, suggestions: [], message: "" });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [form.login_identifier]);

  const updateLeaveForm = (assignmentId, field, value) => {
    setLeaveForms((current) => ({
      ...current,
      [assignmentId]: {
        leave_start: "",
        leave_end: "",
        reason: "",
        ...(current[assignmentId] || {}),
        [field]: value
      }
    }));
  };

  const updateCompleteForm = (assignmentId, value) => {
    setCompleteForms((current) => ({ ...current, [assignmentId]: value }));
  };

  const submitLeave = async (assignmentId) => {
    const payload = leaveForms[assignmentId];
    if (!payload?.leave_start || !payload?.leave_end) return;
    await onAddAssignmentLeave(assignmentId, payload);
    setLeaveForms((current) => ({
      ...current,
      [assignmentId]: { leave_start: "", leave_end: "", reason: "" }
    }));
  };

  const completeAssignment = async (assignmentId) => {
    const completed_at = completeForms[assignmentId] || null;
    await onCompleteAssignment(assignmentId, { completed_at });
    setCompleteForms((current) => ({ ...current, [assignmentId]: "" }));
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    if (a.is_current_stint !== b.is_current_stint) {
      return a.is_current_stint ? -1 : 1;
    }
    return new Date(b.assigned_at) - new Date(a.assigned_at);
  });

  return (
    <section className="panel driver-management-panel">
      <div className="driver-management-head">
        <div>
          <h2>{t("Driver Management", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c28\u0c3f\u0c30\u0c4d\u0c35\u0c39\u0c23")}</h2>
          <p className="muted">{t("Add drivers, assign lorries, and track work in one compact view.", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d\u0c32\u0c28\u0c41 \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c3f, \u0c32\u0c3e\u0c30\u0c40\u0c32\u0c15\u0c41 \u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f, \u0c2a\u0c28\u0c3f \u0c35\u0c3f\u0c35\u0c30\u0c3e\u0c32\u0c28\u0c41 \u0c12\u0c15\u0c47 \u0c38\u0c4d\u0c25\u0c32\u0c02\u0c32\u0c4b \u0c1a\u0c42\u0c21\u0c02\u0c21\u0c3f.")}</p>
        </div>
        <button
          className="compact-submit compact-submit-inline"
          onClick={onSubmit}
          type="button"
          disabled={loginIdCheck.available === false}
        >
          {t("Add Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c41")}
        </button>
      </div>

      {lastCreated ? (
        <div className="driver-created-banner">
          <div>
            <strong>{t("Driver saved", "డ్రైవర్ సేవ్ అయ్యారు")}</strong>
            <p>{lastCreated.name} · {t("Login ID", "లాగిన్ ID")}: <strong>{lastCreated.login_identifier}</strong></p>
            {lastCreated.initial_password ? (
              <p>{t("Password", "పాస్‌వర్డ్")}: <strong>{lastCreated.initial_password}</strong> ({t("auto-generated", "ఆటో జనరేట్")})</p>
            ) : (
              <p>{t("Password set by you", "మీరు ఇచ్చిన పాస్‌వర్డ్")}</p>
            )}
          </div>
          <button type="button" className="ghost" onClick={onDismissCreated}>
            {t("Dismiss", "మూసివేయి")}
          </button>
        </div>
      ) : null}

      <div className="card driver-card">
        <h3>{t("Add Driver Form", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c47 \u0c2b\u0c3e\u0c30\u0c02")}</h3>
        <p className="muted driver-form-hint">
          {t("Login ID and password are optional. If empty, we create driver ID + password automatically.", "లాగిన్ ID మరియు పాస్‌వర్డ్ ఐచ్ఛికం. ఖాళీగా ఉంటే ఆటోమేటిక్‌గా సృష్టిస్తాం.")}
        </p>
        <div className="form-grid single compact-form-grid compact-form-grid-single">
          <input
            placeholder={t("Driver Name", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c2a\u0c47\u0c30\u0c41")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder={t("Phone", "\u0c2b\u0c4b\u0c28\u0c4d")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder={t("License Number", "\u0c32\u0c48\u0c38\u0c46\u0c28\u0c4d\u0c38\u0c4d \u0c28\u0c02\u0c2c\u0c30\u0c4d")}
            value={form.license_number}
            onChange={(e) => setForm({ ...form, license_number: e.target.value })}
          />
          <input
            placeholder={t("Login ID (optional)", "లాగిన్ ID (ఐచ్ఛికం)")}
            value={form.login_identifier || ""}
            onChange={(e) =>
              setForm({ ...form, login_identifier: e.target.value.replace(/\s/g, "_").toLowerCase() })
            }
            autoCapitalize="none"
          />
          {loginIdCheck.checking ? (
            <p className="login-id-status">{t("Checking login ID...", "లాగిన్ ID తనిఖీ...")}</p>
          ) : null}
          {loginIdCheck.available === true ? (
            <p className="login-id-status ok">{t("Login ID is available", "లాగిన్ ID అందుబాటులో ఉంది")}</p>
          ) : null}
          {loginIdCheck.available === false ? (
            <div className="login-id-suggestions">
              <p className="login-id-status bad">
                {loginIdCheck.message || t("Login ID already exists", "లాగిన్ ID ఇప్పటికే ఉంది")}
              </p>
              {loginIdCheck.suggestions.length ? (
                <>
                  <p className="muted">{t("Try one of these:", "ఇవి ప్రయత్నించండి:")}</p>
                  <div className="login-suggest-row">
                    {loginIdCheck.suggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="login-suggest-chip"
                        onClick={() => setForm({ ...form, login_identifier: item })}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <input
            type="password"
            placeholder={t("Password (optional)", "పాస్‌వర్డ్ (ఐచ్ఛికం)")}
            value={form.password || ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {saveError ? <p className="login-error driver-save-error">{saveError}</p> : null}
        </div>
      </div>

      <div className="card driver-card">
        <h3>{t("Assign Driver to Lorry", "\u0c32\u0c3e\u0c30\u0c40\u0c15\u0c3f \u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c2a\u0c41")}</h3>
        <p className="assignment-help-box">
          {t(
            "Each assignment is one work stint. When driver stops, complete the stint. After a gap (days or months), create a new assignment — pay is calculated only for that new stint (e.g. 50 days × Rs 600). Old stint days (e.g. 10 days) stay in history and are not added again.",
            "ప్రతి అసైన్‌మెంట్ ఒక పని కాలం. డ్రైవర్ ఆగితే ఆ కాలం పూర్తి చేయండి. గ్యాప్ తర్వాత కొత్త అసైన్‌మెంట్ — చెల్లింపు కేవలం ఆ కొత్త కాలానికి (ఉదా. 50 రోజులు × Rs 600). పాత కాలం (ఉదా. 10 రోజులు) చరిత్రలో మాత్రమే ఉంటుంది, మళ్లీ కలపరు."
          )}
        </p>
        <div className="form-grid compact-form-grid">
          <select value={assignmentForm.lorry_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, lorry_id: e.target.value })}>
            <option value="">{t("Select Lorry", "\u0c32\u0c3e\u0c30\u0c40 \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f")}</option>
            {lorries.map((lorry) => <option key={lorry.id} value={lorry.id}>{lorry.vehicle_number}</option>)}
          </select>
          <select value={assignmentForm.driver_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, driver_id: e.target.value })}>
            <option value="">{t("Select Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f")}</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
          </select>
          <input type="datetime-local" value={assignmentForm.assigned_at} onChange={(e) => setAssignmentForm({ ...assignmentForm, assigned_at: e.target.value })} />
          <input type="number" min="0" placeholder={t("Daily Wage", "\u0c21\u0c48\u0c32\u0c40 \u0c35\u0c47\u0c24\u0c28\u0c02")} value={assignmentForm.daily_wage} onChange={(e) => setAssignmentForm({ ...assignmentForm, daily_wage: e.target.value })} />
          <input type="number" min="0" placeholder={t("Commission %", "\u0c15\u0c2e\u0c3f\u0c37\u0c28\u0c4d %")} value={assignmentForm.commission_percent} onChange={(e) => setAssignmentForm({ ...assignmentForm, commission_percent: e.target.value })} />
          <input placeholder={t("Notes", "\u0c17\u0c2e\u0c28\u0c3f\u0c15\u0c32\u0c41")} value={assignmentForm.notes} onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })} />
          <button className="compact-submit" type="button" onClick={onAssign}>{t("Assign", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c41")}</button>
        </div>
      </div>

      <div className="cards-list">
        {drivers.map((driver) => (
          <div
            className="mini-card as-btn"
            key={driver.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(driver)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(driver);
            }}
          >
            <h4>{driver.name}</h4>
            <p>{t("Phone", "\u0c2b\u0c4b\u0c28\u0c4d")}: {driver.phone}</p>
            {driver.has_login ? <p>{t("Login", "లాగిన్")}: {driver.login_identifier}</p> : null}
            <p>{t("Status", "\u0c38\u0c4d\u0c25\u0c3f\u0c24\u0c3f")}: {driver.is_active ? t("Active", "\u0c2f\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d") : t("Inactive", "\u0c07\u0c28\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d")}</p>
            <p>{t("Assigned Lorry", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c3f\u0c28 \u0c32\u0c3e\u0c30\u0c40")}: {lorries.find((l) => l.driver_id === driver.id)?.vehicle_number || t("Not assigned", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c1a\u0c32\u0c47\u0c26\u0c41")}</p>
            <button
              type="button"
              className="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onToggleDriverStatus(driver);
              }}
            >
              {driver.is_active ? t("Set Inactive", "\u0c07\u0c28\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d \u0c1a\u0c47\u0c2f\u0c3f") : t("Set Active", "\u0c2f\u0c3e\u0c15\u0c4d\u0c1f\u0c3f\u0c35\u0c4d \u0c1a\u0c47\u0c2f\u0c3f")}
            </button>
            <button
              type="button"
              className="ghost driver-delete-btn"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteDriver(driver);
              }}
            >
              {t("Delete", "తొలగించు")}
            </button>
          </div>
        ))}
      </div>

      <div className="card driver-card">
        <h3>{t("Assignment Ledger", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c2a\u0c41 \u0c32\u0c46\u0c21\u0c4d\u0c1c\u0c30\u0c4d")}</h3>
        <div className="cards-list">
          {sortedAssignments.map((assignment) => (
            <div className={`mini-card assignment-card ${assignment.is_current_stint ? "assignment-card-current" : "assignment-card-past"}`} key={assignment.id}>
              <p>
                <strong>
                  {assignment.is_current_stint
                    ? t("Current work stint", "ప్రస్తుత పని కాలం")
                    : t("Past work stint", "మునుపటి పని కాలం")}
                </strong>
              </p>
              {assignment.gap_days_before > 0 ? (
                <p className="muted">
                  {t("Unpaid gap before this stint", "ఈ కాలం ముందు చెల్లించని గ్యాప్")}: {assignment.gap_days_before} {t("days", "రోజులు")}
                </p>
              ) : null}
              <p>{t("Lorry", "\u0c32\u0c3e\u0c30\u0c40")}: {lorries.find((l) => l.id === assignment.lorry_id)?.vehicle_number || assignment.lorry_id}</p>
              <p>{t("Driver", "\u0c21\u0c4d\u0c30\u0c48\u0c35\u0c30\u0c4d")}: {drivers.find((d) => d.id === assignment.driver_id)?.name || assignment.driver_id}</p>
              <p>{t("Start", "\u0c2a\u0c4d\u0c30\u0c3e\u0c30\u0c02\u0c2d \u0c24\u0c47\u0c26\u0c40")}: {new Date(assignment.assigned_at).toLocaleString()}</p>
              <p>{t("End", "\u0c2e\u0c41\u0c17\u0c3f\u0c02\u0c2a\u0c41 \u0c24\u0c47\u0c26\u0c40")}: {assignment.completed_at ? new Date(assignment.completed_at).toLocaleString() : "-"}</p>
              <p>{t("Status", "\u0c38\u0c4d\u0c25\u0c3f\u0c24\u0c3f")}: {assignment.status}</p>
              {assignment.status === "Active" ? (
                <p>
                  {t("Driver acceptance", "డ్రైవర్ అంగీకారం")}:{" "}
                  {assignment.driver_accepted
                    ? t("Accepted", "అంగీకరించారు")
                    : t("Pending", "పెండింగ్")}
                </p>
              ) : null}
              <p>{t("Total Days", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c41")}: {assignment.total_days}</p>
              <p>{t("Leave Days", "\u0c32\u0c40\u0c35\u0c4d \u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c41")}: {assignment.leave_days}</p>
              <p>{t("Working Days", "\u0c2a\u0c28\u0c3f \u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c41")}: {assignment.working_days}</p>
              <p>{t("Transport Amount", "\u0c1f\u0c4d\u0c30\u0c3e\u0c28\u0c4d\u0c38\u0c4d\u0c2a\u0c4b\u0c30\u0c4d\u0c1f\u0c4d \u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02")}: Rs.{Number(assignment.total_transport_amount || 0).toFixed(2)}</p>
              <p>{t("Daily Wage", "\u0c21\u0c48\u0c32\u0c40 \u0c35\u0c47\u0c24\u0c28\u0c02")}: Rs.{Number(assignment.daily_wage || 0).toFixed(2)} <span className="assignment-rate-locked">{t("locked", "\u0c32\u0c3e\u0c15\u0c4d")}</span></p>
              <p>{t("Wage Amount", "\u0c35\u0c47\u0c24\u0c28 \u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02")}: Rs.{Number(assignment.wage_amount || 0).toFixed(2)} ({assignment.working_days} {t("days", "\u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c41")} × Rs.{Number(assignment.daily_wage || 0).toFixed(0)})</p>
              <p>{t("Commission", "\u0c15\u0c2e\u0c3f\u0c37\u0c28\u0c4d")}: {Number(assignment.commission_percent || 0).toFixed(2)}% / Rs.{Number(assignment.commission_amount || 0).toFixed(2)}</p>
              <p><strong>{t("Total Earning", "\u0c2e\u0c4a\u0c24\u0c4d\u0c24\u0c02 \u0c38\u0c02\u0c2a\u0c3e\u0c26\u0c28")}: Rs.{Number(assignment.total_earning || 0).toFixed(2)}</strong></p>
              {assignment.notes ? <p>{t("Notes", "\u0c17\u0c2e\u0c28\u0c3f\u0c15\u0c32\u0c41")}: {assignment.notes}</p> : null}

              {assignment.trips?.length ? (
                <div className="assignment-trip-table">
                  <h4>{t("Trip-wise Commission", "\u0c1f\u0c4d\u0c30\u0c3f\u0c2a\u0c4d \u0c35\u0c3e\u0c30\u0c40 \u0c15\u0c2e\u0c3f\u0c37\u0c28\u0c4d")}</h4>
                  {assignment.trips.map((trip) => (
                    <div className="assignment-trip-row" key={trip.trip_id}>
                      <span>{trip.route}</span>
                      <span>Rs.{Number(trip.load_price || 0).toFixed(0)} × {trip.commission_percent}%</span>
                      <strong>Rs.{Number(trip.commission_amount || 0).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="assignment-leave-list">
                <h4>{t("Leave Records", "\u0c32\u0c40\u0c35\u0c4d \u0c30\u0c3f\u0c15\u0c3e\u0c30\u0c4d\u0c21\u0c4d\u0c38\u0c4d")}</h4>
                {assignment.leaves?.length ? assignment.leaves.map((leave) => (
                  <p key={leave.id}>
                    {new Date(leave.leave_start).toLocaleDateString()} - {new Date(leave.leave_end).toLocaleDateString()}
                    {leave.reason ? ` (${leave.reason})` : ""}
                  </p>
                )) : <p>{t("No leaves added", "\u0c32\u0c40\u0c35\u0c4d \u0c0f\u0c35\u0c40 \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c32\u0c47\u0c26\u0c41")}</p>}
              </div>

              {assignment.status === "Active" ? (
                <>
                  <div className="form-grid compact-form-grid">
                    <input
                      type="date"
                      value={leaveForms[assignment.id]?.leave_start || ""}
                      onChange={(e) => updateLeaveForm(assignment.id, "leave_start", e.target.value)}
                    />
                    <input
                      type="date"
                      value={leaveForms[assignment.id]?.leave_end || ""}
                      onChange={(e) => updateLeaveForm(assignment.id, "leave_end", e.target.value)}
                    />
                    <input
                      placeholder={t("Leave Reason", "\u0c32\u0c40\u0c35\u0c4d \u0c15\u0c3e\u0c30\u0c23\u0c02")}
                      value={leaveForms[assignment.id]?.reason || ""}
                      onChange={(e) => updateLeaveForm(assignment.id, "reason", e.target.value)}
                    />
                    <button type="button" className="ghost compact-submit" onClick={() => submitLeave(assignment.id)}>
                      {t("Add Leave", "\u0c32\u0c40\u0c35\u0c4d \u0c1a\u0c47\u0c30\u0c4d\u0c1a\u0c41")}
                    </button>
                  </div>

                  <div className="form-grid compact-form-grid assignment-complete-row">
                    <input
                      type="datetime-local"
                      value={completeForms[assignment.id] || ""}
                      onChange={(e) => updateCompleteForm(assignment.id, e.target.value)}
                    />
                    <button className="compact-submit" type="button" onClick={() => completeAssignment(assignment.id)}>
                      {t("Complete Assignment", "\u0c15\u0c47\u0c1f\u0c3e\u0c2f\u0c3f\u0c02\u0c2a\u0c41 \u0c2e\u0c41\u0c17\u0c3f\u0c02\u0c1a\u0c41")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
