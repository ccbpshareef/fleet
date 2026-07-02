import { fleetRequest } from "./utils/fleetApiCore";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function request(path, options = {}) {
  return fleetRequest(path, options, API_BASE);
}

export const api = {
  health: () => request("/health"),
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
  getDrivers: (auth) => request("/drivers", { query: auth }),
  getMyDriver: (auth) => request("/drivers/me", { query: auth }),
  getDriverAssignments: (auth) => request("/driver-assignments", { query: auth }),
  createDriverAssignment: (payload, auth) =>
    request("/driver-assignments", { method: "POST", body: JSON.stringify(payload), query: auth }),
  updateDriverAssignment: (assignmentId, payload, auth) =>
    request(`/driver-assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      query: auth
    }),
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
  createDriver: (payload, auth) =>
    request("/drivers", { method: "POST", body: JSON.stringify(payload), query: auth }),
  updateDriverStatus: (driverId, is_active, auth) =>
    request(`/drivers/${driverId}/status`, { method: "PATCH", body: JSON.stringify({ is_active }), query: auth }),
  deleteDriver: (driverId, auth) =>
    request(`/drivers/${driverId}`, { method: "DELETE", query: auth }),
  getDriverHistory: (driverId, auth) => request(`/drivers/${driverId}/history`, { query: auth }),
  getLorries: (auth) => request("/lorries", { query: auth }),
  createLorry: (payload, auth) =>
    request("/lorries", { method: "POST", body: JSON.stringify(payload), query: auth }),
  updateLorryStatus: (lorryId, is_active, auth) =>
    request(`/lorries/${lorryId}/status`, { method: "PATCH", body: JSON.stringify({ is_active }), query: auth }),
  deleteLorry: (lorryId, auth) =>
    request(`/lorries/${lorryId}`, { method: "DELETE", query: auth }),
  getLorryHistory: (lorryId, auth) => request(`/lorries/${lorryId}/history`, { query: auth }),
  getTrips: (auth) => request("/trips", { query: auth }),
  getExpenses: (auth) => request("/expenses", { query: auth }),
  updateTripStatus: (tripId, status, auth) =>
    request(`/trips/${tripId}/status`, { method: "PATCH", body: JSON.stringify({ status }), query: auth }),
  updateTrip: (tripId, payload, auth) =>
    request(`/trips/${tripId}/status`, { method: "PATCH", body: JSON.stringify(payload), query: auth }),
  createTrip: (payload, auth) =>
    request("/trips", { method: "POST", body: JSON.stringify(payload), query: auth }),
  createExpense: (payload, auth) =>
    request("/expenses", { method: "POST", body: JSON.stringify(payload), query: auth })
};
