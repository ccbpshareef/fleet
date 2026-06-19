import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme";
import { formatDisplayDate, formatStorageDate, parseDisplayInput, parseStorageDate } from "../utils/dateFieldUtils";

let DateTimePicker = null;
let DateTimePickerAndroid = null;

if (Platform.OS !== "web") {
  try {
    const pickerModule = require("@react-native-community/datetimepicker");
    DateTimePicker = pickerModule.default;
    DateTimePickerAndroid = pickerModule.DateTimePickerAndroid;
  } catch (_error) {
    DateTimePicker = null;
    DateTimePickerAndroid = null;
  }
}

export default function DateField({ label, value, onChange, placeholder = "dd-mm-yyyy" }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(parseStorageDate(value));
  const [text, setText] = useState(() => (value ? formatDisplayDate(value) : ""));
  const webDateRef = useRef(null);

  useEffect(() => {
    setText(value ? formatDisplayDate(value) : "");
  }, [value]);

  function applyDate(date) {
    const iso = formatStorageDate(date);
    onChange(iso);
    setText(formatDisplayDate(iso));
    setIosOpen(false);
  }

  function openCalendar() {
    if (Platform.OS === "web") {
      const node = webDateRef.current;
      if (!node) return;
      try {
        if (typeof node.showPicker === "function") {
          node.showPicker();
          return;
        }
      } catch (_error) {
        // ignore
      }
      node.click();
      return;
    }

    const current = parseStorageDate(value);
    if (Platform.OS === "android" && DateTimePickerAndroid?.open) {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        onChange: (event, selectedDate) => {
          if (event.type === "set" && selectedDate) {
            applyDate(selectedDate);
          }
        }
      });
      return;
    }

    if (Platform.OS === "ios") {
      setIosDraft(current);
      setIosOpen(true);
    }
  }

  function handleTextChange(next) {
    setText(next);
    const parsed = parseDisplayInput(next);
    if (parsed !== null) {
      onChange(parsed);
    }
  }

  function handleBlur() {
    const parsed = parseDisplayInput(text);
    if (parsed !== null) {
      onChange(parsed);
      setText(parsed ? formatDisplayDate(parsed) : "");
    } else {
      setText(value ? formatDisplayDate(value) : "");
    }
  }

  function handlePickerChange(iso) {
    onChange(iso || "");
    setText(iso ? formatDisplayDate(iso) : "");
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.inputRow}>
          <input
            type="text"
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => handleTextChange(event.target.value)}
            onBlur={handleBlur}
            style={styles.webTextInput}
          />
          <button type="button" onClick={openCalendar} style={styles.webIconBtn} aria-label={`${label || "Date"} calendar`}>
            📅
          </button>
          <input
            ref={webDateRef}
            type="date"
            value={value || ""}
            onChange={(event) => handlePickerChange(event.target.value || "")}
            style={styles.webDateInputHidden}
            tabIndex={-1}
            aria-hidden
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedSoft}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          underlineColorAndroid="transparent"
        />
        <Pressable onPress={openCalendar} style={styles.iconBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${label || "Date"} calendar`}>
          <MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      {Platform.OS === "ios" ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.modalWrap}>
            <Pressable style={styles.modalBackdrop} onPress={() => setIosOpen(false)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{label || "Select date"}</Text>
                <Pressable onPress={() => setIosOpen(false)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>
              {DateTimePicker ? (
                <DateTimePicker value={iosDraft} mode="date" display="spinner" onChange={(_e, d) => d && setIosDraft(d)} />
              ) : (
                <Text style={styles.fallback}>Date picker unavailable.</Text>
              )}
              <Pressable style={styles.doneBtn} onPress={() => applyDate(iosDraft)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 11, fontWeight: "800", color: colors.textSoft },
  inputRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    overflow: "hidden"
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    paddingVertical: 8,
    paddingRight: 4,
    backgroundColor: "transparent"
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft
  },
  webTextInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    padding: "8px 4px",
    minWidth: 0,
    boxShadow: "none"
  },
  webIconBtn: {
    border: "none",
    background: colors.surfaceSoft,
    borderRadius: 8,
    minWidth: 36,
    minHeight: 36,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    flexShrink: 0
  },
  webDateInputHidden: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
    border: 0,
    padding: 0,
    margin: 0,
    pointerEvents: "none"
  },
  modalWrap: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  modalTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  doneBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  doneBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  fallback: { color: colors.muted, fontSize: 12, paddingVertical: 12 }
});
