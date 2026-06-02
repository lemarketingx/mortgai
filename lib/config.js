// FINZO app-level configuration.
// Add real values here or via environment variables before deploying.

// WhatsApp contact number for public CTAs (international format, no + or spaces).
// Set NEXT_PUBLIC_ADVISOR_WHATSAPP in .env.local to override without a code change.
// Example: 972521234567
export const ADVISOR_WHATSAPP = process.env.NEXT_PUBLIC_ADVISOR_WHATSAPP || "";

const WHATSAPP_MSG = encodeURIComponent("שלום, ראיתי את מחשבון המשכנתא ואשמח לבדיקת תמהיל וריביות");

export const WHATSAPP_URL = ADVISOR_WHATSAPP
  ? `https://wa.me/${ADVISOR_WHATSAPP}?text=${WHATSAPP_MSG}`
  : "";
