import { buildExpenseUpdatePayload, expenseDraftFromTotals, emptyExpenseDraft, EXPENSE_EDIT_FIELDS } from "./tripExpenseEdit";

export function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function buildTripUpdatePayload(trip, { status, loadingDate, unloadingDate, expenseDraft, expenses }) {
  const payload = {};
  if (status !== trip.status) payload.status = status;

  const currentLoading = toDateInputValue(trip.loading_date);
  const currentUnloading = toDateInputValue(trip.unloading_date);
  if (loadingDate !== currentLoading) payload.loading_date = loadingDate || null;
  if (unloadingDate !== currentUnloading) payload.unloading_date = unloadingDate || null;

  const expensePayload = expenseDraft ? buildExpenseUpdatePayload(expenses, expenseDraft) : null;
  if (expensePayload) payload.expense = expensePayload;

  if (Object.keys(payload).length > 0 && payload.status === undefined) {
    payload.status = trip.status || "Loading";
  }

  return payload;
}

export { emptyExpenseDraft, expenseDraftFromTotals, EXPENSE_EDIT_FIELDS, buildExpenseUpdatePayload };
