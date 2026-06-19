import { languageOptionLabel, roleLabel } from "../utils/i18n";

export default function ProfileSetupPage({ language = "en", form, setForm, onSave, onImageUpload, onLanguageChange, loading = false, user }) {
  const t = (en, te) => (language === "te" ? te : en);

  function submit(e) {
    e.preventDefault();
    onSave?.();
  }

  return (
    <section className="panel login-panel profile-setup">
      <div className="profile-icon">
        {form.profile_image_url ? (
          <img src={form.profile_image_url} alt={form.full_name || user?.identifier || "Profile"} className="avatar-img" />
        ) : (
          "👤"
        )}
      </div>
      <h2>{t("Create Your Profile", "మీ ప్రొఫైల్ సృష్టించండి")}</h2>
      <p className="muted">{t("Please complete profile to continue.", "కొనసాగడానికి ప్రొఫైల్ పూర్తి చేయండి.")}</p>
      <p className="muted">
        {user?.identifier} {user?.role === "admin" ? `🛡 ${roleLabel(language, "admin")}` : `👤 ${roleLabel(language, "user")}`}
      </p>
      <form className="form-grid single" onSubmit={submit}>
        <input
          placeholder={t("Full Name", "పూర్తి పేరు")}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <input
          placeholder={t("Phone Number", "ఫోన్ నంబర్")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder={t("Email (optional)", "ఇమెయిల్ (ఐచ్చికం)")}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select
          value={form.preferred_language || "en"}
          onChange={(e) => {
            setForm({ ...form, preferred_language: e.target.value });
            onLanguageChange?.(e.target.value);
          }}
        >
          <option value="en">{languageOptionLabel(language, "en")}</option>
          <option value="te">{languageOptionLabel(language, "te")}</option>
        </select>
        <input type="file" accept="image/*" onChange={onImageUpload} />
        <button type="submit" disabled={loading || !form.full_name}>
          {loading ? t("Saving...", "సేవ్ అవుతోంది...") : t("Save Profile", "ప్రొఫైల్ సేవ్ చేయండి")}
        </button>
      </form>
    </section>
  );
}
