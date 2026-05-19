// TODO: Implement password reset via Supabase Auth.
// When Supabase Auth is configured:
//   1. Initialize Supabase client with service role key
//   2. Call supabase.auth.admin.generateLink({ type: "recovery", email })
//   3. Send the link via transactional email (Supabase handles this automatically
//      if you configure a custom SMTP or use the default Supabase email service)
// Until then, this endpoint always returns success to avoid email enumeration.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const email = String((req.body || {}).email || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "INVALID_EMAIL", message: "יש להזין כתובת אימייל תקינה" });
  }

  // Always return success to prevent email enumeration
  return res.status(200).json({ ok: true });
}
