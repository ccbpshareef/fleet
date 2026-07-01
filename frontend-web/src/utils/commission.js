import { roundMoney } from "./money";

export const COMMISSION_TRANSPORT_THRESHOLD = 120_000;

export function stintCommissionTotal(totalTransport, commissionPercent) {
  const transport = Number(totalTransport || 0);
  const percent = Number(commissionPercent || 0);
  if (transport < COMMISSION_TRANSPORT_THRESHOLD) return 0;
  return roundMoney((transport * percent) / 100);
}

export function commissionRuleText(language = "en") {
  if (language === "te") {
    return "6% కమిషన్ స్టింట్ ట్రాన్స్‌పోర్ట్ ₹1,20,000 చేరిన తర్వాత మాత్రమే చెల్లిస్తారు.";
  }
  return "6% commission is paid only after stint transport reaches ₹1,20,000.";
}

export function commissionProgressText(totalTransport, language = "en") {
  const transport = Number(totalTransport || 0);
  const remaining = Math.max(COMMISSION_TRANSPORT_THRESHOLD - transport, 0);
  if (remaining <= 0) {
    return language === "te" ? "కమిషన్ అర్హత పూర్తయింది" : "Commission threshold reached";
  }
  const formatted = remaining.toLocaleString("en-IN");
  return language === "te"
    ? `కమిషన్ కోసం మరో ₹${formatted} ట్రాన్స్‌పోర్ట్ అవసరం`
    : `₹${formatted} more transport needed for commission`;
}
