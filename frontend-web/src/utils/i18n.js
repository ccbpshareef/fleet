export function t(language, en, te) {
  return language === "te" ? te : en;
}

export function formatMoney(language, amount) {
  const value = Number(amount || 0).toFixed(2);
  return language === "te" ? `₹${value}` : `Rs.${value}`;
}

export function na(language) {
  return t(language, "N/A", "లేదు");
}

export function activeLabel(language, isActive) {
  return t(language, isActive ? "Active" : "Inactive", isActive ? "యాక్టివ్" : "ఇనాక్టివ్");
}

export function roleLabel(language, role) {
  if (role === "admin") return t(language, "Admin", "అడ్మిన్");
  if (role === "driver") return t(language, "Driver", "డ్రైవర్");
  if (role === "user") return t(language, "User", "యూజర్");
  return role || "";
}

export function languageOptionLabel(language, code) {
  if (language === "te") {
    return code === "en" ? "ఇంగ్లీష్" : "తెలుగు";
  }
  return code === "en" ? "English" : "Telugu";
}

export function languageToggleLabel(currentLanguage) {
  return currentLanguage === "en" ? "తెలుగు" : "ఇంగ్లీష్";
}
