// Supabase Auth REST API helpers for FINZO PRO advisor authentication.
// Uses the SERVICE KEY for all server-side calls — no ANON key required.
//
// Required env vars:
//   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
//   SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
//
// For OAuth, also set in .env.local:
//   NEXT_PUBLIC_APP_URL = https://your-domain.com
//
// Supabase Dashboard setup for Google/Facebook OAuth:
//   Authentication → Providers → enable Google / Facebook and paste credentials.
//   Authentication → URL Configuration → add callback URL:
//     https://your-domain.com/api/advisor/auth/callback

function getUrl() {
  return String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function getServiceKey() {
  return String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function assertConfig() {
  if (!getUrl()) throw new Error("Missing SUPABASE_URL");
  if (!getServiceKey()) throw new Error("Missing SUPABASE_SERVICE_KEY");
}

function endpoint(path) {
  return `${getUrl()}/auth/v1${path}`;
}

function headers() {
  const key = getServiceKey();
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

// Create a Supabase Auth user via admin API.
// Uses email_confirm: true so the account is immediately active — no email verification step.
export async function supabaseAdminCreateUser(email, password) {
  assertConfig();
  const res = await fetch(endpoint("/admin/users"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.msg || data.message || data.error_description || `Signup failed (${res.status})`;
    return { error: msg, user: null };
  }
  return { error: null, user: data };
}

// Sign in with email + password.  Returns { error, user } where user has { id, email }.
export async function supabaseSignIn(email, password) {
  assertConfig();
  const res = await fetch(endpoint("/token?grant_type=password"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || "Invalid email or password";
    return { error: msg, user: null };
  }
  return { error: null, user: data.user };
}

// Trigger a Supabase password-reset email.
// Always returns { ok: true } — Supabase handles delivery and we never reveal
// whether the email exists (anti-enumeration).
export async function supabasePasswordReset(email) {
  assertConfig();
  try {
    await fetch(endpoint("/recover"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email }),
    });
  } catch {
    // ignore network errors — still show success to user
  }
  return { ok: true };
}

// Exchange a PKCE OAuth auth_code + code_verifier for a Supabase user object.
// Called from the /api/advisor/auth/callback route after an OAuth redirect.
export async function supabaseExchangePkce(authCode, codeVerifier) {
  assertConfig();
  const res = await fetch(endpoint("/token?grant_type=pkce"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: data.error_description || data.msg || "OAuth exchange failed", user: null };
  }
  return { error: null, user: data.user };
}

// Build the Supabase OAuth authorize URL.
// provider: "google" | "facebook"
// redirectTo: absolute URL to /api/advisor/auth/callback
// codeChallenge: base64url(sha256(codeVerifier))
export function buildOAuthUrl(provider, redirectTo, codeChallenge) {
  const base = getUrl();
  if (!base) return null;
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${base}/auth/v1/authorize?${params.toString()}`;
}
