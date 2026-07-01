import { useEffect, useState } from "react";
import { api } from "../api";
import { languageOptionLabel } from "../utils/i18n";

const ROLES = { user: "user", driver: "driver", loader: "loader" };
const USER_MODES = { login: "login", register: "register", forgot: "forgot" };

const ROLE_TABS = [
  { id: ROLES.user, en: "Fleet Owner", te: "ఫ్లీట్ యజమాని" },
  { id: ROLES.driver, en: "Driver", te: "డ్రైవర్" },
  { id: ROLES.loader, en: "Loader", te: "లోడర్" }
];

const ROLE_HINTS = {
  user: {
    en: "Sign in with your fleet owner account or create a new one.",
    te: "మీ ఫ్లీట్ యజమాని అకౌంట్‌తో లాగిన్ అవ్వండి లేదా కొత్తది సృష్టించండి."
  },
  driver: {
    en: "Use the Driver ID and password provided by your fleet owner.",
    te: "మీ యజమాని ఇచ్చిన డ్రైవర్ ID మరియు పాస్‌వర్డ్ ఉపయోగించండి."
  },
  loader: {
    en: "Use the Loader ID shared by your fleet owner.",
    te: "యజమాని ఇచ్చిన లోడర్ ID ఉపయోగించండి."
  }
};

