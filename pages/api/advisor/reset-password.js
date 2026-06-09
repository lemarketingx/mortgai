import { supabaseUpdatePassword } from "../../../lib/supabaseAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const { accessToken, password } = req.body || {};
  if (!accessToken || !password) {
    return res.status(400).json({ error: "MISSING_FIELDS", message: "חסרים שדות נדרשים" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "PASSWORD_TOO_SHORT", message: "הסיסמה חייבת להכיל לפחות 8 תווים" });
  }

  let result;
  try {
    result = await supabaseUpdatePassword(String(accessToken), String(password));
  } catch (err) {
    console.error("[reset-password] supabaseUpdatePassword threw", err?.message);
    return res.status(500).json({ error: "SERVER_ERROR", message: "שגיאת שרת. נסה שוב." });
  }

  if (result.error) {
    return res.status(400).json({ error: "UPDATE_FAILED", message: "לא הצלחנו לעדכן את הסיסמה. ייתכן שהקישור פג תוקף — בקשו קישור חדש." });
  }

  return res.status(200).json({ ok: true });
}
