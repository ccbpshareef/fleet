import { roundMoney } from "./money";

/** Build trip_id -> expense totals map (memoize inputs in caller). */
export function buildExpenseTotalsByTrip(expenses = []) {
  return expenses.reduce((acc, item) => {
    const current = acc[item.trip_id] || {
      diesel: 0,
      toll: 0,
      driver_bata: 0,
      driver_daily_wage: 0,
      driver_commission_amount: 0,
      maintenance: 0,
      other: 0
    };
    current.diesel = roundMoney(current.diesel + Number(item.diesel || 0));
    current.toll = roundMoney(current.toll + Number(item.toll || 0));
    current.driver_bata = roundMoney(current.driver_bata + Number(item.driver_bata || 0));
    current.driver_daily_wage = roundMoney(current.driver_daily_wage + Number(item.driver_daily_wage || 0));
    current.driver_commission_amount = roundMoney(current.driver_commission_amount + Number(item.driver_commission_amount || 0));
    current.maintenance = roundMoney(current.maintenance + Number(item.maintenance || 0));
    current.other = roundMoney(current.other + Number(item.other || 0));
    acc[item.trip_id] = current;
    return acc;
  }, {});
}
