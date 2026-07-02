import { formatApiErrorBody } from "./fleetApiCore";

/** Extract human-readable message from Fleet API / fetch errors. */
export function parseApiDetail(error, fallback = "Something went wrong") {
  const raw = error?.message || "";
  if (!raw) {
    return fallback;
  }
  return formatApiErrorBody(raw) || fallback;
}
