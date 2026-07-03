import { useEffect, useState } from "react";
import { api } from "../api";
import { languageOptionLabel } from "../utils/i18n";

const ROLES = { user: "user", driver: "driver", loader: "loader" };
const USER_MODES = { login: "login", register: "register", forgot: "forgot" };
const SIGNUP_ROLES = new Set([ROLES.user, ROLES.loader]);

const ROLE_TABS = [
  { id: ROLES.user, en: "Fleet Owner", te: "ఫ్లీట్ యజమాని", shortEn: "Owner", shortTe: "యజమాని" },
  { id: ROLES.driver, en: "Driver", te: "డ్రైవర్", shortEn: "Driver", shortTe: "డ్రైవర్" },
  { id: ROLES.loader, en: "Loader", te: "లోడర్", shortEn: "Loader", shortTe: "లోడర్" }
];

const HERO_FEATURES = [
  {
    key: "fleet",
    en: { title: "Smart Fleet Management", desc: "Track trips, routes, and deliveries in real time." },
    te: { title: "స్మార్ట్ ఫ్లీట్ నిర్వహణ", desc: "ట్రిప్స్, మార్గాలు మరియు డెలివరీలను రియల్ టైమ్‌లో ట్రాక్ చేయండి." }
  },
  {
    key: "drivers",
    en: { title: "Driver & Vehicle Oversight", desc: "Manage drivers, lorries, and assignments with ease." },
    te: { title: "డ్రైవర్ & వాహనం పర్యవేక్షణ", desc: "డ్రైవర్లు, లారీలు మరియు అసైన్‌మెంట్‌లను సులభంగా నిర్వహించండి." }
  },
  {
    key: "data",
    en: { title: "Data-Driven Decisions", desc: "Insights on profit, expenses, and fleet performance." },
    te: { title: "డేటా ఆధారిత నిర్ణయాలు", desc: "లాభం, ఖర్చులు మరియు ఫ్లీట్ పనితీరు పై అంతర్దృష్టులు." }
  }
];

const PAGE_FOOTER_FEATURES = [
  {
    key: "secure",
    en: "Secure & Reliable",
    te: "సురక్షితం & నమ్మకమైనది",
    icon: (
      <path
        fillRule="evenodd"
        d="M9.661 2.237a1.75 1.75 0 011.678 0l5.25 2.879A1.75 1.75 0 0118 6.629v5.742a7.5 7.5 0 01-3.75 6.5l-4.5 2.25a1.75 1.75 0 01-1.5 0l-4.5-2.25A7.5 7.5 0 012 12.37V6.63a1.75 1.75 0 01.961-1.513l5.25-2.88z"
        clipRule="evenodd"
      />
    )
  },
  {
    key: "available",
    en: "Always Available",
    te: "ఎప్పుడూ అందుబాటులో",
    icon: (
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    )
  },
  {
    key: "support",
    en: "24/7 Support",
    te: "24/7 మద్దతు",
    icon: (
      <path d="M3.5 4.5a2.5 2.5 0 015 0v1.25a.75.75 0 001.5 0V4.5a4 4 0 00-8 0v1.25a.75.75 0 001.5 0V4.5zM2 10.75v3.5A2.75 2.75 0 004.75 17h10.5A2.75 2.75 0 0018 14.25v-3.5a.75.75 0 00-1.5 0v3.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-3.5a.75.75 0 00-1.5 0z" />
    )
  }
];

const REGISTER_COPY = {
  user: {
    title: { en: "Create fleet owner account", te: "ఫ్లీట్ యజమాని అకౌంట్ సృష్టించు" },
    desc: {
      en: "Choose a User ID for sign in (letters, numbers, underscore).",
      te: "సైన్ ఇన్ కోసం యూజర్ ID ఎంచుకోండి."
    },
    idLabel: { en: "User ID", te: "యూజర్ ID" }
  },
  loader: {
    title: { en: "Create loader account", te: "లోడర్ అకౌంట్ సృష్టించు" },
    desc: {
      en: "Choose a Loader ID for sign in (letters, numbers, underscore).",
      te: "సైన్ ఇన్ కోసం లోడర్ ID ఎంచుకోండి."
    },
    idLabel: { en: "Loader ID", te: "లోడర్ ID" }
  }
};

