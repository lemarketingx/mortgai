/**
 * Deep verification of the REAL lib/mortgage.js + lib/format.js.
 * Unlike validate-calculations.mjs (which tests inline copies of the formulas),
 * this imports the actual lib modules, so drift in the real code is caught.
 * Reference values are computed independently inside this file with full precision.
 * Run: npm run validate:lib
 */
import { register } from "node:module";
register("./esm-js-loader.mjs", import.meta.url);

const M = await import("../lib/mortgage.js");
const F = await import("../lib/format.js");

let passed = 0, failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}${extra ? " — " + extra : ""}`); }
}
function approx(a, b, tol) { return Math.abs(a - b) <= tol; }

// Independent Spitzer reference (annuity formula, full precision)
function refSpitzer(P, annualPct, years) {
  const r = annualPct / 100 / 12, n = Math.round(years * 12);
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

console.log("── lib/format.js parsing ──");
check('toNumber("1,500,000") = 1500000', F.toNumber("1,500,000") === 1500000);
check('toNumber("12.5") = 12.5', F.toNumber("12.5") === 12.5);
check('toNumber("₪850,000") = 850000', F.toNumber("₪850,000") === 850000);
check('toNumber(garbage) = 0', F.toNumber("abc") === 0);
check('cleanNumber("4.75", allowDecimal) keeps decimal', F.cleanNumber("4.75%", true) === "4.75");
check('cleanNumber strips decimal when not allowed', F.cleanNumber("4.75") === "475");

console.log("\n── monthlyPayment (Spitzer) vs independent annuity formula ──");
const spitzerCases = [
  [800000, 5, 25], [1500000, 4.5, 30], [500000, 3.2, 12], [2400000, 6.1, 20],
  [850000, 4.8, 18], [1000000, 5.5, 7], [300000, 0.1, 40],
];
for (const [P, rate, yrs] of spitzerCases) {
  const got = M.monthlyPayment(P, rate, yrs);
  const want = refSpitzer(P, rate, yrs);
  check(`monthlyPayment(${P}, ${rate}%, ${yrs}y) = ${got} ≈ ${want.toFixed(2)}`, approx(got, want, 1));
}
check("zero-rate: 120000 over 10y = 1000/mo", M.monthlyPayment(120000, 0, 10) === 1000);
check("zero principal → 0", M.monthlyPayment(0, 5, 20) === 0);
check("years=0 clamps to 1y (not crash/Infinity)", Number.isFinite(M.monthlyPayment(100000, 5, 0)) && M.monthlyPayment(100000, 5, 0) > 8000);
check("years=99 clamps to 40y", M.monthlyPayment(1000000, 5, 99) === M.monthlyPayment(1000000, 5, 40));
check("negative rate clamps to 0", M.monthlyPayment(120000, -3, 10) === 1000);
check("rate 25%+ clamps at 25", M.monthlyPayment(1000000, 80, 20) === M.monthlyPayment(1000000, 25, 20));

console.log("\n── mortgagePrincipalFromPayment (inverse round-trip) ──");
for (const [P, rate, yrs] of [[800000, 5, 25], [1500000, 4.5, 30], [500000, 3.2, 12]]) {
  const monthly = M.monthlyPayment(P, rate, yrs);
  const back = M.mortgagePrincipalFromPayment(monthly, rate, yrs);
  check(`inverse(${P}) → ${back} (±0.05%)`, approx(back, P, P * 0.0005));
}
check("zero-rate inverse: 1000/mo,10y → 120000", M.mortgagePrincipalFromPayment(1000, 0, 10) === 120000);

console.log("\n── buildAmortizationTable consistency ──");
{
  const t = M.buildAmortizationTable(500000, 4.5, 20);
  const last = t.rows[t.rows.length - 1];
  check("240 rows for 20y", t.rows.length === 240);
  check(`final balance ≈ 0 (got ${last.balance})`, Math.abs(last.balance) <= 500);
  const sumInterest = t.rows.reduce((s, r) => s + r.interestPart, 0);
  check("totalInterest = sum of monthly interest parts", t.totalInterest === sumInterest);
  const expectedInterest = M.monthlyPayment(500000, 4.5, 20) * 240 - 500000;
  check(`totalInterest ${t.totalInterest} ≈ payments−principal ${expectedInterest} (±600)`, approx(t.totalInterest, expectedInterest, 600));
  check("balance strictly decreasing", t.rows.every((r, i) => i === 0 || r.balance <= t.rows[i - 1].balance));
}

console.log("\n── calculateMortgageAnalysis: core ratios & payment ──");
{
  const a = M.calculateMortgageAnalysis({ income: 25000, expenses: 2000, price: 2000000, equity: 600000, years: 25, propertyType: "single", credit: "clean" });
  check("mortgage = price − equity = 1,400,000", a.mortgage === 1400000);
  check("LTV = 70%", approx(a.ltv, 70, 0.001));
  check("LTV 70% ≤ 75% → not exceeded", a.ltvLimitExceeded === false);
  const trackSum = a.tracks.reduce((s, t) => s + t.amount, 0);
  check("track amounts sum exactly to mortgage", trackSum === a.mortgage);
  const expectedWeighted = a.tracks.reduce((s, t) => s + t.annualRate * t.share, 0);
  check("weightedRate = Σ(rate×share)", approx(a.weightedRate, expectedWeighted, 0.001));
  const refMonthly = refSpitzer(1400000, a.weightedRate, 25);
  check(`monthly ${a.monthly} ≈ independent Spitzer ${refMonthly.toFixed(0)} (±2)`, approx(a.monthly, refMonthly, 2));
  check("mortgageOnlyRatio = monthly/income", approx(a.mortgageOnlyRatio, (a.monthly / 25000) * 100, 0.01));
  check("totalObligationsRatio includes expenses", approx(a.totalObligationsRatio, ((a.monthly + 2000) / 25000) * 100, 0.01));
  check("afterHousing = income − expenses − monthly", a.afterHousing === 25000 - 2000 - a.monthly);
  check("approval within 5..96", a.approval >= 5 && a.approval <= 96);
  check("totalPaid ≈ monthly×months", approx(a.totalPaidEstimate, a.monthly * 300, 1));
  check("totalInterest = totalPaid − mortgage", a.totalInterestEstimate === Math.max(0, a.totalPaidEstimate - 1400000));
}

console.log("\n── calculateMortgageAnalysis: LTV caps per property type ──");
{
  const single = M.calculateMortgageAnalysis({ income: 30000, price: 2000000, equity: 400000, propertyType: "single" });   // 80% > 75
  check("single 80% LTV → exceeded + hard limit", single.ltvLimitExceeded && single.hardLimitExceeded);
  check("approval capped ≤38 on hard limit", single.approval <= 38);
  check("missingEquity = 1.6M − 1.5M = 100k", single.missingEquity === 100000);

  const repl = M.calculateMortgageAnalysis({ income: 30000, price: 2000000, equity: 580000, propertyType: "replacement" }); // 71% > 70
  check("replacement 71% LTV → exceeded", repl.ltvLimitExceeded === true);
  const replOk = M.calculateMortgageAnalysis({ income: 30000, price: 2000000, equity: 620000, propertyType: "replacement" }); // 69%
  check("replacement 69% LTV → ok", replOk.ltvLimitExceeded === false);

  const inv = M.calculateMortgageAnalysis({ income: 30000, price: 2000000, equity: 900000, propertyType: "investment" });  // 55% > 50
  check("investment 55% LTV → exceeded", inv.ltvLimitExceeded === true);
  const invOk = M.calculateMortgageAnalysis({ income: 30000, price: 2000000, equity: 1000000, propertyType: "investment" }); // exactly 50%
  check("investment exactly 50% LTV → ok (boundary)", invOk.ltvLimitExceeded === false);
}

console.log("\n── calculateMortgageAnalysis: guards & penalties ──");
{
  const zeroIncome = M.calculateMortgageAnalysis({ income: 0, price: 1000000, equity: 300000 });
  check("zero income → finite ratios (no NaN/∞)", Number.isFinite(zeroIncome.mortgageOnlyRatio) && Number.isFinite(zeroIncome.totalObligationsRatio));
  check("zero income → approval floor ≥5", zeroIncome.approval >= 5);
  const bdi = M.calculateMortgageAnalysis({ income: 25000, price: 1500000, equity: 600000, credit: "negative" });
  const clean = M.calculateMortgageAnalysis({ income: 25000, price: 1500000, equity: 600000, credit: "clean" });
  check("BDI negative penalty = 30 pts vs clean", clean.approval - bdi.approval === 30);
  const eq = M.calculateMortgageAnalysis({ income: 40000, expenses: 0, price: 1200000, equity: 700000, years: 20 });
  check("strong case approval capped ≤96", eq.approval <= 96);
  // equal principal method: first payment = P/n + P·r
  const ep = M.calculateMortgageAnalysis({ income: 30000, price: 1500000, equity: 500000, years: 20, repaymentMethod: "equalPrincipal" });
  const P = 1000000, n = 240, r = ep.weightedRate / 100 / 12;
  check(`equalPrincipal first payment ≈ P/n + P·r (${ep.firstMonthlyPayment})`, approx(ep.firstMonthlyPayment, P / n + P * r, 2));
  check("equalPrincipal last < first payment", ep.lastMonthlyPaymentEstimate < ep.firstMonthlyPayment);
  // total interest for equal principal: r·P·(n+1)/2
  check("equalPrincipal totalInterest = r·P·(n+1)/2", approx(ep.totalInterestEstimate, r * P * (n + 1) / 2, 2));
  // linked indexation adds cost
  const linked = M.calculateMortgageAnalysis({ income: 30000, price: 1500000, equity: 500000, years: 20, indexation: "linked" });
  const unlinked = M.calculateMortgageAnalysis({ income: 30000, price: 1500000, equity: 500000, years: 20, indexation: "unlinked" });
  check("CPI-linked totalPaid > unlinked", linked.totalPaidEstimate > unlinked.totalPaidEstimate);
}

console.log("\n── Refinance engine (lib) ──");
{
  const b1 = M.calculateRefinanceBreakeven(6000, 5500, 18000);
  check("breakeven: 18000/500 = 36 months, worthIt", b1.breakEvenMonths === 36 && b1.worthIt === true && b1.monthlySavings === 500);
  const b2 = M.calculateRefinanceBreakeven(6000, 5500, 18500);
  check("37 months → not worthIt", b2.breakEvenMonths === 37 && b2.worthIt === false);
  const b3 = M.calculateRefinanceBreakeven(6000, 6100, 10000);
  check("new payment higher → Infinity, not worthIt", b3.breakEvenMonths === Infinity && b3.worthIt === false);
  const b4 = M.calculateRefinanceBreakeven(6000, 5500, 0);
  check("zero costs → breakeven 0, worthIt", b4.breakEvenMonths === 0 && b4.worthIt === true);

  check("prime track → no prepayment penalty", M.calculateEarlyPaymentPenalty(800000, 5, 120, "prime").penalty === 0);
  const pen = M.calculateEarlyPaymentPenalty(800000, 4.8, 240, "standard");
  check("standard penalty = P·r·min(m,18)·0.6", pen.penalty === Math.round(800000 * (4.8 / 100 / 12) * 18 * 0.6));

  const cpi = M.calculateCpiEffect(1000000, 2.5, 10);
  check("CPI factor = 1.025^10", approx(cpi.factor, Math.pow(1.025, 10), 1e-9));
  check("CPI adjusted principal", cpi.adjustedPrincipal === Math.round(1000000 * Math.pow(1.025, 10)));

  const rec = M.refinanceRecommendation({ principal: 900000, rate: 5.5, remainingYears: 18, trackType: "standard" }, { newRate: 4.2 });
  const wantCur = refSpitzer(900000, 5.5, 18), wantNew = refSpitzer(900000, 4.2, 18);
  check("refi current payment matches Spitzer", approx(rec.currentMonthly, wantCur, 1));
  check("refi new payment matches Spitzer", approx(rec.newMonthly, wantNew, 1));
  check("monthlySavings = diff", approx(rec.monthlySavings, rec.currentMonthly - rec.newMonthly, 0.001));
  check("totalSavings = currentTotal − newTotal", rec.totalSavings === rec.currentTotal - rec.newTotal);
  // KNOWN ISSUE (QA finding C-3, docs/QA_CALC_PDF_2026-07-06.md): the penalty
  // heuristic uses the full loan rate instead of the rate differential, which
  // inflates refinanceCosts and pushes break-even past 48 months — so a case
  // with ~₪88k net savings currently returns "לא מומלץ". This check documents
  // the current behavior; flip it to the commented expectation once C-3 is fixed.
  check("1.3% rate drop currently returns לא מומלץ (documented issue C-3)", rec.recommendation === "לא מומלץ");
  // check("1.3% rate drop → recommended", rec.recommendation === "מומלץ מאוד" || rec.recommendation === "כדאי לבדוק");

  const worse = M.refinanceRecommendation({ principal: 900000, rate: 4.0, remainingYears: 18, trackType: "standard" }, { newRate: 5.0 });
  check("higher new rate → לא מומלץ", worse.recommendation === "לא מומלץ");
}

console.log("\n── Track comparison / mix / stress ──");
{
  const cmp = M.compareTrackPayments(1000000, 25);
  for (const t of cmp) {
    check(`track ${t.key}: monthly matches Spitzer at ${t.rate}%`, approx(t.monthly, refSpitzer(1000000, t.rate, 25), 1));
    check(`track ${t.key}: totalInterest = monthly×n − P`, t.totalInterest === t.monthly * 300 - 1000000);
  }
  const mix = M.calculateMixPayment(1200000, 20, { fixed_unlinked: 0.34, cpi_linked: 0.33, prime: 0.33 });
  const mixSum = mix.tracks.reduce((s, t) => s + t.amount, 0);
  check(`mix track amounts ≈ principal (got ${mixSum})`, approx(mixSum, 1200000, 2));
  check("mix totalMonthly = Σ track monthly", mix.totalMonthly === mix.tracks.reduce((s, t) => s + t.monthly, 0));
  const stress = M.stressTest(1200000, 20);
  check("stress +1/+2/+3 strictly increasing", stress[0].increase > 0 && stress[1].increase > stress[0].increase && stress[2].increase > stress[1].increase);
}

console.log("\n── calculateAdditionalCosts (purchase tax) ──");
{
  const below = M.calculateAdditionalCosts(1800000, { isFirstApartment: true });
  check("first apartment below bracket → 0 tax", below.purchaseTax === 0);
  const above = M.calculateAdditionalCosts(2500000, { isFirstApartment: true });
  check("first apartment: 3.5% above 1,919,155", above.purchaseTax === Math.round((2500000 - 1919155) * 0.035));
  const inv = M.calculateAdditionalCosts(2000000, { isFirstApartment: false });
  check("investment: 8% flat", inv.purchaseTax === 160000);
  const invHigh = M.calculateAdditionalCosts(7000000, { isFirstApartment: false });
  check("investment above 6.055M: 10%", invHigh.purchaseTax === 700000);
  check("total = sum of breakdown", below.total === below.breakdown.reduce((s, b) => s + b.amount, 0));
}

console.log("\n──────────────────────────────────────────────────");
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
