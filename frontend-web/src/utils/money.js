/** Round to 2 decimal places using integer cents (avoids 999.98-style float drift). */
export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Value for number inputs — keeps whole numbers clean, otherwise 2 decimals. */
export function moneyInputValue(value) {
  if (value === undefined || value === null || value === "") return "";
  const rounded = roundMoney(value);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

/** Calendar days between ISO dates (inclusive), timezone-safe. */
export function tripCalendarDays(loadingDate, unloadingDate) {
  if (!loadingDate || !unloadingDate) return 1;
  const start = new Date(`${String(loadingDate).slice(0, 10)}T12:00:00`);
  const end = new Date(`${String(unloadingDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = Math.round((end - start) / 86400000);
  return Math.max(diff + 1, 1);
}
