export const TRIP_STATUSES = ["Loading", "On route", "Unloading", "Delivered", "Trip Done"];

export const LORRY_TYPES = ["Open Body", "Container", "Trailer", "Tanker"];

const TRIP_STATUS_TE = {
  Loading: "లోడింగ్",
  "On route": "ప్రయాణంలో",
  Unloading: "అన్‌లోడింగ్",
  Delivered: "డెలివరీ అయింది",
  "Trip Done": "ట్రిప్ పూర్తైంది"
};

const LORRY_TYPE_TE = {
  "Open Body": "ఓపెన్ బాడీ",
  Container: "కంటైనర్",
  Trailer: "ట్రైలర్",
  Tanker: "ట్యాంకర్"
};

export function tripStatusLabel(status, language = "en") {
  if (!status) return "";
  if (language === "te") return TRIP_STATUS_TE[status] || status;
  return status;
}

export function lorryTypeLabel(type, language = "en") {
  if (!type) return "";
  if (language === "te") return LORRY_TYPE_TE[type] || type;
  return type;
}