function AuthField({ label, children }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function AuthAlert({ type = "error", children }) {
  if (!children) return null;
  const isError = type === "error";
  return (
    <div className={isError ? "auth-alert auth-alert-error" : "auth-alert auth-alert-notice"} role="alert">
      <svg className="auth-alert-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {isError ? (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <span>{children}</span>
    </div>
  );
}

export default function LoginPage({
  language = "en",
  form,
  setForm,
  onLogin,
  onRegister,
  onForgotPassword,
  loading = false,
  error = "",
  notice = ""
}) {
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
  const idLabel =
    activeRole === ROLES.driver
      ? t("Driver ID", "డ్రైవర్ ID")
      : activeRole === ROLES.loader
        ? t("Loader ID", "లోడర్ ID")
        : t("User ID", "యూజర్ ID");

  const showLoginForm =
    (activeRole === ROLES.user && userMode === USER_MODES.login) || activeRole !== ROLES.user;

  return (
    <div className="auth-card">
      <header className="auth-card-header">
        <div className="auth-brand-row">
          <div className="auth-brand-mark" aria-hidden="true">
            FL
          </div>
          <div>
            <h1>{t("Fleet Workspace", "ఫ్లీట్ వర్క్‌స్పేస్")}</h1>
            <p>{t("Sign in to manage trips, drivers, and fleet operations.", "ట్రిప్స్, డ్రైవర్లు మరియు ఫ్లీట్ నిర్వహణ కోసం లాగిన్ అవ్వండి.")}</p>
          </div>
        </div>
      </header>

      <div className="auth-card-body">
        {userMode === USER_MODES.login ? (
          <>
            <div className="auth-segment" role="tablist" aria-label={t("Account type", "అకౌంట్ రకం")}>
              {ROLE_TABS.map((tab) => {
                const active = activeRole === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`auth-segment-btn ${active ? "active" : ""}`}
                    onClick={() => switchRole(tab.id)}
                  >
                    {language === "te" ? tab.te : tab.en}
                  </button>
                );
              })}
            </div>

            <p className="auth-hint">{language === "te" ? roleHint.te : roleHint.en}</p>
          </>
        ) : null}

        {showLoginForm ? (
          <form className="auth-form" onSubmit={submit}>
            <AuthField label={idLabel}>
              <input
                id="login-identifier"
                name="identifier"
                autoComplete="username"
                placeholder={t("Enter your ID", "మీ ID నమోదు చేయండి")}
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                autoCapitalize="none"
              />
            </AuthField>
            <AuthField label={t("Password", "పాస్‌వర్డ్")}>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={t("Enter your password", "పాస్‌వర్డ్ నమోదు చేయండి")}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </AuthField>
            {notice ? <AuthAlert type="notice">{notice}</AuthAlert> : null}
            {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? t("Signing in…", "సైన్ ఇన్ అవుతోంది…") : t("Sign in", "లాగిన్")}
            </button>
          </form>
        ) : null}

        {activeRole === ROLES.user && userMode === USER_MODES.login ? (
          <footer className="auth-footer">
            <button className="auth-link" type="button" onClick={() => setUserMode(USER_MODES.register)}>
              {t("Create an account", "కొత్త అకౌంట్ సృష్టించండి")}
            </button>
            <div className="auth-footer-row">
              <button className="auth-link auth-link-muted" type="button" onClick={() => setUserMode(USER_MODES.forgot)}>
                {t("Forgot password?", "పాస్‌వర్డ్ మర్చిపోయారా?")}
              </button>
            </div>
          </footer>
        ) : null}

        {activeRole === ROLES.user && userMode === USER_MODES.forgot ? (
          <div className="auth-subpanel">
            <h2 className="auth-subpanel-title">{t("Reset password", "పాస్‌వర్డ్ రీసెట్")}</h2>
            <p className="auth-subpanel-desc">
              {t("Enter your User ID and choose a new password.", "మీ యూజర్ ID నమోదు చేసి కొత్త పాస్‌వర్డ్ ఎంచుకోండి.")}
            </p>
            <AuthField label={t("User ID", "యూజర్ ID")}>
              <input
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                autoCapitalize="none"
                autoComplete="username"
              />
            </AuthField>
            <AuthField label={t("New password", "కొత్త పాస్‌వర్డ్")}>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoComplete="new-password"
              />
            </AuthField>
            <button
              type="button"
              className="auth-submit"
              onClick={() => onForgotPassword?.(form.identifier, resetPassword, () => setResetPassword(""))}
              disabled={!form.identifier || !resetPassword}
            >
              {t("Update password", "పాస్‌వర్డ్ నవీకరించు")}
            </button>
            <button className="auth-link auth-link-muted" type="button" onClick={() => setUserMode(USER_MODES.login)}>
              {t("Back to sign in", "లాగిన్‌కు తిరిగి వెళ్ళు")}
            </button>
          </div>
        ) : null}

        {activeRole === ROLES.user && userMode === USER_MODES.register ? (
          <div className="auth-subpanel">
            <h2 className="auth-subpanel-title">{t("Create account", "అకౌంట్ సృష్టించు")}</h2>
            <p className="auth-subpanel-desc">
              {t("Choose a User ID for sign in (letters, numbers, underscore).", "సైన్ ఇన్ కోసం యూజర్ ID ఎంచుకోండి.")}
            </p>
            <AuthField label={t("User ID", "యూజర్ ID")}>
              <input
                value={registerForm.identifier}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, identifier: e.target.value.replace(/\s/g, "_").toLowerCase() })
                }
                autoCapitalize="none"
                autoComplete="username"
              />
            </AuthField>
            {userIdCheck.checking ? <p className="auth-id-status">{t("Checking availability…", "తనిఖీ అవుతోంది…")}</p> : null}
            {userIdCheck.available === true ? (
              <p className="auth-id-status ok">{t("User ID is available", "యూజర్ ID అందుబాటులో ఉంది")}</p>
            ) : null}
            {userIdCheck.available === false ? (
              <div>
                <p className="auth-id-status bad">
                  {userIdCheck.message || t("User ID already taken", "యూజర్ ID ఇప్పటికే ఉంది")}
                </p>
                {userIdCheck.suggestions.length ? (
                  <>
                    <p className="auth-hint">{t("Try one of these:", "ఇవి ప్రయత్నించండి:")}</p>
                    <div className="auth-suggest-row">
                      {userIdCheck.suggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="auth-suggest-chip"
                          onClick={() => setRegisterForm({ ...registerForm, identifier: item })}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <AuthField label={t("Phone number", "ఫోన్ నంబర్")}>
              <input
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                autoComplete="tel"
              />
            </AuthField>
            <AuthField label={t("Email", "ఇమెయిల్")}>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                autoCapitalize="none"
                autoComplete="email"
              />
            </AuthField>
            <div className="auth-lang-row">
              <span>{t("Language", "భాష")}</span>
              {[
                { code: "en", label: languageOptionLabel(language, "en") },
                { code: "te", label: languageOptionLabel(language, "te") }
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={registerForm.preferred_language === item.code ? "auth-lang-pill active" : "auth-lang-pill"}
                  onClick={() => setRegisterForm({ ...registerForm, preferred_language: item.code })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <AuthField label={t("Password", "పాస్‌వర్డ్")}>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                autoComplete="new-password"
              />
            </AuthField>
            <AuthField label={t("Confirm password", "పాస్‌వర్డ్ నిర్ధారణ")}>
              <input
                type="password"
                value={registerForm.confirm_password}
                onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
                autoComplete="new-password"
              />
            </AuthField>
            <button
              type="button"
              className="auth-submit"
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
              {t("Create account", "అకౌంట్ సృష్టించు")}
            </button>
            <button className="auth-link auth-link-muted" type="button" onClick={() => setUserMode(USER_MODES.login)}>
              {t("Back to sign in", "లాగిన్‌కు తిరిగి వెళ్ళు")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
