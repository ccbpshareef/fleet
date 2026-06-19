import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme";
import { space, ui } from "../mobileUi";
import { languageOptionLabel } from "../utils/i18n";

export default function ProfileSetupScreen({
  language = "en",
  form,
  setForm,
  onSave,
  onLanguageChange,
  onSelectImage,
  onCaptureImage,
  loading = false
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const avatarInitial = (form.full_name || "F").slice(0, 1).toUpperCase();
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  return (
    <View style={styles.shell}>
      <View style={styles.head}>
        <Pressable style={styles.avatarWrap} onPress={() => setShowPhotoMenu((prev) => !prev)}>
          <View style={styles.avatar}>
            {form.profile_image_url ? (
              <Image source={{ uri: form.profile_image_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            )}
          </View>
          <View style={styles.avatarBadge}>
            <MaterialCommunityIcons name="camera" size={12} color="#fff" />
          </View>
        </Pressable>
        <Text style={ui.screenTitle}>{t("Your profile", "మీ ప్రొఫైల్")}</Text>
      </View>

      {showPhotoMenu ? (
        <View style={styles.photoMenu}>
          <Pressable
            style={styles.photoMenuBtn}
            onPress={() => {
              setShowPhotoMenu(false);
              onSelectImage?.();
            }}
          >
            <MaterialCommunityIcons name="image-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.photoMenuText}>{t("Gallery", "గ్యాలరీ")}</Text>
          </Pressable>
          <Pressable
            style={styles.photoMenuBtn}
            onPress={() => {
              setShowPhotoMenu(false);
              onCaptureImage?.();
            }}
          >
            <MaterialCommunityIcons name="camera-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.photoMenuText}>{t("Camera", "కెమెరా")}</Text>
          </Pressable>
        </View>
      ) : null}

      <TextInput style={ui.input} placeholder={t("Full name", "పూర్తి పేరు")} placeholderTextColor={colors.mutedSoft} value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} />
      <TextInput style={ui.input} placeholder={t("Phone", "ఫోన్")} placeholderTextColor={colors.mutedSoft} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} />
      <TextInput style={ui.input} placeholder={t("Email", "ఇమెయిల్")} placeholderTextColor={colors.mutedSoft} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />

      <View style={styles.langRow}>
        {["en", "te"].map((code) => (
          <Pressable
            key={code}
            style={[styles.langBtn, (form.preferred_language || language) === code && styles.langBtnActive]}
            onPress={() => {
              setForm({ ...form, preferred_language: code });
              onLanguageChange?.(code);
            }}
          >
            <Text style={[styles.langText, (form.preferred_language || language) === code && styles.langTextActive]}>
              {languageOptionLabel(language, code)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[ui.primaryBtn, (!form.full_name || loading) && styles.disabled]} onPress={onSave} disabled={!form.full_name || loading}>
        <Text style={ui.primaryBtnText}>{loading ? t("Saving...", "సేవ్...") : t("Save", "సేవ్")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  photoMenu: { flexDirection: "row", gap: space.sm },
  photoMenuBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft
  },
  photoMenuText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  langRow: { flexDirection: "row", gap: space.sm },
  langBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft
  },
  langBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  langText: { fontSize: 11, fontWeight: "700", color: colors.muted },
  langTextActive: { color: colors.primaryDark },
  disabled: { opacity: 0.6 }
});
