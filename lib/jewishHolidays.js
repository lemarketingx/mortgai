// Jewish + Israeli holidays computed locally from the built-in Hebrew
// calendar (Intl.DateTimeFormat with ca-hebrew). No external API and no
// hardcoded year tables — works for any displayed year, past or future.
//
// Dates follow the standard civil-calendar display convention (the holiday
// appears on the Gregorian day it is observed during daytime; the eve
// starts the night before). Israeli observance: Purim on 14 Adar/Adar II,
// one-day chagim, national days with their official weekday shifts.

const HEBREW_FMT =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long" })
    : null;

function atNoon(value) {
  // Local noon avoids timezone-boundary drift when mapping to a Hebrew date
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function addDays(date, n) {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hebrewParts(date) {
  const parts = HEBREW_FMT.formatToParts(date);
  return {
    day: Number(parts.find((p) => p.type === "day")?.value || 0),
    month: parts.find((p) => p.type === "month")?.value || "",
  };
}

// Fixed Hebrew-date holidays. "AdarP" = the Purim-bearing Adar (plain Adar
// in a regular year, Adar II in a leap year).
const FIXED = {
  "1 Tishri": "ראש השנה",
  "2 Tishri": "ראש השנה",
  "9 Tishri": "ערב יום כיפור",
  "10 Tishri": "יום כיפור",
  "14 Tishri": "ערב סוכות",
  "15 Tishri": "סוכות",
  "16 Tishri": "חול המועד סוכות",
  "17 Tishri": "חול המועד סוכות",
  "18 Tishri": "חול המועד סוכות",
  "19 Tishri": "חול המועד סוכות",
  "20 Tishri": "חול המועד סוכות",
  "21 Tishri": "הושענא רבה",
  "22 Tishri": "שמחת תורה",
  "15 Shevat": "ט״ו בשבט",
  "14 AdarP": "פורים",
  "15 AdarP": "שושן פורים",
  "14 Nisan": "ערב פסח",
  "15 Nisan": "פסח",
  "16 Nisan": "חול המועד פסח",
  "17 Nisan": "חול המועד פסח",
  "18 Nisan": "חול המועד פסח",
  "19 Nisan": "חול המועד פסח",
  "20 Nisan": "חול המועד פסח",
  "21 Nisan": "שביעי של פסח",
  "18 Iyar": "ל״ג בעומר",
  "28 Iyar": "יום ירושלים",
  "5 Sivan": "ערב שבועות",
  "6 Sivan": "שבועות",
};

// Returns [{ dateKey: "YYYY-MM-DD", title }] for every holiday inside
// [from, to] (inclusive). Accepts Date objects or "YYYY-MM-DD" strings.
export function getJewishHolidays(from, to) {
  if (!HEBREW_FMT) return [];
  const fromKey = toDateKey(atNoon(from));
  const toKey = toDateKey(atNoon(to));
  // National days shift by up to 2 days around their Hebrew date, so scan a
  // slightly wider window and filter back down to the requested range.
  const start = addDays(atNoon(from), -3);
  const end = addDays(atNoon(to), 3);

  const byDate = new Map(); // dateKey -> Set of titles
  const add = (date, title) => {
    const key = toDateKey(date);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key).add(title);
  };

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const { day, month } = hebrewParts(d);
    const monthKey = month === "Adar" || month === "Adar II" ? "AdarP" : month;
    const key = `${day} ${monthKey}`;

    if (FIXED[key]) add(d, FIXED[key]);

    // Chanukah — 8 days from 25 Kislev; how far it reaches into Tevet
    // depends on whether Kislev has 29 or 30 days that year.
    if (month === "Kislev" && day >= 25) add(d, "חנוכה");
    if (month === "Tevet" && (day === 1 || day === 2)) add(d, "חנוכה");
    if (month === "Tevet" && day === 3) {
      const weekBack = hebrewParts(addDays(d, -7));
      if (weekBack.day === 25 && weekBack.month === "Kislev") add(d, "חנוכה");
    }

    // Tisha B'Av — postponed to Sunday when 9 Av falls on Shabbat
    if (key === "9 Av") add(d.getDay() === 6 ? addDays(d, 1) : d, "תשעה באב");

    // Yom HaShoah (27 Nisan): Friday → Thursday, Sunday → Monday
    if (key === "27 Nisan") {
      let obs = d;
      if (d.getDay() === 5) obs = addDays(d, -1);
      else if (d.getDay() === 0) obs = addDays(d, 1);
      add(obs, "יום הזיכרון לשואה ולגבורה");
    }

    // Yom Ha'atzmaut (5 Iyar): Fri → Thu, Sat → Thu, Mon → Tue.
    // Yom HaZikaron is always the day before the observed date.
    if (key === "5 Iyar") {
      let obs = d;
      if (d.getDay() === 5) obs = addDays(d, -1);
      else if (d.getDay() === 6) obs = addDays(d, -2);
      else if (d.getDay() === 1) obs = addDays(d, 1);
      add(obs, "יום העצמאות");
      add(addDays(obs, -1), "יום הזיכרון");
    }
  }

  const items = [];
  for (const [dateKey, titles] of byDate) {
    if (dateKey < fromKey || dateKey > toKey) continue;
    for (const title of titles) items.push({ dateKey, title });
  }
  items.sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));
  return items;
}