function RoleTabIcon({ roleId }) {
  if (roleId === ROLES.user) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M6.5 3a2.5 2.5 0 00-2.5 2.5v1.25H3a.75.75 0 000 1.5h1v1.25A2.5 2.5 0 006.5 12h7a2.5 2.5 0 002.5-2.5V8h1a.75.75 0 000-1.5h-1V5.5A2.5 2.5 0 0013.5 3h-7zm7 4H6.5a1 1 0 01-1-1V5.5a1 1 0 011-1h7a1 1 0 011 1V6a1 1 0 01-1 1z" />
        <path d="M4 13.25a.75.75 0 000 1.5h12a.75.75 0 000-1.5H4z" />
      </svg>
    );
  }
  if (roleId === ROLES.driver) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 11.5a3.5 3.5 0 117 0v.25H6v-.25z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 015.5 4h9A1.5 1.5 0 0116 5.5v9A1.5 1.5 0 0114.5 16h-9A1.5 1.5 0 014 14.5v-9zM6 7h8v6H6V7z" />
    </svg>
  );
}

function FeatureIcon({ featureKey }) {
  if (featureKey === "fleet") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.618a2 2 0 011.553-1.947L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A2 2 0 0021 17.382V8.618a2 2 0 00-1.553-1.947L15 4m0 13V4m0 0L9 2" />
      </svg>
    );
  }
  if (featureKey === "drivers") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a4 4 0 11-8 0 4 4 0 018 0zm-6 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m-6 0H5m6 0v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m0 0v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" />
    </svg>
  );
}

function AuthInput({ label, id, type = "text", value, onChange, placeholder, autoComplete, icon, trailing }) {
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <div className="auth-input-wrap">
        {icon ? <span className="auth-input-icon">{icon}</span> : null}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
        />
        {trailing || null}
      </div>
    </label>
  );
}

