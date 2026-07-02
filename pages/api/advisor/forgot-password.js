import { supabasePasswordReset } from "../../../lib/supabaseAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const email = String((req.body || {}).email || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "INVALID_EMAIL", message: "יש להזין כתובת אימייל תקינה" });
  }

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const redirectTo = appUrl ? `${appUrl}/advisor/reset-password` : undefined;

  // Supabase handles delivery; always return success to prevent email enumeration,
  // even if the reset call itself throws (e.g. Supabase misconfigured).
  try {
    await supabasePasswordReset(email, redirectTo);
  } catch (e) {
    console.error("[advisor/forgot-password] supabasePasswordReset threw:", e?.message);
  }
  return res.status(200).json({ ok: true });
}
