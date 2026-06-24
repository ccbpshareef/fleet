import { roundMoney } from "./money";
import { getPeriodRange } from "./periodFilter";

export function tripDriverEarning(expenseTotals) {
  if (!expenseTotals) return 0;
  return roundMoney(
    Number(expenseTotals.driver_bata || 0) +
      Number(expenseTotals.driver_daily_wage || 0) +
      Number(expenseTotals.driver_commission_amount || 0)
  );
}

export function computeDriverEarningsSummary(trips = [], expenseTotalsByTrip = {}) {
  let totalEarning = 0;
  let totalBata = 0;
  let totalDailyWage = 0;
  let totalCommission = 0;
  const tripEarnings = [];

  for (const trip of trips) {
    const exp = expenseTotalsByTrip[trip.id] || {};
    const bata = roundMoney(exp.driver_bata || 0);
    const wage = roundMoney(exp.driver_daily_wage || 0);
    const commission = roundMoney(exp.driver_commission_amount || 0);
    const earning = roundMoney(bata + wage + commission);
    totalBata = roundMoney(totalBata + bata);
    totalDailyWage = roundMoney(totalDailyWage + wage);
    totalCommission = roundMoney(totalCommission + commission);
    totalEarning = roundMoney(totalEarning + earning);
    tripEarnings.push({ trip, earning, bata, wage, commission });
  }

  const activeTrips = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done");
  const doneTrips = trips.filter((trip) => trip.status === "Delivered" || trip.status === "Trip Done");

  return {
    totalEarning,
    totalBata,
    totalDailyWage,
    totalCommission,
    tripCount: trips.length,
    activeTripCount: activeTrips.length,
    doneTripCount: doneTrips.length,
    tripEarnings
  };
}

function assignmentEndDate(assignment) {
  const raw = assignment?.completed_at || new Date().toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function isAssignmentInPeriod(assignment, period) {
  if (period === "complete") return true;
  const range = getPeriodRange(period);
  if (!range) return true;
  const start = new Date(assignment.assigned_at);
  const end = assignmentEndDate(assignment);
  return start <= range.end && end >= range.start;
}

export function filterAssignmentsByPeriod(assignments = [], period = "complete") {
  if (period === "complete") return assignments;
  return assignments.filter((assignment) => isAssignmentInPeriod(assignment, period));
}

export function filterAssignmentsByDriver(assignments = [], driverId) {
  if (!driverId) return assignments;
  return assignments.filter((assignment) => String(assignment.driver_id) === String(driverId));
}

export function payFromStint(assignment) {
  if (!assignment) {
    return {
      workingDays: 0,
      wage: 0,
      commission: 0,
      earning: 0,
      dailyWage: 0,
      commissionPercent: 0
    };
  }
  return {
    workingDays: Number(assignment.working_days || 0),
    wage: roundMoney(assignment.wage_amount || 0),
    commission: roundMoney(assignment.commission_amount || 0),
    earning: roundMoney(assignment.total_earning || 0),
    dailyWage: Number(assignment.daily_wage || 0),
    commissionPercent: Number(assignment.commission_percent || 0)
  };
}

export function getCurrentWorkStint(periods = [], active = null) {
  if (active) return active;
  return periods[0] || null;
}

export function getPastWorkStints(periods = [], currentStint = null) {
  if (!currentStint) return periods.slice(1);
  return periods.filter((assignment) => assignment.id !== currentStint.id);
}

export function computeAssignmentPaySummary(assignments = [], { driverId = null, period = "complete", driverView = false } = {}) {
  let list = assignments;
  if (driverId != null) {
    list = filterAssignmentsByDriver(list, driverId);
  }
  list = filterAssignmentsByPeriod(list, period);
  if (driverView) {
    list = list.filter((assignment) => assignment.earnings_visible);
  }
  const periods = [...list].sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));
  const active = periods.find((item) => item.status === "Active") || null;
  const latest = periods[0] || null;
  const currentStint = getCurrentWorkStint(periods, active);
  const pastPeriods = getPastWorkStints(periods, currentStint);
  const currentStintPay = payFromStint(currentStint);

  let allTimeWage = 0;
  let allTimeCommission = 0;
  let allTimeEarning = 0;
  let allTimeWorkingDays = 0;

  for (const assignment of periods) {
    allTimeWage = roundMoney(allTimeWage + Number(assignment.wage_amount || 0));
    allTimeCommission = roundMoney(allTimeCommission + Number(assignment.commission_amount || 0));
    allTimeEarning = roundMoney(allTimeEarning + Number(assignment.total_earning || 0));
    allTimeWorkingDays += Number(assignment.working_days || 0);
  }

  return {
    periods,
    active,
    latest,
    currentStint,
    currentStintPay,
    pastPeriods,
    totalWage: currentStintPay.wage,
    totalCommission: currentStintPay.commission,
    totalEarning: currentStintPay.earning,
    totalWorkingDays: currentStintPay.workingDays,
    allTime: {
      totalWage: allTimeWage,
      totalCommission: allTimeCommission,
      totalEarning: allTimeEarning,
      totalWorkingDays: allTimeWorkingDays,
      stintCount: periods.length
    },
    periodCount: periods.length,
    pastStintCount: pastPeriods.length
  };
}

export function formatAssignmentPeriod(assignment, language = "en") {
  const locale = language === "te" ? "te-IN" : "en-IN";
  const start = new Date(assignment.assigned_at).toLocaleDateString(locale);
  const end = assignment.completed_at
    ? new Date(assignment.completed_at).toLocaleDateString(locale)
    : language === "te"
      ? "ఇప్పుడు"
      : "Now";
  return `${start} → ${end}`;
}

export function getDriverActiveAssignment(assignments = [], driverId = null) {
  if (driverId == null) return null;
  return (
    assignments.find(
      (assignment) => String(assignment.driver_id) === String(driverId) && assignment.status === "Active"
    ) || null
  );
}

export function driverNeedsAssignmentAccept(assignments = [], driverId = null) {
  const active = getDriverActiveAssignment(assignments, driverId);
  return Boolean(active && !active.driver_accepted);
}
