const BASE_PRICE = 149;

export function calculateLeadPrice(lead) {
  let price = BASE_PRICE;
  let factors = [];

  const score = Number(lead.finzoScore || lead.score || 0);
  if (score >= 80) { price += 100; factors.push({ label: "ציון FINZO גבוה", adjustment: 100 }); }
  else if (score >= 60) { price += 50; factors.push({ label: "ציון FINZO בינוני-גבוה", adjustment: 50 }); }

  const quality = lead.computedQuality || lead.quality || "";
  if (quality === "חם") { price += 50; factors.push({ label: "ליד חם", adjustment: 50 }); }

  if (lead.contractStatus === "חוזה חתום") { price += 75; factors.push({ label: "חוזה חתום", adjustment: 75 }); }

  const docs = Number(lead.documentsCount || 0);
  if (docs >= 5) { price += 30; factors.push({ label: "מסמכים מצורפים", adjustment: 30 }); }

  const equity = Number(lead.equityAmount || lead.equity || 0);
  const propPrice = Number(lead.propertyPrice || lead.propertyValue || 0);
  if (propPrice > 0 && equity / propPrice >= 0.3) { price += 25; factors.push({ label: "הון עצמי 30%+", adjustment: 25 }); }

  const daysSinceCreated = lead.createdAt ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000) : 999;
  if (daysSinceCreated <= 1) { price += 40; factors.push({ label: "ליד טרי (24 שעות)", adjustment: 40 }); }
  else if (daysSinceCreated <= 3) { price += 20; factors.push({ label: "ליד חדש (3 ימים)", adjustment: 20 }); }
  else if (daysSinceCreated > 14) { price -= 30; factors.push({ label: "ליד ישן (מעל שבועיים)", adjustment: -30 }); }

  price = Math.max(99, Math.min(499, price));

  return { price, basePrice: BASE_PRICE, factors, score };
}

export function getPriceLabel(price) {
  if (price >= 350) return "פרימיום";
  if (price >= 250) return "מתקדם";
  if (price >= 150) return "סטנדרט";
  return "בסיסי";
}
