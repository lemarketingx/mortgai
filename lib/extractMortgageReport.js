const DEBUG = false;

const MONEY_RE = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?|\d+(?:[.,]\d+)?/g;
const MONEY_WITH_COMMAS_RE = /\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;
const RATE_RE = /\d{1,2}(?:[.,]\d{2,4})/g;
const DATE_RE = /\d{1,2}[/.]\d{1,2}[/.]\d{4}/g;

// Pages containing these phrases are not mortgage detail pages
const EXCLUDED_PAGE_PHRASES = [
  "דף מידע ללווה",
  "עמלת פרעון מוקדם בהלוואות לדיור",
  "ביאורים",
  "תנאים כלליים",
];

// Pages must contain at least one of these to be considered a primary page
const PRIMARY_PAGE_REQUIRED = ["פרטי משכנתאות", "יתרה לסילוק"];

export function normalizeHebrewText(text) {
  return String(text || "")
    .replace(/‎|‏/g, " ")
    .replace(/[״""]/g, '"')
    .replace(/[׳'']/g, "'")
    .replace(/[־–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMoney(value) {
  const raw = String(value || "").replace(/[^\d,.-]/g, "");
  if (!raw) return "";
  const normalized = raw.includes(",") && raw.includes(".")
    ? raw.replace(/,/g, "")
    : raw.replace(/,/g, ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : "";
}

export function parsePercent(value) {
  const raw = String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".");
  const number = Number(raw);
  return Number.isFinite(number) ? number : "";
}

export function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : "";
}

export function findNumbersNearKeyword(text, keyword, count = 8, radius = 240) {
  const normalized = normalizeHebrewText(text);
  const index = normalized.indexOf(keyword);
  if (index < 0) return [];
  const slice = normalized.slice(Math.max(0, index - radius), index + keyword.length + radius);
  return numbersFromText(slice).slice(0, count);
}

function uniqueNumbers(numbers) {
  return [...new Set(numbers.map((n) => Number(n).toFixed(4)))].map(Number);
}

function numbersFromText(text) {
  return uniqueNumbers(
    (normalizeHebrewText(text).match(MONEY_RE) || [])
      .map(parseMoney)
      .filter((v) => v !== ""),
  );
}

function moneyCandidates(text) {
  return uniqueNumbers(
    (normalizeHebrewText(text).match(MONEY_WITH_COMMAS_RE) || [])
      .map(parseMoney)
      .filter((v) => v !== ""),
  );
}

function hasUsefulCents(value) {
  return Math.round((Number(value) % 1) * 100) !== 0;
}

function indexOfApprox(numbers, selected) {
  return numbers.findIndex((v) => Math.abs(Number(v) - Number(selected)) < 0.01);
}

// ─── Page selection ───────────────────────────────────────────────────────────

function scorePageText(text) {
  const normalized = normalizeHebrewText(text);
  if (EXCLUDED_PAGE_PHRASES.some((phrase) => normalized.includes(phrase))) return -1;
  let score = 0;
  if (normalized.includes("פרטי משכנתאות")) score += 10;
  if (normalized.includes("יתרה לסילוק")) score += 5;
  if (normalized.includes("תשלום חודשי")) score += 5;
  if (normalized.includes("ריבית הכוללת החזויה")) score += 4;
  if (normalized.includes("מספר הלוואה")) score += 3;
  return score;
}

function buildPagesSummary(pages) {
  return pages.map(({ pageNumber, text }) => {
    const normalized = normalizeHebrewText(text);
    const nums = numbersFromText(normalized).filter((v) => v >= 500 && v <= 5000000);
    return {
      pageNumber,
      score: scorePageText(normalized),
      hasMortgageDetails: normalized.includes("פרטי משכנתאות"),
      hasPayoffKeyword: normalized.includes("יתרה לסילוק"),
      hasMonthlyKeyword: normalized.includes("תשלום חודשי"),
      hasInterestKeyword: normalized.includes("ריבית הכוללת החזויה"),
      hasMortgageNumber: normalized.includes("מספר הלוואה"),
      excluded: EXCLUDED_PAGE_PHRASES.some((p) => normalized.includes(p)),
      numbersPreview: nums.slice(0, 12),
    };
  });
}

function selectPrimaryPage(pages) {
  if (!pages || pages.length === 0) return { page: null, reason: "no-pages" };
  if (pages.length === 1) return { page: pages[0], reason: "single-page" };

  let best = null;
  let bestScore = -Infinity;

  for (const page of pages) {
    const score = scorePageText(page.text);
    if (score > bestScore) {
      bestScore = score;
      best = page;
    }
  }

  if (!best || bestScore <= 0) {
    return { page: pages[0], reason: "fallback-first-page" };
  }

  const reason = PRIMARY_PAGE_REQUIRED.some((phrase) =>
    normalizeHebrewText(best.text).includes(phrase),
  )
    ? "primary-keywords-matched"
    : "highest-score";

  return { page: best, reason };
}

// ─── Extraction range within page ────────────────────────────────────────────

// Bank Hapoalim structure: table rows between "מספר הלוואה" header and
// "ריבית הכוללת החזויה" line (which is after the "סה"כ" summary row).
// We include 240 chars after the anchor phrase so the rate value is captured.
function extractionRangeText(pageText) {
  const normalized = normalizeHebrewText(pageText);

  const tableStart = normalized.indexOf("מספר הלוואה");
  const tableEnd = normalized.lastIndexOf("ריבית הכוללת החזויה");

  if (tableStart >= 0 && tableEnd > tableStart) {
    // Include 240 chars past the anchor so we catch the rate number
    return {
      rangeText: normalized.slice(tableStart, tableEnd + 240),
      rangeMethod: "מספר-הלוואה-to-ריבית-הכוללת",
    };
  }

  // Fallback: everything around the last occurrence of "סה"כ"
  const totalIndex = normalized.lastIndexOf('סה"כ');
  if (totalIndex >= 0) {
    const start = Math.max(0, totalIndex - 700);
    const end = Math.min(normalized.length, totalIndex + 300);
    return {
      rangeText: normalized.slice(start, end),
      rangeMethod: "total-row-fallback",
    };
  }

  return { rangeText: normalized, rangeMethod: "full-page-fallback" };
}

// ─── Number picking helpers ───────────────────────────────────────────────────

function pickPayoffFromNumbers(nums) {
  // Israeli payoff balances always carry agorot; original principal is always round.
  // Filter to realistic payoff range (80K–8M) and prefer values with cents.
  const inRange = nums.filter((v) => v >= 80000 && v <= 8000000);
  const withCents = inRange.filter((v) => hasUsefulCents(v));
  if (withCents.length) return Math.max(...withCents);
  return inRange.length ? Math.max(...inRange) : "";
}

function pickPayoffSelectionDebug(rowNumbers, selectedPayoff) {
  const candidates = uniqueNumbers(rowNumbers.filter((n) => Number.isFinite(Number(n))).map(Number));
  const rejected = candidates
    .filter((v) => v !== selectedPayoff)
    .map((v) => {
      let reason = "not selected";
      if (v < 80000) reason = "below minimum payoff range";
      else if (v > 8000000) reason = "above maximum payoff range";
      else if (!hasUsefulCents(v)) reason = "round integer — likely principal, not payoff";
      else if (selectedPayoff && v < selectedPayoff) reason = "valid but lower than selected";
      return { value: v, reason };
    });
  return { candidatePayoffNumbers: candidates, rejectedPayoffCandidates: rejected };
}

function pickCurrentPayment(nums, payoffBalance, rangeText) {
  // Monthly payment typically appears after payoffBalance in pdfjs LTR ordering
  const payoffIdx = indexOfApprox(nums, payoffBalance);
  if (payoffIdx >= 0) {
    const after = nums.slice(payoffIdx + 1);
    const found = after.find((v) => v >= 500 && v <= 30000 && hasUsefulCents(v));
    if (found) return found;
  }

  const paymentIdx = rangeText.indexOf("תשלום חודשי");
  if (paymentIdx >= 0) {
    const near = numbersFromText(rangeText.slice(Math.max(0, paymentIdx - 200), paymentIdx + 220));
    const found = near.filter((v) => v >= 500 && v <= 30000 && hasUsefulCents(v));
    if (found.length) return found.at(-1);
  }

  return "";
}

function pickCurrentRate(rangeText, fullText) {
  const anchors = [
    "ריבית הכוללת החזויה ברמת כל ההלוואות",
    "ריבית הכוללת החזויה",
    "ריבית כוללת חזויה",
    "ריבית כוללת",
    "ריבית ממוצעת",
  ];

  for (const source of [rangeText, fullText]) {
    const normalized = normalizeHebrewText(source);
    for (const anchor of anchors) {
      const idx = normalized.indexOf(anchor);
      if (idx < 0) continue;
      const slice = normalized.slice(idx, idx + 180);
      const rates = (slice.match(RATE_RE) || []).map(parsePercent).filter((v) => v >= 0.1 && v <= 20);
      if (rates.length) return rates[0];
    }
  }
  return "";
}

function pickRefinanceCost(nums, payoffBalance, rangeText) {
  const payoffIdx = indexOfApprox(nums, payoffBalance);
  const before = payoffIdx >= 0 ? nums.slice(0, payoffIdx) : nums;

  for (let i = before.length - 1; i >= 0; i -= 1) {
    const v = before[i];
    if (v > 0 && v <= 250000 && hasUsefulCents(v)) return v;
  }

  for (const anchor of ["עמלת פירעון מוקדם", "עמלת פרעון מוקדם", "עמלה"]) {
    const idx = normalizeHebrewText(rangeText).indexOf(anchor);
    if (idx < 0) continue;
    const near = numbersFromText(rangeText.slice(Math.max(0, idx - 200), idx + 200));
    const found = near.filter((v) => v > 0 && v <= 250000 && hasUsefulCents(v));
    if (found.length) return Math.max(...found);
  }

  return "";
}

function pickPrincipalBalance(nums, payoffBalance) {
  const payoffIdx = indexOfApprox(nums, payoffBalance);
  const before = payoffIdx >= 0 ? nums.slice(0, payoffIdx) : nums;
  const candidates = before.filter((v) => v >= 80000 && v < payoffBalance && hasUsefulCents(v));
  return candidates.length ? Math.max(...candidates) : "";
}

// ─── Date / remaining years ───────────────────────────────────────────────────

function parseIsraeliDate(value) {
  const match = String(value || "").match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const y = Number(year);
  if (y < 2000 || y > 2100) return null;
  const date = new Date(y, Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function yearsFromDate(date) {
  if (!date) return "";
  const now = new Date();
  const months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  return months > 0 ? Math.max(1, Math.round(months / 12)) : "";
}

function pickRemainingYears(text) {
  const dates = [...normalizeHebrewText(text).matchAll(DATE_RE)]
    .map((m) => parseIsraeliDate(m[0]))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());
  return dates.length ? yearsFromDate(dates[0]) : "";
}

// ─── Track detection ──────────────────────────────────────────────────────────

function detectRateType(slice) {
  if (slice.includes("פריים")) return "פריים";
  if (slice.includes("קבוע")) return "קבועה";
  if (slice.includes("משתנה")) return "משתנה";
  if (slice.includes("זכאות")) return "זכאות";
  return "";
}

function detectIndexation(slice) {
  if (slice.includes("לא צמוד")) return "לא צמוד";
  if (slice.includes("מדד המחירים") || slice.includes("צמוד")) return "מדד המחירים לצרכן";
  return "";
}

function detectRepaymentMethod(slice) {
  if (slice.includes("שפיצר")) return "שפיצר";
  if (slice.includes("קרן שווה")) return "קרן שווה";
  return "";
}

function detectTracks(text) {
  const normalized = normalizeHebrewText(text);
  const matches = [...normalized.matchAll(/\b\d{2}\/\d{2}\/\d{5,6}\/\d{3}\b/g)];
  const tracks = [];
  const seen = new Set();

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const loanNumber = match[0];
    if (seen.has(loanNumber)) continue;
    seen.add(loanNumber);

    const nextMatch = matches[i + 1];
    const segmentEnd = nextMatch ? nextMatch.index : Math.min(normalized.length, match.index + 220);
    let rowSegment = normalized.slice(match.index, segmentEnd);
    const totalInSeg = rowSegment.search(/סה"?כ|סה״כ|סהכ/);
    if (totalInSeg >= 0) rowSegment = rowSegment.slice(0, totalInSeg);

    const context = normalized.slice(Math.max(0, match.index - 420), Math.min(normalized.length, match.index + 520));
    const amounts = numbersFromText(rowSegment).filter((v) => v >= 10000 && v <= 2000000 && hasUsefulCents(v));
    const rates = (context.match(RATE_RE) || []).map(parsePercent).filter((v) => v >= 0.1 && v <= 20);
    const finalDate = [...context.matchAll(DATE_RE)]
      .map((dm) => parseIsraeliDate(dm[0]))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    tracks.push({
      loanNumber,
      originalAmount: amounts[0] || "",
      balance: amounts.length ? Math.max(...amounts) : "",
      candidateAmounts: amounts,
      rate: rates[0] || "",
      adjustedRate: rates[1] || "",
      finalPaymentDate: finalDate ? finalDate.toLocaleDateString("he-IL") : "",
      remainingYears: yearsFromDate(finalDate),
      repaymentMethod: detectRepaymentMethod(context),
      rateType: detectRateType(context),
      indexation: detectIndexation(context),
      confidence: rates.length || amounts.length || finalDate ? "medium" : "low",
    });
  }

  return tracks.slice(0, 8);
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function confidenceFor(fields) {
  const score = [fields.payoffBalance, fields.currentPayment, fields.currentRate, fields.remainingYears].filter(Boolean).length;
  if (fields.payoffBalance && fields.currentPayment && fields.currentRate) return "high";
  if (score >= 2) return "medium";
  return "low";
}

// ─── PDF reading ──────────────────────────────────────────────────────────────

async function fallbackReadText(file) {
  try {
    const text = normalizeHebrewText(await file.text());
    return { fullText: text, pages: [{ pageNumber: 1, text }] };
  } catch {
    return { fullText: "", pages: [] };
  }
}

// Returns { fullText, pages: [{ pageNumber, text }] }
export async function readPdfText(file) {
  if (!file) return { fullText: "", pages: [] };

  try {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = normalizeHebrewText(content.items.map((item) => item.str || "").join(" "));
      pages.push({ pageNumber, text: pageText });
    }

    const fullText = normalizeHebrewText(pages.map((p) => p.text).join("\n"));
    return { fullText, pages };
  } catch (error) {
    console.warn("PDF text extraction failed, falling back to raw text", error);
    return fallbackReadText(file);
  }
}

// ─── Main extraction ──────────────────────────────────────────────────────────

// Accepts either a plain string (backward compat) or { fullText, pages } from readPdfText.
export function extractMortgageReport(input) {
  // Normalize input
  let fullText;
  let pages;
  if (input && typeof input === "object" && Array.isArray(input.pages)) {
    fullText = normalizeHebrewText(input.fullText || "");
    pages = input.pages.map((p) => ({ ...p, text: normalizeHebrewText(p.text) }));
  } else {
    fullText = normalizeHebrewText(String(input || ""));
    pages = [{ pageNumber: 1, text: fullText }];
  }

  // Build per-page summary for debug
  const pagesSummary = buildPagesSummary(pages);

  // Select the primary mortgage-details page
  const { page: primaryPage, reason: pageDetectionReason } = selectPrimaryPage(pages);
  const selectedPageNumber = primaryPage ? primaryPage.pageNumber : 1;
  const selectedPageText = primaryPage ? primaryPage.text : fullText;

  if (DEBUG) {
    console.log("[extractMortgage] pagesSummary", pagesSummary);
    console.log("[extractMortgage] selectedPage", selectedPageNumber, pageDetectionReason);
  }

  // Extract from the specific table range on the selected page
  const { rangeText, rangeMethod } = extractionRangeText(selectedPageText);
  const rangeNumbers = numbersFromText(rangeText);

  // Pick each field
  const payoffBalance = safeNumber(pickPayoffFromNumbers(rangeNumbers));
  const currentPayment = safeNumber(pickCurrentPayment(rangeNumbers, payoffBalance, rangeText));
  const currentRate = safeNumber(pickCurrentRate(rangeText, fullText));
  const refinanceCost = safeNumber(pickRefinanceCost(rangeNumbers, payoffBalance, rangeText));
  const principalBalance = safeNumber(pickPrincipalBalance(rangeNumbers, payoffBalance));
  const remainingYears = safeNumber(pickRemainingYears(selectedPageText));

  // Fallback to full text if page-level extraction missed the key field
  let extractionMethod = payoffBalance ? `page-summary (${rangeMethod})` : "";
  let resolvedPayoffBalance = payoffBalance;
  if (!resolvedPayoffBalance) {
    const fullNums = numbersFromText(fullText);
    resolvedPayoffBalance = safeNumber(pickPayoffFromNumbers(fullNums));
    extractionMethod = resolvedPayoffBalance ? "keyword-proximity" : "none";
  }

  const debugInfo = pickPayoffSelectionDebug(rangeNumbers, resolvedPayoffBalance);

  if (DEBUG) {
    console.log("[extractMortgage] rangeMethod", rangeMethod);
    console.log("[extractMortgage] rangeNumbers", rangeNumbers);
    console.log("[extractMortgage] payoffBalance", resolvedPayoffBalance);
    console.log("[extractMortgage] currentPayment", currentPayment);
    console.log("[extractMortgage] currentRate", currentRate);
  }

  const fields = {
    payoffBalance: resolvedPayoffBalance,
    balance: resolvedPayoffBalance,
    principalBalance,
    currentPayment,
    currentRate,
    refinanceCost,
    remainingYears,
    tracks: detectTracks(selectedPageText).map((track) => {
      if (track.balance && resolvedPayoffBalance && Math.abs(track.balance - resolvedPayoffBalance) < 0.01) {
        const lower = (track.candidateAmounts || []).filter((v) => v > 0 && v < resolvedPayoffBalance);
        return { ...track, balance: lower.length ? Math.max(...lower) : "" };
      }
      return track;
    }),
  };

  const missingFields = [
    !fields.payoffBalance && "יתרה לסילוק",
    !fields.currentPayment && "החזר חודשי נוכחי",
    !fields.currentRate && "ריבית קיימת ממוצעת",
    !fields.remainingYears && "תקופה משוערת שנותרה",
  ].filter(Boolean);

  return {
    ...fields,
    confidence: confidenceFor(fields),
    missingFields,
    extractionMethod,
    // Debug fields
    selectedPageNumber,
    selectedPageTextPreview: selectedPageText.slice(0, 300),
    pageDetectionReason,
    pagesSummary,
    detectedSummaryLine: rangeText.slice(0, 500),
    anchorName: rangeMethod,
    candidatePayoffNumbers: debugInfo.candidatePayoffNumbers,
    rejectedPayoffCandidates: debugInfo.rejectedPayoffCandidates,
    rawTextPreview: fullText.slice(0, 700),
  };
}
