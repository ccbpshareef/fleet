import { moneyInputValue, roundMoney } from "./money";

export const EXPENSE_EDIT_FIELDS = [
  { key: "diesel", en: "Diesel", te: "డీజల్" },
  { key: "toll", en: "Toll", te: "టోల్" },
  { key: "driver_bata", en: "Driver Bata", te: "డ్రైవర్ బటా" },
  { key: "driver_daily_wage", en: "Daily Wage", te: "రోజువారీ వేతనం" },
  { key: "driver_commission_amount", en: "Commission", te: "కమిషన్" },
  { key: "maintenance", en: "Maintenance", te: "నిర్వహణ" },
  { key: "other", en: "Other", te: "ఇతర" }
];

export const DRIVER_EXPENSE_FIELDS = EXPENSE_EDIT_FIELDS.filter((field) =>
  ["driver_bata", "driver_daily_wage", "driver_commission_amount"].includes(field.key)
);

export function expenseFieldsForRole(userRole) {
  return userRole === "driver" ? DRIVER_EXPENSE_FIELDS : EXPENSE_EDIT_FIELDS;
}

export function emptyExpenseDraft() {
  return {
    diesel: "",
    toll: "",
    driver_bata: "",
    driver_daily_wage: "",
    driver_commission_amount: "",
    maintenance: "",
    other: ""
  };
}

export function expenseDraftFromTotals(expenses) {
  if (!expenses) return emptyExpenseDraft();
  const draft = emptyExpenseDraft();
  EXPENSE_EDIT_FIELDS.forEach(({ key }) => {
    draft[key] = moneyInputValue(expenses[key]);
  });
  return draft;
}

export function buildExpenseUpdatePayload(original, draft) {
  const payload = {};
  EXPENSE_EDIT_FIELDS.forEach(({ key }) => {
    const orig = roundMoney(original?.[key] || 0);
    const next = roundMoney(draft[key] || 0);
    if (draft[key] !== "" && orig !== next) {
      payload[key] = next;
    }
  });
  return Object.keys(payload).length ? payload : null;
}
