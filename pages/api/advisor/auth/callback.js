// OAuth PKCE callback — exchanges the authorization code for a user,
// finds or creates an advisor profile, and issues an HMAC session cookie.

import { randomUUID } from "crypto";
import { supabaseExchangePkce } from "../../../../lib/supabaseAuth";
import { readAdvisors, createAdvisor } from "../../../../lib/leadsStore";
import { createAdvisorSessionCookie } from "../../../../lib/advisorAuth";

function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

export default async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  if (oauthError || !code) {
    return res.redirect(`/advisor/login?error=${encodeURIComponent(oauthError || "oauth_cancelled")}`);
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const codeVerifier = cookies.pkce_verifier || "";

  if (!codeVerifier) {
    return res.redirect("/advisor/login?error=session_expired");
  }

  // Exchange PKCE code for Supabase user
  const { error: exchError, user: authUser } = await supabaseExchangePkce(code, codeVerifier);
  if (exchError || !authUser?.id) {
    console.error("[oauth/callback] exchange failed:", exchError);
    return res.redirect("/advisor/login?error=oauth_failed");
  }

  // Find or create advisor profile
  let advisorId;
  try {
    const advisors = await readAdvisors();
    let advisor = advisors.find((a) => a.auth_user_id === authUser.id) ||
      advisors.find((a) => String(a.email || "").toLowerCase() === String(authUser.email || "").toLowerCase());

    if (!advisor) {
      advisorId = `adv_${randomUUID().slice(0, 8)}`;
      await createAdvisor({
        advisorId,
        authUserId: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email || "",
        phone: authUser.user_metadata?.phone || "",
        email: authUser.email || "",
        active: true,
        commissionType: "lead",
        commissionAmount: "",
        region: "",
        advisorType: "",
        businessName: "",
      });
    } else {
      advisorId = String(advisor.advisor_id || "");
    }
  } catch (err) {
    console.error("[oauth/callback] profile error:", err?.message);
    return res.redirect("/advisor/login?error=profile_failed");
  }

  res.setHeader("Set-Cookie", [
    createAdvisorSessionCookie(advisorId),
    "pkce_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  ]);
  return res.redirect("/advisor/leads");
}
