import { getAdvisorSession } from "../../../lib/advisorAuth";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function endpoint(table, query = "") {
  return `${getSupabaseUrl()}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

function headers() {
  const key = getServiceKey();
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

export default async function handler(req, res) {
  const session = getAdvisorSession(req);
  if (!session) return res.status(401).json({ error: "ADVISOR_AUTH_REQUIRED" });

  const { advisorId } = session;

  if (req.method === "GET") {
    try {
      const r = await fetch(endpoint("advisor_profiles", `advisor_id=eq.${encodeURIComponent(advisorId)}&limit=1`), {
        headers: headers(),
      });
      if (!r.ok) return res.status(200).json({ profile: null });
      const rows = await r.json();
      return res.status(200).json({ profile: Array.isArray(rows) && rows[0] ? rows[0] : null });
    } catch {
      return res.status(200).json({ profile: null });
    }
  }

  if (req.method === "PUT") {
    const { name, phone, email, city, license, bio, specialties } = req.body || {};
    const row = {
      advisor_id: advisorId,
      name: name || "",
      phone: phone || "",
      email: email || "",
      city: city || "",
      license: license || "",
      bio: bio || "",
      specialties: Array.isArray(specialties) ? specialties : [],
      updated_at: new Date().toISOString(),
    };
    try {
      const r = await fetch(endpoint("advisor_profiles"), {
        method: "POST",
        headers: { ...headers(), Prefer: "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify(row),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("[advisor-profile] upsert failed", r.status, body);
        return res.status(502).json({ error: "SAVE_FAILED" });
      }
      const rows = await r.json();
      return res.status(200).json({ profile: Array.isArray(rows) ? rows[0] : row });
    } catch (err) {
      console.error("[advisor-profile]", err?.message);
      return res.status(500).json({ error: "UNEXPECTED" });
    }
  }

  return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
}
