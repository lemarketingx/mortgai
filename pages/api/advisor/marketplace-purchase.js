import { LeadStoreError, readStoreLeads, createLeadPurchase, readAdvisorPurchasedLeadIds } from "../../../lib/leadsStore";
import { getAdvisorSession } from "../../../lib/advisorAuth";
import { getAdvisorWallet, deductWalletBalance } from "../../../lib/walletStore";

function apiError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");

  const session = getAdvisorSession(req);
  if (!session) return apiError(res, 401, "ADVISOR_AUTH_REQUIRED", "Advisor session required");

  const { leadId } = req.body || {};
  if (!leadId) return apiError(res, 400, "LEAD_ID_REQUIRED", "leadId is required");

  try {
    // Load available leads
    const storeLeads = await readStoreLeads();
    const lead = storeLeads.find((l) => l.id === leadId);

    if (!lead) return apiError(res, 404, "LEAD_NOT_AVAILABLE", "הליד אינו זמין.");
    if (lead.storeStatus === "sold") return apiError(res, 409, "LEAD_ALREADY_SOLD", "הליד כבר נמכר.");

    // Prevent double purchase by same advisor
    const ownedIds = await readAdvisorPurchasedLeadIds(session.advisorId);
    if (ownedIds.has(leadId)) {
      return apiError(res, 409, "ALREADY_PURCHASED", "כבר רכשתם את הליד הזה.");
    }

    const price = lead.storePrice || 0;

    // Wallet balance check + atomic deduction
    const wallet = await getAdvisorWallet(session.advisorId);
    if (wallet.balance < price) {
      return apiError(
        res, 402, "INSUFFICIENT_BALANCE",
        `יתרה לא מספיקה. נדרש: ₪${price}, יתרה: ₪${wallet.balance}.`
      );
    }

    // Atomic deduction — stored procedure uses FOR UPDATE row lock
    const deduction = await deductWalletBalance(session.advisorId, price);
    if (!deduction.success) {
      return apiError(res, 402, "INSUFFICIENT_BALANCE", "יתרה לא מספיקה לרכישה זו.");
    }

    // Record purchase and mark lead sold (exclusive = one buyer via marketplace)
    const purchase = await createLeadPurchase({
      leadId,
      advisorId: session.advisorId,
      purchaseType: "regular",
      price,
      isExclusive: true,
    });

    return res.status(200).json({
      ok: true,
      purchase,
      newBalance: deduction.newBalance,
    });
  } catch (error) {
    if (error instanceof LeadStoreError) {
      if (error.code === "EXCLUSIVE_STATUS_UPDATE_FAILED") {
        return apiError(res, 502, error.code, error.message);
      }
      const status = error.code === "SUPABASE_ENV_MISSING" ? 503 : 502;
      return apiError(res, status, error.code, error.message);
    }
    return apiError(res, 500, "PURCHASE_FAILED", "שגיאה בלתי צפויה בעת הרכישה.");
  }
}
