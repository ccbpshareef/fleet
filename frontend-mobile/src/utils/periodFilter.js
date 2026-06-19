export const PERIOD_KEYS = ["complete", "last_month", "daily", "weekly", "monthly"];

export function getPeriodLabel(period, language = "en") {
  const t = (en, te) => (language === "te" ? te : en);
  if (period === "complete") return t("Complete Period", "పూర్తి కాలం");
  if (period === "daily") return t("Today", "ఈ రోజు");
  if (period === "weekly") return t("This Week", "ఈ వారం");
  if (period === "monthly") return t("This Month", "ఈ నెల");
  return t("Last Month", "గత నెల");
}

export function getTripDate(trip) {
  const raw = trip?.loading_date || trip?.unloading_date || trip?.completed_at;
  if (!raw) return null;
  const parsed = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPeriodRange(period) {
  if (period === "complete") return null;

  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === "daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end };
  }

  if (period === "weekly") {
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end: lastMonthEnd };
}

export function isTripInPeriod(trip, period) {
  if (period === "complete") return true;
  const tripDate = getTripDate(trip);
  if (!tripDate) return false;
  const range = getPeriodRange(period);
  if (!range) return true;
  const { start, end } = range;
  return tripDate >= start && tripDate <= end;
}

export function filterTripsByPeriod(trips, period) {
  if (period === "complete") return trips || [];
  return (trips || []).filter((trip) => isTripInPeriod(trip, period));
}

export function filterTripsByDriver(trips, driverId) {
  if (!driverId) return trips || [];
  return (trips || []).filter((trip) => String(trip.driver_id) === String(driverId));
}

export function computeDashboardFromTrips(trips, lorries = [], drivers = []) {
  const list = trips || [];
  const activeTrips = list.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const totalIncome = list.reduce((sum, trip) => sum + Number(trip.load_price || 0), 0);
  const totalExpenses = list.reduce((sum, trip) => sum + Number(trip.total_expenses || 0), 0);
  const lorryIds = new Set(list.map((trip) => trip.lorry_id).filter(Boolean));

  return {
    total_lorries: lorryIds.size || lorries.length,
    total_drivers: drivers.length,
    running_trips: activeTrips.length,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    total_profit: totalIncome - totalExpenses
  };
}

export function getDriversInPeriod(drivers, trips, period) {
  if (period === "complete") {
    const driverIds = new Set((trips || []).map((trip) => trip.driver_id).filter(Boolean));
    if (!driverIds.size) return drivers || [];
    return (drivers || []).filter((driver) => driverIds.has(driver.id));
  }
  const periodTrips = filterTripsByPeriod(trips, period);
  const driverIds = new Set(periodTrips.map((trip) => trip.driver_id).filter(Boolean));
  if (!driverIds.size) return [];
  return (drivers || []).filter((driver) => driverIds.has(driver.id));
}
