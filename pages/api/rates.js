const fallbackRates = {
  bankOfIsraelRate: 4.5,
  primeRate: 6,
  inflation12m: 3.1,
  nextRateDecision: "לא זמין",
  lastUpdated: "2025-04",
  primeMortgage: 5.1,
  fixedUnlinked: 5.45,
  fixedLinked: 3.9,
  variable5: 5.35,
  variable5Linked: 3.7,
  forecastText:
    "נתוני ריבית לדוגמה לצורך סימולציה. יש לוודא נתוני שוק עדכניים מול מקורות רשמיים והבנקים.",
};

export default function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(fallbackRates);
  } catch {
    return res.status(200).json(fallbackRates);
  }
}
