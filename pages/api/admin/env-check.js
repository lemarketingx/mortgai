import { hasAdminSession } from "../../../lib/adminAuth";
import { getSupabaseConfigStatus } from "../../../lib/leadsStore";

export default function handler(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  try {
    if (!hasAdminSession(req)) {
      return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });
    }
  } catch (error) {
    return res.status(500).json({ error: "ADMIN_AUTH_NOT_CONFIGURED", message: error.message });
  }

  const supabase = getSupabaseConfigStatus();
  return res.status(200).json({
    hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    length: process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim().length : 0,
    hasAdminSessionSecret: Boolean(process.env.ADMIN_SESSION_SECRET),
    hasSupabaseUrl: supabase.hasUrl,
    hasSupabaseServiceKey: supabase.hasServiceKey,
    environment: process.env.VERCEL_ENV || "unknown",
  });
}
