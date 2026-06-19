import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import { colors } from "../theme";
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

function CompactField({
  icon,
  focused,
  onFocus,
  onBlur,
  secureTextEntry,
  showPasswordToggle = false,
  style,
  ...props
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  const fieldBg = focused ? "#FFFFFF" : colors.surfaceSoft;

  return (
    <View style={[styles.inputRow, focused && styles.inputRowFocused, { backgroundColor: fieldBg }]}>
      <View style={[styles.iconPill, focused && styles.iconPillFocused]}>
        <Text style={styles.inputIcon}>{icon}</Text>
      </View>
      <TextInput
        style={[styles.input, Platform.OS === "web" && styles.inputWeb, style]}
        placeholderTextColor={colors.mutedSoft}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        underlineColorAndroid="transparent"
        autoCorrect={false}
        spellCheck={false}
        secureTextEntry={isPassword && !passwordVisible}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      />
      {showPasswordToggle && isPassword ? (
        <Pressable
          style={styles.eyeBtn}
          onPress={() => setPasswordVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={passwordVisible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={focused ? colors.primaryDark : colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function PrimaryButton({ children, disabled, loading, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryBtnOuter,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && !loading && styles.primaryBtnPressed
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.primaryBtn}>
        <View style={styles.primaryBtnShine} />
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>{children}</Text>}
      </View>
    </Pressable>
  );
}

export default function LoginScreen({
  form,
  setForm,
  language = "en",
  onLogin,
  onForgotPassword,
  loading = false,
  error = ""
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
  const [focusField, setFocusField] = useState("");

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

  const registerReady =
    registerForm.identifier.trim().length >= 3 &&
    userIdCheck.available === true &&
    registerForm.phone.trim().length >= 8 &&
    registerForm.email.trim().includes("@") &&
    registerForm.password.length >= 4 &&
    registerForm.confirm_password.length >= 4;

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
    setFocusField("");
  }

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const styleId = "fleet-login-autofill-fix";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      input,
      input:focus,
      input:focus-visible,
      input:active {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
        background-color: transparent !important;
        -webkit-appearance: none;
      }
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0 1000px #F6F9FF inset !important;
        box-shadow: 0 0 0 1000px #F6F9FF inset !important;
        -webkit-text-fill-color: #0F172A !important;
        caret-color: #2563EB !important;
        transition: background-color 99999s ease-out 0s;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  const roleHint = ROLE_HINTS[activeRole];
  const idPlaceholder =
    activeRole === ROLES.driver
      ? t("Driver ID", "డ్రైవర్ ID")
      : activeRole === ROLES.loader
        ? t("Loader ID", "లోడర్ ID")
        : t("User ID", "యూజర్ ID");

  return (
    <View style={styles.root}>
      <View style={styles.skyBase} />
      <View style={styles.skyGlow} />
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <View style={styles.gridDot} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.page}>
          <View style={styles.cardShell}>
            <View style={styles.cardGlow} />
            <View style={styles.card}>
              <View style={styles.cardStripe} />

              <View style={styles.brandRow}>
                <View style={styles.logoRing}>
                  <View style={styles.logoBadge}>
                    <Text style={styles.logoEmoji}>🚛</Text>
                  </View>
                </View>
                <View style={styles.brandTextWrap}>
                  <Text style={styles.brand}>Fleet</Text>
                  <Text style={styles.brandSub} numberOfLines={1}>
                    {t("Smart fleet workspace", "స్మార్ట్ ఫ్లీట్ వర్క్‌స్పేస్")}
                  </Text>
                </View>
              </View>

              <View style={styles.tabBar}>
                {ROLE_TABS.map((tab) => {
                  const active = activeRole === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      style={[styles.tab, active && styles.tabActive]}
                      onPress={() => switchRole(tab.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={styles.tabIcon}>{tab.icon}</Text>
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {language === "te" ? tab.te : tab.en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.roleHint}>{language === "te" ? roleHint.te : roleHint.en}</Text>

              {activeRole !== ROLES.user || userMode === USER_MODES.login ? (
                <View style={styles.formBlock}>
                  <CompactField
                    icon={activeRole === ROLES.driver ? "🚚" : activeRole === ROLES.loader ? "📦" : "👤"}
                    focused={focusField === "id"}
                    onFocus={() => setFocusField("id")}
                    onBlur={() => setFocusField("")}
                    placeholder={idPlaceholder}
                    value={form.identifier}
                    onChangeText={(v) => setForm({ ...form, identifier: v })}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <CompactField
                    icon="🔒"
                    focused={focusField === "pw"}
                    onFocus={() => setFocusField("pw")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("Password", "పాస్‌వర్డ్")}
                    secureTextEntry
                    showPasswordToggle
                    value={form.password}
                    onChangeText={(v) => setForm({ ...form, password: v })}
                  />
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorMark}>!</Text>
                      <Text style={styles.errorText} numberOfLines={3}>
                        {error}
                      </Text>
                    </View>
                  ) : null}
                  <PrimaryButton
                    loading={loading}
                    onPress={() =>
                      onLogin?.({
                        register: false,
                        identifier: form.identifier,
                        password: form.password,
                        loginAs: activeRole
                      })
                    }
                  >
                    {activeRole === ROLES.driver
                      ? t("Driver login", "డ్రైవర్ లాగిన్")
                      : activeRole === ROLES.loader
                        ? t("Loader login", "లోడర్ లాగిన్")
                        : t("User login", "యూజర్ లాగిన్")}
                  </PrimaryButton>
                  {activeRole === ROLES.user ? (
                    <View style={styles.userLinksRow}>
                      <Pressable style={styles.linkChip} onPress={() => setUserMode(USER_MODES.register)}>
                        <Text style={styles.linkChipText}>{t("Create account", "అకౌంట్ సృష్టించు")}</Text>
                      </Pressable>
                      <Pressable style={styles.linkChip} onPress={() => setUserMode(USER_MODES.forgot)}>
                        <Text style={styles.linkChipText}>{t("Forgot password", "పాస్‌వర్డ్ మర్చిపోయారా")}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {activeRole === ROLES.user && userMode === USER_MODES.forgot ? (
                <View style={styles.formBlock}>
                  <Pressable style={styles.backLink} onPress={() => setUserMode(USER_MODES.login)}>
                    <Text style={styles.backLinkText}>← {t("Back to login", "లాగిన్‌కు తిరిగి")}</Text>
                  </Pressable>
                  <CompactField
                    icon="👤"
                    focused={focusField === "rid"}
                    onFocus={() => setFocusField("rid")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("User ID", "యూజర్ ID")}
                    value={form.identifier}
                    onChangeText={(v) => setForm({ ...form, identifier: v })}
                    autoCapitalize="none"
                  />
                  <CompactField
                    icon="🔑"
                    focused={focusField === "rpw"}
                    onFocus={() => setFocusField("rpw")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("New password", "కొత్త పాస్‌వర్డ్")}
                    secureTextEntry
                    showPasswordToggle
                    value={resetPassword}
                    onChangeText={setResetPassword}
                  />
                  <PrimaryButton
                    disabled={!form.identifier || !resetPassword}
                    onPress={() => onForgotPassword?.(form.identifier, resetPassword, () => setResetPassword(""))}
                  >
                    {t("Update password", "పాస్‌వర్డ్ అప్‌డేట్")}
                  </PrimaryButton>
                </View>
              ) : null}

              {activeRole === ROLES.user && userMode === USER_MODES.register ? (
                <ScrollView
                  style={styles.registerScroll}
                  contentContainerStyle={styles.formBlock}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Pressable style={styles.backLink} onPress={() => setUserMode(USER_MODES.login)}>
                    <Text style={styles.backLinkText}>← {t("Back to login", "లాగిన్‌కు తిరిగి")}</Text>
                  </Pressable>
                  <Text style={styles.registerHint}>
                    {t("Choose your User ID for sign in (letters, numbers, underscore).", "సైన్ ఇన్ కోసం మీ యూజర్ ID ఎంచుకోండి.")}
                  </Text>
                  <CompactField
                    icon="🆔"
                    focused={focusField === "uid"}
                    onFocus={() => setFocusField("uid")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("User ID", "యూజర్ ID")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={registerForm.identifier}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, identifier: v.replace(/\s/g, "_").toLowerCase() })}
                  />
                  {userIdCheck.checking ? <Text style={styles.idStatusMuted}>{t("Checking...", "తనిఖీ...")}</Text> : null}
                  {userIdCheck.available === true ? (
                    <Text style={styles.idStatusOk}>{t("User ID is available", "యూజర్ ID అందుబాటులో ఉంది")}</Text>
                  ) : null}
                  {userIdCheck.available === false ? (
                    <View style={styles.suggestBlock}>
                      <Text style={styles.idStatusBad}>
                        {userIdCheck.message || t("User ID already taken", "యూజర్ ID ఇప్పటికే ఉంది")}
                      </Text>
                      {userIdCheck.suggestions.length ? (
                        <>
                          <Text style={styles.suggestLabel}>{t("Try one of these:", "ఇవి ప్రయత్నించండి:")}</Text>
                          <View style={styles.suggestRow}>
                            {userIdCheck.suggestions.map((item) => (
                              <Pressable
                                key={item}
                                style={styles.suggestChip}
                                onPress={() => setRegisterForm({ ...registerForm, identifier: item })}
                              >
                                <Text style={styles.suggestChipText}>{item}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                  <CompactField
                    icon="📱"
                    focused={focusField === "phone"}
                    onFocus={() => setFocusField("phone")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("Phone number", "ఫోన్ నంబర్")}
                    keyboardType="phone-pad"
                    value={registerForm.phone}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, phone: v })}
                  />
                  <CompactField
                    icon="✉️"
                    focused={focusField === "email"}
                    onFocus={() => setFocusField("email")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("Email", "ఇమెయిల్")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={registerForm.email}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, email: v })}
                  />
                  <View style={styles.langBlock}>
                    <Text style={styles.langLabel}>{t("Language", "భాష")}</Text>
                    <View style={styles.langRow}>
                      {["en", "te"].map((code) => {
                        const active = registerForm.preferred_language === code;
                        return (
                          <Pressable
                            key={code}
                            style={[styles.langBtn, active && styles.langBtnActive]}
                            onPress={() => setRegisterForm({ ...registerForm, preferred_language: code })}
                          >
                            <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>
                              {languageOptionLabel(language, code)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <CompactField
                    icon="🔒"
                    focused={focusField === "npw"}
                    onFocus={() => setFocusField("npw")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("Password", "పాస్‌వర్డ్")}
                    secureTextEntry
                    showPasswordToggle
                    value={registerForm.password}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, password: v })}
                  />
                  <CompactField
                    icon="🔒"
                    focused={focusField === "cpw"}
                    onFocus={() => setFocusField("cpw")}
                    onBlur={() => setFocusField("")}
                    placeholder={t("Confirm password", "పాస్‌వర్డ్ నిర్ధారణ")}
                    secureTextEntry
                    showPasswordToggle
                    value={registerForm.confirm_password}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, confirm_password: v })}
                  />
                  <PrimaryButton
                    loading={loading}
                    disabled={!registerReady}
                    onPress={() =>
                      onLogin?.({
                        register: true,
                        loginAs: ROLES.user,
                        ...registerForm,
                        onDone: () => {
                          resetRegisterForm();
                          setUserMode(USER_MODES.login);
                        }
                      })
                    }
                  >
                    {t("Create account", "అకౌంట్ సృష్టించు")}
                  </PrimaryButton>
                </ScrollView>
              ) : null}

              <View style={styles.trustRow}>
                <View style={styles.trustDot} />
                <Text style={styles.trustText}>
                  {t("Secure login for User, Driver & Loader", "యూజర్, డ్రైవర్ & లోడర్ కోసం సురక్షితం")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 }
  },
  android: { elevation: 10 },
  default: {}
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    maxWidth: 400,
    position: "relative",
    overflow: "hidden"
  },
  flex: { flex: 1, width: "100%" },
  page: {
    flex: 1,
    justifyContent: "center",
    width: "100%"
  },
  skyBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#DCE8FF"
  },
  skyGlow: {
    position: "absolute",
    top: -80,
    left: "10%",
    right: "10%",
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)"
  },
  blobTop: {
    position: "absolute",
    top: -30,
    right: -24,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.22)"
  },
  blobBottom: {
    position: "absolute",
    bottom: 12,
    left: -40,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: "rgba(14, 165, 233, 0.2)"
  },
  gridDot: {
    position: "absolute",
    top: "18%",
    left: 12,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.35)"
  },
  cardShell: {
    width: "100%",
    position: "relative"
  },
  cardGlow: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    bottom: -6,
    borderRadius: 26,
    backgroundColor: "rgba(37, 99, 235, 0.14)"
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    overflow: "hidden",
    ...cardShadow
  },
  cardStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.primary
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2
  },
  logoRing: {
    padding: 3,
    borderRadius: 18,
    backgroundColor: "rgba(37, 99, 235, 0.12)"
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  logoEmoji: { fontSize: 24 },
  brandTextWrap: { flex: 1 },
  brand: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.6
  },
  brandSub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 2,
    borderRadius: 11
  },
  tabIcon: {
    fontSize: 14
  },
  roleHint: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.textSoft,
    marginTop: -2
  },
  userLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  linkChip: {
    flex: 1,
    minWidth: "46%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center"
  },
  linkChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "center"
  },
  backLink: {
    alignSelf: "flex-start",
    paddingVertical: 2
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 }
      },
      android: { elevation: 2 },
      default: {}
    })
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.muted
  },
  tabTextActive: {
    color: colors.primaryDark
  },
  formBlock: { gap: 9 },
  registerScroll: { maxHeight: 340 },
  registerHint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 2
  },
  langBlock: { gap: 6 },
  langLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSoft
  },
  langRow: { flexDirection: "row", gap: 8 },
  langBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 9,
    alignItems: "center"
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted
  },
  langBtnTextActive: {
    color: colors.primaryDark
  },
  idStatusMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted
  },
  idStatusOk: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.success
  },
  idStatusBad: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
    lineHeight: 15
  },
  suggestBlock: { gap: 6 },
  suggestLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSoft
  },
  suggestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  suggestChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  suggestChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    height: 46
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: "#FFFFFF"
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  iconPillFocused: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted
  },
  inputIcon: { fontSize: 14 },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent"
  },
  inputWeb: {
    outlineStyle: "none",
    outlineWidth: 0,
    borderWidth: 0,
    boxShadow: "none"
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  errorMark: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.danger,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 18,
    overflow: "hidden"
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
    lineHeight: 15
  },
  primaryBtnOuter: {
    borderRadius: 15,
    marginTop: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 }
      },
      android: { elevation: 4 },
      default: {}
    })
  },
  primaryBtnPressed: { transform: [{ scale: 0.985 }] },
  primaryBtn: {
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  primaryBtnShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "48%",
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14.5,
    letterSpacing: 0.2
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 2
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.success
  },
  trustText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted
  }
});
