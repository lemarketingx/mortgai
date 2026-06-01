export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const { name, email, phone, type, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "MISSING_FIELDS", message: "שדות חובה חסרים." });
  }

  // TODO: wire to email provider (SendGrid, Resend, etc.) or Supabase table
  // For now, log and acknowledge so the contact form works end-to-end
  console.log("[contact]", { name, email, phone, type, message: message.slice(0, 120) });

  return res.status(200).json({ ok: true });
}
