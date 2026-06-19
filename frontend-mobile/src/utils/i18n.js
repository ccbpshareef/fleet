/** Shared UI translations for mobile fleet app. */

export function t(language, en, te) {
  return language === "te" ? te : en;
}

export function formatMoney(language, amount) {
  const value = Number(amount || 0).toFixed(2);
  return language === "te" ? `₹${value}` : `Rs.${value}`;
}

export function formatMoneyShort(language, amount) {
  const value = Number(amount || 0).toFixed(0);
  return language === "te" ? `₹${value}` : `Rs.${value}`;
}

export function na(language) {
  return t(language, "N/A", "లేదు");
}

export function activeLabel(language, isActive) {
  return t(language, isActive ? "Active" : "Inactive", isActive ? "యాక్టివ్" : "ఇనాక్టివ్");
}

export function assignmentStatusLabel(language, status) {
  if (language !== "te") return status || "";
  if (status === "Active") return "యాక్టివ్";
  if (status === "Completed") return "పూర్తయింది";
  return status || "";
}

export function roleLabel(language, role) {
  if (role === "admin") return t(language, "Admin", "అడ్మిన్");
  if (role === "driver") return t(language, "Driver", "డ్రైవర్");
  if (role === "user") return t(language, "User", "యూజర్");
  return role || "";
}

/** Language picker: both labels in the active UI language. */
export function languageOptionLabel(language, code) {
  if (language === "te") {
    return code === "en" ? "ఇంగ్లీష్" : "తెలుగు";
  }
  return code === "en" ? "English" : "Telugu";
}

export function languageToggleLabel(currentLanguage) {
  return currentLanguage === "en" ? "తెలుగు" : "ఇంగ్లీష్";
}
