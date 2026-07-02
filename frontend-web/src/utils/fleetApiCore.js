/** Shared Fleet API helpers for Flask backend at /reports-data/fleet */

export const FLEET_API_PATH = "/reports-data/fleet";

export function withFleetPrefix(path) {
  if (!path) {
    return FLEET_API_PATH;
  }
  if (path.startsWith(FLEET_API_PATH)) {
    return path;
  }
  return `${FLEET_API_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

export function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function buildApiUrl(path, query, apiBase = "") {
  const base = (apiBase || "").replace(/\/$/, "");
  const requestPath = withQuery(withFleetPrefix(path), query);

  if (!base) {
    return requestPath;
  }

  if (base.endsWith(FLEET_API_PATH)) {
    return `${base}${requestPath.slice(FLEET_API_PATH.length)}`;
  }

  return `${base}${requestPath}`;
}

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
        .map((item) => (typeof item === "string" ? item : item?.msg || ""))
        .filter(Boolean)
        .join(". ");
    }
    return text;
  } catch {
    return text;
  }
}

/** Normalize list endpoints — never wipe UI with a non-array payload. */
export function asFleetList(value) {
  return Array.isArray(value) ? value : [];
}

/** Insert or replace a row by id (used after create/update). */
export function upsertFleetItem(items, item) {
  if (!item?.id) {
    return items;
  }
  return [item, ...items.filter((row) => row.id !== item.id)];
}

/** Unwrap Flask Fleet envelope: { status, message?, data, statusCode } */
export function unwrapApiPayload(parsed) {
  if (parsed === null || parsed === undefined) {
    return parsed;
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }
  const isEnvelope =
    (parsed.status === "success" || parsed.status === "fail") &&
    ("data" in parsed || parsed.status === "fail");
  if (isEnvelope) {
    if (parsed.status === "fail") {
      throw new Error(formatApiErrorBody(JSON.stringify(parsed)));
    }
    return parsed.data;
  }
  return parsed;
}

export async function fleetRequest(path, options = {}, apiBase = "") {
  const { query, timeoutMs = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path, query, apiBase), {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...fetchOptions
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(formatApiErrorBody(text) || "Request failed");
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    return unwrapApiPayload(JSON.parse(text));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Request timed out. Check that the Fleet API is running at http://localhost:5000/reports-data/fleet"
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
