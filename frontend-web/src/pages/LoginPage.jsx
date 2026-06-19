import { useEffect, useState } from "react";
import { api } from "../api";
import { languageOptionLabel } from "../utils/i18n";

const ROLES = { user: "user", driver: "driver", loader: "loader" };
const USER_MODES = { login: "login", register: "register", forgot: "forgot" };

const ROLE_TABS = [
  { id: ROLES.user, icon: "👤", en: "User", te: "యూజర్" },
  { id: ROLES.driver, icon: "🚚", en: "Driver", te: "డ్రైవర్" },
  { id: ROLES.loader, icon: "📦", en: "Loader", te: "లోడర్" }
];

const ROLE_HINTS = {
  user: {
    en: "Fleet owner or manager — sign in or create a new account.",
    te: "ఫ్లీట్ యజమాని — లాగిన్ అవ్వండి లేదా కొత్త అకౌంట్ సృష్టించండి."
  },
  driver: {
    en: "Driver account from your fleet owner (Driver ID + password).",
    te: "మీ యజమాని ఇచ్చిన డ్రైవర్ ID + పాస్‌వర్డ్ తో లాగిన్ అవ్వండి."
  },
  loader: {
    en: "Loading staff — use the ID shared by your fleet owner.",
    te: "లోడింగ్ సిబ్బంది — యజమాని ఇచ్చిన ID తో లాగిన్ అవ్వండి."
  }
};

