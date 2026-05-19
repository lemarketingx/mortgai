// OAuth start route — generates PKCE code_verifier, stores it in a cookie,
// and redirects the browser to Supabase's OAuth authorize endpoint.
//
// Setup required in Supabase Dashboard → Authentication → Providers:
//   - Enable Google: paste Client ID + Secret from Google Cloud Console
//   - Enable Facebook: paste App ID + Secret from Facebook Developers
//
// Also add to Supabase → Authentication → URL Configuration → Redirect URLs:
//   https://your-domain.com/api/advisor/auth/callback
//
// Set NEXT_PUBLIC_APP_URL=https://your-domain.com in your environment.

import { createHash, randomBytes } from "crypto";
import { buildOAuthUrl } from "../../../../lib/supabaseAuth";

const ALLOWED_PROVIDERS = ["google", "facebook"];

export default function handler(req, res) {
  const { provider } = req.query;
  if (!ALLOWED_PROVIDERS.includes(provider)) return res.status(404).end();

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (!supabaseUrl) {
    return res.status(503).send("Supabase not configured");
  }

  // PKCE: generate verifier + challenge
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`).replace(/\/$/, "");
  const callbackUrl = `${appUrl}/api/advisor/auth/callback`;

  const oauthUrl = buildOAuthUrl(provider, callbackUrl, codeChallenge);
  if (!oauthUrl) return res.status(503).send("OAuth not configured");

  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `pkce_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${secure ? "; Secure" : ""}`,
  );
  return res.redirect(302, oauthUrl);
}
