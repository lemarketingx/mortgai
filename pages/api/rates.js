const fallbackRates = {
  bankOfIsraelRate: 3.25,
  primeRate: 4.75,
  inflation12m: 3.1,
  nextRateDecision: "לא זמין",
  lastUpdated: "2026-10",
  primeMortgage: 4.1,
  fixedUnlinked: 4.75,
  fixedLinked: 3.45,
  variable5: 4.5,
  variable5Linked: 3.2,
  forecastText:
    "אומדן ריביות לצורך סימולציה (מעודכן 10/2026). הריבית בפועל תלויה בבנק ובפרופיל הלווה — יש לוודא מול הבנקים.",
};

export default function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(fallbackRates);
  } catch {
    return res.status(200).json(fallbackRates);
  }
}
