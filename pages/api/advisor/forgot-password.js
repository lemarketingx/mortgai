import { supabasePasswordReset } from "../../../lib/supabaseAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const email = String((req.body || {}).email || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "INVALID_EMAIL", message: "יש להזין כתובת אימייל תקינה" });
  }

  // Supabase handles delivery; always return success to prevent email enumeration
  await supabasePasswordReset(email);
  return res.status(200).json({ ok: true });
}
