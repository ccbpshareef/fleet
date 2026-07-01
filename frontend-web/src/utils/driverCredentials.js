export function buildDriverCreatePayload(form) {
  const loginId = (form.login_identifier || "").trim().toLowerCase();
  const password = (form.password || "").trim();
  const payload = {
    name: (form.name || "").trim(),
    phone: (form.phone || "").trim(),
    license_number: (form.license_number || "").trim() || null
  };
  if (loginId) payload.login_identifier = loginId;
  if (password) payload.password = password;
  return { payload, loginId, password };
}

export function validateDriverCreateForm({ loginId, password, name, phone }, language = "en") {
  const t = (en, te) => (language === "te" ? te : en);
  if (!name?.trim() || !phone?.trim()) {
    return t("Driver name and phone are required.", "పేరు మరియు ఫోన్ అవసరం.");
  }
  if (loginId && loginId.length < 3) {
    return t("Login ID must be at least 3 characters.", "లాగిన్ ID కనీసం 3 అక్షరాలు ఉండాలి.");
  }
  if (loginId && password && password.length < 4) {
    return t("Password must be at least 4 characters.", "పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి.");
  }
  return "";
}

export function driverCredentialSummary(created, language = "en") {
  const t = (en, te) => (language === "te" ? te : en);
  const loginId = created?.login_identifier || "—";
  let passwordText;
  if (created?.initial_password) {
    passwordText = created.initial_password;
  } else if (!created?.password_auto_generated && !created?.login_auto_generated) {
    passwordText = t("(password you entered)", "(మీరు ఇచ్చిన పాస్‌వర్డ్)");
  } else {
    passwordText = t("(auto-generated)", "(ఆటో జనరేట్)");
  }
  return {
    loginId,
    passwordText,
    signInHint: t(
      "Driver must open the login page and choose the Driver tab.",
      "డ్రైవర్ లాగిన్ పేజీలో డ్రైవర్ ట్యాబ్ ఎంచుకోవాలి."
    )
  };
}

export function driverCredentialClipboardText(created, language = "en") {
  const { loginId, passwordText, signInHint } = driverCredentialSummary(created, language);
  const t = (en, te) => (language === "te" ? te : en);
  return [
    t("Fleet driver login", "ఫ్లీట్ డ్రైవర్ లాగిన్"),
    `${t("Login ID", "లాగిన్ ID")}: ${loginId}`,
    `${t("Password", "పాస్‌వర్డ్")}: ${passwordText}`,
    signInHint
  ].join("\n");
}
