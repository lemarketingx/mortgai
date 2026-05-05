export function toNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d.-]/g, "")) || 0;
}

export function cleanNumber(value, allowDecimal = false) {
  const pattern = allowDecimal ? /[^\d.]/g : /[^\d]/g;
  return String(value || "").replace(pattern, "");
}

export function displayNumber(value) {
  const digits = cleanNumber(value);
  if (!digits) return "";
  return new Intl.NumberFormat("he-IL").format(Number(digits));
}

export function formatILS(value) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value)));
}

export function formatPct(value, digits = 1) {
  return `${new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0)}%`;
}
