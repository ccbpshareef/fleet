/** Extract human-readable message from FastAPI / fetch errors. */
export function parseApiDetail(error, fallback = "Something went wrong") {
  const raw = error?.message || "";
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    const detail = parsed?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item === "string" ? item : item?.msg || JSON.stringify(item)))
        .join(". ");
    }
    return raw;
  } catch {
    return raw || fallback;
  }
}