export default function LoginPage({ language = "en", form, setForm, onLogin, onRegister, onForgotPassword, loading = false, error = "", notice = "" }) {
  const t = (en, te) => (language === "te" ? te : en);
  const [activeRole, setActiveRole] = useState(ROLES.user);
  const [userMode, setUserMode] = useState(USER_MODES.login);
  const [resetPassword, setResetPassword] = useState("");
  const [registerForm, setRegisterForm] = useState({
    identifier: "",
    phone: "",
    email: "",
    preferred_language: "en",
    password: "",
    confirm_password: ""
  });
  const [userIdCheck, setUserIdCheck] = useState({
    checking: false,
    available: null,
    suggestions: [],
    message: ""
  });

  const resetRegisterForm = () => {
    setRegisterForm({
      identifier: "",
      phone: "",
      email: "",
      preferred_language: "en",
      password: "",
      confirm_password: ""
    });
    setUserIdCheck({ checking: false, available: null, suggestions: [], message: "" });
  };

  useEffect(() => {
    if (activeRole !== ROLES.user || userMode !== USER_MODES.register) return;
    const raw = registerForm.identifier.trim();
    if (raw.length < 3) {
      setUserIdCheck({ checking: false, available: null, suggestions: [], message: "" });
      return;
    }
    setUserIdCheck((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkUserId(raw);
        setUserIdCheck({
          checking: false,
          available: result.available,
          suggestions: result.suggestions || [],
          message: result.message || ""
        });
      } catch {
        setUserIdCheck({ checking: false, available: null, suggestions: [], message: "" });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [registerForm.identifier, activeRole, userMode]);

  function switchRole(roleId) {
    setActiveRole(roleId);
    setUserMode(USER_MODES.login);
  }

  function submit(e) {
    e.preventDefault();
    onLogin?.({
      register: false,
      identifier: form.identifier,
      password: form.password,
      loginAs: activeRole
    });
  }

  const roleHint = ROLE_HINTS[activeRole];
  const idPlaceholder =
    activeRole === ROLES.driver
      ? t("Driver ID", "డ్రైవర్ ID")
      : activeRole === ROLES.loader
        ? t("Loader ID", "లోడర్ ID")
        : t("User ID", "యూజర్ ID");

  return (
    <section className="panel login-panel login-panel-pro login-panel-mobile">
      <div className="login-hero">
        <div className="profile-icon">🚛</div>
        <div>
          <h2>{t("Welcome Back", "మళ్లీ స్వాగతం")}</h2>
          <p className="muted">{t("Sign in to continue to Fleet Workspace", "ఫ్లీట్ వర్క్‌స్పేస్ కొనసాగడానికి లాగిన్ అవ్వండి")}</p>
        </div>
      </div>

      <div className="login-role-tabs" role="tablist" aria-label={t("Login type", "లాగిన్ రకం")}>
        {ROLE_TABS.map((tab) => {
          const active = activeRole === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`login-role-tab ${active ? "active" : ""}`}
              onClick={() => switchRole(tab.id)}
            >
              <span className="login-role-tab-icon">{tab.icon}</span>
              <span>{language === "te" ? tab.te : tab.en}</span>
            </button>
          );
        })}
      </div>

      <p className="login-role-hint">{language === "te" ? roleHint.te : roleHint.en}</p>

      {activeRole === ROLES.user && userMode === USER_MODES.login ? (
        <>
          <form className="form-grid single" onSubmit={submit}>
            <input
              placeholder={idPlaceholder}
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              autoCapitalize="none"
            />
            <input
              type="password"
              placeholder={t("Password", "పాస్‌వర్డ్")}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {notice ? <p className="login-notice">{notice}</p> : null}
            {error ? <p className="login-error">{error}</p> : null}
            <button type="submit" disabled={loading}>
              {loading ? t("Signing in...", "సైన్ ఇన్ అవుతోంది...") : t("Login", "లాగిన్")}
            </button>
          </form>
          <button className="ghost login-toggle-btn" type="button" onClick={() => setUserMode(USER_MODES.register)}>
            {t("New User? Create Account", "కొత్త యూజర్? అకౌంట్ సృష్టించండి")}
          </button>
          <div className="inline-actions login-actions">
            <button className="ghost" type="button" onClick={() => setUserMode(USER_MODES.forgot)}>
              {t("Forgot Password", "పాస్‌వర్డ్ మర్చిపోయారా")}
            </button>
          </div>
        </>
      ) : null}

      {activeRole !== ROLES.user ? (
        <form className="form-grid single" onSubmit={submit}>
          <input
            placeholder={idPlaceholder}
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            autoCapitalize="none"
          />
          <input
            type="password"
            placeholder={t("Password", "పాస్‌వర్డ్")}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? t("Signing in...", "సైన్ ఇన్ అవుతోంది...") : t("Login", "లాగిన్")}
          </button>
        </form>
      ) : null}

      {activeRole === ROLES.user && userMode === USER_MODES.forgot ? (
        <div className="account-hints login-reset-box">
          <p><strong>🔐 {t("Reset Password", "పాస్‌వర్డ్ రీసెట్")}</strong></p>
          <input
            placeholder={t("User ID", "యూజర్ ఐడి")}
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            autoCapitalize="none"
          />
          <input
            placeholder={t("New Password", "కొత్త పాస్‌వర్డ్")}
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => onForgotPassword?.(form.identifier, resetPassword, () => setResetPassword(""))}
            disabled={!form.identifier || !resetPassword}
          >
            {t("Reset Now", "ఇప్పుడే రీసెట్ చేయండి")}
          </button>
          <button className="ghost" type="button" onClick={() => setUserMode(USER_MODES.login)}>
            {t("Back to Login", "లాగిన్‌కు తిరిగి వెళ్ళు")}
          </button>
        </div>
      ) : null}

      {activeRole === ROLES.user && userMode === USER_MODES.register ? (
        <div className="account-hints login-reset-box">
          <p><strong>👤 {t("Create User Account", "యూజర్ అకౌంట్ సృష్టించు")}</strong></p>
          <p className="muted login-register-hint">
            {t("Choose your User ID for sign in (letters, numbers, underscore).", "సైన్ ఇన్ కోసం మీ యూజర్ ID ఎంచుకోండి.")}
          </p>
          <input
            placeholder={t("User ID", "యూజర్ ID")}
            value={registerForm.identifier}
            onChange={(e) => setRegisterForm({ ...registerForm, identifier: e.target.value.replace(/\s/g, "_").toLowerCase() })}
            autoCapitalize="none"
          />
          {userIdCheck.checking ? <p className="login-id-status muted">{t("Checking...", "తనిఖీ...")}</p> : null}
          {userIdCheck.available === true ? <p className="login-id-status ok">{t("User ID is available", "యూజర్ ID అందుబాటులో ఉంది")}</p> : null}
          {userIdCheck.available === false ? (
            <div className="login-id-suggestions">
              <p className="login-id-status bad">{userIdCheck.message || t("User ID already taken", "యూజర్ ID ఇప్పటికే ఉంది")}</p>
              {userIdCheck.suggestions.length ? (
                <>
                  <p className="muted">{t("Try one of these:", "ఇవి ప్రయత్నించండి:")}</p>
                  <div className="login-suggest-row">
                    {userIdCheck.suggestions.map((item) => (
                      <button key={item} type="button" className="login-suggest-chip" onClick={() => setRegisterForm({ ...registerForm, identifier: item })}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <input
            placeholder={t("Phone number", "ఫోన్ నంబర్")}
            value={registerForm.phone}
            onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
          />
          <input
            placeholder={t("Email", "ఇమెయిల్")}
            type="email"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
            autoCapitalize="none"
          />
          <div className="login-lang-row">
            <span className="muted">{t("Language", "భాష")}:</span>
            {[
              { code: "en", label: languageOptionLabel(language, "en") },
              { code: "te", label: languageOptionLabel(language, "te") }
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                className={registerForm.preferred_language === item.code ? "lang-pill active" : "lang-pill"}
                onClick={() => setRegisterForm({ ...registerForm, preferred_language: item.code })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            placeholder={t("Password", "పాస్‌వర్డ్")}
            type="password"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
          />
          <input
            placeholder={t("Confirm password", "పాస్‌వర్డ్ నిర్ధారణ")}
            type="password"
            value={registerForm.confirm_password}
            onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
          />
          <button
            type="button"
            onClick={() =>
              onRegister?.({
                ...registerForm,
                onDone: () => {
                  resetRegisterForm();
                  setUserMode(USER_MODES.login);
                }
              })
            }
            disabled={
              registerForm.identifier.trim().length < 3 ||
              userIdCheck.available !== true ||
              registerForm.phone.trim().length < 8 ||
              !registerForm.email.trim().includes("@") ||
              registerForm.password.length < 4 ||
              registerForm.confirm_password.length < 4
            }
          >
            {t("Create User", "యూజర్ సృష్టించు")}
          </button>
          <button className="ghost" type="button" onClick={() => setUserMode(USER_MODES.login)}>
            {t("Back to Login", "లాగిన్‌కు తిరిగి వెళ్ళు")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
