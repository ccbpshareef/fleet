import { Platform } from "react-native";

function resolveApiBase() {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) {
    return envBase;
  }

  if (Platform.OS === "web") {
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `http://${host}:8000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }

  return "http://127.0.0.1:8000";
}

const API_BASE = resolveApiBase();
const inflightGetRequests = new Map();

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function request(path, options = {}) {
  const { query, timeoutMs = 12000, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const dedupeKey =
    method === "GET" ? `${method}:${withQuery(path, query)}` : null;

  if (dedupeKey && inflightGetRequests.has(dedupeKey)) {
    return inflightGetRequests.get(dedupeKey);
  }

  const run = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE}${withQuery(path, query)}`, {
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        ...fetchOptions
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "API error");
      }
      if (response.status === 204) {
        return null;
      }
      const text = await response.text();
      if (!text) {
        return null;
      }
      return JSON.parse(text);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Request timed out. Check that the backend is running on port 8000.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const promise = run();
  if (dedupeKey) {
    inflightGetRequests.set(dedupeKey, promise);
    promise.finally(() => {
      if (inflightGetRequests.get(dedupeKey) === promise) {
        inflightGetRequests.delete(dedupeKey);
      }
    });
  }
  return promise;
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  loginAsUser: (payload, auth) =>
    request("/auth/login-as-user", { method: "POST", body: JSON.stringify(payload), query: auth }),
  registerUser: (payload) => request("/auth/register-user", { method: "POST", body: JSON.stringify(payload) }),
  checkUserId: (identifier) => request("/auth/check-user-id", { query: { identifier } }),
  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  getUsers: (auth) => request("/users", { query: auth }),
  getUserProfile: (identifier) => request("/user-profile", { query: { identifier } }),
  saveUserProfile: (payload) => request("/user-profile", { method: "POST", body: JSON.stringify(payload) }),
  getDashboard: (auth) => request("/dashboard", { query: auth }),
  getLorries: (auth) => request("/lorries", { query: auth }),
  getDrivers: (auth) => request("/drivers", { query: auth }),
  getDriverAssignments: (auth) => request("/driver-assignments", { query: auth }),
  createDriverAssignment: (payload, auth) =>
    request("/driver-assignments", { method: "POST", body: JSON.stringify(payload), query: auth }),
  completeDriverAssignment: (assignmentId, payload, auth) =>
    request(`/driver-assignments/${assignmentId}/complete`, {
      method: "PATCH",
      body: JSON.stringify(payload || {}),
      query: auth
    }),
  addDriverAssignmentLeave: (assignmentId, payload, auth) =>
    request(`/driver-assignments/${assignmentId}/leaves`, {
      method: "POST",
      body: JSON.stringify(payload),
      query: auth
    }),
  acceptDriverAssignment: (assignmentId, auth) =>
    request(`/driver-assignments/${assignmentId}/accept`, { method: "POST", query: auth }),
  getNotifications: async (auth) => {
    try {
      return await request("/notifications", { query: auth });
    } catch {
      return [];
    }
  },
  markNotificationRead: (notificationId, auth) =>
    request(`/notifications/${notificationId}/read`, { method: "PATCH", query: auth }),
  markAllNotificationsRead: (auth) =>
    request("/notifications/read-all", { method: "POST", query: auth }),
  clearAllNotifications: (auth) =>
    request("/notifications", { method: "DELETE", query: auth }),
  getTrips: (auth) => request("/trips", { query: auth }),
  getExpenses: (auth) => request("/expenses", { query: auth }),
  createLorry: (payload, auth) =>
    request("/lorries", { method: "POST", body: JSON.stringify(payload), query: auth }),
  createDriver: (payload, auth) =>
    request("/drivers", { method: "POST", body: JSON.stringify(payload), query: auth }),
  updateDriverStatus: (driverId, is_active, auth) =>
    request(`/drivers/${driverId}/status`, { method: "PATCH", body: JSON.stringify({ is_active }), query: auth }),
  deleteDriver: (driverId, auth) =>
    request(`/drivers/${driverId}`, { method: "DELETE", query: auth }),
  getDriverHistory: (driverId, auth) => request(`/drivers/${driverId}/history`, { query: auth }),
  updateLorryStatus: (lorryId, is_active, auth) =>
    request(`/lorries/${lorryId}/status`, { method: "PATCH", body: JSON.stringify({ is_active }), query: auth }),
  deleteLorry: (lorryId, auth) =>
    request(`/lorries/${lorryId}`, { method: "DELETE", query: auth }),
  getLorryHistory: (lorryId, auth) => request(`/lorries/${lorryId}/history`, { query: auth }),
  createTrip: (payload, auth) =>
    request("/trips", { method: "POST", body: JSON.stringify(payload), query: auth }),
  createExpense: (payload, auth) =>
    request("/expenses", { method: "POST", body: JSON.stringify(payload), query: auth }),
  updateTripStatus: (tripId, status, auth) =>
    request(`/trips/${tripId}/status`, { method: "PATCH", body: JSON.stringify({ status }), query: auth }),
  updateTrip: (tripId, payload, auth) =>
    request(`/trips/${tripId}/status`, { method: "PATCH", body: JSON.stringify(payload), query: auth })
};
