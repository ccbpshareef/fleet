import { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme";
import { space, ui } from "../mobileUi";
import { languageOptionLabel, roleLabel } from "../utils/i18n";

export default function ProfileSettingsModal({
  visible,
  onClose,
  language = "en",
  authUser,
  form,
  setForm,
  profileImageUrl,
  profileInitial,
  onSave,
  onLogout,
  onLanguageChange,
  onSelectImage,
  onCaptureImage,
  loading = false,
  periodSummary = null,
  needsSetup = false
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  useEffect(() => {
    if (!visible) setShowPhotoMenu(false);
  }, [visible]);

  function pickFromGallery() {
    setShowPhotoMenu(false);
    onSelectImage?.();
  }

  function pickFromCamera() {
    setShowPhotoMenu(false);
    onCaptureImage?.();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Pressable
              style={styles.avatarWrap}
              onPress={() => setShowPhotoMenu((prev) => !prev)}
              accessibilityLabel={t("Change profile photo", "ప్రొఫైల్ ఫోటో మార్చు")}
            >
              <View style={styles.avatar}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{profileInitial}</Text>
                )}
              </View>
              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="camera" size={12} color="#fff" />
              </View>
            </Pressable>
            <View style={styles.headCopy}>
              <Text style={styles.name} numberOfLines={1}>{form.full_name || authUser?.identifier}</Text>
              <Text style={styles.meta}>
                {authUser?.identifier} · {roleLabel(language, authUser?.role)}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {showPhotoMenu ? (
            <View style={styles.photoMenu}>
              <Pressable style={styles.photoMenuBtn} onPress={pickFromGallery}>
                <MaterialCommunityIcons name="image-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.photoMenuText}>{t("Gallery", "గ్యాలరీ")}</Text>
              </Pressable>
              <Pressable style={styles.photoMenuBtn} onPress={pickFromCamera}>
                <MaterialCommunityIcons name="camera-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.photoMenuText}>{t("Camera", "కెమెరా")}</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {needsSetup ? (
              <View style={styles.setupNote}>
                <Text style={styles.setupNoteTitle}>
                  {t("Create your profile", "మీ ప్రొఫైల్ సృష్టించండి")}
                </Text>
                <Text style={styles.setupNoteText}>
                  {t("Add your name and details below. Name is required.", "కింద పేరు మరియు వివరాలు చేర్చండి. పేరు తప్పనిసరి.")}
                </Text>
              </View>
            ) : null}

            <Text style={ui.label}>{t("Name", "పేరు")}</Text>
            <TextInput
              style={ui.input}
              value={form.full_name}
              onChangeText={(v) => setForm((prev) => ({ ...prev, full_name: v }))}
              placeholder={t("Full name", "పూర్తి పేరు")}
              placeholderTextColor={colors.mutedSoft}
            />

            <View style={styles.row2}>
              <View style={styles.half}>
                <Text style={ui.label}>{t("Phone", "ఫోన్")}</Text>
                <TextInput
                  style={ui.input}
                  value={form.phone}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                  placeholder={t("Phone", "ఫోన్")}
                  placeholderTextColor={colors.mutedSoft}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.half}>
                <Text style={ui.label}>{t("Email", "ఇమెయిల్")}</Text>
                <TextInput
                  style={ui.input}
                  value={form.email}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, email: v }))}
                  placeholder={t("Email", "ఇమెయిల్")}
                  placeholderTextColor={colors.mutedSoft}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {periodSummary ? (
              <View style={styles.periodCard}>
                <Text style={styles.periodTitle}>{t("Activity", "కార్యకలాపం")} · {periodSummary.periodLabel}</Text>
                <View style={styles.periodRow}>
                  <Text style={styles.periodItem}>{t("Trips", "ట్రిప్స్")}: {periodSummary.trips}</Text>
                  <Text style={styles.periodItem}>₹{Number(periodSummary.income || 0).toFixed(0)}</Text>
                  <Text style={[styles.periodItem, styles.periodProfit]}>₹{Number(periodSummary.profit || 0).toFixed(0)}</Text>
                </View>
              </View>
            ) : null}

            <Text style={ui.label}>{t("Language", "భాష")}</Text>
            <View style={styles.langRow}>
              <Pressable
                style={[styles.langBtn, (form.preferred_language || language) === "en" && styles.langBtnOn]}
                onPress={() => onLanguageChange?.("en")}
              >
                <Text style={[styles.langText, (form.preferred_language || language) === "en" && styles.langTextOn]}>
                  {languageOptionLabel(language, "en")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.langBtn, (form.preferred_language || language) === "te" && styles.langBtnOn]}
                onPress={() => onLanguageChange?.("te")}
              >
                <Text style={[styles.langText, (form.preferred_language || language) === "te" && styles.langTextOn]}>
                  {languageOptionLabel(language, "te")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[ui.primaryBtn, (!form.full_name?.trim() || loading) && styles.btnOff]}
              onPress={onSave}
              disabled={!form.full_name?.trim() || loading}
            >
              <Text style={ui.primaryBtnText}>
                {loading
                  ? t("Saving...", "సేవ్...")
                  : needsSetup
                    ? t("Save Profile", "ప్రొఫైల్ సేవ్")
                    : t("Save", "సేవ్")}
              </Text>
            </Pressable>

            <Pressable
              style={styles.logoutBtn}
              onPress={() => {
                onClose?.();
                onLogout?.();
              }}
            >
              <MaterialCommunityIcons name="logout" size={16} color={colors.danger} />
              <Text style={styles.logoutText}>{t("Logout", "లాగౌట్")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    maxHeight: "88%",
    paddingHorizontal: space.lg,
    paddingBottom: space.lg
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
    marginTop: space.sm,
    marginBottom: space.sm
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.sm
  },
  avatarWrap: {
    position: "relative"
  },
  avatar: {
    width: 44,
    height: 44,
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
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  photoMenu: {
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.sm
  },
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
  headCopy: { flex: 1, gap: 1 },
  name: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 10, color: colors.muted, fontWeight: "600" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  body: { gap: space.sm, paddingBottom: space.md },
  setupNote: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: space.md,
    gap: 3
  },
  setupNoteTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark
  },
  setupNoteText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSoft,
    fontWeight: "600"
  },
  periodCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 4
  },
  periodTitle: { fontSize: 11, fontWeight: "800", color: colors.primaryDark },
  periodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  periodItem: { fontSize: 12, fontWeight: "700", color: colors.textSoft },
  periodProfit: { color: colors.success, fontWeight: "800" },
  row2: { flexDirection: "row", gap: space.sm },
  half: { flex: 1, gap: 2 },
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
  langBtnOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  langText: { fontSize: 11, fontWeight: "700", color: colors.muted },
  langTextOn: { color: colors.primaryDark },
  btnOff: { opacity: 0.55 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8
  },
  logoutText: { fontSize: 12, fontWeight: "800", color: colors.danger }
});
