export function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function toPositiveNumber(value) {
  return Math.max(0, toNumber(value));
}

export function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.min(max, Math.max(min, toNumber(value)));
}

export function normalizeIsraeliPhone(value) {
  const digits = cleanNumber(value);
  if (/^9725\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  return digits;
}

export function cleanNumber(value, allowDecimal = false) {
  const pattern = allowDecimal ? /[^\d.]/g : /[^\d]/g;
  return String(value || "").replace(pattern, "");
}

export function displayNumber(value) {
  const raw = String(value || "").replace(/[^\d.]/g, "");
  if (!raw) return "";
  const number = Number(raw);
  if (!Number.isFinite(number)) return "";
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: raw.includes(".") ? 2 : 0,
  }).format(number);
}

export function formatILS(value) {
  const amount = toNumber(value);
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(amount) ? amount : 0));
}

export function formatPct(value, digits = 1) {
  const percent = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(percent)}%`;
}