function PasswordInput({ label, id, value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthInput
      label={label}
      id={id}
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
      }
      trailing={
        <button
          type="button"
          className="auth-input-trailing"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.027 10.027 0 003.3-4.38 1.651 1.651 0 000-1.015 10.027 10.027 0 00-3.3-4.38l2.22-2.22a.75.75 0 00-1.06-1.06l-1.32 1.32-12.5-12.5zM10 12.25a2.25 2.25 0 01-2.122-1.5H10a.75.75 0 000-1.5H7.878A2.25 2.25 0 0110 7.75c.414 0 .806.112 1.14.308l1.07-1.07A3.75 3.75 0 0010 6.25 3.75 3.75 0 006.25 10c0 .966.366 1.848.966 2.512l1.07-1.07A2.247 2.247 0 0110 12.25z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path
                fillRule="evenodd"
                d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      }
    />
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

function RegisterForm({
  language,
  registerRole,
  registerForm,
  setRegisterForm,
  userIdCheck,
  onRegister,
  onBack
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const copy = REGISTER_COPY[registerRole] || REGISTER_COPY.user;

  return (
    <div className="auth-subpanel">
      <header className="auth-panel-head">
        <h2>{t(copy.title.en, copy.title.te)}</h2>
        <p>{t(copy.desc.en, copy.desc.te)}</p>
      </header>
      <AuthInput
        label={t(copy.idLabel.en, copy.idLabel.te)}
        id="register-identifier"
        value={registerForm.identifier}
        onChange={(e) =>
          setRegisterForm({ ...registerForm, identifier: e.target.value.replace(/\s/g, "_").toLowerCase() })
        }
        autoComplete="username"
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 11.5a3.5 3.5 0 117 0v.25H6v-.25z" />
          </svg>
        }
      />
      {userIdCheck.checking ? <p className="auth-id-status">{t("Checking availability…", "తనిఖీ అవుతోంది…")}</p> : null}
      {userIdCheck.available === true ? (
        <p className="auth-id-status ok">{t("ID is available", "ID అందుబాటులో ఉంది")}</p>
      ) : null}
      {userIdCheck.available == null && userIdCheck.message ? (
        <p className="auth-id-status warn">{userIdCheck.message}</p>
      ) : null}
      {userIdCheck.available === false ? (
        <div>
          <p className="auth-id-status bad">
            {userIdCheck.message || t("ID already taken", "ID ఇప్పటికే ఉంది")}
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
      <AuthInput
        label={t("Phone number", "ఫోన్ నంబర్")}
        id="register-phone"
        value={registerForm.phone}
        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
        autoComplete="tel"
        placeholder={t("Enter phone number", "ఫోన్ నంబర్ నమోదు చేయండి")}
      />
      <AuthInput
        label={t("Email", "ఇమెయిల్")}
        id="register-email"
        type="email"
        value={registerForm.email}
        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
        autoComplete="email"
        placeholder={t("you@example.com", "you@example.com")}
      />
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
      <PasswordInput
        label={t("Password", "పాస్‌వర్డ్")}
        id="register-password"
        value={registerForm.password}
        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
        autoComplete="new-password"
        placeholder={t("Create a password", "పాస్‌వర్డ్ సృష్టించండి")}
      />
      <PasswordInput
        label={t("Confirm password", "పాస్‌వర్డ్ నిర్ధారణ")}
        id="register-confirm"
        value={registerForm.confirm_password}
        onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
        autoComplete="new-password"
        placeholder={t("Confirm password", "పాస్‌వర్డ్ నిర్ధారించండి")}
      />
      <button
        type="button"
        className="auth-submit"
        onClick={() =>
          onRegister?.({
            ...registerForm,
            accountType: registerRole,
            onDone: onBack
          })
        }
        disabled={
          registerForm.identifier.trim().length < 3 ||
          userIdCheck.available === false ||
          userIdCheck.checking ||
          registerForm.phone.trim().length < 8 ||
          !registerForm.email.trim().includes("@") ||
          registerForm.password.length < 4 ||
          registerForm.confirm_password.length < 4
        }
      >
        <span>{t("Create account", "అకౌంట్ సృష్టించు")}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <p className="auth-switch-prompt">
        {t("Already have an account?", "ఇప్పటికే అకౌంట్ ఉందా?")}{" "}
        <button className="auth-link" type="button" onClick={onBack}>
          {t("Sign in", "లాగిన్")}
        </button>
      </p>
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
  const [themeMode, setThemeMode] = useState("light");
  const [activeRole, setActiveRole] = useState(ROLES.user);
  const [userMode, setUserMode] = useState(USER_MODES.login);
  const [rememberMe, setRememberMe] = useState(false);
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

  const supportsSignup = SIGNUP_ROLES.has(activeRole);
  const isRegisterMode = supportsSignup && userMode === USER_MODES.register;
  const isForgotMode = activeRole === ROLES.user && userMode === USER_MODES.forgot;
  const showLoginForm = !isRegisterMode && !isForgotMode;

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
    if (!isRegisterMode) return;
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
        setUserIdCheck({
          checking: false,
          available: null,
          suggestions: [],
          message:
            language === "te"
              ? "ID తనిఖీ విఫలమైంది — API అందుబాటులో లేదు లేదా నెమ్మదిగా ఉంది. మీరు ఇంకా సైన్ అప్ ప్రయత్నించవచ్చు."
              : "Could not verify ID — API unreachable or slow. You can still try creating an account."
        });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [registerForm.identifier, isRegisterMode, language]);

  function switchRole(roleId) {
    setActiveRole(roleId);
    setUserMode(USER_MODES.login);
  }

  function openRegister() {
    resetRegisterForm();
    setUserMode(USER_MODES.register);
  }

  function backToLogin() {
    resetRegisterForm();
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

  const idLabel =
    activeRole === ROLES.driver
      ? t("Driver ID", "డ్రైవర్ ID")
      : activeRole === ROLES.loader
        ? t("Loader ID", "లోడర్ ID")
        : t("User ID", "యూజర్ ID");

  const panelTitle = isRegisterMode
    ? t("Create your account", "మీ అకౌంట్ సృష్టించండి")
    : isForgotMode
      ? t("Reset password", "పాస్‌వర్డ్ రీసెట్")
      : t("Welcome back", "మళ్ళీ స్వాగతం");

  const panelSubtitle = isRegisterMode
    ? t("Fill in your details to get started.", "ప్రారంభించడానికి మీ వివరాలు నమోదు చేయండి.")
    : isForgotMode
      ? t("Enter your User ID and choose a new password.", "మీ యూజర్ ID నమోదు చేసి కొత్త పాస్‌వర్డ్ ఎంచుకోండి.")
      : t("Sign in to access your fleet workspace.", "మీ ఫ్లీట్ వర్క్‌స్పేస్‌ను యాక్సెస్ చేయడానికి సైన్ ఇన్ చేయండి.");

  return (
    <div className={`auth-page ${themeMode === "dark" ? "auth-page-dark" : ""}`}>
      <div className="auth-page-controls" aria-label={t("Display options", "ప్రదర్శన ఎంపికలు")}>
        <span className="auth-page-controls-label">{t("Theme", "థీమ్")}</span>
        <button
          type="button"
          className={`auth-control-btn ${themeMode === "light" ? "active" : ""}`}
          aria-label={t("Light mode", "లైట్ మోడ్")}
          title={t("Light mode", "లైట్ మోడ్")}
          onClick={() => setThemeMode("light")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 3.25a.75.75 0 01.75.75v1.25a.75.75 0 01-1.5 0V4a.75.75 0 01.75-.75zm0 10a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5zm6-3.25a.75.75 0 01.75-.75H18a.75.75 0 010 1.5h-1.25A.75.75 0 0116 10zm-6 6a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0v-1.25a.75.75 0 01.75-.75zm-6-6a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H4.75A.75.75 0 014 10zm9.72-4.97a.75.75 0 011.06 0l.884.884a.75.75 0 01-1.06 1.06l-.884-.884a.75.75 0 010-1.06zm-7.44 7.44a.75.75 0 011.06 0l.884.884a.75.75 0 11-1.06 1.06l-.884-.884a.75.75 0 010-1.06zm9.384 1.944a.75.75 0 010 1.06l-.884.884a.75.75 0 01-1.06-1.06l.884-.884a.75.75 0 011.06 0zM7.22 5.03a.75.75 0 010 1.06l-.884.884a.75.75 0 11-1.06-1.06l.884-.884a.75.75 0 011.06 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>{t("Light", "లైట్")}</span>
            </button>
        <button
          type="button"
          className={`auth-control-btn ${themeMode === "dark" ? "active" : ""}`}
          aria-label={t("Dark mode", "డార్క్ మోడ్")}
          title={t("Dark mode", "డార్క్ మోడ్")}
          onClick={() => setThemeMode("dark")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M11.714 2.296a.75.75 0 00-.973.824 6.5 6.5 0 018.252 8.253.75.75 0 00.824-.973A8 8 0 1111.714 2.296z" />
          </svg>
          <span>{t("Dark", "డార్క్")}</span>
          </button>
      </div>
      <div className="auth-layout">
        <aside className="auth-hero" aria-label={t("Fleet Workspace", "ఫ్లీట్ వర్క్‌స్పేస్")}>
          <div className="auth-hero-content">
            <div className="auth-hero-brand">
              <div className="auth-brand-mark" aria-hidden="true">
                FL
              </div>
              <div>
                <h1>{t("Fleet Workspace", "ఫ్లీట్ వర్క్‌స్పేస్")}</h1>
                <p>{t("Manage trips, drivers, and fleet operations with ease.", "ట్రిప్స్, డ్రైవర్లు మరియు ఫ్లీట్ ఆపరేషన్స్‌ను సులభంగా నిర్వహించండి.")}</p>
              </div>
            </div>
            <ul className="auth-hero-features">
              {HERO_FEATURES.map((feature) => {
                const copy = language === "te" ? feature.te : feature.en;
                return (
                  <li key={feature.key}>
                    <span className="auth-hero-feature-icon">
                      <FeatureIcon featureKey={feature.key} />
                    </span>
                    <span>
                      <strong>{copy.title}</strong>
                      <span>{copy.desc}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            {!isForgotMode ? (
              <div className="auth-role-tabs" role="tablist" aria-label={t("Account type", "అకౌంట్ రకం")}>
                {ROLE_TABS.map((tab) => {
                  const active = activeRole === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`auth-role-tab ${active ? "active" : ""}`}
                      onClick={() => switchRole(tab.id)}
                    >
                      <RoleTabIcon roleId={tab.id} />
                      <span className="auth-role-tab-label">{language === "te" ? tab.te : tab.en}</span>
                      <span className="auth-role-tab-label-short">{language === "te" ? tab.shortTe : tab.shortEn}</span>
                    </button>
                  );
                })}
              </div>
      ) : null}

            {isRegisterMode ? (
              <RegisterForm
                language={language}
                registerRole={activeRole}
                registerForm={registerForm}
                setRegisterForm={setRegisterForm}
                userIdCheck={userIdCheck}
                onRegister={onRegister}
                onBack={backToLogin}
              />
            ) : (
              <>
                <header className="auth-panel-head">
                  <h2>{panelTitle}</h2>
                  <p>{panelSubtitle}</p>
                </header>

                {isForgotMode ? (
                  <div className="auth-subpanel">
                    <AuthInput
                      label={t("User ID", "యూజర్ ID")}
                      id="forgot-identifier"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                      autoComplete="username"
                      icon={
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 11.5a3.5 3.5 0 117 0v.25H6v-.25z" />
                        </svg>
                      }
                    />
                    <PasswordInput
                      label={t("New password", "కొత్త పాస్‌వర్డ్")}
                      id="forgot-password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder={t("Enter new password", "కొత్త పాస్‌వర్డ్ నమోదు చేయండి")}
          />
          <button
            type="button"
                      className="auth-submit"
            onClick={() => onForgotPassword?.(form.identifier, resetPassword, () => setResetPassword(""))}
            disabled={!form.identifier || !resetPassword}
          >
                      <span>{t("Update password", "పాస్‌వర్డ్ నవీకరించు")}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                          clipRule="evenodd"
                        />
                      </svg>
          </button>
                    <p className="auth-switch-prompt">
                      {t("Remember your password?", "పాస్‌వర్డ్ గుర్తుందా?")}{" "}
                      <button className="auth-link" type="button" onClick={() => setUserMode(USER_MODES.login)}>
                        {t("Sign in", "లాగిన్")}
                      </button>
                    </p>
                  </div>
                ) : showLoginForm ? (
                  <>
                    <form className="auth-form" onSubmit={submit}>
                      <AuthInput
                        label={idLabel}
                        id="login-identifier"
                        value={form.identifier}
                        onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                        autoComplete="username"
                        placeholder={t("Enter your ID", "మీ ID నమోదు చేయండి")}
                        icon={
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 11.5a3.5 3.5 0 117 0v.25H6v-.25z" />
                          </svg>
                        }
                      />
                      <PasswordInput
                        label={t("Password", "పాస్‌వర్డ్")}
                        id="login-password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        autoComplete="current-password"
                        placeholder={t("Enter your password", "పాస్‌వర్డ్ నమోదు చేయండి")}
                      />
                      <div className="auth-form-options">
                        <label className="auth-remember">
          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <span>{t("Remember me", "నన్ను గుర్తుంచుకో")}</span>
                        </label>
                        {activeRole === ROLES.user ? (
              <button
                            className="auth-link auth-link-inline"
                type="button"
                            onClick={() => setUserMode(USER_MODES.forgot)}
                          >
                            {t("Forgot password?", "పాస్‌వర్డ్ మర్చిపోయారా?")}
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                      {notice ? <AuthAlert type="notice">{notice}</AuthAlert> : null}
                      {error ? <AuthAlert type="error">{error}</AuthAlert> : null}
                      <button type="submit" className="auth-submit" disabled={loading}>
                        <span>{loading ? t("Signing in…", "సైన్ ఇన్ అవుతోంది…") : t("Sign in", "లాగిన్")}</span>
                        {!loading ? (
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : null}
                      </button>
                    </form>
                    <div className="auth-divider">
                      <span>{t("or", "లేదా")}</span>
                    </div>
                    <button type="button" className="auth-sso-btn" disabled title={t("Coming soon", "త్వరలో")}>
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M9.661 2.237a1.75 1.75 0 011.678 0l5.25 2.879A1.75 1.75 0 0118 6.629v5.742a7.5 7.5 0 01-3.75 6.5l-4.5 2.25a1.75 1.75 0 01-1.5 0l-4.5-2.25A7.5 7.5 0 012 12.37V6.63a1.75 1.75 0 01.961-1.513l5.25-2.88z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{t("Sign in with SSO", "SSO తో సైన్ ఇన్")}</span>
                    </button>
                    {supportsSignup ? (
                      <p className="auth-switch-prompt">
                        {t("Need an account?", "అకౌంట్ కావాలా?")}{" "}
                        <button className="auth-link" type="button" onClick={openRegister}>
                          {t("Sign up", "సైన్ అప్")}
              </button>
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="auth-page-footer">
        <div className="auth-page-footer-features">
          {PAGE_FOOTER_FEATURES.map((item) => (
            <div key={item.key} className="auth-page-footer-item">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                {item.icon}
              </svg>
              <span>{language === "te" ? item.te : item.en}</span>
            </div>
          ))}
        </div>
        <div className="auth-page-footer-legal">
          <span>{t("© 2025 Fleet Workspace. All rights reserved.", "© 2025 Fleet Workspace. అన్ని హక్కులు రక్షించబడ్డాయి.")}</span>
          <span className="auth-page-footer-links">
            <button type="button" className="auth-link auth-link-muted auth-link-inline">
              {t("Privacy Policy", "గోప్యతా విధానం")}
          </button>
            <button type="button" className="auth-link auth-link-muted auth-link-inline">
              {t("Terms of Service", "సేవా నిబంధనలు")}
          </button>
          </span>
        </div>
      </footer>
    </div>
  );
}
