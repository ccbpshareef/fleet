import { StyleSheet } from "react-native";
import { colors, radius, typography } from "./theme";

export const space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24
};

export const ui = StyleSheet.create({
  page: { gap: space.md },
  screenHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm
  },
  screenTitle: {
    fontSize: typography.lg,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3
  },
  screenSubtitle: {
    fontSize: typography.sm,
    color: colors.muted,
    lineHeight: 20,
    marginTop: 2
  },
  screenBadge: {
    fontSize: typography.xs,
    fontWeight: "800",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: "hidden"
  },
  helpBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    backgroundColor: colors.surfaceMuted
  },
  helpBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  helpBannerText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.textSoft,
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    padding: space.md,
    gap: space.sm
  },
  rowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.sm
  },
  label: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  title: {
    fontSize: typography.md,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    lineHeight: 22
  },
  meta: {
    fontSize: typography.sm,
    color: colors.textSoft,
    lineHeight: 20
  },
  status: {
    fontSize: typography.xs,
    fontWeight: "800",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: "hidden"
  },
  empty: {
    paddingVertical: space.xl,
    alignItems: "center",
    gap: space.sm
  },
  emptyTitle: {
    fontSize: typography.md,
    fontWeight: "800",
    color: colors.text
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: space.lg
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm
  },
  statBox: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 4,
    minHeight: 72
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.muted,
    fontWeight: "700"
  },
  statValue: {
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: "900"
  },
  statValueSuccess: {
    fontSize: typography.lg,
    color: colors.success,
    fontWeight: "900"
  },
  linkBtn: {
    alignItems: "center",
    paddingVertical: space.sm,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center"
  },
  linkBtnText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: typography.sm
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: typography.sm,
    color: colors.text,
    minHeight: 48
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: typography.sm
  },
  detailLine: {
    fontSize: typography.sm,
    color: colors.textSoft,
    lineHeight: 20
  },
  detailLineStrong: {
    fontSize: typography.sm,
    color: colors.success,
    fontWeight: "800",
    lineHeight: 20
  }
});
