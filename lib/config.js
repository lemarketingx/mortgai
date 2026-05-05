// Change this placeholder to the advisor's real WhatsApp number.
// Use international format without +, spaces, or hyphens. Example: 972521234567.
export const ADVISOR_WHATSAPP = "972501234567";

const WHATSAPP_MSG = encodeURIComponent("שלום, ראיתי את מחשבון המשכנתא ואשמח לבדיקת תמהיל וריביות");

export const WHATSAPP_URL = `https://wa.me/${ADVISOR_WHATSAPP}?text=${WHATSAPP_MSG}`;
