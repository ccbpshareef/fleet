/** Extract human-readable message from Fleet API / fetch errors. */
export function formatApiErrorBody(text) {
  if (!text) {
    return "Request failed";
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed?.detail === "string" && parsed.detail.trim()) {
      return parsed.detail.trim();
    }
    if (Array.isArray(parsed?.detail)) {
      return parsed.detail
        .map((item) => (typeof item === "string" ? item : item?.msg || JSON.stringify(item)))
        .join(". ");
    }
    return text;
  } catch {
    return text;
  }
}

export function parseApiDetail(error, fallback = "Something went wrong") {
  const raw = error?.message || "";
  if (!raw) {
    return fallback;
  }
  return formatApiErrorBody(raw) || fallback;
}
